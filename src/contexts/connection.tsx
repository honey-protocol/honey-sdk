import { clusterApiUrl, Connection } from '@solana/web3.js'
import React, { FC, useContext, useEffect, useMemo, useState } from 'react'
import * as anchor from "@project-serum/anchor";
import { setProgramIds } from '../helpers/ids';
import { setProgramIdls } from '../helpers/idls';
import { getWalletAndAnchor } from '../helpers/connectWallet';
import { User, Wallet, WalletProvider } from '../helpers/JetTypes';
import { getEmptyUserState } from '.';

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

export const providers: WalletProvider[] = [
  {
    name: "Phantom",
    logo: "img/wallets/phantom.png",
    url: "https://phantom.app/"
  },
  {
    name: "Slope",
    logo: "img/wallets/slope.png",
    url: "https://slope.finance/"
  },
  {
    name: "Solflare",
    logo: "img/wallets/solflare.png",
    url: "https://solflare.com/"
  },
  {
    name: "Solong",
    logo: "img/wallets/solong.png",
    url: "https://solongwallet.com/"
  },
  {
    name: "Sollet",
    logo: "img/wallets/sollet.png",
    url: "https://www.sollet.io/"
  },
  {
    name: "Math Wallet",
    logo: "img/wallets/math_wallet.png",
    url: "https://mathwallet.org/en-us/"
  }
];

const DEFAULT_ENDPOINT = ENDPOINTS[2].endpoint

interface ConnectionContextProps {
  endpoint: string;
  network: string
}

export const ConnectionContext = React.createContext({
  endpoint: DEFAULT_ENDPOINT,
  network: ENDPOINTS[2].name,
  connection: new Connection(DEFAULT_ENDPOINT, anchor.Provider.defaultOptions().commitment),
});

export const ConnectionProvider: FC<ConnectionContextProps> = ({ children = undefined as any }) => {

  const [endpoint, setEndpoint] = useState<string>(DEFAULT_ENDPOINT);
  const [network, setNetwork] = useState<string>(ENDPOINTS[2].name);
  const [user, setUser] = useState<User>(getEmptyUserState());
  const [hasWallet, setHasWallet] = useState<boolean>(false);
  const [wallet, setWallet] = useState<Wallet>();


  const connection = useMemo(
    () => new Connection(endpoint, 'recent'),
    [endpoint],
  );

  useEffect(() => {
    setEndpoint(ENDPOINTS.find((end) => end.name === network)?.endpoint || DEFAULT_ENDPOINT)
  }, [network])

  useEffect(() => {
    const fetchWallet = async () => {
      const provider = providers[0]; // hardcoded for Phatom now.
      const wallet = await getWalletAndAnchor(provider) as Wallet;
      setWallet(wallet);
      setHasWallet(true);
    }
    fetchWallet();
  }, []);
  
  setProgramIds(network);
  setProgramIdls(network);

  return (
    <ConnectionContext.Provider
      value={{
        endpoint,
        network,
        connection,
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