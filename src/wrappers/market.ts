import * as anchor from '@project-serum/anchor';
import { HoneyClient } from './client';
import { CreateReserveParams, HoneyReserve } from './reserve';
import { PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token';
import { HoneyMarketReserveInfo, MarketReserveInfoList, ReserveStateStruct, TMarket, TReserve } from '../helpers';

export interface HoneyMarketData {
  quoteTokenMint: PublicKey;
  marketAuthority: PublicKey;
  owner: PublicKey;
  nftSwitchboardPriceAggregator: PublicKey;
  nftCollectionCreator: PublicKey;
  market: TMarket;
  reserves: HoneyMarketReserveInfo[];
  reserveList: ReserveDataAndState[];
}

export interface ReserveDataAndState {
  data: TReserve;
  state: ReserveStateStruct;
}

export class HoneyMarket implements HoneyMarketData {
  private constructor(
    private client: HoneyClient,
    public address: PublicKey,
    public quoteTokenMint: PublicKey,
    public marketAuthority: PublicKey,
    public owner: PublicKey,
    public market: TMarket,
    public reserves: HoneyMarketReserveInfo[],
    public reserveList: ReserveDataAndState[],
    public nftSwitchboardPriceAggregator: PublicKey,
    public nftCollectionCreator: PublicKey,
  ) {}

  async fetchObligations(): Promise<any[]> {
    let obligations = await this.client.program.account.obligation?.all();
    obligations = obligations.filter((item) => {
      return (
        item.account.market.toString() == this.address.toString() &&
        item.account.collateralNftMint[0].toString() != PublicKey.default.toString()
      );
    });
    return obligations;
  }

  public static async fetchMarket(
    client: HoneyClient,
    address?: PublicKey,
  ): Promise<[TMarket, HoneyMarketReserveInfo[], ReserveDataAndState[]]> {
    const tMarket: TMarket = (await client.program.account.market.fetch(address)) as any as TMarket;

    const reserveInfoData = new Uint8Array(tMarket.reserves);
    const reserveInfoList = MarketReserveInfoList.decode(reserveInfoData) as HoneyMarketReserveInfo[];

    const reservesList = [] as ReserveDataAndState[];
    for (const reserve of reserveInfoList) {
      if (reserve.reserve.equals(PublicKey.default)) {
        continue;
      }
      const { data, state } = await HoneyReserve.decodeReserve(client, reserve.reserve);
      reservesList.push({ data, state });
    }

    return [tMarket, reserveInfoList, reservesList];
  }

  /**
   * Load the market account data from the network.
   * @param client The program client
   * @param address The address of the market.
   * @returns An object for interacting with the Honey market.
   */
  static async load(client: HoneyClient, address: PublicKey): Promise<HoneyMarket> {
    const [tMarket, reserveInfoList, reserveList] = await HoneyMarket.fetchMarket(client, address);

    return new HoneyMarket(
      client,
      address,
      tMarket.quoteTokenMint,
      tMarket.marketAuthority,
      tMarket.owner,
      tMarket,
      reserveInfoList,
      reserveList,
      tMarket.nftSwitchboardPriceAggregator,
      tMarket.nftCollectionCreator,
    );
  }

  /**
   * Get the latest market account data from the network.
   */
  async refresh(): Promise<void> {
    const [tMarket, reserveInfoList, reserveList] = await HoneyMarket.fetchMarket(this.client, this.address);

    this.market = tMarket;
    this.reserves = reserveInfoList;
    this.reserveList = reserveList;
    this.owner = tMarket.owner;
    this.marketAuthority = tMarket.marketAuthority;
    this.quoteTokenMint = tMarket.quoteTokenMint;
    this.nftSwitchboardPriceAggregator = tMarket.nftSwitchboardPriceAggregator;
    this.nftCollectionCreator = tMarket.nftCollectionCreator;
  }

  async setFlags(flags: u64) {
    await this.client.program.rpc.setMarketFlags(flags, {
      accounts: {
        market: this.address,
        owner: this.owner,
      },
    });
  }

  async createReserve(params: CreateReserveParams): Promise<HoneyReserve> {
    let account = params.account;

    if (account === undefined) {
      account = Keypair.generate();
    }

    const derivedAccounts = await HoneyReserve.deriveAccounts(this.client, account.publicKey, params.tokenMint);

    const [feeAccount, feeAccountBump] = await PublicKey.findProgramAddress(
      [Buffer.from('fee-vault'), account.publicKey.toBuffer()],
      this.client.program.programId,
    );

    const [protocolFeeAccount, protocolFeeAccountBump] = await PublicKey.findProgramAddress(
      [Buffer.from('protocol-fee-vault'), account.publicKey.toBuffer()],
      this.client.program.programId,
    );

    const bumpSeeds = {
      vault: derivedAccounts.vault.bumpSeed,
      feeNoteVault: feeAccountBump,
      protocolFeeNoteVault: protocolFeeAccountBump,
      dexOpenOrdersA: derivedAccounts.dexOpenOrdersA.bumpSeed,
      dexOpenOrdersB: derivedAccounts.dexOpenOrdersB.bumpSeed,
      dexSwapTokens: derivedAccounts.dexSwapTokens.bumpSeed,
      loanNoteMint: derivedAccounts.loanNoteMint.bumpSeed,
      depositNoteMint: derivedAccounts.depositNoteMint.bumpSeed,
    };

    const createReserveAccount = await this.client.program.account.reserve.createInstruction(account);
    const transaction = new Transaction();
    transaction.add(createReserveAccount);
    const initTx = await this.client.program.provider.sendAndConfirm(transaction, [account], { skipPreflight: true });
    console.log(`Init reserve account tx ${initTx}`);

    const txid = await this.client.program.methods
      .initReserve(bumpSeeds, params.config)
      .accounts({
        market: this.address,
        marketAuthority: this.marketAuthority,
        reserve: account.publicKey,
        vault: derivedAccounts.vault.address,
        depositNoteMint: derivedAccounts.depositNoteMint.address,
        feeNoteVault: feeAccount,
        protocolFeeNoteVault: protocolFeeAccount,
        tokenMint: params.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        switchboardPriceAggregator: params.switchboardOracle,
        loanNoteMint: derivedAccounts.loanNoteMint.address,
        owner: this.owner,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    return await HoneyReserve.load(this.client, account.publicKey, this);
  }
}

export interface CreateMarketParams {
  /**
   * The address that must sign to make future changes to the market,
   * such as modifying the available reserves (or their configuation)
   */
  owner: PublicKey;

  /**
   * The token mint for the currency being used to quote the value of
   * all other tokens stored in reserves.
   */
  quoteCurrencyMint: PublicKey;

  /**
   * The name of the currency used for quotes, this has to match the
   * name specified in any Switchboard/oracle accounts.
   */
  quoteCurrencyName: string;

  /**
   *  creator public key of the NFT held in the associated metadata
   */
  nftCollectionCreator: PublicKey;

  /**
   *  price oracles modeled from switchboard
   */
  nftOraclePrice: PublicKey;

  /**
   * The account to use for the market data.
   *
   * If not provided an account will be generated.
   */
  account?: Keypair;
}

export enum MarketFlags {
  HaltBorrows = 1 << 0,
  HaltRepays = 1 << 1,
  HaltDeposits = 1 << 2,
  HaltAll = HaltBorrows | HaltRepays | HaltDeposits,
}
