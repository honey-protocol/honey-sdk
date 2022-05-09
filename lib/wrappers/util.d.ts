import * as BL from '@solana/buffer-layout';
import { BN } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
export declare class NumberField extends BL.Layout {
    constructor(property?: string);
    decode(b: Uint8Array, offset?: number): BN;
    encode(src: BN, b: Uint8Array, offset?: number): number;
}
export declare class PubkeyField extends BL.Layout {
    constructor(property?: string);
    decode(b: Uint8Array, offset?: number): PublicKey;
    encode(src: PublicKey, b: Uint8Array, offset?: number): number;
}
export declare class U64Field extends BL.Layout {
    constructor(property?: string);
    decode(b: Uint8Array, offset?: number): BN;
    encode(src: BN, b: Uint8Array, offset?: number): number;
}
export declare function numberField(property?: string): NumberField;
export declare function pubkeyField(property?: string): PubkeyField;
export declare function u64Field(property?: string): U64Field;
