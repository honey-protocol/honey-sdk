import { PublicKey } from '@solana/web3.js';
export declare class DerivedAccount {
    address: PublicKey;
    bumpSeed: number;
    constructor(address: PublicKey, bumpSeed: number);
}
