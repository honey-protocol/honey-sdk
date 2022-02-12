import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { getNFTAssociatedMetadata, JetUser } from "..";
import { useConnection } from "../contexts/connection";
import { useHoney } from "../contexts/honey";
import { METADATA_PROGRAM_ID } from "../helpers/ids";
import { ObligationAccount } from "../helpers/JetTypes";
import { TBorrowPosition } from "../helpers/types";
import { useMarket } from "./useMarket";

export const useBorrowPositions = () => {
  const [userPositions, setUserPositions] = useState<TBorrowPosition[]>([]);
  const { user } = useHoney();
  const { jetUser } = useMarket();
  const connection = useConnection();

  const fetchData = async (jetUser: JetUser) => {
    const borrowPositions: TBorrowPosition[] = [];
    const obligation = await jetUser.getObligationData() as ObligationAccount;
    if (!obligation.market) return;
    const collateralNftMint: PublicKey[] = obligation.collateralNftMint;
    if (!collateralNftMint || collateralNftMint.length == 0) return;
    const metadataPubKey = new PublicKey(METADATA_PROGRAM_ID);
    const promises = collateralNftMint.map(async (key: PublicKey, index: number) => {
      if (!key.equals(PublicKey.default)) {
        const [nftMetadata, metadataBump] = await PublicKey.findProgramAddress(
          [
            Buffer.from("metadata"),
            metadataPubKey.toBuffer(),
            key.toBuffer()
          ],
          metadataPubKey
        );
        const data = await getNFTAssociatedMetadata(connection, nftMetadata);
        if (!data)
          return
        const tokenMetadata = new Metadata(nftMetadata, data);
        const arweaveData = await (await fetch(tokenMetadata.data.data.uri)).json();
        borrowPositions.push(
          {
            collateralTokenId: "sadfk",
            stakeTime: 14973132,
            assetsBorrowed: [],
            name: tokenMetadata.data.data.name,
            image: arweaveData.image,
            liquidationThreshold: 11.5,
            totalInterest: 104.6,
            tokenId: key
          }
        );
      }
    });

    await Promise.all(promises);

    obligation.loans.map((loan: any, index: number) => {
      borrowPositions[index]?.assetsBorrowed.push(
        { name: "sol", value: Math.round(user.assets?.tokens["SOL"].loanNoteBalance.amount.toNumber()! * 1000) / 1000 }
      )
    })
    console.log(borrowPositions);
    setUserPositions(borrowPositions);
  }

  // build borrow positions
  useEffect(() => {
    if (!user.assets || !jetUser) return;
    fetchData(jetUser);
  }, [jetUser])

  return { userPositions };
}
