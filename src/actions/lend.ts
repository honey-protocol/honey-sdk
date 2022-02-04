import { PublicKey } from "@solana/web3.js";
import { Amount, JetReserve, JetUser } from "../jet";
import { deriveAssociatedTokenAccount } from "./borrow";

export const deposit = async (
  jetUser: JetUser,
  tokenAmount: number,
  depositTokenMint: PublicKey,
  depositReserves: JetReserve[]
): Promise<string> => {
  try {
    const depositReserve = depositReserves.filter((reserve: JetReserve) => reserve.data.tokenMint.equals(depositTokenMint))[0];
    const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(depositTokenMint, jetUser.address);
    const amount = Amount.tokens(tokenAmount);

    if (associatedTokenAccount) {
      const depositSlip = await jetUser.deposit(depositReserve, associatedTokenAccount, amount);
      console.log(depositSlip);
      return depositSlip;
    }
    return '';
  } catch (error) {
    console.log(error);
    return '';
  }
}

export const depositCollateral = async (
  jetUser: JetUser,
  tokenAmount: number,
  depositTokenMint: PublicKey,
  depositReserves: JetReserve[]
) => {
  const depositReserve = depositReserves.filter((reserve: JetReserve) => reserve.data.tokenMint.equals(depositTokenMint))[0];
  const depositCollateral = await jetUser.depositCollateral(depositReserve, Amount.tokens(tokenAmount));
  return depositCollateral;
}

export const withdraw = async (
  jetUser: JetUser,
  tokenAmount: number,
  withdrawTokenMint: PublicKey,
  withdrawReserves: JetReserve[]
): Promise<string> => {
  try {
    const withdrawReserve = withdrawReserves.filter((reserve: JetReserve) => reserve.data.tokenMint.equals(withdrawTokenMint))[0];
    const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(withdrawTokenMint, jetUser.address);
    const amount = Amount.tokens(tokenAmount);
    if (associatedTokenAccount) {
      const withdrawSlip = await jetUser.withdraw(withdrawReserve, associatedTokenAccount, amount);
      console.log(withdrawSlip);
      return withdrawSlip;
    }
    console.log("no associated token account")
    return 'error';
  } catch (error) {
    console.log(error);
    return 'error';
  }
}

export const withdrawCollateral = async (
  jetUser: JetUser,
  tokenAmount: number,
  withdrawTokenMint: PublicKey,
  withdrawReserves: JetReserve[]
): Promise<string[]> => {
  const withdrawReserve = withdrawReserves.filter((reserve: JetReserve) => reserve.data.tokenMint.equals(withdrawTokenMint))[0];
  // const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(withdrawTokenMint, jetUser.address);
  // const amount = Amount.tokens(tokenAmount);
  const withdrawCollateral = await jetUser.withdrawCollateral(withdrawReserve, Amount.tokens(tokenAmount));
  return withdrawCollateral;
}