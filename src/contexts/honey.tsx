import React, { FC, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { 
  AssetStore, 
  HoneyMarketReserveInfo, 
  ReserveStateStruct, 
  User 
} from '../helpers/honeyTypes';
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
import { MarketReserveInfoList, ReserveStateLayout } from '../helpers/layout';
import { parsePriceData } from '@pythnetwork/client';
import { getEmptyUserState } from './getEmptyUser';
import { NATIVE_MINT } from '@solana/spl-token';
import { getAssetPubkeys, getReserveStructures } from '../helpers/honeyProtocolHelpers';
import { ConnectedWallet } from '../helpers/walletType';
import { useMarket } from '../hooks';
import { Connection, PublicKey } from '@solana/web3.js';

interface HoneyContext {
  market: Market | null,
  marketReserveInfo: HoneyMarketReserveInfo[] | null,
  parsedReserves: Reserve[] | null;
}
const HoneyContext = React.createContext<HoneyContext>({
  market: null,
  marketReserveInfo: null,
  parsedReserves: null
});

export const useHoney = () => {
  const context = useContext(HoneyContext);
  return context;
};

export interface HoneyProps {
  children: ReactNode,
  wallet: ConnectedWallet | null;
  connection: Connection,
  honeyProgramId: string;
  honeyMarketId: string;
}

export interface Market {
  authorityBumpSeed: number[],
  authoritySeed: PublicKey,
  flags: number,
  marketAuthority: PublicKey,
  nftCollectionCreator: PublicKey,
  owner: PublicKey,
  quoteCurrency: number[],
  quoteExponent: number,
  quoteTokenMint: PublicKey,
  reserved: number[],
  reserves: number[],
  version: 0
}

export interface Reserve {
  config: any;
  depositNoteMint: PublicKey;
  dexMarketA: PublicKey;
  dexMarketB: PublicKey;
  dexOpenOrdersA: PublicKey;
  dexOpenOrdersB: PublicKey;
  dexSwapTokens: PublicKey;
  exponent: number;
  feeNoteVault: PublicKey;
  index: number;
  loanNoteMint: PublicKey;
  market: PublicKey;
  nftDropletMint: PublicKey;
  nftDropletVault: PublicKey;
  protocolFeeNoteVault: PublicKey;
  pythOraclePrice: PublicKey;
  pythOracleProduct: PublicKey;
  reserved0: number[];
  reserved1: number[];
  state: number[];
  tokenMint: PublicKey;
  vault: PublicKey;
  version: number;
  reserveState: ReserveState;
}

export interface ReserveState {
  accruedUntil: number;
  invalidated: number;
  lastUpdated: number;
  outstandingDebt: number;
  totalDepositNotes: number;
  totalDeposits: number;
  totalLoanNotes: number;
  uncollectedFees: number;
  _UNUSED_0_: Uint8Array;
  _UNUSED_1_: Uint8Array;
}

export const HoneyProvider: FC<HoneyProps> = ({
  children,
  wallet,
  connection,
  honeyProgramId,
  honeyMarketId
}) => {
  const { program, coder } = useAnchor();
  const { honeyMarket } = useMarket(connection, wallet, honeyProgramId, honeyMarketId)

  const [market, setMarket] = useState<Market | null>(null);
  const [marketReserveInfo, setMarketReserveInfo] = useState<HoneyMarketReserveInfo[]>()
  const [parsedReserves, setReserves] = useState<Reserve[] | null>();

  // useEffect(() => {

  //   const fetchReserves = async () => {

  //     const reserveStructures: Record<string, Reserve> = await getReserveStructures(honeyReserves);
  //     setMarket(current => ({
  //       ...current,
  //       accountPubkey: honeyMarket.address,
  //       authorityPubkey: honeyMarket.marketAuthority,
  //       reserves: reserveStructures,
  //       currentReserve: reserveStructures.SOL,
  //     }));
  //   }

  //   if (isConfigured && honeyReserves) {
  //     fetchReserves();
  //   }
  // }, [honeyReserves, isConfigured]);

  useEffect(() => {
    if (!program?.provider?.connection || !coder || !honeyMarket?.address)
      return

    const fetchMarket = async () => {
      // market info
      const marketValue = await program.account.market.fetch(honeyMarket.address);
      setMarket(marketValue as Market);

      // reserve info
      let reserveInfoData = new Uint8Array(marketValue.reserves as any as number[]);
      let reserveInfoList = MarketReserveInfoList.decode(reserveInfoData) as HoneyMarketReserveInfo[];
      setMarketReserveInfo(reserveInfoList);

      const reservesList = [] as Reserve[];
      for (const reserve of reserveInfoList) {
        if (reserve.reserve.equals(PublicKey.default)) return;
        const reserveValue = await program.account.reserve.fetch(reserve.reserve) as Reserve;
        const reserveState = ReserveStateLayout.decode(Buffer.from(reserveValue.state as any as number[])) as ReserveState;
        reserveValue.reserveState = reserveState;
        reservesList.push(reserveValue);
        setReserves(reservesList);

      }
      console.log("resreves list", reservesList);
      setReserves(reservesList);
    }

    fetchMarket();

    // const fetchReserve = async () => {
    //   return await program.account.reserve.fetch(honeyMarket.address);
    // }

    // const subscribeToMarket = async () => {
    //   let promise: Promise<number>;
    //   const promises: Promise<number>[] = [];

    //   // promise = getAccountInfoAndSubscribe(program.provider.connection, honeyMarket.address, account => {
    //   //   if (account != null) {
    //   //     console.assert(MarketReserveInfoList.span === 12288);
    //   //     const decoded = parseMarketAccount(account.data, coder);
    //   //     for (const reserveStruct of decoded.reserves) {
    //   //       for (const abbrev in market.reserves) {
    //   //         if (market.reserves[abbrev].accountPubkey.equals(reserveStruct.reserve)) {
    //   //           const reserve = market.reserves[abbrev];

    //   //           reserve.liquidationPremium = reserveStruct.liquidationBonus;
    //   //           reserve.depositNoteExchangeRate = reserveStruct.depositNoteExchangeRate;
    //   //           reserve.loanNoteExchangeRate = reserveStruct.loanNoteExchangeRate;

    //   //           const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
    //   //           console.log(marketUpdate, userUpdate, assetUpdate);
    //   //         }
    //   //       }
    //   //     }
    //   //   }
    //   // });
    //   // @ts-ignore
    //   for (const key of Object.keys(market.reserves)) {
    //     const reserveMeta = market.reserves[key];
    //     // Reserve
    //     // promise = getAccountInfoAndSubscribe(program.provider.connection, reserveMeta.accountPubkey, account => {
    //     //   if (account != null) {
    //     //     const decoded = parseReserveAccount(account.data, coder);

    //     //     // Hardcoding min c-ratio to 130% for now
    //     //     // market.minColRatio = decoded.config.minCollateralRatio / 10000;

    //     //     const reserve = market.reserves[reserveMeta.abbrev];

    //     //     reserve.maximumLTV = decoded.config.minCollateralRatio;
    //     //     reserve.liquidationPremium = decoded.config.liquidationPremium;
    //     //     reserve.outstandingDebt = new TokenAmount(decoded.state.outstandingDebt, reserveMeta.decimals).divb(new anchor.BN(Math.pow(10, 15)));
    //     //     reserve.accruedUntil = decoded.state.accruedUntil;
    //     //     reserve.config = decoded.config;

    //     //     const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
    //     //     console.log(marketUpdate, userUpdate, assetUpdate);
    //     //   }
    //     // });
    //     // promises.push(promise);

    //     // Deposit Note Mint
    //   //   promise = getMintInfoAndSubscribe(program.provider.connection, reserveMeta.depositNoteMintPubkey, amount => {
    //   //     if (amount != null) {
    //   //       const reserve = market.reserves[reserveMeta.abbrev];
    //   //       reserve.depositNoteMint = amount;

    //   //       const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
    //   //       console.log(marketUpdate, userUpdate, assetUpdate);
    //   //     }
    //   //   });
    //   //   promises.push(promise);

    //   //   // Loan Note Mint
    //   //   promise = getMintInfoAndSubscribe(program.provider.connection, reserveMeta.loanNoteMintPubkey, amount => {
    //   //     if (amount != null) {
    //   //       const reserve = market.reserves[reserveMeta.abbrev];
    //   //       reserve.loanNoteMint = amount;

    //   //       const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
    //   //       console.log(marketUpdate, userUpdate, assetUpdate);
    //   //     }
    //   //   });
    //   //   promises.push(promise);

    //   //   // Reserve Vault
    //   //   promise = getTokenAccountAndSubscribe(program.provider.connection, reserveMeta.vaultPubkey, reserveMeta.decimals, amount => {
    //   //     if (amount != null) {
    //   //       const reserve = market.reserves[reserveMeta.abbrev];
    //   //       reserve.availableLiquidity = amount;

    //   //       const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
    //   //       console.log(marketUpdate, userUpdate, assetUpdate);
    //   //     }
    //   //   });
    //   //   promises.push(promise);

    //   //   // Reserve Token Mint
    //   //   promise = getMintInfoAndSubscribe(program.provider.connection, reserveMeta.tokenMintPubkey, amount => {
    //   //     if (amount != null) {
    //   //       const reserve = market.reserves[reserveMeta.abbrev];
    //   //       reserve.tokenMint = amount;

    //   //       const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
    //   //       console.log(marketUpdate, userUpdate, assetUpdate);
    //   //     }
    //   //   });
    //   //   promises.push(promise);

    //   //   // Pyth Price
    //   //   promise = getAccountInfoAndSubscribe(program.provider.connection, reserveMeta.pythPricePubkey, account => {
    //   //     if (account != null) {
    //   //       const reserve = market.reserves[reserveMeta.abbrev];
    //   //       reserve.price = parsePriceData(account.data).price || 90; // default to 90 for now

    //   //       const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
    //   //       console.log(marketUpdate, userUpdate, assetUpdate);
    //   //     }
    //   //   });
    //   //   promises.push(promise);
    //   }
    //   // await Promise.all(promises);
    // }
    // if (market.reserves && program?.provider?.connection && market.reserves && user)
    //   subscribeToMarket();

  }, [honeyMarket, program?.provider?.connection]);

  // useEffect(() => {
  //   const fetchAssets = async () => {
  //     const fetchedAssetStore: AssetStore | null = await getAssetPubkeys(market, user, program, wallet);
  //     user.assets = fetchedAssetStore;
  //     setAssetStore(fetchedAssetStore);
  //   }
  //   if (market.accountPubkey && user && program?.provider?.connection && wallet)
  //     fetchAssets();
  // }, [market.accountPubkey, user, program, wallet])

  // useEffect(() => {
  //   const subscribeToAssets = async () => {
  //     if (!user.assets)
  //       return

  //     let promise: Promise<number>;
  //     const promises: Promise<number>[] = [];

  //     // Obligation
  //     promise = getAccountInfoAndSubscribe(program.provider.connection, assetStore?.obligationPubkey!, account => {
  //       if (account != null && user.assets) {
  //         user.assets.obligation = {
  //           ...account,
  //           data: parseObligationAccount(account.data, coder),
  //         };
  //       };
  //     })
  //     promises.push(promise);

  //     // Wallet native SOL balance
  //     promise = getAccountInfoAndSubscribe(program.provider.connection, wallet?.publicKey, account => {
  //       if (user.assets) {
  //         // const reserve = market.reserves.SOL;

  //         // Need to be careful constructing a BN from a number.
  //         // If the user has more than 2^53 lamports it will throw for not having enough precision.
  //         // user.assets.tokens.SOL.walletTokenBalance = new TokenAmount(new anchor.BN(account?.lamports.toString() ?? 0), SOL_DECIMALS)

  //         // user.assets.sol = user.assets.tokens.SOL.walletTokenBalance
  //         // user.walletBalances.SOL = user.assets.tokens.SOL.walletTokenBalance.uiAmountFloat;

  //         // const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
  //         // console.log(marketUpdate, userUpdate, assetUpdate);
  //       }
  //       return user;
  //     });
  //     promises.push(promise);

  //     for (const abbrev in user.assets.tokens) {
  //       const asset = user.assets.tokens[abbrev];
  //       const reserve = market.reserves[abbrev];

  //       // Wallet token account
  //       promise = getTokenAccountAndSubscribe(program.provider.connection, asset.walletTokenPubkey, reserve.decimals, amount => {
  //         if (user.assets) {
  //           user.assets.tokens[reserve.abbrev].walletTokenBalance = amount ?? new TokenAmount(new anchor.BN(0), reserve.decimals);
  //           user.assets.tokens[reserve.abbrev].walletTokenExists = !!amount;
  //           // Update wallet token balance
  //           if (!asset.tokenMintPubkey.equals(NATIVE_MINT)) {
  //             user.walletBalances[reserve.abbrev] = asset.walletTokenBalance.uiAmountFloat;
  //           }

  //           const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
  //           console.log(marketUpdate, userUpdate, assetUpdate);
  //         }
  //         return user;
  //       });
  //       promises.push(promise);

  //       // Reserve deposit notes
  //       promise = getTokenAccountAndSubscribe(program.provider.connection, asset.depositNoteDestPubkey, reserve.decimals, amount => {
  //         if (user.assets) {
  //           user.assets.tokens[reserve.abbrev].depositNoteDestBalance = amount ?? TokenAmount.zero(reserve.decimals);
  //           user.assets.tokens[reserve.abbrev].depositNoteDestExists = !!amount;

  //           const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
  //           console.log(marketUpdate, userUpdate, assetUpdate);
  //         }
  //         return user;
  //       })
  //       promises.push(promise);

  //       // Deposit notes account
  //       promise = getTokenAccountAndSubscribe(program.provider.connection, asset.depositNotePubkey, reserve.decimals, amount => {
  //         if (user.assets) {
  //           user.assets.tokens[reserve.abbrev].depositNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
  //           user.assets.tokens[reserve.abbrev].depositNoteExists = !!amount;

  //           const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
  //           console.log(marketUpdate, userUpdate, assetUpdate);
  //         }
  //       })
  //       promises.push(promise);

  //       // Obligation loan notes
  //       promise = getTokenAccountAndSubscribe(program.provider.connection, asset.loanNotePubkey, reserve.decimals, amount => {
  //         if (user.assets) {
  //           user.assets.tokens[reserve.abbrev].loanNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
  //           user.assets.tokens[reserve.abbrev].loanNoteExists = !!amount;

  //           const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
  //           console.log(marketUpdate, userUpdate, assetUpdate);
  //         }
  //       })
  //       promises.push(promise);

  //       // Obligation collateral notes
  //       promise = getTokenAccountAndSubscribe(program.provider.connection, asset.collateralNotePubkey, reserve.decimals, amount => {
  //         if (user.assets) {
  //           user.assets.tokens[reserve.abbrev].collateralNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
  //           user.assets.tokens[reserve.abbrev].collateralNoteExists = !!amount;

  //           const { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
  //           console.log(marketUpdate, userUpdate, assetUpdate);
  //         }
  //       });
  //       promises.push(promise);
  //     }
  //     Promise.all([promise]);
  //   }
  //   if (user.assets?.tokens && program?.provider?.connection && assetStore && wallet)
  //     subscribeToAssets()
  // }, [user, program?.provider?.connection, assetStore, wallet])

  // const honeyContext = useMemo(() => ({
  //   market,
  //   marketReserveInfo,
  //   honeyReserves
  // }), [market, marketReserveInfo, honeyReserves])

  const honeyContext = {
    market,
    marketReserveInfo,
    parsedReserves
  }
  return (
    <HoneyContext.Provider
      value={honeyContext}>
      {children}
    </HoneyContext.Provider>
  )
}

