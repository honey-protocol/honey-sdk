import { PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token';
import * as anchor from '@project-serum/anchor';
import * as BL from '@solana/buffer-layout';

import { CreateReserveParams, HoneyReserve } from './reserve';
import * as util from './util';
import { HoneyClient } from './client';
import { HoneyMarketReserveInfo, MarketReserveInfoList } from '../helpers';

const MAX_RESERVES = 32;

// const ReserveInfoStruct = BL.struct([
//   util.pubkeyField('address'),
//   BL.blob(80, '_UNUSED_0_'),
//   util.numberField('price'),
//   util.numberField('depositNoteExchangeRate'),
//   util.numberField('loanNoteExchangeRate'),
//   util.numberField('minCollateralRatio'),
//   BL.u16('liquidationBonus'),
//   BL.blob(158, '_UNUSED_1_'),
//   BL.blob(16, '_CACHE_TAIL'),
// ]);

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

    const nftDropletAccount = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      params.nftDropletMint,
      this.marketAuthority,
      true,
    );

    const createReserveAccount = await this.client.program.account.reserve.createInstruction(account);
    const transaction = new Transaction();
    transaction.add(createReserveAccount);
    const initTx = await this.client.program.provider.sendAndConfirm(transaction, [account], { skipPreflight: true });
    console.log(`Init reserve account tx ${initTx}`);

    // console.log('accounts', {
    //   market: this.address.toBase58(),
    //   marketAuthority: this.marketAuthority.toBase58(),
    //   reserve: account.publicKey.toBase58(),
    //   vault: derivedAccounts.vault.address.toBase58(),
    //   nftDropletMint: params.nftDropletMint.toBase58(),
    //   nftDropletVault: nftDropletAccount.toBase58(),

    //   feeNoteVault: derivedAccounts.feeNoteVault.address.toBase58(),
    //   protocolFeeNoteVault: derivedAccounts.protocolFeeNoteVault.address.toBase58(),

    //   feeAccount: feeAccount.toBase58(),
    //   protocolFeeAccount: protocolFeeAccount.toBase58(),

    //   dexSwapTokens: derivedAccounts.dexSwapTokens.address.toBase58(),
    //   dexOpenOrdersA: derivedAccounts.dexOpenOrdersA.address.toBase58(),
    //   dexOpenOrdersB: derivedAccounts.dexOpenOrdersB.address.toBase58(),
    //   dexMarketA: params.dexMarketA.toBase58(),
    //   dexMarketB: params.dexMarketB.toBase58(),
    //   dexProgram: DEX_PID.toBase58(),
    //   loanNoteMint: derivedAccounts.loanNoteMint.address.toBase58(),
    //   depositNoteMint: derivedAccounts.depositNoteMint.address.toBase58(),

    //   oraclePrice: params.switchboardOracle.toBase58(),
    //   quoteTokenMint: this.quoteTokenMint.toBase58(),
    //   tokenMint: params.tokenMint.toBase58(),
    //   owner: this.owner.toBase58(),
    // });

    const txid = await this.client.program.rpc.initReserve(bumpSeeds, params.config, {
      accounts: {
        market: this.address,
        marketAuthority: this.marketAuthority,
        reserve: account.publicKey,
        vault: derivedAccounts.vault.address,
        nftDropletMint: params.nftDropletMint,
        nftDropletVault: nftDropletAccount,
        feeNoteVault: feeAccount,
        protocolFeeNoteVault: protocolFeeAccount,
        dexProgram: DEX_PID,
        loanNoteMint: derivedAccounts.loanNoteMint.address,
        depositNoteMint: derivedAccounts.depositNoteMint.address,
        switchboardPriceAggregator: params.switchboardOracle,
        quoteTokenMint: this.quoteTokenMint,
        tokenMint: params.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        owner: this.owner,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [],
      // instructions: [createReserveAccount],
    });
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
