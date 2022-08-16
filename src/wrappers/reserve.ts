import * as anchor from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import * as BL from '@solana/buffer-layout';

import { HoneyClient } from './client';
import { HoneyMarket } from './market';
import * as util from './util';
import { BN } from '@project-serum/anchor';
import { DerivedAccount } from './derived-account';
import { IReserve } from '../contexts';
import { ReserveStateLayout } from '../helpers';
import { CacheStruct, ReserveStateStruct } from '../contexts';

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
  liquidationSlippage: number;
  liquidationDexTradeMax: anchor.BN;
  confidenceThreshold: number;
}

export interface ReserveAccounts {
  vault: DerivedAccount;
  feeNoteVault: DerivedAccount;
  protocolFeeNoteVault: DerivedAccount;
  dexSwapTokens: DerivedAccount;
  dexOpenOrdersA: DerivedAccount;
  dexOpenOrdersB: DerivedAccount;
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
   * token mint for the solvent droplets
   */
  nftDropletMint?: PublicKey;

  /**
   * Dex market A
   */
  dexMarketA?: PublicKey;

  /**
   * dex market B
   */
  dexMarketB?: PublicKey;

  /**
   * The account to use for the reserve data.
   *
   * If not provided an account will be generated.
   */
  account?: Keypair;
}

export interface ReserveData {
  // index: number;
  market: PublicKey;
  switchBoardOracle: PublicKey;
  tokenMint: PublicKey;
  depositNoteMint: PublicKey;
  loanNoteMint: PublicKey;
  vault: PublicKey;
  feeNoteVault: PublicKey;
  protocolFeeNoteVault: PublicKey;
  dexSwapTokens: PublicKey;
  dexOpenOrdersA: PublicKey;
  dexOpenOrdersB: PublicKey;
  dexMarketA: PublicKey;
  dexMarketB: PublicKey;
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

export interface ReserveDexMarketAccounts {
  market: PublicKey;
  openOrders: PublicKey;
  requestQueue: PublicKey;
  eventQueue: PublicKey;
  bids: PublicKey;
  asks: PublicKey;
  coinVault: PublicKey;
  pcVault: PublicKey;
  vaultSigner: PublicKey;
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
    public address: PublicKey,
    public data?: IReserve,
    public state?: ReserveStateStruct,
  ) {
    this.conn = this.client.program.provider.connection;
  }

  async refresh(): Promise<void> {
    await this.market.refresh();
    const { data, state } = await HoneyReserve.decodeReserve(this.client, this.address);
    this.data = data;
    this.state = state;
  }

  static async decodeReserve(client: HoneyClient, address: PublicKey) {
    const reserveData = (await client.program.account.reserve.fetch(address)) as any as IReserve;
    const reserveState = ReserveStateLayout.decode(Buffer.from(reserveData.state)) as ReserveStateStruct;
    reserveData.reserveState = reserveState;

    return { data: reserveData, state: reserveState };
  }

  async sendRefreshTx(): Promise<string> {
    const tx = new Transaction().add(await this.makeRefreshIx());
    return await this.client.program.provider.sendAndConfirm(tx);
  }

  async refreshOldReserves(): Promise<void> {
    if (!this.state) {
      console.log('State is not set, call refresh');
      return;
    }
    let accruedUntil = new BN(this.state.accruedUntil);
    while (accruedUntil.add(MAX_ACCRUAL_SECONDS).lt(new BN(Math.floor(Date.now() / 1000)))) {
      this.sendRefreshTx();
      accruedUntil = accruedUntil.add(MAX_ACCRUAL_SECONDS);
    }
  }

  async makeRefreshIx(): Promise<TransactionInstruction> {
    if (!this.data) return;

    const [feeAccount, _feeAccountBump] = await PublicKey.findProgramAddress(
      [Buffer.from('fee-vault'), this.address.toBuffer()],
      this.client.program.programId,
    );

    const [protocolFeeAccount, _protocolFeeAccountBump] = await PublicKey.findProgramAddress(
      [Buffer.from('protocol-fee-vault'), this.address.toBuffer()],
      this.client.program.programId,
    );

    return this.client.program.instruction.refreshReserve({
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        reserve: this.address,
        feeNoteVault: feeAccount,
        protocolFeeNoteVault: protocolFeeAccount,
        depositNoteMint: this.data.depositNoteMint,
        switchboardPriceAggregator: this.data.switchboardPriceAggregator,
        nftSwitchboardPriceAggregator: this.market.nftSwitchboardPriceAggregator,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });
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
    const { data } = await HoneyReserve.decodeReserve(client, address);
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
      dexSwapTokens: await client.findDerivedAccount(['dex-swap-tokens', address]),
      dexOpenOrdersA: await client.findDerivedAccount(['dex-open-orders-a', address]),
      dexOpenOrdersB: await client.findDerivedAccount(['dex-open-orders-b', address]),
      loanNoteMint: await client.findDerivedAccount(['loans', address, tokenMint]),
      depositNoteMint: await client.findDerivedAccount(['deposits', address, tokenMint]),
    };
  }
}

const ReserveStateStruct = BL.struct([
  util.u64Field('accruedUntil'),
  util.numberField('outstandingDebt'),
  util.numberField('uncollectedFees'),
  util.u64Field('totalDeposits'),
  util.u64Field('totalDepositNotes'),
  util.u64Field('totalLoanNotes'),
  BL.blob(416 + 16, '_RESERVED_'),
]);
