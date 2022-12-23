import { Connection } from '@solana/web3.js';

export const waitForConfirmation = async (connection: Connection, txid: string) => {
  await connection.confirmTransaction(txid);
};
