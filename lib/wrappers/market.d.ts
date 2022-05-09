import { PublicKey, Keypair } from '@solana/web3.js';
import { u64 } from '@solana/spl-token';
import * as anchor from '@project-serum/anchor';
import { CreateReserveParams, HoneyReserve } from './reserve';
import { HoneyClient } from './client';
export declare const DEX_PID: PublicKey;
export interface HoneyMarketReserveInfo {
    address: PublicKey;
    price: anchor.BN;
    depositNoteExchangeRate: anchor.BN;
    loanNoteExchangeRate: anchor.BN;
}
export interface HoneyMarketData {
    quoteTokenMint: PublicKey;
    quoteCurrency: string;
    marketAuthority: PublicKey;
    owner: PublicKey;
    reserves: HoneyMarketReserveInfo[];
    pythOraclePrice: PublicKey;
    pythOracleProduct: PublicKey;
    updateAuthority: PublicKey;
}
export declare class HoneyMarket implements HoneyMarketData {
    private client;
    address: PublicKey;
    quoteTokenMint: PublicKey;
    quoteCurrency: string;
    marketAuthority: PublicKey;
    owner: PublicKey;
    reserves: HoneyMarketReserveInfo[];
    pythOraclePrice: PublicKey;
    pythOracleProduct: PublicKey;
    updateAuthority: PublicKey;
    private constructor();
    static fetchData(client: HoneyClient, address: PublicKey): Promise<[any, HoneyMarketReserveInfo[]]>;
    /**
     * Load the market account data from the network.
     * @param client The program client
     * @param address The address of the market.
     * @returns An object for interacting with the Jet market.
     */
    static load(client: HoneyClient, address: PublicKey): Promise<HoneyMarket>;
    /**
     * Get the latest market account data from the network.
     */
    refresh(): Promise<void>;
    setFlags(flags: u64): Promise<void>;
    createReserve(params: CreateReserveParams): Promise<HoneyReserve>;
}
export interface CreateMarketParams {
    /**
     * The address that must sign to make future changes to the market,
     * such as modifying the available reserves (or their configuation)
     */
    owner: PublicKey;
    /**
     * The token mint for the currency being used to quote the value of
     * all other tokens stored in reserves.
     */
    quoteCurrencyMint: PublicKey;
    /**
     * The name of the currency used for quotes, this has to match the
     * name specified in any Pyth/oracle accounts.
     */
    quoteCurrencyName: string;
    /**
     *  creator public key of the NFT held in the associated metadata
     */
    nftCollectionCreator: PublicKey;
    /**
     * The account to use for the market data.
     *
     * If not provided an account will be generated.
     */
    account?: Keypair;
}
export declare enum MarketFlags {
    HaltBorrows = 1,
    HaltRepays = 2,
    HaltDeposits = 4,
    HaltAll = 7
}
