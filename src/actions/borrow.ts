import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import { InstructionAndSigner } from '../helpers';
import { TxnResponse } from '../helpers/honeyTypes';
import { Amount, HoneyReserve, HoneyUser } from '../wrappers';
import { TxResponse } from './types';

// Lend Actions
export const deriveAssociatedTokenAccount = async (tokenMint: PublicKey, userPubkey: PublicKey) => {
  const associatedTokenAccount: PublicKey = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
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
): Promise<TxResponse> => {
  const associatedMetadata = await getNFTAssociatedMetadata(connection, metadataPubKey);
  if (!associatedMetadata) {
    console.error(`Could not find NFT metadata account ${metadataPubKey}`);
    return [TxnResponse.Failed, []];
  }
  const tokenMetadata = new Metadata(metadataPubKey, associatedMetadata);
  const tokenMint = new PublicKey(tokenMetadata.data.mint);
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
    new PublicKey(tokenMetadata.data.data.creators[0].address),
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
): Promise<TxResponse> => {
  const associatedMetadata = await getNFTAssociatedMetadata(connection, metadataPubKey);
  if (!associatedMetadata) {
    console.error(`Could not find NFT metadata account ${metadataPubKey}`);
    return [TxnResponse.Failed, []];
  }
  const tokenMetadata = new Metadata(metadataPubKey, associatedMetadata);
  const tokenMint = new PublicKey(tokenMetadata.data.mint);
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
    new PublicKey(tokenMetadata.data.data.creators[0].address),
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
  borrowAmount: number,
  borrowTokenMint: PublicKey,
  borrowReserves: HoneyReserve[],
): Promise<TxResponse> => {
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
  borrowAmount: number,
  borrowTokenMint: PublicKey,
  borrowReserves: HoneyReserve[],
): Promise<TxResponse> => {
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
  repayAmount: number,
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
  repayAmount: number,
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
  return await honeyUser.repayAndRefresh(repayReserve, associatedTokenAccount, amount);
};

export const makeRepayTx = async (
  honeyUser: HoneyUser,
  repayAmount: number,
  repayTokenMint: PublicKey,
  repayReserves: HoneyReserve[],
): Promise<InstructionAndSigner[]> => {
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
    return [];
  }
  return await honeyUser.makeRepayTx(repayReserve, associatedTokenAccount, amount);
};
