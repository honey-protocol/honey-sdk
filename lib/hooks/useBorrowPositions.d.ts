import { Connection, PublicKey } from '@solana/web3.js';
import { SupportedWallet, TBorrowPosition } from '../helpers/types';
export declare const METADATA_PROGRAM_ID: PublicKey;
export declare const useBorrowPositions: (connection: Connection, wallet: SupportedWallet, jetId: string) => {
    loading: boolean;
    data?: TBorrowPosition[];
    error?: Error;
};
