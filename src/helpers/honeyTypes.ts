import type { PublicKey } from '@solana/web3.js';
import type BN from 'bn.js';

// Web3
export interface HasPublicKey {
  publicKey: PublicKey;
}
export interface ToBytes {
  toBytes(): Uint8Array;
}

export type ReserveStateStruct = CacheStruct & {
  accruedUntil: BN;
  outstandingDebt: BN;
  uncollectedFees: BN;
  protocolUncollectedFees: BN;
  totalDeposits: BN;
  totalDepositNotes: BN;
  totalLoanNotes: BN;
  _reserved: number[];
};

export interface CacheStruct {
  /** The last slot that this information was updated in */
  lastUpdated: BN;
  /** Whether the value has been manually invalidated */
  invalidated: number;
  /** Unused space */
  _reserved: number[];
}

// Idl errors
export interface CustomProgramError {
  code: number;
  name: string;
  msg: string;
}

// Market
export interface MarketAccount {
  version: number;
  /** The exponent used for quote prices */
  quoteExponent: number;
  /** The currency used for quote prices */
  quoteCurrency: BN;
  /** The bump seed value for generating the authority address. */
  authorityBumpSeed: number;
  /** The address used as the seed for generating the market authority
  address. Typically this is the market account's own address. */
  authoritySeed: PublicKey;
  /** The account derived by the program, which has authority over all
  assets in the market. */
  marketAuthority: PublicKey;
  /** The account that has authority to make changes to the market */
  owner: PublicKey;
  /** The mint for the token in terms of which the reserve assets are quoted */
  quoteTokenMint: PublicKey;
  nftSwitchboardPriceAggregator: PublicKey;
  nftCollectionCreator: PublicKey;
  flags: number;
  marketOracleState: number[];
  /** Reserved space */
  _reserved: number[];
  /** Tracks the current prices of the tokens in reserve accounts */
  reserves: number[];
}
export interface HoneyMarketReserveInfo {
  reserve: PublicKey;
  price: BN;
  depositNoteExchangeRate: BN;
  loanNoteExchangeRate: BN;
  minCollateralRatio: BN;
  liquidationBonus: number;
  lastUpdated: BN;
  invalidated: number;
}
export type CacheReserveInfoStruct = CacheStruct & {
  /** The price of the asset being stored in the reserve account.
  USD per smallest unit (1u64) of a token
  */
  price: BN;
  /** The value of the deposit note (unit: reserve tokens per note token) */
  depositNoteExchangeRate: BN;
  /** The value of the loan note (unit: reserve tokens per note token) */
  loanNoteExchangeRate: BN;
  /** The minimum allowable collateralization ratio for a loan on this reserve */
  minCollateralRatio: number;
  /** The bonus awarded to liquidators when repaying a loan in exchange for a
  collateral asset.
  */
  liquidationBonus: number;
  /** Unused space */
  _reserved: number[];
};

// Reserve
export interface ReserveAccount {
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
  state: ReserveStateStruct;
}
export interface ReserveConfigStruct {
  /** The utilization rate at which we switch from the first to second regime. */
  utilizationRate1: number;
  /** The utilization rate at which we switch from the second to third regime. */
  utilizationRate2: number;
  /** The lowest borrow rate in the first regime. Essentially the minimum
      borrow rate possible for the reserve. */
  borrowRate0: number;
  /** The borrow rate at the transition point from the first to second regime. */
  borrowRate1: number;
  /** The borrow rate at the transition point from the second to thirs regime. */
  borrowRate2: number;
  /** The highest borrow rate in the third regime. Essentially the maximum
      borrow rate possible for the reserve. */
  borrowRate3: number;
  /** The minimum allowable collateralization ratio for an obligation */
  minCollateralRatio: number;
  /** The amount given as a bonus to a liquidator */
  liquidationPremium: number;
  /** The threshold at which to collect the fees accumulated from interest into
      real deposit notes. */
  manageFeeCollectionThreshold: BN;
  /** The fee rate applied to the interest payments collected */
  manageFeeRate: number;
  /** The fee rate applied as interest owed on new loans */
  loanOriginationFee: number;
  /** Unused space */
  _reserved0: number;
  // confidenceThreshhold: number;
  // /** Maximum number of tokens to sell in a single DEX trade during liquidation */
  // liquidationDexTradeMax: number;
  /** Unused space */
  _reserved1: number[];
  _reserved2: number[];
}

// Obligation
export interface ObligationAccount {
  version: number;
  /** Unused space */
  _reserved0: number;
  /** The market this obligation is a part of */
  market: PublicKey;
  /** The address that owns the debt/assets as a part of this obligation */
  owner: PublicKey;
  /** Unused space */
  _reserved1: number[];
  collateralNftMint: PublicKey[];
  /** Storage for cached calculations */
  cached: number[];

  /** The storage for the information on positions owed by this obligation */
  loans: ObligationPositionStruct[];
}
export interface ObligationPositionStruct {
  /** The token account holding the bank notes */
  account: PublicKey;
  /** Non-authoritative number of bank notes placed in the account */
  amount: BN;
  side: number;
  /** The index of the reserve that this position's assets are from */
  reserveIndex: number;
  _reserved: number[];
}

export enum TxnResponse {
  Success = 'SUCCESS',
  Failed = 'FAILED',
  Cancelled = 'CANCELLED',
}

export interface SlopeTxn {
  msg: string;
  data: {
    publicKey?: string;
    signature?: string;
    signatures?: string[];
  };
}
