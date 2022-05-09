import * as anchor from '@project-serum/anchor';
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { HoneyClient } from './client';
import { HoneyMarket } from './market';
import { DerivedAccount } from './derived-account';
export interface ReserveConfig {
    utilizationRate1: number;
    utilizationRate2: number;
    borrowRate0: number;
    borrowRate1: number;
    borrowRate2: number;
    borrowRate3: number;
    minCollateralRatio: number;
    liquidationPremium: number;
    manageFeeCollectionThreshold: anchor.BN;
    manageFeeRate: number;
    loanOriginationFee: number;
    liquidationSlippage: number;
    liquidationDexTradeMax: anchor.BN;
    confidenceThreshold: number;
}
export interface ReserveAccounts {
    vault: DerivedAccount;
    feeNoteVault: DerivedAccount;
    protocolFeeNoteVault: DerivedAccount;
    dexSwapTokens: DerivedAccount;
    dexOpenOrdersA: DerivedAccount;
    dexOpenOrdersB: DerivedAccount;
    loanNoteMint: DerivedAccount;
    depositNoteMint: DerivedAccount;
}
export interface CreateReserveParams {
    /**
     * The Serum market for the reserve.
     */
    dexMarket: PublicKey;
    /**
     * The mint for the token to be stored in the reserve.
     */
    tokenMint: PublicKey;
    /**
     * The Pyth account containing the price information for the reserve token.
     */
    pythOraclePrice: PublicKey;
    /**
     * The Pyth account containing the metadata about the reserve token.
     */
    pythOracleProduct: PublicKey;
    /**
     * The initial configuration for the reserve
     */
    config: ReserveConfig;
    /**
     * token mint for the solvent droplets
     */
    nftDropletMint: PublicKey;
    /**
     * Dex market A
     */
    dexMarketA: PublicKey;
    /**
     * dex market B
     */
    dexMarketB: PublicKey;
    /**
     * The account to use for the reserve data.
     *
     * If not provided an account will be generated.
     */
    account?: Keypair;
}
export interface ReserveData {
    market: PublicKey;
    pythPrice: PublicKey;
    pythProduct: PublicKey;
    pythOraclePrice?: PublicKey;
    pythOracleProduct?: PublicKey;
    tokenMint: PublicKey;
    depositNoteMint: PublicKey;
    loanNoteMint: PublicKey;
    vault: PublicKey;
    feeNoteVault: PublicKey;
    protocolFeeNoteVault: PublicKey;
    dexSwapTokens: PublicKey;
    dexOpenOrdersA: PublicKey;
    dexOpenOrdersB: PublicKey;
    dexMarketA: PublicKey;
    dexMarketB: PublicKey;
}
export interface ReserveStateData {
    accruedUntil: anchor.BN;
    outstandingDebt: anchor.BN;
    uncollectedFees: anchor.BN;
    totalDeposits: anchor.BN;
    totalDepositNotes: anchor.BN;
    totalLoanNotes: anchor.BN;
}
export interface ReserveDexMarketAccounts {
    market: PublicKey;
    openOrders: PublicKey;
    requestQueue: PublicKey;
    eventQueue: PublicKey;
    bids: PublicKey;
    asks: PublicKey;
    coinVault: PublicKey;
    pcVault: PublicKey;
    vaultSigner: PublicKey;
}
export interface UpdateReserveConfigParams {
    config: ReserveConfig;
    reserve: PublicKey;
    market: PublicKey;
    owner: Keypair;
}
export declare class HoneyReserve {
    private client;
    private market;
    address: PublicKey;
    data: ReserveData;
    state?: ReserveStateData;
    private conn;
    constructor(client: HoneyClient, market: HoneyMarket, address: PublicKey, data: ReserveData, state?: ReserveStateData);
    refresh(): Promise<void>;
    sendRefreshTx(): Promise<string>;
    refreshOldReserves(): Promise<void>;
    makeRefreshIx(): TransactionInstruction;
    updateReserveConfig(params: UpdateReserveConfigParams): Promise<void>;
    static load(client: HoneyClient, address: PublicKey, maybeMarket?: HoneyMarket): Promise<HoneyReserve>;
    /**
     * Derive all the associated accounts for a reserve.
     * @param address The reserve address to derive the accounts for.
     * @param tokenMint The address of the mint for the token stored in the reserve.
     * @param market The address of the market the reserve belongs to.
     */
    static deriveAccounts(client: HoneyClient, address: PublicKey, tokenMint: PublicKey): Promise<ReserveAccounts>;
}
