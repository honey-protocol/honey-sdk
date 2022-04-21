import * as anchor from '@project-serum/anchor';
import { BN, Program } from '@project-serum/anchor';
import { ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Token, TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token';
import {
  findDepositNoteAddress,
  findDepositNoteDestAddress,
  findLoanNoteAddress,
  findObligationAddress,
  findCollateralAddress,
  SOL_DECIMALS,
} from './programUtil';
import { TokenAmount } from './util';
import { Asset, AssetStore, IdlMetadata, Market, Reserve, SolongWallet, User, Wallet } from './honeyTypes';
import { ConnectedWallet } from './walletType';
import { HoneyReserve } from '../wrappers';

export const getReserveStructures = async (honeyReserves: HoneyReserve[]): Promise<Record<string, Reserve>> => {
  // Setup reserve structures
  const reserves: Record<string, Reserve> = {};
  for (const reserveMeta of honeyReserves) {
    if (!reserveMeta || !reserveMeta.data || !reserveMeta.state) continue;
    const reserve: Reserve = {
      name: reserveMeta.address.toString(),
      abbrev: reserveMeta.address.toString(),
      marketSize: TokenAmount.zero(0), //reserveMeta.state.totalDeposits ??
      outstandingDebt: TokenAmount.zero(0), //reserveMeta.state.outstandingDebt ??
      utilizationRate: 0,
      depositRate: 0,
      borrowRate: 0,
      maximumLTV: 0,
      liquidationPremium: 0,
      price: 0,
      decimals: 0,
      depositNoteExchangeRate: new BN(0),
      loanNoteExchangeRate: new BN(0),
      accruedUntil: new BN(0),
      config: {
        utilizationRate1: 0,
        utilizationRate2: 0,
        borrowRate0: 0,
        borrowRate1: 0,
        borrowRate2: 0,
        borrowRate3: 0,
        minCollateralRatio: 0,
        liquidationPremium: 0,
        manageFeeCollectionThreshold: new BN(0),
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
      pythPricePubkey: reserveMeta.data.pythPrice,
      pythProductPubkey: reserveMeta.data.pythProduct,
    };
    reserves[reserveMeta.address.toString()] = reserve;
  }
  return reserves;
};

// Get user token accounts
export const getAssetPubkeys = async (
  market: Market,
  user: User,
  program: Program,
  wallet: ConnectedWallet | null,
): Promise<AssetStore | null> => {
  if (program == null || wallet === null) {
    return null;
  }

  let [obligationPubkey, obligationBump] = await findObligationAddress(program, market.accountPubkey, wallet.publicKey);

  let assetStore: AssetStore = {
    sol: new TokenAmount(new BN(0), SOL_DECIMALS),
    obligationPubkey,
    obligationBump,
    tokens: {},
  } as AssetStore;
  for (const assetAbbrev in market.reserves) {
    let reserve = market.reserves[assetAbbrev];
    let tokenMintPubkey = reserve.tokenMintPubkey;

    let [depositNoteDestPubkey, depositNoteDestBump] = await findDepositNoteDestAddress(
      program,
      reserve.accountPubkey,
      wallet.publicKey,
    );
    let [depositNotePubkey, depositNoteBump] = await findDepositNoteAddress(
      program,
      reserve.accountPubkey,
      wallet.publicKey,
    );
    let [loanNotePubkey, loanNoteBump] = await findLoanNoteAddress(
      program,
      reserve.accountPubkey,
      obligationPubkey,
      wallet.publicKey,
    );
    let [collateralPubkey, collateralBump] = await findCollateralAddress(
      program,
      reserve.accountPubkey,
      obligationPubkey,
      wallet.publicKey,
    );

    let asset: Asset = {
      tokenMintPubkey,
      walletTokenPubkey: await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        tokenMintPubkey,
        wallet.publicKey,
      ),
      walletTokenExists: false,
      walletTokenBalance: TokenAmount.zero(reserve.decimals), // be careful of what were setting for this on the idl / server
      depositNotePubkey,
      depositNoteBump,
      depositNoteExists: false,
      depositNoteBalance: TokenAmount.zero(reserve.decimals),
      depositBalance: TokenAmount.zero(reserve.decimals),
      depositNoteDestPubkey,
      depositNoteDestBump,
      depositNoteDestExists: false,
      depositNoteDestBalance: TokenAmount.zero(reserve.decimals),
      loanNotePubkey,
      loanNoteBump,
      loanNoteExists: false,
      loanNoteBalance: TokenAmount.zero(reserve.decimals),
      loanBalance: TokenAmount.zero(reserve.decimals),
      collateralNotePubkey: collateralPubkey,
      collateralNoteBump: collateralBump,
      collateralNoteExists: false,
      collateralNoteBalance: TokenAmount.zero(reserve.decimals),
      collateralBalance: TokenAmount.zero(reserve.decimals),
      maxDepositAmount: 0,
      maxWithdrawAmount: 0,
      maxBorrowAmount: 0,
      maxRepayAmount: 0,
    };

    // Set user assets
    assetStore.tokens[assetAbbrev] = asset;
  }

  return assetStore;
};
