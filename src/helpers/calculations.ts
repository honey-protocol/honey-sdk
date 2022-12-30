import BN from 'bn.js';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { HoneyMarketReserveInfo, HoneyUser, TReserve } from '@honey-finance/sdk';
import { getOraclePrice, RoundHalfDown, RoundHalfUp } from './util';
import { MarketAccount, ReserveConfigStruct } from './types';
import { getCcRate } from './programUtil';

/**
 * @typedef {Function} calculateUserDeposits
 * @param {HoneyMarketReserveInfo} marketReserveInfo
 * @param {HoneyUser} honeyUser
 * @returns {number} totalDeposits
 */
export async function calculateUserDeposits(marketReserveInfo: HoneyMarketReserveInfo, honeyUser: HoneyUser) {
  if (!marketReserveInfo || !honeyUser) return;

  await honeyUser.refresh();
  let depositNoteExchangeRate = BnToDecimal(marketReserveInfo[0].depositNoteExchangeRate, 15, 5);
  let depositValue = (await honeyUser.deposits().length) > 0;
  if (depositValue == false) {
    return 0;
  } else {
    let totalDeposits =
      (honeyUser
        .deposits()[0]
        .amount.div(new BN(10 ** 5))
        .toNumber() *
        depositNoteExchangeRate) /
      10 ** 4;
    return totalDeposits;
  }
}

/**
 * @typedef {Function} calculateUserBorrows
 * @param {TReserve} honeyReserves
 * @returns {number} totalBorrows
 */
export async function calculateMarketDebt(honeyReserves: TReserve[]) {
  try {
    const depositTokenMint = new PublicKey('So11111111111111111111111111111111111111112');

    if (honeyReserves) {
      const depositReserve = honeyReserves.filter((reserve: any) =>
        reserve?.data?.tokenMint?.equals(depositTokenMint),
      )[0];
      const reserveState = depositReserve.reserveState;
      if (reserveState?.outstandingDebt) {
        let marketDebt = reserveState?.outstandingDebt.div(new BN(10 ** 15)).toNumber();
        if (marketDebt) {
          let sum = Number(marketDebt / LAMPORTS_PER_SOL);
          return (marketDebt = RoundHalfDown(sum));
        }
        return marketDebt;
      }
    } else {
      return 0;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * @typedef {Function} fetchAllowanceLtvAndDebt
 * @param nftPrice floor price of nft
 * @param collateralNFTPositions number of positions
 * @param honeyUser honey user object
 * @param marketReserveInfo market reserve info object
 * @param ltv ltv from reserve config
 * @returns sumOfAllowance
 * @returns sumOfTotalDebt
 */
export async function fetchAllowanceLtvAndDebt(
  nftPrice: number,
  collateralNFTPositions: any,
  honeyUser: HoneyUser,
  marketReserveInfo: HoneyMarketReserveInfo,
  ltv: number,
): Promise<{ sumOfAllowance: number; sumOfTotalDebt: number }> {
  try {
    let totalDebt = 0;
    let userLoans = 0;
    let nftCollateralValue = nftPrice * collateralNFTPositions;

    if (honeyUser?.loans().length > 0) {
      if (honeyUser?.loans().length > 0 && marketReserveInfo) {
        userLoans =
          (marketReserveInfo[0].loanNoteExchangeRate
            .mul(honeyUser?.loans()[0]?.amount)
            .div(new BN(10 ** 15))
            .toNumber() *
            1.002) /
          LAMPORTS_PER_SOL;
        totalDebt =
          marketReserveInfo[0].loanNoteExchangeRate
            .mul(honeyUser?.loans()[0]?.amount)
            .div(new BN(10 ** 15))
            .toNumber() / LAMPORTS_PER_SOL;
      }
    }
    let sumOfAllowance = RoundHalfDown(nftCollateralValue * ltv - userLoans, 4);
    let sumOfTotalDebt = RoundHalfUp(totalDebt);
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
 * @returns
 */
export async function calcNFT(reserve: TReserve, market: MarketAccount, connection: Connection) {
  try {
    if (reserve && market) {
      let solPrice = await getOraclePrice('mainnet-beta', connection, reserve.switchboardPriceAggregator); //in sol
      let nftPrice = await getOraclePrice('mainnet-beta', connection, market.nftSwitchboardPriceAggregator); //in usd

      return nftPrice / solPrice;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * fetches the onchain price of SOL in USD
 * @param reserve reserve account data
 * @param connection to the cluster
 * @param devnet flag to determine if devnet or mainnet
 * @returns sol price as seen by the oracle
 */
export async function fetchSolPrice(reserve: TReserve, connection: Connection, devnet?: boolean) {
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
