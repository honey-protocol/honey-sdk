import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import { TxnResponse } from '../helpers/JetTypes';
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

export const depositNFT = async (
  connection: Connection,
  HoneyUser: HoneyUser,
  metadataPubKey: PublicKey,
): Promise<TxResponse> => {
  const associatedMetadata = await getNFTAssociatedMetadata(connection, metadataPubKey);
  if (!associatedMetadata) {
    console.error(`Could not find NFT metadata account ${metadataPubKey}`);
    return [TxnResponse.Failed, []];
  }
  const tokenMetadata = new Metadata(metadataPubKey, associatedMetadata);
  const tokenMint = new PublicKey(tokenMetadata.data.mint);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(tokenMint, HoneyUser.address);
  if (!associatedTokenAccount) {
    console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
    return [TxnResponse.Failed, []];
  }
  return await HoneyUser.depositNFT(associatedTokenAccount, tokenMint, new PublicKey(tokenMetadata.data.updateAuthority));
};

export const withdrawNFT = async (
  connection: Connection,
  HoneyUser: HoneyUser,
  metadataPubKey: PublicKey,
  reserves: HoneyReserve[],
): Promise<TxResponse> => {
  const associatedMetadata = await getNFTAssociatedMetadata(connection, metadataPubKey);
  if (!associatedMetadata) {
    console.error(`Could not find NFT metadata account ${metadataPubKey}`);
    return [TxnResponse.Failed, []];
  }
  const tokenMetadata = new Metadata(metadataPubKey, associatedMetadata);
  const tokenMint = new PublicKey(tokenMetadata.data.mint);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(tokenMint, HoneyUser.address);
  if (!associatedTokenAccount) {
    console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
    return [TxnResponse.Failed, []];
  }
  return await HoneyUser.withdrawNFT(
    associatedTokenAccount,
    tokenMint,
    new PublicKey(tokenMetadata.data.updateAuthority),
    reserves,
  );
};

export const borrow = async (
  HoneyUser: HoneyUser,
  borrowAmount: number,
  borrowTokenMint: PublicKey,
  borrowReserves: HoneyReserve[],
): Promise<TxResponse> => {
  const amount = Amount.tokens(borrowAmount);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    borrowTokenMint,
    HoneyUser.address,
  );
  const borrowReserve: HoneyReserve = borrowReserves.filter((reserve: HoneyReserve) =>
    reserve.data.tokenMint.equals(borrowTokenMint),
  )[0];

  if (!associatedTokenAccount) {
    console.error(`Ata could not be found`);
    return [TxnResponse.Failed, []];
  }
  const borrowTx = await HoneyUser.borrow(borrowReserve, associatedTokenAccount, amount);
  return borrowTx;
};

export const repay = async (
  HoneyUser: HoneyUser,
  repayAmount: number,
  repayTokenMint: PublicKey,
  repayReserves: HoneyReserve[],
): Promise<TxResponse> => {
  const amount = Amount.tokens(repayAmount); // basically just pay back double the loan for now
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    repayTokenMint,
    HoneyUser.address,
  );
  const repayReserve: HoneyReserve = repayReserves.filter((reserve: HoneyReserve) =>
    reserve.data.tokenMint.equals(repayTokenMint),
  )[0];
  if (!associatedTokenAccount) {
    console.error(`Ata could not be found`);
    return [TxnResponse.Failed, []];
  }
  return await HoneyUser.repay(repayReserve, associatedTokenAccount, amount);
};
