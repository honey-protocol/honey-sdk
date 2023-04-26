import * as anchor from '@project-serum/anchor';
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { HoneyClient, HoneyMarket, HoneyUser, HoneyReserve } from '..';
import { useAnchor } from '../contexts/anchor';
import { ConnectedWallet } from '../helpers/walletType';

/**
 * Mostly deprecated, but still useful for fetching a single market
 * @param connection to the cluster
 * @param wallet wallet adapter or null for read-only
 * @param honeyProgramId of the program
 * @param honeyMarketId array of market ids
 * @returns array of HoneyUsers
 */
export const useMarket = (
  connection: Connection,
  // remove '| null'  - since we want to use this func. to init a honey user for transactions 
  wallet: ConnectedWallet,
  honeyProgramId: string,
  honeyMarketIds: string[],
) => {
  const { isConfigured } = useAnchor();

  const [honeyClient, setHoneyClient] = useState<HoneyClient>();
  const [honeyMarket, setHoneyMarket] = useState<HoneyMarket>();
  const [honeyUser, setHoneyUser] = useState<HoneyUser[]>();
  const [honeyReserves, setHoneyReserves] = useState<HoneyReserve[]>();

  useEffect(() => {
    const fetchHoneyClient = async (marketId: string) => {
      // init provider 
      const provider = new anchor.AnchorProvider(
        connection,
        wallet,
        anchor.AnchorProvider.defaultOptions(),
      );
      // init and set client
      const client: HoneyClient = await HoneyClient.connect(provider, honeyProgramId, true);
      setHoneyClient(client);
      // init and set market
      const honeyMarketPubKey: PublicKey = new PublicKey(marketId);
      const market: HoneyMarket = await HoneyMarket.load(client, honeyMarketPubKey);
      setHoneyMarket(market);

      // pull latest reserve data - add await
      await market.refresh();
      // init market reserves
      const reserves: HoneyReserve[] = market.cachedReserveInfo.map(
        (reserve) => new HoneyReserve(client, market, reserve.reserve),
      );
      // refresh all reserves so we have the latest data - set the reserves
      await Promise.all(
        reserves.map(async (reserve) => {
          if (reserve.reserve && reserve.reserve.toBase58() !== PublicKey.default.toBase58()) await reserve.refresh();
        }),
      );
      
      setHoneyReserves(reserves);
      // init and set the honey user
      const user: HoneyUser = await HoneyUser.load(
        client,
        market,
        new PublicKey(wallet.publicKey),
        reserves,
      );


      setHoneyUser((prevHoneyUser) => {
        if (prevHoneyUser.some((u) => u.market.address.toString() === user.market.address.toString())) {
        // if user for this market already exists in state, return previous state
        return prevHoneyUser;
      }
    // otherwise, append new user object to state
    return [...prevHoneyUser, user];
});
    };

    const runMarkets = async () => {
      try {
        for (const marketId of honeyMarketIds) {
          await fetchHoneyClient(marketId);
        }
      } catch (err) {
        console.log(`Error occurred running fetchHoneyClient: ${err}`);
      }
    }

    if (isConfigured && connection && honeyProgramId && honeyMarketIds.length) {
      runMarkets();
    }
  }, [isConfigured, connection, honeyProgramId, honeyMarketIds]);

  return {
    honeyClient,
    setHoneyClient,
    honeyMarket,
    setHoneyMarket,
    honeyUser,
    setHoneyUser,
    honeyReserves,
    setHoneyReserves,
  };
};
