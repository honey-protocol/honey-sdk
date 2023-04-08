import { Program } from '@project-serum/anchor';
import React, { FC, ReactNode, useContext, useEffect, useState } from 'react';
import * as anchor from '@project-serum/anchor';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { ConnectedWallet } from '../helpers/walletType';
import devnetIdl from '../artifacts/devnet/honey.json';
import mainnetBetaIdl from '../artifacts/mainnet-beta/honey.json';
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';

export interface AnchorContext {
  program: Program;
  coder: anchor.Coder;
  isConfigured: boolean;
}
const AnchorContext = React.createContext<AnchorContext>(null!);

/**
 * The useAnchor hook is accessible throught the application and provides functionality to interact with Anchor programs.
 *
 * @example
 * ```ts
 * import { useAnchor } from '@honey-finance/sdk';
 * const { program } = useAnchor();
 * ```
 */
export const useAnchor = () => {
  const context = useContext(AnchorContext);
  return context;
};

export interface WebWallet {
  signTransaction(tx: Transaction): Promise<Transaction>;
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>;
  publicKey: PublicKey;
}

export interface AnchorProviderProps {
  children: ReactNode;
  wallet: ConnectedWallet | null;
  connection: Connection;
  network: string;
  honeyProgram: string;
}

/**
 * On-chain context provider for Anchor programs.
 * 
 * @example
 * You need to wrap the entrypoint to your frontend application. 
 * For React Applications go to `src/App.tsx`.
 * For NextJS Applications go to `pages/_app.tsx`
 * 
 * ```ts
 * import { AnchorProvider } from '@honey-finance/sdk';
 * const wallet = useConnectedWallet();
 * const connection = useConnection();
 * const network = 'devnet';
 * 
 * return (
 *  <AnchorProvider
 *    wallet={wallet}
 *    connection={connection}
 *    network={network}
 *    honeyProgram={HONEY_PROGRAM_ID}>
 * 
 *    <Component {...pageProps} /> # entrypoint to your application
 * 
 *  </AnchorProvider>
 * )
 * ```

 */
export const AnchorProvider: FC<AnchorProviderProps> = ({ children, wallet, connection, network, honeyProgram }) => {
  const [program, setProgram] = useState<Program>({} as Program);
  const [coder, setAnchorCoder] = useState<anchor.Coder>({} as anchor.Coder);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  useEffect(() => {
    // setup coder for anchor operations
    const setup = async () => {
      const idl: any = network === 'devnet' ? devnetIdl : mainnetBetaIdl;
      setAnchorCoder(new anchor.BorshCoder(idl));
      // init program
      const HONEY_PROGRAM_ID = new PublicKey(honeyProgram);

      const provider = new anchor.AnchorProvider(
        connection,
        wallet ?? new NodeWallet(new Keypair()),
        anchor.AnchorProvider.defaultOptions(),
      );
      const anchorProgram: Program = new anchor.Program(idl as any, HONEY_PROGRAM_ID, provider);
      setProgram(anchorProgram);
      setIsConfigured(true);
    };

    if (connection) setup();
  }, [connection]);

  return (
    <AnchorContext.Provider
      value={{
        program,
        coder,
        isConfigured,
      }}
    >
      {children}
    </AnchorContext.Provider>
  );
};
