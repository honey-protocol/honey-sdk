import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { BN } from '@project-serum/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { CollateralNFTPosition, getNFTAssociatedMetadata, LoanPosition, ObligationAccount } from '..';
import { ConnectedWallet } from '../helpers/walletType';
import { useMarket } from './useMarket';

export const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

/**
 * mostly deprecated, use fetchAllMarkets instead
 * @param connection to the cluster
 * @param wallet wallet adapter or null for read-only
 * @param honeyId of the program
 * @param honeyMarketId of the market
 * @returns list of collateral nft positions and loan positions
 */
export const useBorrowPositions = (
  connection: Connection,
  wallet: ConnectedWallet,
  honeyId: string,
  honeyMarketId: string,
) => {
  const [status, setStatus] = useState<{
    loading: boolean;
    collateralNFTPositions?: CollateralNFTPosition[];
    loanPositions?: LoanPosition[];
    error?: Error;
  }>({ loading: false });

  const { honeyUser } = useMarket(connection, wallet, honeyId, honeyMarketId);

  const fetchData = async () => {
    setStatus({ loading: true });

    const collateralNFTPositions: CollateralNFTPosition[] = [];
    const obligation = await honeyUser.getObligationData();
    if (!obligation.market) {
      setStatus({ loading: false, error: new Error('Obligation does not have a valid market') });
      return;
    }
    const collateralNftMint: PublicKey[] = obligation.collateralNftMint;
    if (!collateralNftMint || collateralNftMint.length === 0) {
      setStatus({ loading: false, error: new Error('Obligation does not have a valid collateral nft mint') });
      return;
    }
    const promises = collateralNftMint.map(async (key: PublicKey, index: number) => {
      if (!key.equals(PublicKey.default)) {
        const [nftMetadata, _] = await PublicKey.findProgramAddress(
          [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), key.toBuffer()],
          METADATA_PROGRAM_ID,
        );
        const data = await getNFTAssociatedMetadata(connection, nftMetadata);
        if (!data) return;
        const tokenMetadata = await Metadata.fromAccountAddress(connection, nftMetadata);
        const verifiedCreator = tokenMetadata.data.creators.filter((creator) => creator.verified)[0].address;
        const arweaveData = await (await fetch(tokenMetadata.data.uri)).json();
        collateralNFTPositions.push({
          mint: new PublicKey(tokenMetadata?.mint),
          updateAuthority: new PublicKey(tokenMetadata?.updateAuthority),
          name: tokenMetadata?.data?.name,
          symbol: tokenMetadata?.data?.symbol,
          uri: tokenMetadata?.data?.uri,
          image: arweaveData?.image,
          verifiedCreator: verifiedCreator.toBase58(),
        });
      }
    });

    await Promise.all(promises);

    // build outstanding loans in market
    const loanPositions: LoanPosition[] = [];

    obligation.loans.map((loan: any) => {
      if (loan.account.equals(PublicKey.default)) return;
      loanPositions.push({
        amount: loan.amount.div(new BN(10 ** 15)),
        tokenAccount: loan.account,
      });
    });

    setStatus({ loading: false, collateralNFTPositions, loanPositions });
  };

  const refreshPositions = async () => {
    await fetchData();
  };

  // build borrow positions
  useEffect(() => {
    if (!honeyUser) {
      setStatus({ loading: false, error: new Error('HoneyUser is undefined') });
      return;
    }
    fetchData();
  }, [honeyUser]);

  return { ...status, refreshPositions };
};
