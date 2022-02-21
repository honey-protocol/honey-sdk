import * as anchor from '@project-serum/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { JetClient, JetMarket, JetUser, JetReserve } from '..';
import { useAnchor, Wallet } from '../contexts/anchor';
import { programIds } from '../helpers/ids';
import { SupportedWallet } from '../helpers/types';

export const useMarket = (connection: Connection, wallet: SupportedWallet, jetId: string) => {
  const { idlMetadata, isConfigured } = useAnchor();

  const [jetClient, setJetClient] = useState<JetClient>();
  const [jetMarket, setJetMarket] = useState<JetMarket>();
  const [jetUser, setJetUser] = useState<JetUser>();
  const [jetReserves, setJetReserves] = useState<JetReserve[]>();

  useEffect(() => {
    const provider = new anchor.Provider(connection, wallet as unknown as Wallet, anchor.Provider.defaultOptions());
    const fetchJetClient = async () => {
      if (!wallet) return;
      const client: JetClient = await JetClient.connect(provider, jetId, true);
      setJetClient(client);
      const markets = idlMetadata.market.market;
      const jetMarketPubKey: PublicKey = new PublicKey(markets);
      const market: JetMarket = await JetMarket.load(client, jetMarketPubKey);
      setJetMarket(market);

      // USDC
      const reserveAddress = idlMetadata.reserves[0].accounts.reserve;
      const reserveAccounts = idlMetadata.reserves[0].accounts;
      reserveAccounts.market = idlMetadata.market.market;
      const reserve: JetReserve = new JetReserve(client, market, reserveAddress, reserveAccounts);

      const reserves: JetReserve[] = [reserve];
      const jetUserWrapper: JetUser = await JetUser.load(client, market, new PublicKey(wallet.publicKey), reserves);
      setJetUser(jetUserWrapper);
      setJetReserves(reserves);
    };
    // load jet
    if (isConfigured && wallet) fetchJetClient();
  }, [isConfigured, connection, idlMetadata, wallet]);

  return {
    jetClient,
    setJetClient,
    jetMarket,
    setJetMarket,
    jetUser,
    setJetUser,
    jetReserves,
    setJetReserves,
  };
};
