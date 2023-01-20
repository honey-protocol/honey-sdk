import * as anchor from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { HoneyClient } from './client';
import { HoneyMarket } from './market';
import { BN } from '@project-serum/anchor';
import { DerivedAccount } from './derived-account';
import {
  getCcRate,
  getOraclePrice,
  ReserveState,
  ReserveStateLayout,
  ReserveStateStruct,
  TReserve,
  TotalReserveState,
  onChainNumberToBN,
} from '../helpers';

export interface ReserveConfig {
  utilizationRate1: number;
  utilizationRate2: number;
  borrowRate0: number;
  borrowRate1: number;
  borrowRate2: number;
  borrowRate3: number;
  minCollateralRatio: number;
  liquidationPremium: number;
  manageFeeCollectionThreshold: anchor.BN;
  manageFeeRate: number;
  loanOriginationFee: number;
}

export interface ReserveAccounts {
  vault: DerivedAccount;
  feeNoteVault: DerivedAccount;
  protocolFeeNoteVault: DerivedAccount;
  loanNoteMint: DerivedAccount;
  depositNoteMint: DerivedAccount;
}

export interface CreateReserveParams {
  /**
   * The Serum market for the reserve.
   */
  dexMarket?: PublicKey;

  /**
   * The mint for the token to be stored in the reserve.
   */
  tokenMint: PublicKey;

  /**
   * The Switchboard account containing the price information for the reserve token.
   */
  switchboardOracle: PublicKey;

  /**
   * The initial configuration for the reserve
   */
  config: ReserveConfig;

  /**
   * The account to use for the reserve data.
   *
   * If not provided an account will be generated.
   */
  account?: Keypair;
}

export interface ReserveData {
  market: PublicKey;
  switchBoardOracle: PublicKey;
  tokenMint: PublicKey;
  depositNoteMint: PublicKey;
  loanNoteMint: PublicKey;
  vault: PublicKey;
  feeNoteVault: PublicKey;
  protocolFeeNoteVault: PublicKey;
}

export interface ReserveStateData {
  accruedUntil: anchor.BN;
  outstandingDebt: anchor.BN;
  uncollectedFees: anchor.BN;
  protocolUncollectedFees: anchor.BN;
  totalDeposits: anchor.BN;
  totalDepositNotes: anchor.BN;
  totalLoanNotes: anchor.BN;
}

export interface UpdateReserveConfigParams {
  config: ReserveConfig;
  reserve: PublicKey;
  market: PublicKey;
  owner: Keypair;
}

const SECONDS_PER_HOUR: BN = new BN(3600);
const SECONDS_PER_DAY: BN = SECONDS_PER_HOUR.muln(24);
const SECONDS_PER_WEEK: BN = SECONDS_PER_DAY.muln(7);
const MAX_ACCRUAL_SECONDS: BN = SECONDS_PER_WEEK;
export class HoneyReserve {
  private conn: Connection;

  constructor(
    private client: HoneyClient,
    private market: HoneyMarket,
    public reserve: PublicKey,
    public data?: TReserve,
  ) {
    this.conn = this.client.program.provider.connection;
  }

  async refresh(): Promise<void> {
    await this.market.refresh();
    const data = await HoneyReserve.decodeReserve(this.client, this.reserve);
    this.data = data;
  }

  static async decodeReserve(client: HoneyClient, address: PublicKey): Promise<TReserve> {
    const reserveData = (await client.program.account.reserve.fetch(address)) as any as TReserve;
    const reserveState = ReserveStateLayout.decode(Buffer.from(reserveData.state)) as ReserveStateStruct;
    reserveData.reserveState = reserveState;

    return reserveData;
  }

  /**
   *
   * @returns {TotalReserveState} gathers all of the state information for the reserve from the chain and converts
   * it into human readable format useable by the front end.
   */
  gatherReserveState(): TotalReserveState {
    const { utilization, interestRate } = this.getUtilizationAndInterestRate();
    return {
      config: this.getReserveConfig(),
      state: this.getReserveState(),
      utilization,
      interestRate,
    };
  }

  /**
   * Get specific information about the configuration of the reserve.
   * Example include fees charges, expected collateralization ratios and interest rate.
   * @returns {ReserveConfig} The reserve config
   */
  getReserveConfig(): ReserveConfig {
    return this.data.config;
  }

  /**
   * Get the top level information needed for each reserve.
   * outstandingDebt, uncollectedFees and protocolUncollectedFees are stored as a special Number type on the
   * backend and therefore need to be converted by dividing by 10^15.
   * @returns {ReserveState} The latest state of the total reserve in string format
   */
  getReserveState(): ReserveState {
    const decimals = new anchor.BN(10 ** (this.data.exponent * -1));

    const outstandingAsUnderlying = onChainNumberToBN(this.data.reserveState.outstandingDebt).div(decimals).toString();
    const uncollectedAsUnderlying = onChainNumberToBN(this.data.reserveState.uncollectedFees).div(decimals).toString();
    const protocolUncollectedAsUnderlying = onChainNumberToBN(this.data.reserveState.protocolUncollectedFees)
      .div(decimals)
      .toString();

    return {
      accruedUntil: this.data.reserveState.outstandingDebt.toString(),
      outstandingDebt: outstandingAsUnderlying,
      uncollectedFees: uncollectedAsUnderlying,
      protocolUncollectedFees: protocolUncollectedAsUnderlying,
      totalDeposits: this.data.reserveState.totalDeposits.div(decimals).toString(),
      totalDepositNotes: this.data.reserveState.totalDepositNotes.div(decimals).toString(),
      totalLoanNotes: this.data.reserveState.totalLoanNotes.div(decimals).toString(),
    };
  }

  /**
   * Takes the reserve level state and calculates the current utilization
   * and interest rate based on the utilization.
   */
  getUtilizationAndInterestRate(): { utilization: number; interestRate: number } {
    const outstandingDebt = onChainNumberToBN(this.data.reserveState.outstandingDebt);
    const totalDeposits = this.data.reserveState.totalDeposits;
    const util = outstandingDebt.div(totalDeposits.add(outstandingDebt)).toNumber();
    const interestRate = getCcRate(this.data.config, util);
    return { utilization: util, interestRate: interestRate };
  }

  async sendRefreshTx(): Promise<string> {
    const tx = new Transaction().add(await this.makeRefreshIx());
    return await this.client.program.provider.sendAndConfirm(tx);
  }

  async fetchReserveValue(cluster: 'mainnet-beta' | 'devnet' = 'mainnet-beta'): Promise<number> {
    // @ts-ignore - switchboard doesn't export their big number type
    const bigNumber = await getOraclePrice(cluster, this.conn, this.data.switchboardPriceAggregator);
    return bigNumber.toNumber();
  }

  async refreshOldReserves(): Promise<void> {
    if (!this.data.reserveState) {
      console.log('State is not set, call refresh');
      return;
    }
    let accruedUntil = new BN(this.data.reserveState.accruedUntil);
    while (accruedUntil.add(MAX_ACCRUAL_SECONDS).lt(new BN(Math.floor(Date.now() / 1000)))) {
      await this.sendRefreshTx();
      accruedUntil = accruedUntil.add(MAX_ACCRUAL_SECONDS);
    }
  }

  async makeRefreshIx(): Promise<TransactionInstruction> {
    if (!this.data) return;

    const [feeAccount, _feeAccountBump] = await PublicKey.findProgramAddress(
      [Buffer.from('fee-vault'), this.reserve.toBuffer()],
      this.client.program.programId,
    );

    const [protocolFeeAccount, _protocolFeeAccountBump] = await PublicKey.findProgramAddress(
      [Buffer.from('protocol-fee-vault'), this.reserve.toBuffer()],
      this.client.program.programId,
    );

    return this.client.program.methods
      .refreshReserve()
      .accounts({
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        reserve: this.reserve,
        feeNoteVault: feeAccount,
        protocolFeeNoteVault: protocolFeeAccount,
        depositNoteMint: this.data.depositNoteMint,
        switchboardPriceAggregator: this.data.switchboardPriceAggregator,
        nftSwitchboardPriceAggregator: this.market.nftSwitchboardPriceAggregator,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
  }

  async updateReserveConfig(params: UpdateReserveConfigParams): Promise<void> {
    await this.client.program.rpc.updateReserveConfig(params.config, {
      accounts: {
        market: params.market,
        reserve: params.reserve,
        owner: params.owner.publicKey,
      },
      signers: [params.owner],
    });
  }

  static async load(client: HoneyClient, address: PublicKey, maybeMarket?: HoneyMarket): Promise<HoneyReserve> {
    const data = await HoneyReserve.decodeReserve(client, address);
    const market = maybeMarket || (await HoneyMarket.load(client, data.market));
    return new HoneyReserve(client, market, address, data);
  }

  /**
   * Derive all the associated accounts for a reserve.
   * @param address The reserve address to derive the accounts for.
   * @param tokenMint The address of the mint for the token stored in the reserve.
   * @param market The address of the market the reserve belongs to.
   */
  static async deriveAccounts(client: HoneyClient, address: PublicKey, tokenMint: PublicKey): Promise<ReserveAccounts> {
    return {
      vault: await client.findDerivedAccount(['vault', address]),
      feeNoteVault: await client.findDerivedAccount(['fee-vault', address]),
      protocolFeeNoteVault: await client.findDerivedAccount(['protocol-fee-vault', address]),
      loanNoteMint: await client.findDerivedAccount(['loans', address, tokenMint]),
      depositNoteMint: await client.findDerivedAccount(['deposits', address, tokenMint]),
    };
  }
}
