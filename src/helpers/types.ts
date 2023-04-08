import { Connection, PublicKey } from '@solana/web3.js';
import type BN from 'bn.js';
import { ReserveConfig } from '../wrappers';

/**
 * The data structure for a market account
 * @typedef {Object} MarketData
 * @property {PublicKey} quoteTokenMint The mint for the token that is used as the quote currency (usually SOL)
 * @property {PublicKey} marketAuthority The account that has authority to make changes to the market
 * @property {PublicKey} owner The account that has authority to make changes to the market
 * @property {PublicKey} nftSwitchboardPriceAggregator The account that has authority to make changes to the market
 * @property {PublicKey} nftCollectionCreator The account that has authority to make changes to the market
 * @property {MarketAccount} market The market account
 * @property {CachedReserveInfo[]} reserves The reserve accounts
 * @property {ReserveDataAndState[]} reserveList The reserve accounts
 * @property {Connection} conn The connection to the cluster
 */
export interface HoneyMarketData {
  quoteTokenMint: PublicKey;
  marketAuthority: PublicKey;
  owner: PublicKey;
  nftSwitchboardPriceAggregator: PublicKey;
  nftCollectionCreator: PublicKey;
  conn: Connection;
  market: MarketAccount;
  cachedReserveInfo: CachedReserveInfo[];
  reserveList: TReserve[];
}

/**
 * The data structure for a market account
 * @typedef {Object} MarketAccount
 * @property {number} version The version of the market account
 * @property {number} quoteExponent The exponent of the quote currency
 * @property {string} quoteCurrency The name of the quote currency
 * @property {number[]} authorityBumpSeed The bump seed for the market authority
 * @property {PublicKey} authoritySeed The seed for the market authority
 * @property {PublicKey} marketAuthority The account that has authority to make changes to the market
 * @property {PublicKey} owner The account that has authority to make changes to the market
 * @property {PublicKey} quoteTokenMint The mint for the token that is used as the quote currency (usually SOL)
 * @property {PublicKey} nftSwitchboardPriceAggregator floor price aggregator (TWAP) for the collection which this market is associated
 * @property {PublicKey} nftCollectionCreator The verified creator of the NFT collection which this market is associated
 * @property {number} flags The flags for the market
 * @property {number[]} marketOracleState The state of the market oracle
 * @property {number[]} reserved Reserved space for future use
 * @property {CachedReserveInfo[]} reserves The reserve accounts
 */
export interface MarketAccount {
  version: 0;
  quoteExponent: number;
  quoteCurrency: string;
  authorityBumpSeed: number[];
  authoritySeed: PublicKey;
  marketAuthority: PublicKey;
  owner: PublicKey;
  quoteTokenMint: PublicKey;
  nftSwitchboardPriceAggregator: PublicKey;
  nftCollectionCreator: PublicKey;
  flags: number;
  marketOracleState: number[];
  reserved: number[];
  reserves: CachedReserveInfo[];
}

/**
 * The data structure for a reserve account
 * @typedef {Object} CachedReserveInfo
 * @property {PublicKey} reserve The reserve account
 * @property {BN} price The price of the asset being stored in the reserve account.
 * USD per smallest unit (1u64) of a token
 * @property {BN} depositNoteExchangeRate The value of the deposit note (unit: reserve tokens per note token)
 * @property {BN} loanNoteExchangeRate The value of the loan note (unit: reserve tokens per note token)
 * @property {BN} minCollateralRatio The minimum allowable collateralization ratio for a loan on this reserve
 * @property {BN} lastUpdated The last slot that this information was updated in
 * @property {number} invalidated Whether the cache has been invalidated
 */
export interface CachedReserveInfo {
  reserve: PublicKey;
  price: BN;
  depositNoteExchangeRate: BN;
  loanNoteExchangeRate: BN;
  minCollateralRatio: BN;
  lastUpdated: BN;
  invalidated: number;
}

export interface ReserveInfoState {
  price: number;
  depositNoteExchangeRate: number;
  loanNoteExchangeRate: number;
  minCollateralRatio: number;
}

/**
 * The data structure for a reserve account
 * @typedef {Object} TReserve
 * @property {number} version The version of the reserve account
 * @property {number} index The index of the reserve account
 * @property {number} exponent The exponent of the reserve token
 * @property {PublicKey} market The market account
 * @property {PublicKey} switchboardPriceAggregator The price aggregator for the reserve token
 * @property {PublicKey} tokenMint The mint for the reserve token
 * @property {PublicKey} depositNoteMint The mint for the deposit note
 * @property {PublicKey} loanNoteMint The mint for the loan note
 * @property {PublicKey} vault The vault account
 * @property {PublicKey} feeNoteVault The fee note vault account
 * @property {PublicKey} protocolFeeNoteVault The protocol fee note vault account
 * @property {ReserveConfigStruct} config The config for the reserve
 * @property {number[]} reserved0 Reserved space for future use
 * @property {number[]} reserved1 Reserved space for future use
 * @property {number[]} state The state of the reserve
 * @property {ReserveStateStruct} reserveState The decoded state of the reserve
 */
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
  config: ReserveConfigStruct;
  reserved0: number[];
  reserved1: number[];
  state: ReserveStateStruct;
  reserveState: ReserveStateStruct;
}

export interface TotalReserveState {
  config: ReserveConfig;
  state: ReserveState;
  utilization: number;
  interestRate: number;
}

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

/**
 * The data structure for a reserve config in front-end consumable format
 * @notice due to the size limitations of numbers in JS, the values are stored as strings
 */
export interface ReserveState {
  accruedUntil: string;
  outstandingDebt: number;
  uncollectedFees: number;
  protocolUncollectedFees: number;
  totalDeposits: number;
  totalDepositNotes: number;
  totalLoanNotes: number;
}

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
  reserved0: number;
  /** Unused space */
  reserved1: number[];
  reserved2: number[];
}

// [
//           {
//             name: 'version';
//             type: 'u32';
//           },
//           {
//             name: 'reserved0';
//             type: 'u32';
//           },
//           {
//             name: 'market';
//             docs: ['The market this obligation is a part of'];
//             type: 'publicKey';
//           },
//           {
//             name: 'owner';
//             docs: ['The address that owns the debt/assets as a part of this obligation'];
//             type: 'publicKey';
//           },
//           {
//             name: 'reserved1';
//             docs: ['Unused space before start of collateral info'];
//             type: {
//               array: ['u8', 184];
//             };
//           },
//           {
//             name: 'collateralNftMint';
//             docs: ['stores collateral nft key'];
//             type: {
//               array: ['publicKey', 11];
//             };
//           },
//           {
//             name: 'cached';
//             docs: ['The storage for cached calculations'];
//             type: {
//               array: ['u8', 256];
//             };
//           },
//           {
//             name: 'loans';
//             docs: ['The storage for the information on positions owed by this obligation'];
//             type: {
//               array: ['u8', 2048];
//             };
//           },
//         ]

// Obligation
export interface ObligationAccount {
  version: number;
  /** Unused space */
  reserved0: number;
  /** The market this obligation is a part of */
  market: PublicKey;
  /** The address that owns the debt/assets as a part of this obligation */
  owner: PublicKey;
  /** Unused space */
  reserved1: number[];
  /** nfts registered with the obligation */
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

export interface NftPosition {
  obligation: string;
  debt: number;
  nft_mint: PublicKey;
  owner: PublicKey;
  ltv: number;
  is_healthy: string;
  highest_bid: number;
  verifiedCreator?: PublicKey;
}

export interface CollateralNFTPosition {
  mint: PublicKey;
  updateAuthority: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  image: string;
  verifiedCreator?: string | null;
}

export interface LoanPosition {
  amount: BN;
  tokenAccount: PublicKey;
}

export interface FungibleCollateralPosition {
  amount: number;
  tokenAccount: PublicKey;
}

export interface Bid {
  bid: string;
  bidder: string;
  bidLimit: number;
}

export enum TxnResponse {
  Success = 'SUCCESS',
  Failed = 'FAILED',
  Cancelled = 'CANCELLED',
}
