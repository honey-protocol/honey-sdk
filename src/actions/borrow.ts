import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { Amount, JetMarket, JetReserve, JetUser } from "../jet";

// Lend Actions
export const deriveAssociatedTokenAccount = async (tokenMint: PublicKey, userPubkey: PublicKey) => {
  const associatedTokenAccount: PublicKey = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    tokenMint,
    userPubkey
  );
  if (!associatedTokenAccount)
    console.log("Associated Token Account could not be located");
  return associatedTokenAccount;
}

export const getNFTAssociatedMetadata = async (
  connection: Connection,
  metadataPubKey: PublicKey
) => {
  const data = await connection.getAccountInfo(metadataPubKey);
  if (!data)
    return;
  return data;
}

export const depositNFT = async (
  connection: Connection,
  jetUser: JetUser,
  metadataPubKey: PublicKey,
) => {
  const data = await getNFTAssociatedMetadata(connection, metadataPubKey);
  if (!data)
    return
  const tokenMetadata = new Metadata(metadataPubKey, data);
  const tokenMint = new PublicKey(tokenMetadata.data.mint);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(tokenMint, jetUser.address);
  if (associatedTokenAccount) {
    const depositSlipNFT = await jetUser.depositNFT(
      associatedTokenAccount,
      tokenMint,
      new PublicKey(tokenMetadata.data.updateAuthority)
    )
    console.log(depositSlipNFT);
  } else {
    console.log("could not find the associated token account");
  }
}

export const withdrawNFT = async (
  connection: Connection,
  jetUser: JetUser,
  metadataPubKey: PublicKey,
  reserves: JetReserve[]
) => {
  const data = await getNFTAssociatedMetadata(connection, metadataPubKey);
  if (!data)
    return
  const tokenMetadata = new Metadata(metadataPubKey, data);
  const tokenMint = new PublicKey(tokenMetadata.data.mint);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(tokenMint, jetUser.address);
  if (associatedTokenAccount) {
    const withdrawSlip = await jetUser.withdrawNFT(
      associatedTokenAccount,
      tokenMint,
      new PublicKey(tokenMetadata.data.updateAuthority),
      reserves
    );
    console.log(withdrawSlip);
  }
}

export const borrow = async (
  jetUser: JetUser,
  borrowAmount: number,
  borrowTokenMint: PublicKey,
  borrowReserves: JetReserve[],
  nftToBorrowAgainst: any
  ): Promise<string[]> => {
  const amount = Amount.tokens(borrowAmount);
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(borrowTokenMint, jetUser.address);
  const borrowReserve: JetReserve = borrowReserves.filter((reserve: JetReserve) => reserve.data.tokenMint.equals(borrowTokenMint))[0];
  if (associatedTokenAccount) {
    const borrow = await jetUser.borrow(
      borrowReserve,
      associatedTokenAccount, 
      amount,
      nftToBorrowAgainst
    );
    return borrow;
  }
  return [];
}

export const repay = async (
  jetUser: JetUser,
  repayAmount: number,
  repayTokenMint: PublicKey,
  repayReserves: JetReserve[]
): Promise<string> => {
  const amount = Amount.tokens(repayAmount); // basically just pay back double the loan for now
  const associatedTokenAccount: PublicKey | undefined = await deriveAssociatedTokenAccount(repayTokenMint, jetUser.address);
  const repayReserve: JetReserve = repayReserves.filter((reserve: JetReserve) => reserve.data.tokenMint.equals(repayTokenMint))[0];

  if (associatedTokenAccount) {
    const repay = await jetUser.repay(repayReserve, associatedTokenAccount, amount)
    return repay;
  }
  return '';
}