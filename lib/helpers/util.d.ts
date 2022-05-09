import { BN } from '@project-serum/anchor';
import type { AccountInfo as TokenAccountInfo, MintInfo, u64 } from '@solana/spl-token';
export declare const checkDarkTheme: () => Promise<void>;
export declare const setDark: (darkTheme: boolean) => void;
export declare const currencyFormatter: (value: number, usd: boolean, digits?: number) => string;
export declare const totalAbbrev: (total: number, price?: number, native?: boolean, digits?: number) => string;
export declare const shortenPubkey: (pubkey: string, halfLength: number) => string;
export declare const timeout: (ms: number) => Promise<boolean>;
export declare class TokenAmount {
    /** Raw amount of token lamports */
    amount: BN;
    /** Number of decimals configured for token's mint */
    decimals: number;
    /** Token amount as string, accounts for decimals */
    uiAmount: string;
    /** Token amount as a float, accounts for decimals. Imprecise at large numbers */
    uiAmountFloat: number;
    constructor(amount: BN, decimals: number);
    static zero(decimals: number): TokenAmount;
    static tokenAccount(tokenAccount: TokenAccountInfo, decimals: number): TokenAmount;
    static mint(mint: MintInfo): TokenAmount;
    static tokens(tokenAmount: string, decimals: number): TokenAmount;
    private static tokenAmount;
    static tokenPrice(marketValue: number, price: number, decimals: number): TokenAmount;
    private static tokensToLamports;
    add(b: TokenAmount): TokenAmount;
    addb(b: BN): TokenAmount;
    addn(b: number): TokenAmount;
    sub(b: TokenAmount): TokenAmount;
    subb(b: BN): TokenAmount;
    subn(b: number): TokenAmount;
    mul(b: TokenAmount): TokenAmount;
    mulb(b: BN): TokenAmount;
    muln(b: number): TokenAmount;
    div(b: TokenAmount): TokenAmount;
    divb(b: BN): TokenAmount;
    divn(b: number): TokenAmount;
    lt(b: TokenAmount): any;
    gt(b: TokenAmount): any;
    eq(b: TokenAmount): any;
    isZero(): any;
    private do;
}
export declare type AmountUnits = {
    tokens?: {};
    depositNotes?: {};
    loanNotes?: {};
};
export declare class Amount {
    units: AmountUnits;
    value: BN;
    private constructor();
    static tokens(amount: number | u64): Amount;
    static depositNotes(amount: number | u64): Amount;
    static loanNotes(amount: number | u64): Amount;
}
