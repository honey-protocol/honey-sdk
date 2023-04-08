import React, { FC, ReactNode, useContext, useEffect, useState } from 'react';
import { useAnchor } from './anchor';
import { ConnectedWallet } from '../helpers/walletType';
import { useMarket } from '../hooks';
import { Connection, PublicKey } from '@solana/web3.js';
import { HoneyReserve } from '../wrappers';
import { CachedReserveInfo, MarketAccount, MarketReserveInfoList, TReserve } from '../helpers';

interface HoneyContext {
  market: MarketAccount | null;
  marketReserveInfo: CachedReserveInfo[] | null;
  parsedReserves: TReserve[] | null;
  fetchMarket: Function;
}
const HoneyContext = React.createContext<HoneyContext>({
  market: null,
  marketReserveInfo: null,
  parsedReserves: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  fetchMarket: () => null,
});

/**
 * The useHoney hook is accesible throughout the application and provides on-chain data and methods to interact with the honey program.
 *
 * @example
 * ```ts
 * import { useHoney } from '@honey-finance/sdk';
 * const { market, marketReserveInfo, parsedReserves, fetchMarket }  = useHoney();
 * ```
 */
export const useHoney = () => {
  const context = useContext(HoneyContext);
  return context;
};

export interface HoneyProps {
  children: ReactNode;
  wallet: ConnectedWallet | null;
  connection: Connection;
  honeyProgramId: string;
  honeyMarketId: string;
}

/**
 * On-chain context provider for the Honey programs.
 *
 * @example
 * You need to wrap the entrypoint to your frontend application.
 * For React Applications `src/App.tsx`. n\
 * For NextJS Applications `pages/_app.tsx`
 *
 * ```ts NextJS Example
 * import { HoneyProvider } from '@honey-finance/sdk';
 * const wallet = useConnectedWallet();
 * const connection = useConnection();
 *
 * return (
 *  <HoneyProvider
 *    wallet={wallet}
 *    connection={connection}
 *    honeyMarketId={HONEY_MARKET_ID}
 *    honeyProgram={HONEY_PROGRAM_ID}>
 *
 *    <Component {...pageProps} /> # entrypoint to your application
 *
 *  </HoneyProvider>
 * )
 * ```
 */
export const HoneyProvider: FC<HoneyProps> = ({ children, wallet, connection, honeyProgramId, honeyMarketId }) => {
  const { program, coder } = useAnchor();
  const { honeyClient, honeyMarket } = useMarket(connection, wallet, honeyProgramId, honeyMarketId);

  const [market, setMarket] = useState<MarketAccount | null>(null);
  const [marketReserveInfo, setMarketReserveInfo] = useState<CachedReserveInfo[]>();
  const [parsedReserves, setReserves] = useState<TReserve[] | null>();

  const fetchMarket = async () => {
    // market info
    const fetchMarket = (await program.account.market.fetch(honeyMarket.address)) as unknown as MarketAccount;
    setMarket(fetchMarket);

    // reserve info
    setMarketReserveInfo(fetchMarket.reserves);

    const reservesList = [] as TReserve[];
    for (const reserve of fetchMarket.reserves) {
      if (reserve.reserve.equals(PublicKey.default)) {
        continue;
      }
      const data = await HoneyReserve.decodeReserve(honeyClient, reserve.reserve);
      reservesList.push(data);
    }
    setReserves(reservesList);
  };

  useEffect(() => {
    if (!program?.provider?.connection || !coder || !honeyMarket?.address) return;

    fetchMarket();
  }, [honeyMarket, program?.provider?.connection]);

  const honeyContext = {
    market,
    marketReserveInfo,
    parsedReserves,
    fetchMarket,
  };
  return <HoneyContext.Provider value={honeyContext}>{children}</HoneyContext.Provider>;
};
