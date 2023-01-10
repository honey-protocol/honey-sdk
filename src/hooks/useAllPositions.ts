import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { useEffect, useState } from 'react';
import { HoneyClient, ObligationPositionStruct, PositionInfoList } from '..';
import { useHoney } from '../contexts/honey';
import { ConnectedWallet } from '../helpers/walletType';
import { useMarket } from './useMarket';
import * as anchor from '@project-serum/anchor';
import { BN } from '@project-serum/anchor';
import { NftPosition } from '../helpers/types';
import { getHealthStatus, getOraclePrice, TokenAmount } from '../helpers/util';
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';

export const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
export const LTV_MAX = 40;
export const LTV_MEDIUM = 30;
export const LTV_LOW = 20;

export interface Bid {
  bid: string;
  bidder: string;
  bidLimit: number;
}

export const useAllPositions = (
  connection: Connection,
  wallet: ConnectedWallet | null,
  honeyId: string,
  honeyMarketId: string,
  devnet?: boolean,
) => {
  const [status, setStatus] = useState<{
    loading: boolean;
    positions?: NftPosition[];
    bids?: Bid[];
    error?: Error;
  }>({ loading: false });

  const { honeyUser, honeyReserves, honeyMarket } = useMarket(connection, wallet, honeyId, honeyMarketId);
  const { marketReserveInfo } = useHoney();

  const fetchPositions = async (isDevnet: boolean) => {
    console.log('fetching bids...');
    const resBids = await fetch(
      isDevnet
        ? `https://honey-nft-api.herokuapp.com/bids/${honeyMarketId}`
        : `https://honey-mainnet-api.herokuapp.com/bids/${honeyMarketId}`,
      // 'http://localhost:3001/bids',
      { mode: 'cors' },
    );
    const arrBids = await resBids.json();
    // const parsedBids = arrBids.map((str) => JSON.parse(str));

    const highestBid = Math.max.apply(
      Math,
      arrBids.map(function (o) {
        return o.bidLimit;
      }),
    );
    console.log('fetching positions...');
    const provider = new anchor.AnchorProvider(
      connection,
      new NodeWallet(new Keypair()),
      anchor.AnchorProvider.defaultOptions(),
    );
    const client: HoneyClient = await HoneyClient.connect(provider, honeyId, true);
    let arrPositions: NftPosition[] = [];

    const solPriceUsd = await getOraclePrice(
      isDevnet ? 'devnet' : 'mainnet-beta',
      connection,
      honeyReserves[0].data.switchboardPriceAggregator,
    );
    const nftPriceUsd = await getOraclePrice(
      isDevnet ? 'devnet' : 'mainnet-beta',
      connection,
      honeyMarket.nftSwitchboardPriceAggregator,
    );
    const nftPrice = nftPriceUsd / solPriceUsd;

    let obligations = await honeyMarket.fetchObligations();
    if (obligations && marketReserveInfo) {
      await Promise.all(
        obligations.map(async (item) => {
          let nftMints: PublicKey[] = item.account.collateralNftMint;

          const parsePosition = (position: any) => {
            const pos: ObligationPositionStruct = {
              account: new PublicKey(position.account),
              amount: new BN(position.amount),
              side: position.side,
              reserveIndex: position.reserveIndex,
              _reserved: [],
            };
            return pos;
          };

          item.account.loans = PositionInfoList.decode(Buffer.from(item.account.loans as any as number[])).map(
            parsePosition,
          );
          await Promise.all(
            nftMints.map(async (nft) => {
              if (nft.toString() != '11111111111111111111111111111111') {

                const loanNoteBalance: TokenAmount = new TokenAmount(item.account?.loans[0]?.amount, -honeyReserves[0].data.exponent);                
                const totalDebt = loanNoteBalance.mulb(marketReserveInfo[0].loanNoteExchangeRate).divb(new BN(Math.pow(10, 15)).mul(new BN(Math.pow(10, 6))));

                let position: NftPosition = {
                  obligation: item.publicKey.toString(),
                  debt: totalDebt.uiAmountFloat,
                  nft_mint: new PublicKey(nft),
                  owner: item.account.owner,
                  ltv: 40,
                  is_healthy: getHealthStatus(totalDebt.uiAmountFloat, nftPrice),
                  highest_bid: highestBid,
                };
                arrPositions.push(position);
              }
            }),
          );
        }),
      );
      return { positions: arrPositions, bids: arrBids };
    }
  };

  // build nft positions
  useEffect(() => {
    if (!honeyUser) {
      setStatus({ loading: false, error: new Error('HoneyUser is undefined') });
      return;
    }

    fetchPositions(devnet).then((res) => {
      setStatus({ loading: false, positions: res.positions, bids: res.bids });
    });
  }, [honeyUser, marketReserveInfo]);
  return { ...status, fetchPositions: fetchPositions };
};
