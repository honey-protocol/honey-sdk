import { PublicKey } from '@solana/web3.js';
import { TxnResponse } from '../helpers';
import { Amount, HoneyReserve, HoneyUser } from '../wrappers';
import { deriveAssociatedTokenAccount } from './borrow';
import { TxResponse } from './types';
import { BN } from '@project-serum/anchor';
/**
 * Deposit Collateral.
 *
 * @example
 * ```ts
 * import { deposit } from '@honey-finance/sdk';
 * const tx = await deposit(honeyUser, tokenAmount, depositTokenMint, honeyReserves);
 * ```
 *
 */
export const deposit = async (
  honeyUser: HoneyUser,
  tokenAmount: number | BN,
  depositTokenMint: PublicKey,
  depositReserves: HoneyReserve[],
): Promise<TxResponse> => {
  if (typeof tokenAmount === 'number') {
    tokenAmount = new BN(tokenAmount);
  }
  const depositReserve = depositReserves.filter((reserve: HoneyReserve) =>
    reserve?.data?.tokenMint?.equals(depositTokenMint),
  )[0];

  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    depositTokenMint,
    honeyUser.address,
  );
  const amount = Amount.tokens(tokenAmount);

  if (!associatedTokenAccount) {
    console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
    return [TxnResponse.Failed, []];
  }
  return await honeyUser.deposit(depositReserve, associatedTokenAccount, amount);
};

export const withdraw = async (
  honeyUser: HoneyUser,
  tokenAmount: number | BN,
  withdrawTokenMint: PublicKey,
  withdrawReserves: HoneyReserve[],
): Promise<TxResponse> => {
  if (typeof tokenAmount === 'number') {
    tokenAmount = new BN(tokenAmount);
  }
  const withdrawReserve = withdrawReserves.filter((reserve: HoneyReserve) =>
    reserve?.data?.tokenMint.equals(withdrawTokenMint),
  )[0];
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(
    withdrawTokenMint,
    honeyUser.address,
  );
  const amount = Amount.tokens(tokenAmount);
  if (!associatedTokenAccount) {
    console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
    return [TxnResponse.Failed, []];
  }
  return await honeyUser.withdraw(withdrawReserve, associatedTokenAccount, amount);
};
