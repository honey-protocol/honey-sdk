import * as anchor from '@project-serum/anchor';
import { HoneyClient } from './client';
import { CreateReserveParams, HoneyReserve } from './reserve';
import { PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token';
import {
  getOraclePrice,
  HoneyMarketData,
  CachedReserveInfo,
  MarketReserveInfoList,
  MarketAccount,
  TReserve,
  oracleUrl,
} from '../helpers';

export class HoneyMarket implements HoneyMarketData {
  conn: anchor.web3.Connection;

  private constructor(
    private client: HoneyClient,
    public address: PublicKey,
    public quoteTokenMint: PublicKey,
    public marketAuthority: PublicKey,
    public owner: PublicKey,
    public market: MarketAccount,
    public reserves: CachedReserveInfo[],
    public reserveList: TReserve[],
    public nftSwitchboardPriceAggregator: PublicKey,
    public nftCollectionCreator: PublicKey,
  ) {
    this.conn = this.client.program.provider.connection;
  }

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

  /**
   * Fetch and decode all the associated data for a market
   * @param client HoneyClient
   * @param address Market address
   * @returns MarketAccount: market level data
   * @returns CachedReserveInfo[]: reserve level data
   * @returns TReserve[]: data includes the config + public keys associated with the reserve
   * state includes the current state of the reserve, eg outstanding deposits, loans, etc
   */
  public static async fetchMarket(
    client: HoneyClient,
    address?: PublicKey,
  ): Promise<[MarketAccount, CachedReserveInfo[], TReserve[]]> {
    const market: MarketAccount = (await client.program.account.market.fetch(address)) as any as MarketAccount;

    const reserveInfoData = new Uint8Array(market.reserves);
    const reserveInfoList = MarketReserveInfoList.decode(reserveInfoData) as CachedReserveInfo[];

    const reservesList = [] as TReserve[];
    for (const reserve of reserveInfoList) {
      if (reserve.reserve.equals(PublicKey.default)) {
        continue;
      }
      const data = await HoneyReserve.decodeReserve(client, reserve.reserve);
      reservesList.push(data);
    }

    return [market, reserveInfoList, reservesList];
  }

  public async fetchNFTFloorPrice(cluster: 'mainnet-beta' | 'devnet' = 'mainnet-beta'): Promise<number> {
    // @ts-ignore - switchboard doesn't export their big number type
    return await getOraclePrice(cluster, this.conn, this.market.nftSwitchboardPriceAggregator).toNumber();
  }

  /**
   * Load the market account data from the network.
   * @param client The program client
   * @param address The address of the market.
   * @returns An object for interacting with the Honey market.
   */
  static async load(client: HoneyClient, address: PublicKey): Promise<HoneyMarket> {
    const [market, reserveInfoList, reserveList] = await HoneyMarket.fetchMarket(client, address);

    return new HoneyMarket(
      client,
      address,
      market.quoteTokenMint,
      market.marketAuthority,
      market.owner,
      market,
      reserveInfoList,
      reserveList,
      market.nftSwitchboardPriceAggregator,
      market.nftCollectionCreator,
    );
  }

  /**
   * @returns string url of the oracle
   */
  fetchOracleUrl() {
    return oracleUrl(this.market.nftSwitchboardPriceAggregator.toString());
  }

  /**
   * @returns approx LTV given the min collateral ratio config
   */
  fetchLTV(): number {
    return 10000 / this.reserveList[0].config.minCollateralRatio;
  }

  /**
   * Get the latest market account data from the network.
   */
  async refresh(): Promise<void> {
    const [market, reserveInfoList, reserveList] = await HoneyMarket.fetchMarket(this.client, this.address);

    this.market = market;
    this.reserves = reserveInfoList;
    this.reserveList = reserveList;
    this.owner = market.owner;
    this.marketAuthority = market.marketAuthority;
    this.quoteTokenMint = market.quoteTokenMint;
    this.nftSwitchboardPriceAggregator = market.nftSwitchboardPriceAggregator;
    this.nftCollectionCreator = market.nftCollectionCreator;
  }

  async setFlags(flags: u64) {
    await this.client.program.rpc.seMarketAccountFlags(flags, {
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
