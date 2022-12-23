import { Connection } from '@solana/web3.js';

export const waitForConfirmation = async (connection: Connection, txid: string) => {
  const latestBlockHash = await connection.getLatestBlockhash();

  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: txid,
  });
};
