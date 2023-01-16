import { Connection } from '@solana/web3.js';
import { getOraclePrice } from './util';
import { TReserve } from './types';

/**
 * fetches the onchain price of Reserve in USD
 * @param reserve reserve account data
 * @param connection to the cluster
 * @param devnet flag to determine if devnet or mainnet
 * @returns reserve price as seen by the oracle
 */
export async function fetchReservePrice(reserve: TReserve, connection: Connection, devnet?: boolean) {
  if (reserve && connection) {
    try {
      let reservePrice = await getOraclePrice(
        devnet ? 'devnet' : 'mainnet-beta',
        connection,
        reserve.switchboardPriceAggregator,
      );
      return reservePrice;
    } catch (error) {
      throw error;
    }
  }
}
