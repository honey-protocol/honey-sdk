import React, { FC, ReactNode, useContext, useEffect, useState } from 'react'
import { HoneyMarketReserveInfo } from '../helpers/honeyTypes';
import { useAnchor } from './anchor';
import { MarketReserveInfoList } from '../helpers/layout';
import { ConnectedWallet } from '../helpers/walletType';
import { useMarket } from '../hooks';
import { Connection, PublicKey } from '@solana/web3.js';
import { HoneyReserve } from '../wrappers';
import { TMarket, TReserve } from '../helpers';

interface HoneyContext {
  market: TMarket | null,
  marketReserveInfo: HoneyMarketReserveInfo[] | null,
  parsedReserves: TReserve[] | null;
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

export const HoneyProvider: FC<HoneyProps> = ({
  children,
  wallet,
  connection,
  honeyProgramId,
  honeyMarketId
}) => {
  const { program, coder } = useAnchor();
  const { honeyClient, honeyMarket } = useMarket(connection, wallet, honeyProgramId, honeyMarketId)

  const [market, setMarket] = useState<TMarket | null>(null);
  const [marketReserveInfo, setMarketReserveInfo] = useState<HoneyMarketReserveInfo[]>()
  const [parsedReserves, setReserves] = useState<TReserve[] | null>();

  const fetchMarket = async () => {
    // market info
    const marketValue = await program.account.market.fetch(honeyMarket.address);
    setMarket(marketValue as any as TMarket);

    // reserve info
    const reserveInfoData = new Uint8Array(marketValue.reserves as any as number[]);
    const reserveInfoList = MarketReserveInfoList.decode(reserveInfoData) as HoneyMarketReserveInfo[];
    setMarketReserveInfo(reserveInfoList);

    const reservesList = [] as TReserve[];
    for (const reserve of reserveInfoList) {
      if (reserve.reserve.equals(PublicKey.default)) {
        continue;
      };
      console.log('reserve', reserve.reserve.toString());

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

