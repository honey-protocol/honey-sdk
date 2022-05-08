import { BN } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import * as BL from '@solana/buffer-layout';
export declare class NumberField extends BL.Layout {
    constructor(span: number, property?: string);
    decode(b: Uint8Array, offset?: number): BN;
    encode(src: BN, b: Uint8Array, offset?: number): number;
}
export declare class SignedNumberField extends BL.Layout {
    constructor(span: number, property?: string);
    decode(b: Uint8Array, offset?: number): BN;
    encode(src: BN, b: Uint8Array, offset?: number): number;
}
export declare class PubkeyField extends BL.Layout {
    constructor(property?: string);
    decode(b: Uint8Array, offset?: number): PublicKey;
    encode(src: PublicKey, b: Uint8Array, offset?: number): number;
}
export declare function numberField(property?: string): NumberField;
export declare function u64Field(property?: string): NumberField;
export declare function i64Field(property?: string): SignedNumberField;
export declare function pubkeyField(property?: string): PubkeyField;
export declare const MarketReserveInfoList: BL.Sequence<unknown>;
export declare const ReserveStateLayout: BL.Structure<unknown>;
export declare const PositionInfo: BL.Structure<unknown>;
export declare const PositionInfoList: BL.Sequence<unknown>;
