import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { JetClient, JetMarket, JetUser, JetReserve } from "..";
import { useAnchor, Wallet } from "../contexts/anchor";
import { useConnection } from "../contexts/connection";
import { useHoney } from "../contexts/honey";
import { programIds } from "../helpers/ids";


export const useMarket = () => {
  const connection = useConnection();
  const { user, userConfigured } = useHoney();
  const wallet = user.wallet;
  const { idlMetadata, isConfigured } = useAnchor();

  const [jetClient, setJetClient] = useState<JetClient>();
  const [jetMarket, setJetMarket] = useState<JetMarket>();
  const [jetUser, setJetUser] = useState<JetUser>();
  const [jetReserves, setJetReserves] = useState<JetReserve[]>();

  useEffect(() => {
    const provider = new anchor.Provider(connection, wallet as unknown as Wallet, anchor.Provider.defaultOptions());
    const fetchJetClient = async () => {
      if (!wallet) return;
      const jetClient: JetClient = await JetClient.connect(provider, programIds().jet.JET_ID, true);
      setJetClient(jetClient);
      const markets = idlMetadata.market.market;
      const jetMarketPubKey: PublicKey = new PublicKey(markets);
      const jetMarket: JetMarket = await JetMarket.load(jetClient, jetMarketPubKey);
      setJetMarket(jetMarket);

      // USDC
      const reserveAddress = idlMetadata.reserves[0].accounts.reserve;
      const reserveAccounts = idlMetadata.reserves[0].accounts;
      reserveAccounts['market'] = idlMetadata.market.market;
      const jetReserve: JetReserve = new JetReserve(jetClient, jetMarket, reserveAddress, reserveAccounts);

      const reserves: JetReserve[] = [jetReserve];
      const jetUser: JetUser = await JetUser.load(jetClient, jetMarket, new PublicKey(wallet.publicKey), reserves);
      setJetUser(jetUser);
      setJetReserves([jetReserve]);
    }
    // load jet
    if (isConfigured && userConfigured && user.wallet)
      fetchJetClient();

  }, [isConfigured, userConfigured, connection, idlMetadata, user]);


  return {
    jetClient,
    setJetClient,
    jetMarket,
    setJetMarket,
    jetUser,
    setJetUser,
    jetReserves,
    setJetReserves
  }
}
