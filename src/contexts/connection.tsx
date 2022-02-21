import { Connection, ConnectionConfig } from '@solana/web3.js';
import React, { createContext, FC, ReactNode, useContext, useMemo } from 'react';

export interface ConnectionContextState {
    connection: Connection;
    network: string;
}

export const ConnectionContext = createContext<ConnectionContextState>({} as ConnectionContextState);

export function useConnection(): Connection {
    return useContext(ConnectionContext).connection;
}

export function useNetwork(): string {
  return useContext(ConnectionContext).network;
}

export interface ConnectionProviderProps {
    children: ReactNode;
    endpoint: string;
    network: string;
    config?: ConnectionConfig;
}

export const ConnectionProvider: FC<ConnectionProviderProps> = ({
    children,
    endpoint,
    network,
    config = { commitment: 'confirmed' },
}) => {
    const connection = useMemo(() => new Connection(endpoint, config), [endpoint, config]);
  
    return <ConnectionContext.Provider value={{ connection, network }}>{children}</ConnectionContext.Provider>;
};