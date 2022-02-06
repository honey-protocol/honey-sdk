import { clusterApiUrl, Connection } from '@solana/web3.js'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import * as anchor from "@project-serum/anchor";
import { setProgramIds } from '../helpers/ids';
import { setProgramIdls } from '../helpers/idls';

export type ENV = "localnet" | "mainnet-beta" | "devnet";

export const ENDPOINTS = [
  {
    name: 'localnet',
    endpoint: "http://127.0.0.1:8899"  
  },
  {
    name: 'mainnet-beta',
    endpoint: process.env.REACT_APP_RPC_NODE || clusterApiUrl('mainnet-beta')
  },
  {
    name: 'devnet',
    endpoint: "https://api.devnet.solana.com"
  },
];

const DEFAULT_ENDPOINT = ENDPOINTS[2].endpoint

interface ConnectionContextProps {
  endpoint: string;
  network: string
  setNetwork: (props: ENV) => void;
  connection: Connection
}

export const ConnectionContext = React.createContext<ConnectionContextProps>({
  endpoint: DEFAULT_ENDPOINT,
  setNetwork: () => ENDPOINTS[2].name,
  network: ENDPOINTS[2].name,
  connection: new Connection(DEFAULT_ENDPOINT, anchor.Provider.defaultOptions().commitment)
});

export default function ConnectionProvider({ children = undefined as any }) {

  const [endpoint, setEndpoint] = useState<string>(DEFAULT_ENDPOINT);
  const [network, setNetwork] = useState<string>(ENDPOINTS[2].name);
  const connection = useMemo(
    () => new Connection(endpoint, 'recent'),
    [endpoint],
  );

  useEffect(() => {
    setEndpoint(ENDPOINTS.find((end) => end.name === network)?.endpoint || DEFAULT_ENDPOINT)
  }, [network])

  setProgramIds(network);
  setProgramIdls(network);

  return (
    <ConnectionContext.Provider
      value={{
        endpoint,
        network,
        setNetwork,
        connection
      }}>
      {children}
    </ConnectionContext.Provider>
  )
}

export function useNetwork() {
  return useContext(ConnectionContext).network;
}

export function useConnection() {
  return useContext(ConnectionContext).connection as Connection;
}