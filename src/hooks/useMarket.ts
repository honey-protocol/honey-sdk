import * as anchor from '@project-serum/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { HoneyClient, HoneyMarket, HoneyUser, HoneyReserve } from '..';
import { useAnchor, Wallet } from '../contexts/anchor';
import { programIds } from '../helpers/ids';
import { SupportedWallet } from '../helpers/types';

export const useMarket = (connection: Connection, wallet: SupportedWallet, jetId: string) => {
  const { idlMetadata, isConfigured } = useAnchor();

  const [HoneyClient, setHoneyClient] = useState<HoneyClient>();
  const [HoneyMarket, setHoneyMarket] = useState<HoneyMarket>();
  const [HoneyUser, setHoneyUser] = useState<HoneyUser>();
  const [HoneyReserves, setHoneyReserves] = useState<HoneyReserve[]>();

  useEffect(() => {
    const provider = new anchor.Provider(connection, wallet as unknown as Wallet, anchor.Provider.defaultOptions());
    const fetchHoneyClient = async () => {
      if (!wallet) return;
      const client: HoneyClient = await HoneyClient.connect(provider, jetId, true);
      setHoneyClient(client);
      const markets = idlMetadata.market.market;
      const HoneyMarketPubKey: PublicKey = new PublicKey(markets);
      const market: HoneyMarket = await HoneyMarket.load(client, HoneyMarketPubKey);
      setHoneyMarket(market);

      // USDC
      const reserveAddress = idlMetadata.reserves[0].accounts.reserve;
      const reserveAccounts = idlMetadata.reserves[0].accounts;
      reserveAccounts.market = idlMetadata.market.market;
      const reserve: HoneyReserve = new HoneyReserve(client, market, reserveAddress, reserveAccounts);

      const reserves: HoneyReserve[] = [reserve];
      const HoneyUserWrapper: HoneyUser = await HoneyUser.load(client, market, new PublicKey(wallet.publicKey), reserves);
      setHoneyUser(HoneyUserWrapper);
      setHoneyReserves(reserves);
    };
    // load jet
    if (isConfigured && wallet) fetchHoneyClient();
  }, [isConfigured, connection, idlMetadata, wallet]);

  return {
    HoneyClient,
    setHoneyClient,
    HoneyMarket,
    setHoneyMarket,
    HoneyUser,
    setHoneyUser,
    HoneyReserves,
    setHoneyReserves,
  };
};
