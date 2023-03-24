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
 * @param honeyMarketId single market id to fetch
 * @returns HoneyClient, HoneyMarket, HoneyUser, HoneyReserve[] and their setters
 */
export const useMarket = (
  connection: Connection,
  wallet: ConnectedWallet | null,
  honeyProgramId: string,
  honeyMarketId: string,
) => {
  const { isConfigured } = useAnchor();

  const [honeyClient, setHoneyClient] = useState<HoneyClient>();
  const [honeyMarket, setHoneyMarket] = useState<HoneyMarket>();
  const [honeyUser, setHoneyUser] = useState<HoneyUser>();
  const [honeyReserves, setHoneyReserves] = useState<HoneyReserve[]>();

  useEffect(() => {
    const readOnlyKeypair = new Keypair();
    const fetchHoneyClient = async () => {
      const provider = new anchor.AnchorProvider(
        connection,
        wallet ?? new NodeWallet(readOnlyKeypair),
        anchor.AnchorProvider.defaultOptions(),
      );
      const client: HoneyClient = await HoneyClient.connect(provider, honeyProgramId, true);
      setHoneyClient(client);

      const honeyMarketPubKey: PublicKey = new PublicKey(honeyMarketId);
      const market: HoneyMarket = await HoneyMarket.load(client, honeyMarketPubKey);
      setHoneyMarket(market);

      // pull latest reserve data
      market.refresh();

      const reserves: HoneyReserve[] = market.cachedReserveInfo.map(
        (reserve) => new HoneyReserve(client, market, reserve.reserve),
      );
      await Promise.all(
        reserves.map(async (reserve) => {
          if (reserve.reserve && reserve.reserve.toBase58() !== PublicKey.default.toBase58()) await reserve.refresh();
        }),
      );
      setHoneyReserves(reserves);

      const user: HoneyUser = await HoneyUser.load(
        client,
        market,
        wallet ? new PublicKey(wallet.publicKey) : readOnlyKeypair.publicKey,
        reserves,
      );
      setHoneyUser(user);
    };
    if (isConfigured && connection && honeyProgramId && honeyMarketId) {
      fetchHoneyClient();
    }
  }, [isConfigured, connection, honeyProgramId, honeyMarketId]);

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
