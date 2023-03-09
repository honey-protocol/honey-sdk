import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { BN } from '@project-serum/anchor';
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ConfirmOptions, Connection, PublicKey } from '@solana/web3.js';
import { combineAllTransactions, InstructionAndSigner, TxnResponse } from '../helpers';
import { Amount, HoneyReserve, HoneyUser } from '../wrappers';
import { TxResponse } from './types';
import * as anchor from '@project-serum/anchor';

// Lend Actions
export const deriveAssociatedTokenAccount = async (tokenMint: PublicKey, userPubkey: PublicKey) => {
  const associatedTokenAccount: PublicKey = await getAssociatedTokenAddress(
    tokenMint,
    userPubkey,
  );
  if (!associatedTokenAccount) console.log('Associated Token Account could not be located');
  return associatedTokenAccount;
};

export const getNFTAssociatedMetadata = async (connection: Connection, metadataPubKey: PublicKey) => {
  const data = await connection.getAccountInfo(metadataPubKey);
  if (!data) return;
  return data;
};
/**
 * Deposits NFT into locker.
 *
 * @example
 *```ts
 * import { depositNFT } from '@honey-finance/sdk';
 * const metadata = await Metadata.findByMint(sdkConfig.saberHqConnection, mintID);
 * const tx = await depositNFT(sdkConfig.saberHqConnection, honeyUser, metadata.pubkey);
 * ```
 */
export const depositNFT = async (
  connection: Connection,
  honeyUser: HoneyUser,
  metadataPubKey: PublicKey,
  pnft?: boolean
): Promise<TxResponse> => {
  const associatedMetadata = await getNFTAssociatedMetadata(connection, metadataPubKey);
  if (!associatedMetadata) {
    console.error(`Could not find NFT metadata account ${metadataPubKey}`);
    return [TxnResponse.Failed, []];
  }
  const tokenMetadata = await Metadata.fromAccountAddress(connection, metadataPubKey);
  const tokenMint = new PublicKey(tokenMetadata.mint);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    tokenMint,
    honeyUser.address,
  );
  if (!associatedTokenAccount) {
    console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
    return [TxnResponse.Failed, []];
  }
  return await honeyUser.depositNFT(
    associatedTokenAccount,
    tokenMint,
    new PublicKey(tokenMetadata.data.creators[0].address),
    pnft
  );
};
/**
 * Withdraws NFT from locker.
 *
 * @example
 *```ts
 * import { withdrawNFT } from '@honey-finance/sdk';
 * const metadata = await Metadata.findByMint(sdkConfig.saberHqConnection, mintID);
 * const tx = await withdrawNFT(sdkConfig.saberHqConnection, honeyUser, metadata.pubkey);
 * ```
 */
export const withdrawNFT = async (
  connection: Connection,
  honeyUser: HoneyUser,
  metadataPubKey: PublicKey,
  pnft?: boolean
): Promise<TxResponse> => {
  const associatedMetadata = await getNFTAssociatedMetadata(connection, metadataPubKey);
  if (!associatedMetadata) {
    console.error(`Could not find NFT metadata account ${metadataPubKey}`);
    return [TxnResponse.Failed, []];
  }
  const tokenMetadata = await Metadata.fromAccountAddress(connection, metadataPubKey);
  const tokenMint = new PublicKey(tokenMetadata.mint);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    tokenMint,
    honeyUser.address,
  );

  if (!associatedTokenAccount) {
    console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
    return [TxnResponse.Failed, []];
  }
  return await honeyUser.withdrawNFT(
    associatedTokenAccount,
    tokenMint,
    new PublicKey(tokenMetadata.data.creators[0].address),
    pnft
  );
};
/**
 * Borrows collateral .
 *
 * @example
 * ```ts
 * import { borrow } from '@honey-finance/sdk';
 * const tx = await borrow(honeyUser, val * LAMPORTS_PER_SOL, borrowTokenMint, honeyReserves);
 * ```
 *
 */

export const borrow = async (
  honeyUser: HoneyUser,
  borrowAmount: number | BN,
  borrowTokenMint: PublicKey,
  borrowReserves: HoneyReserve[],
): Promise<TxResponse> => {
  if (typeof borrowAmount === 'number') {
    borrowAmount = new BN(borrowAmount);
  }
  const amount = Amount.tokens(borrowAmount);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    borrowTokenMint,
    honeyUser.address,
  );
  const borrowReserve: HoneyReserve = borrowReserves.filter((reserve: HoneyReserve) =>
    reserve?.data?.tokenMint.equals(borrowTokenMint),
  )[0];

  if (!associatedTokenAccount) {
    console.error(`Ata could not be found`);
    return [TxnResponse.Failed, []];
  }
  const borrowTx = await honeyUser.borrow(borrowReserve, associatedTokenAccount, amount);
  return borrowTx;
};

export const borrowAndRefresh = async (
  honeyUser: HoneyUser,
  borrowAmount: number | BN,
  borrowTokenMint: PublicKey,
  borrowReserves: HoneyReserve[],
): Promise<TxResponse> => {
  if (typeof borrowAmount === 'number') {
    borrowAmount = new BN(borrowAmount);
  }
  const amount = Amount.tokens(borrowAmount);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    borrowTokenMint,
    honeyUser.address,
  );
  const borrowReserve: HoneyReserve = borrowReserves.filter((reserve: HoneyReserve) =>
    reserve?.data?.tokenMint.equals(borrowTokenMint),
  )[0];

  if (!associatedTokenAccount) {
    console.error(`Ata could not be found`);
    return [TxnResponse.Failed, []];
  }

  await borrowReserve.refreshOldReserves();
  return await honeyUser.borrowAndRefresh(borrowReserve, associatedTokenAccount, amount);
};

export const makeBorrowTx = async (
  honeyUser: HoneyUser,
  borrowAmount: number,
  borrowTokenMint: PublicKey,
  borrowReserves: HoneyReserve[],
): Promise<InstructionAndSigner[]> => {
  const amount = Amount.tokens(borrowAmount);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    borrowTokenMint,
    honeyUser.address,
  );
  const borrowReserve: HoneyReserve = borrowReserves.filter((reserve: HoneyReserve) =>
    reserve?.data?.tokenMint.equals(borrowTokenMint),
  )[0];

  if (!associatedTokenAccount) {
    console.error(`Ata could not be found`);
    return [];
  }
  return await honeyUser.makeBorrowTx(borrowReserve, associatedTokenAccount, amount);
};

/**
 * Repays a loan.
 *
 * @example
 * ```ts
 * import { repay } from '@honey-finance/sdk';
 * const tx = await repay(honeyUser, val * LAMPORTS_PER_SOL, repayTokenMint, honeyReserves)
 * ```
 * [pg-structure](https://www.npmjs.com/package/pg-structure)

 */
export const repay = async (
  honeyUser: HoneyUser,
  repayAmount: BN,
  repayTokenMint: PublicKey,
  repayReserves: HoneyReserve[],
): Promise<TxResponse> => {
  const amount = Amount.tokens(repayAmount); // basically just pay back double the loan for now
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    repayTokenMint,
    honeyUser.address,
  );
  const repayReserve: HoneyReserve = repayReserves.filter((reserve: HoneyReserve) =>
    reserve?.data?.tokenMint.equals(repayTokenMint),
  )[0];
  if (!associatedTokenAccount) {
    console.error(`Ata could not be found`);
    return [TxnResponse.Failed, []];
  }
  return await honeyUser.repay(repayReserve, associatedTokenAccount, amount);
};

export const repayAndRefresh = async (
  honeyUser: HoneyUser,
  repayAmount: BN,
  repayTokenMint: PublicKey,
  repayReserves: HoneyReserve[],
): Promise<TxResponse> => {
  const amount = Amount.tokens(repayAmount); // basically just pay back double the loan for now
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    repayTokenMint,
    honeyUser.address,
  );
  const repayReserve: HoneyReserve = repayReserves.filter((reserve: HoneyReserve) =>
    reserve?.data?.tokenMint.equals(repayTokenMint),
  )[0];
  if (!associatedTokenAccount) {
    console.error(`Ata could not be found`);
    return [TxnResponse.Failed, []];
  }
  await repayReserve.refreshOldReserves();
  return await honeyUser.repayAndRefresh(repayReserve, associatedTokenAccount, amount);
};

export const makeRepayTx = async (
  honeyUser: HoneyUser,
  repayAmount: BN,
  repayTokenMint: PublicKey,
  repayReserves: HoneyReserve[],
): Promise<InstructionAndSigner[]> => {
  const amount = Amount.tokens(repayAmount);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    repayTokenMint,
    honeyUser.address,
  );
  const repayReserve: HoneyReserve = repayReserves.filter((reserve: HoneyReserve) =>
    reserve?.data?.tokenMint.equals(repayTokenMint),
  )[0];
  if (!associatedTokenAccount) {
    console.error(`Ata could not be found`);
    return [];
  }
  return await honeyUser.makeRepayTx(repayReserve, associatedTokenAccount, amount);
};

// export const repayAndWithdrawNFT = async (
//   connection: Connection,
//   honeyUser: HoneyUser,
//   metadataPubKey: PublicKey,
//   repayAmount: BN,
//   repayTokenMint: PublicKey,
//   reserve: HoneyReserve,
// ): Promise<TxResponse> => {};

export const makeRepayAndWithdrawNFT = async (
  connection: Connection,
  honeyUser: HoneyUser,
  metadataPubKey: PublicKey,
  repayAmount: BN,
  repayTokenMint: PublicKey,
  reserve: HoneyReserve,
): Promise<TxResponse> => {
  const amount = Amount.tokens(repayAmount.muln(1.002)); // interest
  const associatedRepayTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    repayTokenMint,
    honeyUser.address,
  );
  const ixs = await honeyUser.makeRepayTx(reserve, associatedRepayTokenAccount, amount);

  const transaction = await combineAllTransactions(honeyUser.client.program.provider as anchor.AnchorProvider, ixs);

  const associatedMetadata = await getNFTAssociatedMetadata(connection, metadataPubKey);
  if (!associatedMetadata) {
    console.error(`Could not find NFT metadata account ${metadataPubKey}`);
    return [TxnResponse.Failed, []];
  }

  const tokenMetadata = await Metadata.fromAccountAddress(connection, metadataPubKey);
  const tokenMint = new PublicKey(tokenMetadata.mint);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    tokenMint,
    honeyUser.address,
  );

  if (!associatedTokenAccount) {
    console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
    return [TxnResponse.Failed, []];
  }
  const repayAndWithdraw = await honeyUser.makeNFTWithdrawTx(
    associatedTokenAccount,
    tokenMint,
    new PublicKey(tokenMetadata.data.creators[0].address),
  );

  transaction.add(repayAndWithdraw);
  // @ts-ignore
  // const signedTx = await honeyUser.client.program.provider.wallet.signTransaction(transaction);
  const txid = await honeyUser.client.program.provider.sendAndConfirm(transaction, [], { skipPreflight: true });
  // const rawTransaction = signedTx.serialize();
  // const txid = await honeyUser.client.program.provider.connection.sendRawTransaction(rawTransaction);

  return [TxnResponse.Success, [txid]];
};
