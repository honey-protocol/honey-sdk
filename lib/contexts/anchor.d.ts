import { Program } from '@project-serum/anchor';
import { FC, ReactNode } from 'react';
import { IdlMetadata } from '../helpers/JetTypes';
import * as anchor from "@project-serum/anchor";
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Wallet as ParentWallet, SolongWallet } from '../helpers/walletType';
export interface AnchorContext {
    program: Program;
    idlMetadata: IdlMetadata;
    coder: anchor.Coder;
    isConfigured: boolean;
}
export declare const useAnchor: () => AnchorContext;
export interface Wallet {
    signTransaction(tx: Transaction): Promise<Transaction>;
    signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
    publicKey: PublicKey;
}
export interface AnchorProviderProps {
    children: ReactNode;
    wallet: ParentWallet | SolongWallet | null;
    connection: Connection;
    network: string;
}
export declare const AnchorProvider: FC<AnchorProviderProps>;
