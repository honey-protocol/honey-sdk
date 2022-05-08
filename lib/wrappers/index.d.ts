import { PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { u64 } from '@solana/spl-token';
export { HoneyClient } from './client';
export { HoneyMarket, MarketFlags } from './market';
export { HoneyReserve } from './reserve';
export type { ReserveConfig } from './reserve';
export { HoneyUser } from './user';
export * from './derived-account';
export * from './token-amount';
export declare const PLACEHOLDER_ACCOUNT: PublicKey;
export declare type AmountUnits = {
    tokens?: {};
    depositNotes?: {};
    loanNotes?: {};
};
export declare class Amount {
    units: AmountUnits;
    value: anchor.BN;
    constructor(units: AmountUnits, value: anchor.BN);
    static tokens(amount: number | u64): Amount;
    static depositNotes(amount: number | u64): Amount;
    static loanNotes(amount: number | u64): Amount;
}
