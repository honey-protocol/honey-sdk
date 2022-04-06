import React, { FC, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { AssetStore, Market, Reserve, User } from '../helpers/JetTypes';
import {
  getAccountInfoAndSubscribe,
  getMintInfoAndSubscribe,
  getTokenAccountAndSubscribe,
  parseMarketAccount,
  parseObligationAccount,
  parseReserveAccount,
  SOL_DECIMALS
} from '../helpers/programUtil';
import { deriveValues } from '../helpers/subscribe';
import { TokenAmount } from '../helpers/util';
import { useAnchor } from './anchor';
import { getEmptyMarketState } from './getEmptyMarket';
import * as anchor from "@project-serum/anchor";
import { MarketReserveInfoList } from '../helpers/layout';
import { parsePriceData } from '@pythnetwork/client';
import { getEmptyUserState } from './getEmptyUser';
import { NATIVE_MINT } from '@solana/spl-token';
import { getAssetPubkeys, getReserveStructures } from '../helpers/honey-protocol-helpers';
import { ConnectedWallet } from '../helpers/walletType';

interface HoneyContext {
  market: Market,
  user: User,
  assetStore: AssetStore | null;
}
const HoneyContext = React.createContext<HoneyContext>({
  market: getEmptyMarketState(),
  user: getEmptyUserState(),
  assetStore: null
});

export const useHoney = () => {
  const context = useContext(HoneyContext);
  return context;
};

export interface HoneyProps {
  children: ReactNode,
  wallet: ConnectedWallet | null;
}

export const HoneyProvider: FC<HoneyProps> = ({
  children,
  wallet
}) => {
  const { program, idlMetadata, coder, isConfigured } = useAnchor();

  const [market, setMarket] = useState<Market>(getEmptyMarketState());
  const [user, setUser] = useState<User>(getEmptyUserState());
  const [assetStore, setAssetStore] = useState<AssetStore | null>(null);

  useEffect(() => {

    const fetchReserves = async () => {
      const reserveStructures: Record<string, Reserve> = await getReserveStructures(idlMetadata);
      console.log({ idlMetadata })
      setMarket(current => ({
        ...current,
        accountPubkey: idlMetadata.market.market,
        authorityPubkey: idlMetadata.market.marketAuthority,
        reserves: reserveStructures,
        currentReserve: reserveStructures.SOL,
      }));
    }

    if (isConfigured)
      fetchReserves();
  }, [idlMetadata]);

  useEffect(() => {
    if (!program?.provider?.connection ||
      !idlMetadata || !user || !coder ||
      Object.keys(market.reserves).length === 0 ||
      !user.assets?.tokens)
      return

    const subscribeToMarket = async () => {
      let promise: Promise<number>;
      const promises: Promise<number>[] = [];

      promise = getAccountInfoAndSubscribe(program.provider.connection, idlMetadata?.market.market, account => {
        if (account != null) {
          console.assert(MarketReserveInfoList.span === 12288);
          const decoded = parseMarketAccount(account.data, coder);
          for (const reserveStruct of decoded.reserves) {
            for (const abbrev in market.reserves) {
              if (market.reserves[abbrev].accountPubkey.equals(reserveStruct.reserve)) {
                const reserve = market.reserves[abbrev];

                reserve.liquidationPremium = reserveStruct.liquidationBonus;
                reserve.depositNoteExchangeRate = reserveStruct.depositNoteExchangeRate;
                reserve.loanNoteExchangeRate = reserveStruct.loanNoteExchangeRate;

                const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                console.log(marketUpdate, userUpdate, assetUpdate);
              }
            }
          }
        }
      });

      for (const reserveMeta of idlMetadata.reserves) {
        // Reserve
        promise = getAccountInfoAndSubscribe(program.provider.connection, reserveMeta.accounts.reserve, account => {
          if (account != null) {
            const decoded = parseReserveAccount(account.data, coder);

            // Hardcoding min c-ratio to 130% for now
            // market.minColRatio = decoded.config.minCollateralRatio / 10000;

            const reserve = market.reserves[reserveMeta.abbrev];

            reserve.maximumLTV = decoded.config.minCollateralRatio;
            reserve.liquidationPremium = decoded.config.liquidationPremium;
            reserve.outstandingDebt = new TokenAmount(decoded.state.outstandingDebt, reserveMeta.decimals).divb(new anchor.BN(Math.pow(10, 15)));
            reserve.accruedUntil = decoded.state.accruedUntil;
            reserve.config = decoded.config;

            const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Deposit Note Mint
        promise = getMintInfoAndSubscribe(program.provider.connection, reserveMeta.accounts.depositNoteMint, amount => {
          if (amount != null) {
            const reserve = market.reserves[reserveMeta.abbrev];
            reserve.depositNoteMint = amount;

            const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Loan Note Mint
        promise = getMintInfoAndSubscribe(program.provider.connection, reserveMeta.accounts.loanNoteMint, amount => {
          if (amount != null) {
            const reserve = market.reserves[reserveMeta.abbrev];
            reserve.loanNoteMint = amount;

            const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Reserve Vault
        promise = getTokenAccountAndSubscribe(program.provider.connection, reserveMeta.accounts.vault, reserveMeta.decimals, amount => {
          if (amount != null) {
            const reserve = market.reserves[reserveMeta.abbrev];
            reserve.availableLiquidity = amount;

            const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Reserve Token Mint
        promise = getMintInfoAndSubscribe(program.provider.connection, reserveMeta.accounts.tokenMint, amount => {
          if (amount != null) {
            const reserve = market.reserves[reserveMeta.abbrev];
            reserve.tokenMint = amount;

            const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Pyth Price
        promise = getAccountInfoAndSubscribe(program.provider.connection, reserveMeta.accounts.pythPrice, account => {
          if (account != null) {
            const reserve = market.reserves[reserveMeta.abbrev];
            reserve.price = parsePriceData(account.data).price || 90; // default to 90 for now

            const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);
      }
      await Promise.all(promises);
    }
    if (idlMetadata?.market?.market && program?.provider?.connection && market.reserves && user)
      subscribeToMarket();

  }, [idlMetadata?.market?.market, program?.provider?.connection, market.reserves, user]);

  useEffect(() => {
    const fetchAssets = async () => {
      const fetchedAssetStore: AssetStore | null = await getAssetPubkeys(market, user, program, wallet);
      user.assets = fetchedAssetStore;
      setAssetStore(fetchedAssetStore);
    }
    if (market && user && program?.provider?.connection && wallet)
      fetchAssets();
  }, [market, user, program?.provider?.connection, wallet])

  useEffect(() => {
    const subscribeToAssets = async () => {
      if (!user.assets)
        return

      let promise: Promise<number>;
      const promises: Promise<number>[] = [];

      // Obligation
      promise = getAccountInfoAndSubscribe(program.provider.connection, assetStore?.obligationPubkey!, account => {
        if (account != null && user.assets) {
          user.assets.obligation = {
            ...account,
            data: parseObligationAccount(account.data, coder),
          };
        };
      })
      promises.push(promise);

      // Wallet native SOL balance
      promise = getAccountInfoAndSubscribe(program.provider.connection, wallet?.publicKey, account => {
        if (user.assets) {
          const reserve = market.reserves.SOL;

          // Need to be careful constructing a BN from a number.
          // If the user has more than 2^53 lamports it will throw for not having enough precision.
          user.assets.tokens.SOL.walletTokenBalance = new TokenAmount(new anchor.BN(account?.lamports.toString() ?? 0), SOL_DECIMALS)

          user.assets.sol = user.assets.tokens.SOL.walletTokenBalance
          user.walletBalances.SOL = user.assets.tokens.SOL.walletTokenBalance.uiAmountFloat;

          const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
          console.log(marketUpdate, userUpdate, assetUpdate);
        }
        return user;
      });
      promises.push(promise);

      for (const abbrev in user.assets.tokens) {
        if (!abbrev || abbrev !== "SOL") continue;
        const asset = user.assets.tokens[abbrev];
        const reserve = market.reserves[abbrev];

        // Wallet token account
        promise = getTokenAccountAndSubscribe(program.provider.connection, asset.walletTokenPubkey, reserve.decimals, amount => {
          if (user.assets) {
            user.assets.tokens[reserve.abbrev].walletTokenBalance = amount ?? new TokenAmount(new anchor.BN(0), reserve.decimals);
            user.assets.tokens[reserve.abbrev].walletTokenExists = !!amount;
            // Update wallet token balance
            if (!asset.tokenMintPubkey.equals(NATIVE_MINT)) {
              user.walletBalances[reserve.abbrev] = asset.walletTokenBalance.uiAmountFloat;
            }

            const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
          return user;
        });
        promises.push(promise);

        // Reserve deposit notes
        promise = getTokenAccountAndSubscribe(program.provider.connection, asset.depositNoteDestPubkey, reserve.decimals, amount => {
          if (user.assets) {
            user.assets.tokens[reserve.abbrev].depositNoteDestBalance = amount ?? TokenAmount.zero(reserve.decimals);
            user.assets.tokens[reserve.abbrev].depositNoteDestExists = !!amount;

            const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
          return user;
        })
        promises.push(promise);

        // Deposit notes account
        promise = getTokenAccountAndSubscribe(program.provider.connection, asset.depositNotePubkey, reserve.decimals, amount => {
          if (user.assets) {
            user.assets.tokens[reserve.abbrev].depositNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
            user.assets.tokens[reserve.abbrev].depositNoteExists = !!amount;

            const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        })
        promises.push(promise);

        // Obligation loan notes
        promise = getTokenAccountAndSubscribe(program.provider.connection, asset.loanNotePubkey, reserve.decimals, amount => {
          if (user.assets) {
            user.assets.tokens[reserve.abbrev].loanNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
            user.assets.tokens[reserve.abbrev].loanNoteExists = !!amount;

            const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        })
        promises.push(promise);

        // Obligation collateral notes
        promise = getTokenAccountAndSubscribe(program.provider.connection, asset.collateralNotePubkey, reserve.decimals, amount => {
          if (user.assets) {
            user.assets.tokens[reserve.abbrev].collateralNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
            user.assets.tokens[reserve.abbrev].collateralNoteExists = !!amount;

            const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);
      }
      Promise.all([promise]);
    }
    if (user.assets?.tokens && program?.provider?.connection && assetStore && wallet)
      subscribeToAssets()
  }, [user, program?.provider?.connection, assetStore, wallet])

  const honeyContext = useMemo(() => ({
    market,
    user,
    assetStore
  }), [market, user, assetStore])

  return (
    <HoneyContext.Provider
      value={honeyContext}>
      {children}
    </HoneyContext.Provider>
  )
}

