import { Connection } from '@solana/web3.js';
import { SupportedWallet, TPool } from '../helpers/types';
export declare const usePools: (connection: Connection, wallet: SupportedWallet, jetId: string) => {
    loading: boolean;
    data: TPool[];
    error?: Error;
};
