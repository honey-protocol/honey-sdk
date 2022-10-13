import { PublicKey } from '@solana/web3.js';
import { ReserveStateStruct } from './honeyTypes';

export type TAsset = {
  name: String;
  value: number;
};
export type TBorrowPosition = {
  collateralTokenId: String;
  stakeTime: number;
  assetsBorrowed: TAsset[];
  name: String;
  image: String;
  liquidationThreshold: number;
  totalInterest: number;
  tokenId: PublicKey;
};

type TUserDepositedAsset = {
  sol: number;
  usdc: number;
};

type TUserBorrowStatus = {
  numOfPositions: number;
  positionHealths: number[];
};

export type TPool = {
  id: string;
  publicKey: PublicKey;
  imageUrl: string;
  title: string;
  totalSupplied: number;
  totalBorrowed: number;
  userDeposit: TUserDepositedAsset;
  userBorrowStatus?: TUserBorrowStatus;
  borrowRate: number;
  APY: number;
  interestRate: number;
  collateralEvaluation: number;
};

export interface NftPosition {
  obligation: string,
  debt: number;
  nft_mint: PublicKey;
  owner: PublicKey;
  ltv: number;
  is_healthy: string;
  highest_bid: number;
}


export interface TMarket {
  version: 0,
  _reserved1: number,
  quoteCurrency: number[],
  authorityBumpSeed: number[],
  authoritySeed: PublicKey,
  marketAuthority: PublicKey,
  owner: PublicKey,
  quoteTokenMint: PublicKey,
  nftSwitchboardPriceAggregator: PublicKey,
  nftCollectionCreator: PublicKey,
  flags: number,
  marketOracleState: number[],
  reserved: number[],
  reserves: number[]
}

export interface TReserve {
  version: number;
  index: number;
  exponent: number;
  market: PublicKey;
  switchboardPriceAggregator: PublicKey;
  tokenMint: PublicKey;
  depositNoteMint: PublicKey;
  loanNoteMint: PublicKey;
  vault: PublicKey;
  feeNoteVault: PublicKey;
  protocolFeeNoteVault: PublicKey;
  // dexMarketA: PublicKey;
  // dexMarketB: PublicKey;
  // dexOpenOrdersA: PublicKey;
  // dexOpenOrdersB: PublicKey;
  // dexSwapTokens: PublicKey;
  config: any;
  // nftDropletMint: PublicKey;
  // nftDropletVault: PublicKey;
  reserved0: number[];
  reserved1: number[];
  state: number[];
  reserveState: ReserveStateStruct;
}