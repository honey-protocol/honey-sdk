/// <reference types="node" />
import { Connection, PublicKey } from '@solana/web3.js';
import { HoneyReserve, HoneyUser } from '../wrappers';
import { TxResponse } from './types';
export declare const deriveAssociatedTokenAccount: (tokenMint: PublicKey, userPubkey: PublicKey) => Promise<PublicKey>;
export declare const getNFTAssociatedMetadata: (connection: Connection, metadataPubKey: PublicKey) => Promise<import("@solana/web3.js").AccountInfo<Buffer>>;
export declare const depositNFT: (connection: Connection, honeyUser: HoneyUser, metadataPubKey: PublicKey) => Promise<TxResponse>;
export declare const withdrawNFT: (connection: Connection, honeyUser: HoneyUser, metadataPubKey: PublicKey) => Promise<TxResponse>;
export declare const borrow: (honeyUser: HoneyUser, borrowAmount: number, borrowTokenMint: PublicKey, borrowReserves: HoneyReserve[]) => Promise<TxResponse>;
export declare const repay: (honeyUser: HoneyUser, repayAmount: number, repayTokenMint: PublicKey, repayReserves: HoneyReserve[]) => Promise<TxResponse>;
