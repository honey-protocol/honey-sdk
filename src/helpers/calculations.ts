import BN from 'bn.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { getOraclePrice } from './util';
import { CachedReserveInfo, MarketAccount, ReserveConfigStruct, TReserve } from './types';
import { getCcRate } from './programUtil';
import { HoneyUser } from '../wrappers';

/**
 * @typedef {Function} calculateUserDeposits
 * @param {CachedReserveInfo[]} reserveInfo
 * @param {HoneyUser} honeyUser
 * @returns {number} totalDeposits / decimals
 */
export async function calculateUserDeposits(reserveInfo: CachedReserveInfo[], honeyUser: HoneyUser, reserve: TReserve) {
  if (!reserveInfo || !honeyUser) return;

  await honeyUser.refresh();
  let depositValue = (await honeyUser.deposits().length) > 0;
  if (depositValue == false) {
    return 0;
  } else {
    let totalDeposits = honeyUser
      .deposits()[0]
      .amount.mul(reserveInfo[0].depositNoteExchangeRate)
      .div(new BN(10 ** reserve.exponent));
    return totalDeposits;
  }
}

/**
 * @typedef {Function} calculateMarketDebt
 * @param {TReserve} honeyReserves
 * @returns {number} totalBorrows
 */
export async function calculateMarketDebt(honeyReserves: TReserve[], depositTokenMint: PublicKey): Promise<BN> {
  try {
    if (honeyReserves) {
      const depositReserve = honeyReserves.filter((reserve: any) =>
        reserve?.data?.tokenMint?.equals(depositTokenMint),
      )[0];
      const reserveState = depositReserve.reserveState;
      if (reserveState?.outstandingDebt) {
        let marketDebt = reserveState?.outstandingDebt.div(new BN(10 ** 15));
        if (marketDebt) {
          return marketDebt.div(new BN(10 ** 15)).div(new BN(10 ** depositReserve.exponent));
        }
        return marketDebt;
      }
    } else {
      return new BN(0);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * @typedef {Function} fetchAllowanceAndDebt
 * @param nftPrice floor price of nft
 * @param collateralNFTPositions number of positions
 * @param honeyUser honey user object
 * @param marketReserveInfo market reserve info object
 * @param reserve reserve account data
 * @returns sumOfAllowance
 * @returns sumOfTotalDebt
 */
export async function fetchAllowanceAndDebt(
  nftPrice: number,
  collateralNFTPositions: number,
  honeyUser: HoneyUser,
  marketReserveInfo: CachedReserveInfo,
  reserve: TReserve,
): Promise<{ sumOfAllowance: BN; sumOfTotalDebt: BN }> {
  try {
    let userLoans = new BN(0);
    let nftCollateralValue = new BN(nftPrice * collateralNFTPositions);

    honeyUser.refresh();

    if (honeyUser?.loans().length > 0) {
      if (honeyUser?.loans().length > 0 && marketReserveInfo) {
        userLoans = marketReserveInfo.loanNoteExchangeRate
          .mul(honeyUser?.loans()[0]?.amount)
          .div(new BN(10 ** 15))
          .div(new BN(10 ** reserve.exponent));
      }
    }
    let sumOfTotalDebt = userLoans;
    let sumOfAllowance = sumOfTotalDebt.sub(
      nftCollateralValue.mul(new BN(marketReserveInfo.minCollateralRatio).div(new BN(100))),
    );

    return {
      sumOfAllowance,
      sumOfTotalDebt,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * calculates the NFT's value in the base currency (USD) given the values of the onchain oracles
 * @param reserve reserve account data
 * @param market market account data
 * @param connection to the cluster
 * @returns nft floor price divided by reserve switchboard price
 */
export async function calcNFT(reserve: TReserve, market: MarketAccount, connection: Connection) {
  try {
    if (reserve && market) {
      let reservePrice = await getOraclePrice('mainnet-beta', connection, reserve.switchboardPriceAggregator);
      let floor = await getOraclePrice('mainnet-beta', connection, market.nftSwitchboardPriceAggregator);

      return floor / reservePrice;
    }
  } catch (error) {
    throw error;
  }
}

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
      let solPrice = await getOraclePrice(
        devnet ? 'devnet' : 'mainnet-beta',
        connection,
        reserve.switchboardPriceAggregator,
      );
      return solPrice;
    } catch (error) {
      throw error;
    }
  }
}

/**
 * @param config reserve config struct
 * @param utilRate current util rate
 * @returns continuous compounding rate / effective interest rate
 */
export function getInterestRate(config: ReserveConfigStruct, utilRate: number): number {
  return getCcRate(config, utilRate);
}

/**
 * @description converts bn to decimal
 * @params value as in BN, amount of decimals required, amount of precision
 * @returns number with requested decimals
 */
export function BnToDecimal(val: BN | undefined, decimal: number, precision: number) {
  if (!val) return 0;
  return val.div(new BN(10 ** (decimal - precision))).toNumber() / 10 ** precision;
}

/**
 * @description function which extends the logic as a helper
 * @params value from SDK | first multiplier | second multiplier
 * @returns outcome of sum
 */
export function BnDivided(val: BN, a: number, b: number) {
  return val.div(new BN(a ** b)).toNumber();
}
