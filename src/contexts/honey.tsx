import React, { FC, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { HoneyMarketReserveInfo } from '../helpers/honeyTypes';
import { useAnchor } from './anchor';
import * as anchor from "@project-serum/anchor";
import { MarketReserveInfoList, ReserveStateLayout } from '../helpers/layout';
import { ConnectedWallet } from '../helpers/walletType';
import { useMarket } from '../hooks';
import { Connection, PublicKey } from '@solana/web3.js';
import { BN } from '@project-serum/anchor';
import { HoneyReserve } from '../wrappers';

interface HoneyContext {
  market: IMarket | null,
  marketReserveInfo: HoneyMarketReserveInfo[] | null,
  parsedReserves: IReserve[] | null;
  fetchMarket: Function
}
const HoneyContext = React.createContext<HoneyContext>({
  market: null,
  marketReserveInfo: null,
  parsedReserves: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  fetchMarket: () => null
});

export const useHoney = () => {
  const context = useContext(HoneyContext);
  return context;
};

export interface HoneyProps {
  children: ReactNode,
  wallet: ConnectedWallet | null;
  connection: Connection,
  honeyProgramId: string;
  honeyMarketId: string;
}

export interface IMarket {
  authorityBumpSeed: number[],
  authoritySeed: PublicKey,
  flags: number,
  marketAuthority: PublicKey,
  nftCollectionCreator: PublicKey,
  owner: PublicKey,
  quoteCurrency: number[],
  quoteExponent: number,
  quoteTokenMint: PublicKey,
  reserved: number[],
  reserves: number[],
  version: 0
}

export interface IReserve {
  config: any;
  depositNoteMint: PublicKey;
  dexMarketA: PublicKey;
  dexMarketB: PublicKey;
  dexOpenOrdersA: PublicKey;
  dexOpenOrdersB: PublicKey;
  dexSwapTokens: PublicKey;
  exponent: number;
  feeNoteVault: PublicKey;
  index: number;
  loanNoteMint: PublicKey;
  market: PublicKey;
  nftDropletMint: PublicKey;
  nftDropletVault: PublicKey;
  protocolFeeNoteVault: PublicKey;
  pythOraclePrice: PublicKey;
  pythOracleProduct: PublicKey;
  reserved0: number[];
  reserved1: number[];
  state: number[];
  tokenMint: PublicKey;
  vault: PublicKey;
  version: number;
  reserveState: ReserveStateStruct;
}

export type ReserveStateStruct = CacheStruct & {
  accruedUntil: BN,
  outstandingDebt: BN,
  uncollectedFees: BN,
  uncollectedProtocolFees: BN,
  totalDeposits: BN,
  totalDepositNotes: BN,
  totalLoanNotes: BN,
  _reserved: number[],
};

export interface CacheStruct {
  /** The last slot that this information was updated in */
  lastUpdated: BN,
  /** Whether the value has been manually invalidated */
  invalidated: number,
  /** Unused space */
  _reserved: number[],
};

export const HoneyProvider: FC<HoneyProps> = ({
  children,
  wallet,
  connection,
  honeyProgramId,
  honeyMarketId
}) => {
  const { program, coder } = useAnchor();
  const { honeyClient, honeyMarket } = useMarket(connection, wallet, honeyProgramId, honeyMarketId)

  const [market, setMarket] = useState<IMarket | null>(null);
  const [marketReserveInfo, setMarketReserveInfo] = useState<HoneyMarketReserveInfo[]>()
  const [parsedReserves, setReserves] = useState<IReserve[] | null>();

  const fetchMarket = async () => {
    // market info
    const marketValue = await program.account.market.fetch(honeyMarket.address);
    setMarket(marketValue as IMarket);

    // reserve info
    const reserveInfoData = new Uint8Array(marketValue.reserves as any as number[]);
    const reserveInfoList = MarketReserveInfoList.decode(reserveInfoData) as HoneyMarketReserveInfo[];
    setMarketReserveInfo(reserveInfoList);

    const reservesList = [] as IReserve[];
    for (const reserve of reserveInfoList) {
      if (reserve.reserve.equals(PublicKey.default)) {
        continue;
      };
      const { data, state } = await HoneyReserve.decodeReserve(honeyClient, reserve.reserve);
      reservesList.push(data);
    }
    console.log("reserves list", reservesList);
    setReserves(reservesList);
  }

  useEffect(() => {
    if (!program?.provider?.connection || !coder || !honeyMarket?.address)
      return

    fetchMarket();

  }, [honeyMarket, program?.provider?.connection]);

  const honeyContext = {
    market,
    marketReserveInfo,
    parsedReserves,
    fetchMarket
  }
  return (
    <HoneyContext.Provider
      value={honeyContext}>
      {children}
    </HoneyContext.Provider>
  )
}

