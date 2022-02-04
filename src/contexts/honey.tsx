import React, { useContext, useEffect, useMemo, useState } from 'react'
import { getAssetPubkeys, getReserveStructures } from '../helpers/jet/jet';
import { AssetStore, Market, Reserve, User, WalletProvider } from '../helpers/jet/JetTypes';
import { findDepositNoteDestAddress, getAccountInfoAndSubscribe, getMintInfoAndSubscribe, getTokenAccountAndSubscribe, parseMarketAccount, parseObligationAccount, parseReserveAccount, parseTokenAccount, SOL_DECIMALS } from '../helpers/jet/programUtil';
import { deriveValues } from '../helpers/jet/subscribe';
import { TokenAmount } from '../helpers/jet/util';
import { useAnchor } from './anchor';
import { getEmptyMarketState } from './getEmptyMarket';
import * as anchor from "@project-serum/anchor";
import { MarketReserveInfoList } from '../helpers/jet/layout';
import { PublicKey } from '@solana/web3.js';
import { parsePriceData } from '@pythnetwork/client';
import { getEmptyUserState } from './getEmptyUser';
import { NATIVE_MINT } from '@solana/spl-token';
import { getWalletAndAnchor } from '../helpers/connectWallet';
import { JetClient, JetReserve } from '../jet';

export const providers: WalletProvider[] = [
  {
    name: "Phantom",
    logo: "img/wallets/phantom.png",
    url: "https://phantom.app/"
  },
  {
    name: "Slope",
    logo: "img/wallets/slope.png",
    url: "https://slope.finance/"
  },
  {
    name: "Solflare",
    logo: "img/wallets/solflare.png",
    url: "https://solflare.com/"
  },
  {
    name: "Solong",
    logo: "img/wallets/solong.png",
    url: "https://solongwallet.com/"
  },
  {
    name: "Sollet",
    logo: "img/wallets/sollet.png",
    url: "https://www.sollet.io/"
  },
  {
    name: "Math Wallet",
    logo: "img/wallets/math_wallet.png",
    url: "https://mathwallet.org/en-us/"
  }
];


interface HoneyContext {
  market: Market,
  user: User,
  nfts: Reserve[],
  userConfigured: boolean
}
const HoneyContext = React.createContext<HoneyContext>({
  market: getEmptyMarketState(),
  user: getEmptyUserState(),
  nfts: [],
  userConfigured: false
});

export const useHoney = () => {
  const context = useContext(HoneyContext);
  return context;
};

export default function HoneyProvider({ children = null as any }) {
  const { program, idlMetadata, coder, isConfigured } = useAnchor();

  const [market, setMarket] = useState<Market>(getEmptyMarketState());
  const [user, setUser] = useState<User>(getEmptyUserState());

  const [nftPubKey, setNftPubKey] = useState<PublicKey[]>([]);
  const [nftReserves, setNftReserves] = useState<Reserve[]>([]);
  const [hasWallet, setHasWallet] = useState<boolean>(false);
  const [hasData, setHasData] = useState<boolean>(false);
  const [hasNFTs, setNFTReady] = useState<boolean>(false);

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

  // const findLoanNoteAddress = async (
  //   program: anchor.Program,
  //   reserve: PublicKey, 
  //   obligation: PublicKey, 
  //   wallet: PublicKey): Promise<[loanNotePubkey: PublicKey, loanNoteBump: number]>  => 
  //   {
  //   return await PublicKey.findProgramAddress(
  //     [
  //       Buffer.from("loan"), 
  //       reserve.toBuffer(), 
  //       obligation.toBuffer(), 
  //       wallet.toBuffer()
  //     ],
  //     program.programId
  //   );
  // };

  // const findObligation = async (market: Market, user: User) => {
  //   return await PublicKey.findProgramAddress(
  //     [
  //       Buffer.from("obligation"), 
  //       market.accountPubkey.toBuffer(),
  //       user.wallet?.publicKey.toBuffer(),
  //     ],
  //     program.programId
  //   );
  // }

  // useEffect(() => {
  //   const fetchData = async () => {
  //     if (!idlMetadata || idlMetadata.reserves.length <= 0) return;
  //     const solReserve = idlMetadata.reserves[0];
  //     if (!user.wallet?.publicKey || !user.assets?.tokens) return; 

  //     if (!user.assets?.tokens["SOL"].depositNotePubkey) return; // don't have balance account
  //     const data = await program.provider.connection.getAccountInfo(user.assets?.tokens["SOL"].depositNotePubkey);
  //     if (!data) return;
  //     if (data && data.data.length != 165) {
  //       console.log('account data length', data.data.length);
  //     }
  //     const decoded = parseTokenAccount(data, user.assets?.tokens["SOL"].depositNotePubkey);
  //     const amount = TokenAmount.tokenAccount(decoded.data, 9);
  //     console.log(decoded);
  //     console.log(amount);
  //   }
  //   fetchData();
  // }, [user])

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
          console.assert(MarketReserveInfoList.span == 12288);
          const decoded = parseMarketAccount(account.data, coder);
          const nftList = [];
          for (const reserveStruct of decoded.reserves) {
            let found = false;
            for (const abbrev in market.reserves) {
              if (market.reserves[abbrev].accountPubkey.equals(reserveStruct.reserve)) {
                const reserve = market.reserves[abbrev];

                reserve.liquidationPremium = reserveStruct.liquidationBonus;
                reserve.depositNoteExchangeRate = reserveStruct.depositNoteExchangeRate;
                reserve.loanNoteExchangeRate = reserveStruct.loanNoteExchangeRate;

                let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                console.log(marketUpdate, userUpdate, assetUpdate);
                found = true;
              }
            }
            if (!found && !reserveStruct.reserve.equals(new PublicKey('11111111111111111111111111111111'))) {
              if (!nftPubKey.includes(reserveStruct.reserve)) {
                nftList.push(reserveStruct.reserve);
              }
              console.log('NFT Reserves');
              console.log(reserveStruct.reserve.toString());
              console.log('Price: ', reserveStruct.price.toString());
            }
          }
          setNftPubKey(nftList);
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

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Deposit Note Mint
        promise = getMintInfoAndSubscribe(program.provider.connection, reserveMeta.accounts.depositNoteMint, amount => {
          if (amount != null) {
            let reserve = market.reserves[reserveMeta.abbrev];
            reserve.depositNoteMint = amount;

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Loan Note Mint
        promise = getMintInfoAndSubscribe(program.provider.connection, reserveMeta.accounts.loanNoteMint, amount => {
          if (amount != null) {
            let reserve = market.reserves[reserveMeta.abbrev];
            reserve.loanNoteMint = amount;

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Reserve Vault
        promise = getTokenAccountAndSubscribe(program.provider.connection, reserveMeta.accounts.vault, reserveMeta.decimals, amount => {
          if (amount != null) {
            let reserve = market.reserves[reserveMeta.abbrev];
            reserve.availableLiquidity = amount;

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Reserve Token Mint
        promise = getMintInfoAndSubscribe(program.provider.connection, reserveMeta.accounts.tokenMint, amount => {
          if (amount != null) {
            let reserve = market.reserves[reserveMeta.abbrev];
            reserve.tokenMint = amount;

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Pyth Price
        promise = getAccountInfoAndSubscribe(program.provider.connection, reserveMeta.accounts.pythPrice, account => {
          if (account != null) {
            let reserve = market.reserves[reserveMeta.abbrev];
            reserve.price = parsePriceData(account.data).price || 90; // default to 90 for now

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);
      }
      await Promise.all(promises);
    }
    if (idlMetadata?.market?.market && program?.provider?.connection && market.reserves && user)
      subscribeToMarket();

  }, [user])

  useEffect(() => {
    const fetchNFTReserves = async () => {
      const jetClient: JetClient = await JetClient.connect(program.provider, true);
      nftPubKey.filter((v, i, a) => a.findIndex(t => (t.equals(v))) === i)
      const promises = nftPubKey.map(async (pubkey) => {
        const newReserve = await JetReserve.load(jetClient, pubkey);
        let reserveMeta: Reserve = getEmptyReserve(newReserve);
        return reserveMeta;
      });
      const results = await Promise.all(promises);
      setNftReserves(results)
      setNFTReady(true);
    }
    if (nftPubKey.length > 0 && program?.provider)
      fetchNFTReserves();
  }, [nftPubKey, program?.provider])

  useEffect(() => {
    const subscribeToNfts = async () => {
      let promise: Promise<number>;
      const promises: Promise<number>[] = [];

      for (const reserveMeta of nftReserves) {
        // Reserve
        promise = getAccountInfoAndSubscribe(program.provider.connection, reserveMeta.accountPubkey, account => {
          if (account != null) {
            const decoded = parseReserveAccount(account.data, coder);

            // Hardcoding min c-ratio to 130% for now
            // market.minColRatio = decoded.config.minCollateralRatio / 10000;

            let reserve: Reserve = reserveMeta

            reserve.maximumLTV = decoded.config.minCollateralRatio;
            reserve.liquidationPremium = decoded.config.liquidationPremium;
            reserve.outstandingDebt = new TokenAmount(decoded.state.outstandingDebt, 0).divb(new anchor.BN(Math.pow(10, 15)));
            reserve.accruedUntil = decoded.state.accruedUntil;
            reserve.config = decoded.config;

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Deposit Note Mint
        promise = getMintInfoAndSubscribe(program.provider.connection, reserveMeta.depositNoteMintPubkey, amount => {
          if (amount != null) {
            let reserve: Reserve = reserveMeta;
            reserve.depositNoteMint = amount;

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Loan Note Mint
        promise = getMintInfoAndSubscribe(program.provider.connection, reserveMeta.loanNoteMintPubkey, amount => {
          if (amount != null) {
            let reserve: Reserve = reserveMeta;
            reserve.loanNoteMint = amount;

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Reserve Vault
        promise = getTokenAccountAndSubscribe(program.provider.connection, reserveMeta.vaultPubkey, 0, amount => {
          if (amount != null) {
            let reserve: Reserve = reserveMeta;
            reserve.availableLiquidity = amount;

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Reserve Token Mint
        promise = getMintInfoAndSubscribe(program.provider.connection, reserveMeta.tokenMintPubkey, amount => {
          if (amount != null) {
            let reserve: Reserve = reserveMeta;
            reserve.tokenMint = amount;

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);

        // Pyth Price
        let pythOracle = reserveMeta.pythPricePubkey;
        promise = getAccountInfoAndSubscribe(program.provider.connection, pythOracle, account => {
          if (account != null) {
            let reserve: Reserve = reserveMeta;
            reserve.price = parsePriceData(account.data).price || 0;

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);
      }
      await Promise.all(promises);
    }

    if (program?.provider?.connection && hasNFTs)
      subscribeToNfts();
  }, [nftPubKey, hasNFTs, program?.provider?.connection])

  useEffect(() => {
    const fetchWallet = async () => {
      const provider = providers[0]; // hardcoded for Phatom now.
      const wallet = await getWalletAndAnchor(provider);
      setUser(current => ({
        ...current,
        wallet: wallet
      }));
      setHasWallet(true);
    }
    fetchWallet();
  }, []);


  useEffect(() => {
    const fetchAssets = async () => {
      if (!user || !user.assets)
        return
      const assetStore: AssetStore | null = await getAssetPubkeys(market, user, program);
      setUser(current => ({
        ...current,
        assets: assetStore
      }));
      setHasData(true);
    }
    if (hasWallet && program.provider.connection)
      fetchAssets();
  }, [hasWallet, program?.provider?.connection])

  useEffect(() => {
    const subscribeToAssets = async () => {
      if (!user.assets)
        return

      let promise: Promise<number>;
      let promises: Promise<number>[] = [];

      // Obligation
      promise = getAccountInfoAndSubscribe(program.provider.connection, user.assets?.obligationPubkey!, account => {
        if (account != null && user.assets) {
          user.assets.obligation = {
            ...account,
            data: parseObligationAccount(account.data, coder),
          };
        };
      })
      promises.push(promise);

      // Wallet native SOL balance
      promise = getAccountInfoAndSubscribe(program.provider.connection, user.wallet?.publicKey, account => {
        if (user.assets) {
          const reserve = market.reserves["SOL"];

          // Need to be careful constructing a BN from a number.
          // If the user has more than 2^53 lamports it will throw for not having enough precision.
          user.assets.tokens.SOL.walletTokenBalance = new TokenAmount(new anchor.BN(account?.lamports.toString() ?? 0), SOL_DECIMALS)

          user.assets.sol = user.assets.tokens.SOL.walletTokenBalance
          user.walletBalances.SOL = user.assets.tokens.SOL.walletTokenBalance.uiAmountFloat;

          let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
          console.log(marketUpdate, userUpdate, assetUpdate);
        }
        return user;
      });
      promises.push(promise);

      for (const abbrev in user.assets.tokens) {
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

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
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

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
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

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        })
        promises.push(promise);

        // Obligation loan notes
        promise = getTokenAccountAndSubscribe(program.provider.connection, asset.loanNotePubkey, reserve.decimals, amount => {
          if (user.assets) {
            user.assets.tokens[reserve.abbrev].loanNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
            user.assets.tokens[reserve.abbrev].loanNoteExists = !!amount;

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        })
        promises.push(promise);

        // Obligation collateral notes
        promise = getTokenAccountAndSubscribe(program.provider.connection, asset.collateralNotePubkey, reserve.decimals, amount => {
          if (user.assets) {
            user.assets.tokens[reserve.abbrev].collateralNoteBalance = amount ?? TokenAmount.zero(reserve.decimals);
            user.assets.tokens[reserve.abbrev].collateralNoteExists = !!amount;

            let { marketUpdate, userUpdate, assetUpdate } = deriveValues(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
            console.log(marketUpdate, userUpdate, assetUpdate);
          }
        });
        promises.push(promise);
      }
      Promise.all([promise]);
    }
    if (user.assets?.tokens && program?.provider?.connection)
      subscribeToAssets()
  }, [user, program?.provider?.connection])

  const getEmptyReserve = (reserveMeta: JetReserve) => {
    let reserve: Reserve = {
      name: "NFT PLACEHOLDER",
      abbrev: "NFT ABBREV PLACEHOLDER",
      marketSize: TokenAmount.zero(0),
      outstandingDebt: TokenAmount.zero(0),
      utilizationRate: 0,
      depositRate: 0,
      borrowRate: 0,
      maximumLTV: 0,
      liquidationPremium: 0,
      price: 0,
      decimals: 0,
      depositNoteExchangeRate: new anchor.BN(0),
      loanNoteExchangeRate: new anchor.BN(0),
      accruedUntil: new anchor.BN(0),
      config: {
        utilizationRate1: 0,
        utilizationRate2: 0,
        borrowRate0: 0,
        borrowRate1: 0,
        borrowRate2: 0,
        borrowRate3: 0,
        minCollateralRatio: 0,
        liquidationPremium: 0,
        manageFeeCollectionThreshold: new anchor.BN(0),
        manageFeeRate: 0,
        loanOriginationFee: 0,
        liquidationSlippage: 0,
        _reserved0: 0,
        liquidationDexTradeMax: 0,
        _reserved1: [],
      },

      accountPubkey: reserveMeta.address,
      vaultPubkey: reserveMeta.data.vault,
      availableLiquidity: TokenAmount.zero(0),
      feeNoteVaultPubkey: reserveMeta.data.feeNoteVault,
      tokenMintPubkey: reserveMeta.data.tokenMint,
      tokenMint: TokenAmount.zero(0),
      faucetPubkey: null,
      depositNoteMintPubkey: reserveMeta.data.depositNoteMint,
      depositNoteMint: TokenAmount.zero(0),
      loanNoteMintPubkey: reserveMeta.data.loanNoteMint,
      loanNoteMint: TokenAmount.zero(0),
      pythPricePubkey: reserveMeta.data.pythPrice || reserveMeta.data.pythOraclePrice,
      pythProductPubkey: reserveMeta.data.pythProduct || reserveMeta.data.pythOracleProduct,
    };
    return reserve;
  }

  const honeyContext = useMemo(() => ({
    market,
    user,
    nfts: nftReserves,
    userConfigured: hasData
  }), [market, user, nftReserves, hasData])

  return (
    <HoneyContext.Provider
      value={honeyContext}>
      {children}
    </HoneyContext.Provider>
  )
}

