import { Connection, ConnectionConfig } from '@solana/web3.js';
import React, { FC, ReactNode } from 'react';
export interface ConnectionContextState {
    connection: Connection;
    network: string;
}
export declare const ConnectionContext: React.Context<ConnectionContextState>;
export declare function useConnection(): Connection;
export declare function useNetwork(): string;
export interface ConnectionProviderProps {
    children: ReactNode;
    endpoint: string;
    network: string;
    config?: ConnectionConfig;
}
export declare const ConnectionProvider: FC<ConnectionProviderProps>;
