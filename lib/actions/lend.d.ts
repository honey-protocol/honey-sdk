import { PublicKey } from '@solana/web3.js';
import { HoneyReserve, HoneyUser } from '../wrappers';
import { TxResponse } from './types';
export declare const deposit: (HoneyUser: HoneyUser, tokenAmount: number, depositTokenMint: PublicKey, depositReserves: HoneyReserve[]) => Promise<TxResponse>;
export declare const depositCollateral: (HoneyUser: HoneyUser, tokenAmount: number, depositTokenMint: PublicKey, depositReserves: HoneyReserve[]) => Promise<TxResponse>;
export declare const withdraw: (HoneyUser: HoneyUser, tokenAmount: number, withdrawTokenMint: PublicKey, withdrawReserves: HoneyReserve[]) => Promise<TxResponse>;
export declare const withdrawCollateral: (HoneyUser: HoneyUser, tokenAmount: number, withdrawTokenMint: PublicKey, withdrawReserves: HoneyReserve[]) => Promise<TxResponse>;
