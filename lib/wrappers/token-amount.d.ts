import { PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
export declare class TokenAmount {
    mint: PublicKey;
    amount: anchor.BN;
    constructor(mint: PublicKey, amount: anchor.BN);
}
