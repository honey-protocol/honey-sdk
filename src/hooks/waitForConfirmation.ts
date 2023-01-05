import { Connection } from '@solana/web3.js';

/**
 * helper function to wait for transaction confirmation
 * @param connection to the cluster
 * @param txid to wait for confirmation
 */
export const waitForConfirmation = async (connection: Connection, txid: string) => {
  const latestBlockHash = await connection.getLatestBlockhash();

  await connection.confirmTransaction(txid);
};
