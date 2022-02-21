import { PublicKey } from '@solana/web3.js';
import { TxnResponse } from '../helpers/JetTypes';
import { Amount, HoneyReserve, HoneyUser } from '../wrappers';
import { deriveAssociatedTokenAccount } from './borrow';
import { TxResponse } from './types';

export const deposit = async (
  HoneyUser: HoneyUser,
  tokenAmount: number,
  depositTokenMint: PublicKey,
  depositReserves: HoneyReserve[],
): Promise<TxResponse> => {
  const depositReserve = depositReserves.filter((reserve: HoneyReserve) =>
    reserve.data.tokenMint.equals(depositTokenMint),
  )[0];
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    depositTokenMint,
    HoneyUser.address,
  );
  const amount = Amount.tokens(tokenAmount);

  if (!associatedTokenAccount) {
    console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
    return [TxnResponse.Failed, []];
  }
  return await HoneyUser.deposit(depositReserve, associatedTokenAccount, amount);
};

export const depositCollateral = async (
  HoneyUser: HoneyUser,
  tokenAmount: number,
  depositTokenMint: PublicKey,
  depositReserves: HoneyReserve[],
): Promise<TxResponse> => {
  const depositReserve = depositReserves.filter((reserve: HoneyReserve) =>
    reserve.data.tokenMint.equals(depositTokenMint),
  )[0];
  return await HoneyUser.depositCollateral(depositReserve, Amount.tokens(tokenAmount));
};

export const withdraw = async (
  HoneyUser: HoneyUser,
  tokenAmount: number,
  withdrawTokenMint: PublicKey,
  withdrawReserves: HoneyReserve[],
): Promise<TxResponse> => {
  const withdrawReserve = withdrawReserves.filter((reserve: HoneyReserve) =>
    reserve.data.tokenMint.equals(withdrawTokenMint),
  )[0];
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    withdrawTokenMint,
    HoneyUser.address,
  );
  const amount = Amount.tokens(tokenAmount);
  if (!associatedTokenAccount) {
    console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
    return [TxnResponse.Failed, []];
  }
  return await HoneyUser.withdraw(withdrawReserve, associatedTokenAccount, amount);
};

export const withdrawCollateral = async (
  HoneyUser: HoneyUser,
  tokenAmount: number,
  withdrawTokenMint: PublicKey,
  withdrawReserves: HoneyReserve[],
): Promise<TxResponse> => {
  const withdrawReserve = withdrawReserves.find((reserve: HoneyReserve) =>
    reserve.data.tokenMint.equals(withdrawTokenMint),
  );
  if (!withdrawReserve) {
    console.error(`Reserve with token mint ${withdrawTokenMint} does not exist`);
    return [TxnResponse.Failed, []];
  }
  const withdrawCollateralTx = await HoneyUser.withdrawCollateral(withdrawReserve, Amount.tokens(tokenAmount));
  return withdrawCollateralTx;
};
