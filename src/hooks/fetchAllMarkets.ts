import { ConnectedWallet } from '../helpers/walletType';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  HoneyClient,
  HoneyMarket,
  HoneyMarketReserveInfo,
  HoneyReserve,
  HoneyUser,
  MarketReserveInfoList,
  ObligationPositionStruct,
  PositionInfoList,
} from '..';
import * as anchor from '@project-serum/anchor';
import { BN, Program } from '@project-serum/anchor';
import { NftPosition } from '../helpers/types';
import { getHealthStatus, getOraclePrice } from '../helpers/util';
import { Bid } from './useAllPositions';
import devnetIdl from '../idl/devnet/honey.json';
import mainnetBetaIdl from '../idl/mainnet-beta/honey.json';
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';

export interface MarketBundle {
  client: HoneyClient;
  market: HoneyMarket;
  reserves: HoneyReserve[];
  user: HoneyUser;
  positions?: NftPosition[];
  bids?: Bid[];
}

export const fetchAllMarkets = async (
  connection: Connection,
  wallet: ConnectedWallet | null,
  honeyId: string,
  honeyMarketIds: string[],
  devnet?: boolean,
): Promise<MarketBundle[]> => {
  const marketBundles: MarketBundle[] = [];
  const program: Program = buildProgram(honeyId, connection, wallet, devnet);
  await Promise.all(
    honeyMarketIds.map(async (honeyMarketId) => {
      const marketBundle = await buildMarketBundle(connection, wallet, honeyId, honeyMarketId);
      const positionsAndBids = await fetchPositionsAndBids(
        devnet,
        connection,
        honeyMarketId,
        marketBundle.market,
        marketBundle.reserves,
        program,
      );
      marketBundles.push({ ...marketBundle, ...positionsAndBids });
    }),
  );

  return marketBundles;
};

const buildMarketBundle = async (
  connection: Connection,
  wallet: ConnectedWallet | null,
  honeyProgramId: string,
  honeyMarketId: string,
): Promise<MarketBundle> => {
  const provider = new anchor.AnchorProvider(
    connection,
    wallet ?? new NodeWallet(new Keypair()),
    anchor.AnchorProvider.defaultOptions(),
  );
  const client: HoneyClient = await HoneyClient.connect(provider, honeyProgramId, true);
  const honeyMarketPubKey: PublicKey = new PublicKey(honeyMarketId);
  const market: HoneyMarket = await HoneyMarket.load(client, honeyMarketPubKey);

  // pull latest reserve data
  market.refresh();

  const reserves: HoneyReserve[] = market.reserves.map((reserve) => new HoneyReserve(client, market, reserve.reserve));
  await Promise.all(
    reserves.map(async (reserve) => {
      if (reserve.reserve && reserve.reserve.toBase58() !== PublicKey.default.toBase58()) await reserve.refresh();
    }),
  );

  const user: HoneyUser = await HoneyUser.load(
    client,
    market,
    wallet ? new PublicKey(wallet.publicKey) : new Keypair().publicKey,
    reserves,
  );

  return {
    client,
    market,
    reserves,
    user,
  } as MarketBundle;
};

const fetchPositionsAndBids = async (
  isDevnet: boolean,
  connection: Connection,
  honeyMarketId: string,
  honeyMarket: HoneyMarket,
  honeyReserves: HoneyReserve[],
  program: Program,
) => {
  console.log('fetching bids...');
  const resBids = await fetch(
    isDevnet
      ? `https://honey-nft-api.herokuapp.com/bids/${honeyMarketId}`
      : `https://honey-mainnet-api.herokuapp.com/bids/${honeyMarketId}`,
    // 'http://localhost:3001/bids',
    { mode: 'cors' },
  );
  const arrBids = await resBids.json();
  const highestBid = Math.max.apply(
    Math,
    arrBids.map(function (o) {
      return o.bidLimit;
    }),
  );

  console.log('fetching positions...');
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

  // reserve info
  const marketReserves = await program.account.market.fetch(honeyMarket.address);
  const reserveInfoData = new Uint8Array(marketReserves.reserves as any as number[]);
  const reserveInfoList = MarketReserveInfoList.decode(reserveInfoData) as HoneyMarketReserveInfo[];

  let obligations = await honeyMarket.fetchObligations();
  if (obligations && reserveInfoList) {
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
              const totalDebt =
                reserveInfoList[0].loanNoteExchangeRate
                  .mul(item.account?.loans[0]?.amount)
                  .div(new BN(10 ** 15))
                  .div(new BN(10 ** 6)) //!!
                  .div(new BN(10 ** 5))
                  .toNumber() /
                10 ** 4; //dividing lamport
              let position: NftPosition = {
                obligation: item.publicKey.toString(),
                debt: totalDebt,
                nft_mint: new PublicKey(nft),
                owner: item.account.owner,
                ltv: 40,
                is_healthy: getHealthStatus(totalDebt, nftPrice),
                highest_bid: highestBid,
                verifiedCreator: honeyMarket.nftCollectionCreator,
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

export const buildProgram = (honeyProgramId: string, connection: Connection, wallet: any, devnet: boolean) => {
  const idl: any = devnet ? devnetIdl : mainnetBetaIdl;
  const HONEY_PROGRAM_ID = new PublicKey(honeyProgramId);
  const provider = new anchor.AnchorProvider(
    connection,
    wallet ?? new NodeWallet(new Keypair()),
    anchor.AnchorProvider.defaultOptions(),
  );
  const program: Program = new anchor.Program(idl as any, HONEY_PROGRAM_ID, provider);
  return program;
};
