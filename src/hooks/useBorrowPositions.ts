import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { Connection, PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { ConnectedWallet } from 'src/helpers/walletType';
import { getNFTAssociatedMetadata } from '..';
import { useHoney } from '../contexts/honey';
import { ObligationAccount } from '../helpers/honeyTypes';
import { SupportedWallet, TBorrowPosition } from '../helpers/types';
import { useMarket } from './useMarket';

export const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export const useBorrowPositions = (connection: Connection, wallet: ConnectedWallet, honeyId: string, honeyMarketId: string) => {
  const [status, setStatus] = useState<{
    loading: boolean;
    data?: TBorrowPosition[];
    error?: Error;
  }>({ loading: false });

  const { assetStore } = useHoney();
  const { honeyUser } = useMarket(connection, wallet, honeyId, honeyMarketId);

  const fetchData = async () => {
    setStatus({ loading: true });

    const borrowPositions: TBorrowPosition[] = [];
    const obligation = await honeyUser.getObligationData() as ObligationAccount;
    if (!obligation.market) {
      setStatus({ loading: false, error: new Error("Obligation does not have a valid market") });
      return;
    };
    const collateralNftMint: PublicKey[] = obligation.collateralNftMint;
    if (!collateralNftMint || collateralNftMint.length === 0) {
      setStatus({ loading: false, error: new Error("Obligation does not have a valid collateral nft mint") });
      return;
    };
    const promises = collateralNftMint.map(async (key: PublicKey, index: number) => {
      if (!key.equals(PublicKey.default)) {
        const [nftMetadata, metadataBump] = await PublicKey.findProgramAddress(
          [
            Buffer.from('metadata'), 
            METADATA_PROGRAM_ID.toBuffer(), 
            key.toBuffer()
          ],
          METADATA_PROGRAM_ID,
        );
        const data = await getNFTAssociatedMetadata(connection, nftMetadata);
        if (!data) return;
        const tokenMetadata = new Metadata(nftMetadata, data);
        const arweaveData = await (await fetch(tokenMetadata.data.data.uri)).json();
        borrowPositions.push({
          collateralTokenId: 'sadfk',
          stakeTime: 14973132,
          assetsBorrowed: [],
          name: tokenMetadata.data.data.name,
          image: arweaveData.image,
          liquidationThreshold: 11.5,
          totalInterest: 104.6,
          tokenId: key,
        });
      }
    });

    await Promise.all(promises);

    obligation.loans.map((loan: any, index: number) => {
      borrowPositions[index]?.assetsBorrowed.push({
        name: 'SOL',
        value: Math.round(assetStore?.sol.uiAmountFloat) //.SOL.loanNoteBalance.amount.toNumber()! * 1000) / 1000,
      });
    });
    setStatus({ loading: false, data: borrowPositions });
  };

  // build borrow positions
  useEffect(() => {
    if (!assetStore || !honeyUser) {
      setStatus({ loading: false, error: new Error('AssetStore or HoneyUser is undefined') });
      return;
    }
    fetchData();
  }, [honeyUser, assetStore]);

  return { ...status };
};
