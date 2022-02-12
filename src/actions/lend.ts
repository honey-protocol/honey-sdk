import { PublicKey } from '@solana/web3.js';
import { TxnResponse } from '../helpers/JetTypes';
import { Amount, JetReserve, JetUser } from '../wrappers';
import { deriveAssociatedTokenAccount } from './borrow';
import { TxResponse } from './types';

export const deposit = async (
  jetUser: JetUser,
  tokenAmount: number,
  depositTokenMint: PublicKey,
  depositReserves: JetReserve[],
): Promise<TxResponse> => {
  const depositReserve = depositReserves.filter((reserve: JetReserve) =>
    reserve.data.tokenMint.equals(depositTokenMint),
  )[0];
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    depositTokenMint,
    jetUser.address,
  );
  const amount = Amount.tokens(tokenAmount);

  if (!associatedTokenAccount) {
    console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
    return [TxnResponse.Failed, []];
  }
  return await jetUser.deposit(depositReserve, associatedTokenAccount, amount);
};

export const depositCollateral = async (
  jetUser: JetUser,
  tokenAmount: number,
  depositTokenMint: PublicKey,
  depositReserves: JetReserve[],
): Promise<TxResponse> => {
  const depositReserve = depositReserves.filter((reserve: JetReserve) =>
    reserve.data.tokenMint.equals(depositTokenMint),
  )[0];
  return await jetUser.depositCollateral(depositReserve, Amount.tokens(tokenAmount));
};

export const withdraw = async (
  jetUser: JetUser,
  tokenAmount: number,
  withdrawTokenMint: PublicKey,
  withdrawReserves: JetReserve[],
): Promise<TxResponse> => {
  const withdrawReserve = withdrawReserves.filter((reserve: JetReserve) =>
    reserve.data.tokenMint.equals(withdrawTokenMint),
  )[0];
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    withdrawTokenMint,
    jetUser.address,
  );
  const amount = Amount.tokens(tokenAmount);
  if (!associatedTokenAccount) {
    console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
    return [TxnResponse.Failed, []];
  }
  return await jetUser.withdraw(withdrawReserve, associatedTokenAccount, amount);
};

export const withdrawCollateral = async (
  jetUser: JetUser,
  tokenAmount: number,
  withdrawTokenMint: PublicKey,
  withdrawReserves: JetReserve[],
): Promise<TxResponse> => {
  const withdrawReserve = withdrawReserves.find((reserve: JetReserve) =>
    reserve.data.tokenMint.equals(withdrawTokenMint),
  );
  if (!withdrawReserve) {
    console.error(`Reserve with token mint ${withdrawTokenMint} does not exist`);
    return [TxnResponse.Failed, []];
  }
  const withdrawCollateralTx = await jetUser.withdrawCollateral(withdrawReserve, Amount.tokens(tokenAmount));
  return withdrawCollateralTx;
};
