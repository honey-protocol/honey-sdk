import * as anchor from '@project-serum/anchor';
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { HasPublicKey, ToBytes, TxnResponse } from '../helpers';
import devnetIdl from '../idl/devnet/honey.json';
import mainnetBetaIdl from '../idl/mainnet-beta/honey.json';
import { DerivedAccount } from './derived-account';
import {
  NATIVE_MINT,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  AccountLayout as TokenAccountLayout,
  Token,
} from '@solana/spl-token';
import { Amount, HoneyReserve } from '.';
import { deposit, TxResponse } from '../actions';

export interface PlaceBidParams {
  bid_limit: number;
  market: PublicKey;
  bidder: PublicKey;
  bid_mint: PublicKey;
  deposit_source?: PublicKey;
}

export interface IncreaseBidParams {
  bid_increase: number;
  market: PublicKey;
  bidder: PublicKey;
  bid_mint: PublicKey;
  deposit_source?: PublicKey;
}

export interface RevokeBidParams {
  amount: number;
  market: PublicKey;
  bidder: PublicKey;
  bid_mint: PublicKey;
  withdraw_destination?: PublicKey;
}

export interface ExecuteBidParams {
  amount: number;
  market: PublicKey;
  obligation: PublicKey;
  reserve: PublicKey;
  nftMint: PublicKey;
  payer: PublicKey;
  bidder: PublicKey;
}

type DerivedAccountSeed = HasPublicKey | ToBytes | Uint8Array | string;

export class LiquidatorClient {
  conn: anchor.web3.Connection;

  constructor(public program: anchor.Program) {
    this.conn = program.provider.connection;
  }

  /**
   * Create a new client for interacting with the Jet lending program.
   * @param provider The provider with wallet/network access that can be used to send transactions.
   * @returns The client
   */
  static async connect(
    provider: anchor.AnchorProvider | anchor.Provider,
    honeyPubKey: string,
    devnet?: boolean,
  ): Promise<LiquidatorClient> {
    console.log('provider in liquidator', typeof provider);
    const idl = devnet ? devnetIdl : mainnetBetaIdl;
    const HONEY_PROGRAM_ID = new PublicKey(honeyPubKey);
    const program = new anchor.Program(idl as any, HONEY_PROGRAM_ID, provider);

    return new LiquidatorClient(program);
  }

  /**
   * Find a PDA
   * @param seeds
   * @returns
   */
  async findDerivedAccount(seeds: DerivedAccountSeed[]): Promise<DerivedAccount> {
    const seedBytes = seeds.map((s) => {
      if (typeof s === 'string') {
        return Buffer.from(s);
      } else if ('publicKey' in s) {
        return s.publicKey.toBytes();
      } else if ('toBytes' in s) {
        return s.toBytes();
      } else {
        return s;
      }
    });
    const [address, bumpSeed] = await PublicKey.findProgramAddress(seedBytes, this.program.programId);
    return new DerivedAccount(address, bumpSeed);
  }

  async placeBid(params: PlaceBidParams): Promise<TxResponse> {
    if (params.bid_limit <= 0) return [TxnResponse.Failed, ['Bid limit should be greater than 0']];

    const bid = await this.findBidAccount(params.market, params.bidder);
    console.log(bid.address.toString());
    const bid_escrow = await this.findEscrowAccount(params.market, params.bidder);
    const bid_escrow_authority = await this.findBidEscrowAuthorityAccount(bid_escrow.address);
    const market_authority = await this.findMarketAuthority(params.market);

    const bumps = {
      bid: bid.bumpSeed,
      bidEscrow: bid_escrow.bumpSeed,
      bidEscrowAuthority: bid_escrow_authority.bumpSeed,
    };

    const amount = params.bid_limit * 1e9; /* Wrapped SOL's decimals is 9 */
    const amountBN = new anchor.BN(amount);

    const bidder = params.bidder;

    // wSOL deposit
    const depositSource = Keypair.generate();
    const tx = new Transaction().add(
      // create token account
      SystemProgram.createAccount({
        fromPubkey: bidder,
        newAccountPubkey: depositSource.publicKey,
        space: TokenAccountLayout.span,
        lamports: (await Token.getMinBalanceRentForExemptAccount(this.program.provider.connection)) + amount, // rent + amount
        programId: TOKEN_PROGRAM_ID,
      }),
      // init token account
      Token.createInitAccountInstruction(TOKEN_PROGRAM_ID, NATIVE_MINT, depositSource.publicKey, bidder),
    );

    try {
      const result = await this.program.methods
        .placeLiquidateBid(bumps, amountBN)
        .accounts({
          market: params.market,
          marketAuthority: market_authority.address,
          bid: bid.address,
          bidder: params.bidder,
          depositSource: depositSource.publicKey,
          bidMint: params.bid_mint,
          bidEscrow: bid_escrow.address,
          bidEscrowAuthority: bid_escrow_authority.address,

          // system accounts
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .preInstructions([
          SystemProgram.createAccount({
            fromPubkey: bidder,
            newAccountPubkey: depositSource.publicKey,
            space: TokenAccountLayout.span,
            lamports: (await Token.getMinBalanceRentForExemptAccount(this.program.provider.connection)) + amount, // rent + amount
            programId: TOKEN_PROGRAM_ID,
          }),
          // init token account
          Token.createInitAccountInstruction(TOKEN_PROGRAM_ID, NATIVE_MINT, depositSource.publicKey, bidder),
        ])
        .postInstructions([
          Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, depositSource.publicKey, bidder, bidder, []),
        ])
        .signers([depositSource])
        .rpc();
      console.log(result);
      return [TxnResponse.Success, [result]];
    } catch (err) {
      console.error(`Error placing bid: ${err}`);
      return [TxnResponse.Failed, []];
    }
    // tx.add(ix);
    // tx.add(Token.createCloseAccountInstruction(
    //     TOKEN_PROGRAM_ID,
    //     depositSource.publicKey,
    //     bidder,
    //     bidder,
    //     []));
    // try {
    //     const result = await this.program.provider.send(tx, [depositSource], { skipPreflight: true });
    //     console.log(result);
    //     return [TxnResponse.Success, [result]];
    // } catch(err) {
    //     console.error(`Error placing bid: ${err}`);
    //     return [TxnResponse.Failed, []];
    // }
  }

  async increaseBid(params: IncreaseBidParams): Promise<TxResponse> {
    if (params.bid_increase <= 0) return [TxnResponse.Failed, ['Bid increase amount should be greater than 0']];
    const bid = await this.findBidAccount(params.market, params.bidder);
    console.log(bid.address.toString());
    const bid_escrow = await this.findEscrowAccount(params.market, params.bidder);
    const bid_escrow_authority = await this.findBidEscrowAuthorityAccount(bid_escrow.address);
    const market_authority = await this.findMarketAuthority(params.market);

    const bumps = {
      bid: bid.bumpSeed,
      bidEscrow: bid_escrow.bumpSeed,
      bidEscrowAuthority: bid_escrow_authority.bumpSeed,
    };

    const amount = params.bid_increase * 1e9; /* Wrapped SOL's decimals is 9 */
    const amountBN = new anchor.BN(amount);

    const bidder = params.bidder;

    // wSOL deposit
    const depositSource = Keypair.generate();
    // const tx = new Transaction().add(
    //     // create token account
    //     SystemProgram.createAccount({
    //         fromPubkey: bidder,
    //         newAccountPubkey: depositSource.publicKey,
    //         space: TokenAccountLayout.span,
    //         lamports:
    //             (await Token.getMinBalanceRentForExemptAccount(this.program.provider.connection)) + amount, // rent + amount
    //         programId: TOKEN_PROGRAM_ID,
    //     }),
    //     // init token account
    //     Token.createInitAccountInstruction(
    //         TOKEN_PROGRAM_ID,
    //         NATIVE_MINT,
    //         depositSource.publicKey,
    //         bidder
    //     ),
    // );

    try {
      const result = await this.program.methods
        .increaseLiquidateBid(bumps, amountBN)
        .accounts({
          market: params.market,
          marketAuthority: market_authority.address,
          bid: bid.address,
          bidder: params.bidder,
          depositSource: depositSource.publicKey,
          bidMint: params.bid_mint,
          bidEscrow: bid_escrow.address,
          bidEscrowAuthority: bid_escrow_authority.address,

          // system accounts
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .preInstructions([
          SystemProgram.createAccount({
            fromPubkey: bidder,
            newAccountPubkey: depositSource.publicKey,
            space: TokenAccountLayout.span,
            lamports: (await Token.getMinBalanceRentForExemptAccount(this.program.provider.connection)) + amount, // rent + amount
            programId: TOKEN_PROGRAM_ID,
          }),
          // init token account
          Token.createInitAccountInstruction(TOKEN_PROGRAM_ID, NATIVE_MINT, depositSource.publicKey, bidder),
        ])
        .postInstructions([
          Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, depositSource.publicKey, bidder, bidder, []),
        ])
        .signers([depositSource])
        .rpc();
      // const result = await this.program.provider.sendAndConfirm(tx, [depositSource], { skipPreflight: true });
      console.log(result);
      return [TxnResponse.Success, [result]];
    } catch (err) {
      return [TxnResponse.Failed, []];
    }

    // tx.add(ix);
    // tx.add(Token.createCloseAccountInstruction(
    //     TOKEN_PROGRAM_ID,
    //     depositSource.publicKey,
    //     bidder,
    //     bidder,
    //     []));

    // try {
    //     const result = await this.program.provider.sendAndConfirm(tx, [depositSource], { skipPreflight: true });
    //     console.log(result);
    //     return [TxnResponse.Success, [result]];
    // } catch(err) {
    //     return [TxnResponse.Failed, []];
    // }
  }

  async revokeBid(params: RevokeBidParams): Promise<TxResponse> {
    const bid = await this.findBidAccount(params.market, params.bidder);
    const bid_escrow = await this.findEscrowAccount(params.market, params.bidder);
    const bid_escrow_authority = await this.findBidEscrowAuthorityAccount(bid_escrow.address);
    const market_authority = await this.findMarketAuthority(params.market);

    const bumps = {
      bid: bid.bumpSeed,
      bidEscrow: bid_escrow.bumpSeed,
      bidEscrowAuthority: bid_escrow_authority.bumpSeed,
    };

    const amount = params.amount * 1e9; /* Wrapped SOL's decimals is 9 */
    const amountBN = new anchor.BN(amount);
    const bidder = params.bidder;

    // wSOL withdrawal
    const withdrawDestination = Keypair.generate();
    const tx = new Transaction().add(
      // create token account
      SystemProgram.createAccount({
        fromPubkey: bidder,
        newAccountPubkey: withdrawDestination.publicKey,
        space: TokenAccountLayout.span,
        lamports: await Token.getMinBalanceRentForExemptAccount(this.program.provider.connection), // rent + amount
        programId: TOKEN_PROGRAM_ID,
      }),
      // init token account
      Token.createInitAccountInstruction(TOKEN_PROGRAM_ID, NATIVE_MINT, withdrawDestination.publicKey, bidder),
    );

    const ix = await this.program.instruction.revokeLiquidateBid(bumps, amountBN, {
      accounts: {
        market: params.market,
        marketAuthority: market_authority.address,
        bid: bid.address,
        bidder: params.bidder,
        bidEscrow: bid_escrow.address,
        bidEscrowAuthority: bid_escrow_authority.address,
        bidMint: params.bid_mint,
        withdrawDestination: withdrawDestination.publicKey,

        // system accounts
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });

    tx.add(ix);
    tx.add(Token.createCloseAccountInstruction(TOKEN_PROGRAM_ID, withdrawDestination.publicKey, bidder, bidder, []));

    try {
      const result = await this.program.provider.sendAndConfirm(tx, [withdrawDestination], { skipPreflight: true });
      console.log(result);
      return [TxnResponse.Success, [result]];
    } catch (err) {
      return [TxnResponse.Failed, []];
    }
  }

  /**
   * Execute a liquidation bid.
   * @param params
   * @returns
   */
  async executeBid(reserves: HoneyReserve[], params: ExecuteBidParams) {
    const bid = await this.findBidAccount(params.market, params.bidder);
    const bid_escrow = await this.findEscrowAccount(params.market, params.bidder);
    const bid_escrow_authority = await this.findBidEscrowAuthorityAccount(bid_escrow.address);
    const market_authority = await this.findMarketAuthority(params.market);

    const bumps = {
      bid: bid.bumpSeed,
      bidEscrow: bid_escrow.bumpSeed,
      bidEscrowAuthority: bid_escrow_authority.bumpSeed,
    };

    const market = await this.program.account.market.fetch(params.market);
    const reserve = await this.program.account.reserve.fetch(params.reserve);
    const obligation = await this.program.account.obligation.fetch(params.obligation);
    const bidData = await this.program.account.bid.fetch(bid.address);
    // @ts-ignore
    const amount = Amount.tokens(bidData.bidLimit);

    // pay for these should be ther person getting liquidated
    // @ts-ignore
    const loanNoteAddress = await this.findLoanNoteAddress(params.reserve, params.obligation, obligation.owner);
    // @ts-ignore
    const loanNoteMint = await this.findLoanNoteMintAddress(params.reserve, reserve.tokenMint);
    // const collateralAddress = await this.findCollateralAddress(params.reserve, params.obligation, params.payer);
    const vault = await this.findVaultAddress(params.market, params.reserve);

    // find the registered nft to liqudiate
    const vaultedNFTMint = obligation.collateralNftMint[0];
    const vaultedNFT: PublicKey = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      vaultedNFTMint,
      market_authority.address,
      true,
    );

    const receiverAccount: PublicKey = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      params.nftMint,
      // @ts-ignore
      bidData.bidder,
    );

    const liquidationFeeReceiver = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      // @ts-ignore
      bidData.bidMint,
      params.payer,
    );

    console.log('liquidationFeeReceiver', liquidationFeeReceiver.toString());

    const leftoversReceiver = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      // @ts-ignore
      bidData.bidMint,
      bidData.bidder,
    );
    console.log('leftoversReceiver', leftoversReceiver.toString());
    console.log('bid', bid.address.toString());
    console.log('bidData.bidder', bidData.bidder.toString());
    const refreshIx = await reserves[0].makeRefreshIx();
    const tx = new Transaction().add(refreshIx);
    // @ts-ignore
    const ix = await this.program.instruction.executeLiquidateBid(bumps, amount, {
      accounts: {
        market: params.market,
        marketAuthority: market_authority.address,
        obligation: params.obligation,
        reserve: params.reserve,
        vault: vault.address,
        loanNoteMint: loanNoteMint.address,
        loanAccount: loanNoteAddress.address,
        collateralAccount: vaultedNFT,
        bid: bid.address,
        bidder: bidData.bidder,
        bidMint: bidData.bidMint,
        bidEscrow: bidData.bidEscrow,
        bidEscrowAuthority: bid_escrow_authority.address,
        payerAccount: bidData.bidEscrow,
        nftMint: params.nftMint,
        receiverAccount: receiverAccount,
        liquidationFeeReceiver,
        leftoversReceiver,
        payer: params.payer,
        // system accounts
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
    tx.add(ix);

    const result = await this.program.provider.sendAndConfirm(tx, [], { skipPreflight: true });
    console.log(result);
    return tx;
  }

  async findBidAccount(market: PublicKey, bidder: PublicKey): Promise<DerivedAccount> {
    return await this.findDerivedAccount(['bid', market, bidder]);
  }

  async findEscrowAccount(market: PublicKey, bidder: PublicKey): Promise<DerivedAccount> {
    return await this.findDerivedAccount(['escrow', market, bidder]);
  }

  async findBidEscrowAuthorityAccount(bid_escrow_authority: PublicKey): Promise<DerivedAccount> {
    return await this.findDerivedAccount([bid_escrow_authority]);
  }

  async findMarketAuthority(market: PublicKey): Promise<DerivedAccount> {
    return await this.findDerivedAccount([market]);
  }

  /** Find reserve deposit note account for wallet */
  private async findDepositNoteAddress(reserve: PublicKey, wallet: PublicKey): Promise<DerivedAccount> {
    return await this.findDerivedAccount(['deposits', reserve, wallet]);
  }

  /** Find loan note token account for the reserve, obligation and wallet. */
  private async findLoanNoteAddress(
    reserve: PublicKey,
    obligation: PublicKey,
    wallet: PublicKey,
  ): Promise<DerivedAccount> {
    return await this.findDerivedAccount(['loan', reserve, obligation, wallet]);
  }

  /** Find collateral account for the reserve, obligation and wallet. */
  private async findCollateralAddress(
    reserve: PublicKey,
    obligation: PublicKey,
    wallet: PublicKey,
  ): Promise<DerivedAccount> {
    return await this.findDerivedAccount(['collateral', reserve, obligation, wallet]);
  }

  /** Find reserve deposit note mint. */
  private async findDepositNoteMintAddress(reserve: PublicKey, reserveTokenMint: PublicKey): Promise<DerivedAccount> {
    return await this.findDerivedAccount(['deposits', reserve, reserveTokenMint]);
  }

  /** Find reserve loan note mint. */
  private async findLoanNoteMintAddress(reserve: PublicKey, reserveTokenMint: PublicKey): Promise<DerivedAccount> {
    return await this.findDerivedAccount(['loans', reserve, reserveTokenMint]);
  }

  /** Find reserve vault token account. */
  private async findVaultAddress(market: PublicKey, reserve: PublicKey): Promise<DerivedAccount> {
    return await this.findDerivedAccount(['vault', reserve]);
  }
}
