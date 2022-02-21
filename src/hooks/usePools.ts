import { Connection, PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { useHoney } from '../contexts/honey';
import { ObligationAccount } from '../helpers/JetTypes';
import { SupportedWallet, TPool } from '../helpers/types';
import { useMarket } from './useMarket';

export const usePools = (connection: Connection, wallet: SupportedWallet, jetId: string) => {
  const { market, user } = useHoney();
  const { jetUser } = useMarket(connection, wallet, jetId);
  const [status, setStatus] = useState<{
    loading: boolean;
    data: TPool[];
    error?: Error;
  }>({ loading: false, data: [] });

  useEffect(() => {
    const fetchPools = async () => {
      if (!market.reserves.SOL || !jetUser || !user.assets) return;
      setStatus({ loading: true, data: [] });
      const reserve = market.reserves.SOL;
      const obligation = (await jetUser.getObligationData()) as ObligationAccount;
      if (!obligation.collateralNftMint) return;
      const collateralNftMint: PublicKey[] = obligation.collateralNftMint;
      const numOfPositions =
        !collateralNftMint || collateralNftMint.length === 0
          ? 0
          : collateralNftMint.filter((mint) => !mint.equals(PublicKey.default)).length;
      const data = {
        id: '3uT1ULwpnxNRrtbrwnNvEoGG7jZhxiNuQ7Rnw4kaR2x8',
        imageUrl: 'https://www.arweave.net/rr6teTGplFJsnp0LdGNEqLPVU1gnFLGo5ay_HRNLTpY?ext=png',
        publicKey: PublicKey.default,
        title: 'Test Net Bees',
        totalSupplied: reserve.marketSize.uiAmount,
        totalBorrowed: (reserve.marketSize.uiAmountFloat - reserve.availableLiquidity.uiAmountFloat).toString(),
        userDeposit: {
          sol: user.assets.tokens.SOL.depositNoteBalance.uiAmountFloat,
          usdc: 0,
        },
        userBorrowStatus: {
          numOfPositions,
          positionHealths: [0],
        },
        borrowRate: reserve.borrowRate,
        interestRate: reserve.depositRate,
        APY: reserve.borrowRate, // same as borrowRate
        collateralEvaluation: 5000, // todo do we need this?
      };
      setStatus({ loading: false, data: [data as unknown as TPool] });
    };
    fetchPools();
  }, [market.reserves, user.assets, jetUser]);

  return { ...status };
};
