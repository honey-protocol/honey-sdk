import { PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token';
import * as anchor from '@project-serum/anchor';
import { CreateReserveParams, HoneyReserve } from './reserve';
import { HoneyClient } from './client';
import { HoneyMarketReserveInfo, MarketReserveInfoList } from '../helpers';

// const MarketReserveInfoList = BL.seq(ReserveInfoStruct, MAX_RESERVES);
export const DEX_PID = new PublicKey('DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY'); // localnet

export interface HoneyMarketData {
  quoteTokenMint: PublicKey;
  quoteCurrency: string;
  marketAuthority: PublicKey;
  owner: PublicKey;
  reserves: HoneyMarketReserveInfo[];
  nftSwitchboardPriceAggregator: PublicKey;
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
    public nftSwitchboardPriceAggregator: PublicKey,
    public updateAuthority: PublicKey,
    public borrowFeeReceiver: PublicKey,
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
   * @returns An object for interacting with the Honey market.
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
      data.nftSwitchboardPriceAggregator,
      data.updateAuthority,
      data.borrowFeeReceiver,
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
    this.nftSwitchboardPriceAggregator = data.nftSwitchboardPriceAggregator;
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

        // nftDropletMint: params.nftDropletMint,
        // nftDropletVault: nftDropletAccount,
        // dexProgram: DEX_PID,
        // instructions: [createReserveAccount],
      })
      .rpc();
    console.log('initReserve tx', txid);
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
