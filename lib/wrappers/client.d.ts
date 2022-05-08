import { PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { CreateMarketParams, HoneyMarket } from './market';
import { DerivedAccount } from './derived-account';
interface ToBytes {
    toBytes(): Uint8Array;
}
interface HasPublicKey {
    publicKey: PublicKey;
}
declare type DerivedAccountSeed = HasPublicKey | ToBytes | Uint8Array | string;
export declare class HoneyClient {
    program: anchor.Program;
    devnet?: boolean;
    constructor(program: anchor.Program, devnet?: boolean);
    /**
     * Create a new client for interacting with the Jet lending program.
     * @param provider The provider with wallet/network access that can be used to send transactions.
     * @returns The client
     */
    static connect(provider: anchor.Provider, jetId: string, devnet?: boolean): Promise<HoneyClient>;
    /**
     * Find a PDA
     * @param seeds
     * @returns
     */
    findDerivedAccount(seeds: DerivedAccountSeed[]): Promise<DerivedAccount>;
    createMarket(params: CreateMarketParams): Promise<HoneyMarket>;
}
export {};
