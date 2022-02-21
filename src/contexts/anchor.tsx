import { Program } from '@project-serum/anchor';
import React, { FC, ReactNode, useContext, useEffect, useState } from 'react'
import { IdlMetadata } from '../helpers/JetTypes';
import { parseIdlMetadata } from '../helpers/programUtil';
import * as anchor from "@project-serum/anchor";
import { PROGRAM_IDLS } from '../helpers/idls';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Wallet as ParentWallet, SolongWallet } from '../helpers/walletType';

export interface AnchorContext {
  program: Program,
  idlMetadata: IdlMetadata,
  coder: anchor.Coder,
  isConfigured: boolean
}
const AnchorContext = React.createContext<AnchorContext>(null!);

export const useAnchor = () => {
  const context = useContext(AnchorContext);
  return context;
};

export interface Wallet {
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  publicKey: PublicKey;
}

export interface AnchorProviderProps {
  children: ReactNode,
  wallet: ParentWallet | SolongWallet | null,
  connection: Connection,
  network: string
}

export const AnchorProvider: FC<AnchorProviderProps> = ({
  children,
  wallet,
  connection,
  network
}) => {
  const [program, setProgram] = useState<Program>({} as Program);
  const [idlMetadata, setIdlMetadata] = useState<IdlMetadata>({} as IdlMetadata);
  const [coder, setAnchorCoder] = useState<anchor.Coder>({} as anchor.Coder);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  useEffect(() => {      
    // setup coder for anchor operations
    const setup = async () => {
      const idl = PROGRAM_IDLS.filter((value) => value.name === network)[0];
      const parsedIdlMetadata = parseIdlMetadata(idl.jet.metadata as IdlMetadata);
      setAnchorCoder(new anchor.Coder(idl.jet));
      setIdlMetadata(parsedIdlMetadata);
      const provider = new anchor.Provider(connection, wallet as unknown as Wallet, anchor.Provider.defaultOptions());
      const anchorProgram: Program = new anchor.Program(idl.jet, (new anchor.web3.PublicKey(idl.jet.metadata.address)), provider);
      setProgram(anchorProgram);
      setIsConfigured(true);
    };
    if (connection && wallet)
      setup();
  }, [connection, wallet])
  
  return (
    <AnchorContext.Provider
      value={{
        program,
        idlMetadata,
        coder,
        isConfigured
      }}> 
      {children}
    </AnchorContext.Provider>
  )
}
