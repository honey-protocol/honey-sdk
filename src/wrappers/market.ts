import { PublicKey, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token';
import * as anchor from '@project-serum/anchor';
import * as BL from '@solana/buffer-layout';

import { CreateReserveParams, HoneyReserve } from './reserve';
import * as util from './util';
import { HoneyClient } from './client';

const MAX_RESERVES = 32;

const ReserveInfoStruct = BL.struct([
  util.pubkeyField('address'),
  BL.blob(80, '_UNUSED_0_'),
  util.numberField('price'),
  util.numberField('depositNoteExchangeRate'),
  util.numberField('loanNoteExchangeRate'),
  util.numberField('minCollateralRatio'),
  BL.u16('liquidationBonus'),
  BL.blob(158, '_UNUSED_1_'),
  BL.blob(16, '_CACHE_TAIL'),
]);

const MarketReserveInfoList = BL.seq(ReserveInfoStruct, MAX_RESERVES);

export interface HoneyMarketReserveInfo {
  address: PublicKey;
  price: anchor.BN;
  depositNoteExchangeRate: anchor.BN;
  loanNoteExchangeRate: anchor.BN;
}

export interface HoneyMarketData {
  quoteTokenMint: PublicKey;
  quoteCurrency: string;
  marketAuthority: PublicKey;
  owner: PublicKey;

  reserves: HoneyMarketReserveInfo[];
  pythOraclePrice: PublicKey;
  pythOracleProduct: PublicKey;
  updateAuthority: PublicKey;
}

export class HoneyMarket implements HoneyMarketData {
  private constructor(
    private client: HoneyClient,
    public address: PublicKey,
    public quoteTokenMint: PublicKey,
    public quoteCurrency: string,
    public marketAuthority: PublicKey,
    public owner: PublicKey,
    public reserves: HoneyMarketReserveInfo[],
    public pythOraclePrice: PublicKey,
    public pythOracleProduct: PublicKey,
    public updateAuthority: PublicKey,
  ) {}

  public static async fetchData(client: HoneyClient, address: PublicKey): Promise<[any, HoneyMarketReserveInfo[]]> {
    const data: any = await client.program.account.market.fetch(address);
    const reserveInfoData = new Uint8Array(data.reserves);
    const reserveInfoList = MarketReserveInfoList.decode(reserveInfoData) as HoneyMarketReserveInfo[];

    return [data, reserveInfoList];
  }

  /**
   * Load the market account data from the network.
   * @param client The program client
   * @param address The address of the market.
   * @returns An object for interacting with the Jet market.
   */
  static async load(client: HoneyClient, address: PublicKey): Promise<HoneyMarket> {
    const [data, reserveInfoList] = await HoneyMarket.fetchData(client, address);

    return new HoneyMarket(
      client,
      address,
      data.quoteTokenMint,
      data.quoteCurrency,
      data.marketAuthority,
      data.owner,
      reserveInfoList,
      data.nftPythOraclePrice,
      data.nftPythOracleProduct,
      data.updateAuthority,
    );
  }

  /**
   * Get the latest market account data from the network.
   */
  async refresh(): Promise<void> {
    const [data, reserveInfoList] = await HoneyMarket.fetchData(this.client, this.address);

    this.reserves = reserveInfoList;
    this.owner = data.owner;
    this.marketAuthority = data.marketAuthority;
    this.quoteCurrency = data.quoteCurrency;
    this.quoteTokenMint = data.quoteTokenMint;
    this.pythOraclePrice = data.pythOraclePrice;
    this.pythOracleProduct = data.pythOracleProduct;
    this.updateAuthority = data.updateAuthority;
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

    const bumpSeeds = {
      vault: derivedAccounts.vault.bumpSeed,
      feeNoteVault: derivedAccounts.feeNoteVault.bumpSeed,
      dexOpenOrders: derivedAccounts.dexOpenOrders.bumpSeed,
      dexSwapTokens: derivedAccounts.dexSwapTokens.bumpSeed,

      loanNoteMint: derivedAccounts.loanNoteMint.bumpSeed,
      depositNoteMint: derivedAccounts.depositNoteMint.bumpSeed,
    };

    const createReserveAccount = await this.client.program.account.reserve.createInstruction(account);

    await this.client.program.rpc.initReserve(bumpSeeds, params.config, {
      accounts: {
        market: this.address,
        marketAuthority: this.marketAuthority,
        owner: this.owner,
        oracleProduct: params.pythOracleProduct,
        oraclePrice: params.pythOraclePrice,
        reserve: account.publicKey,
        vault: derivedAccounts.vault.address,
        feeNoteVault: derivedAccounts.feeNoteVault.address,
        loanNoteMint: derivedAccounts.loanNoteMint.address,
        depositNoteMint: derivedAccounts.depositNoteMint.address,
        quoteTokenMint: this.quoteTokenMint,
        tokenMint: params.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      instructions: [createReserveAccount],
      signers: [account],
    });

    return HoneyReserve.load(this.client, account.publicKey, this);
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
   * name specified in any Pyth/oracle accounts.
   */
  quoteCurrencyName: string;

  /**
   * The account to use for the market data.
   *
   * If not provided an account will be generated.
   */
  account?: Keypair;

  /**
   *  Update authority of the NFT held in the associated metadata
   */
  updateAuthority: PublicKey;

  oraclePrice: PublicKey;

  oracleProduct: PublicKey;
}

export enum MarketFlags {
  HaltBorrows = 1 << 0,
  HaltRepays = 1 << 1,
  HaltDeposits = 1 << 2,
  HaltAll = HaltBorrows | HaltRepays | HaltDeposits,
}
