import * as anchor from '@project-serum/anchor';
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from '@solana/web3.js';
import { HasPublicKey, ToBytes, TxnResponse } from '../helpers';
import { DerivedAccount } from './derived-account';
import {
  NATIVE_MINT,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  AccountLayout as TokenAccountLayout,
  getMinimumBalanceForRentExemptAccount,
  createCloseAccountInstruction,
  createInitializeAccount2Instruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { HoneyReserve } from '.';
import { TxResponse } from '../actions';
import { prepPnftAccounts } from '../helpers/programUtil';
import { METADATA_PROGRAM_ID } from './user';
import { PROGRAM_ID as TMETA_PROG_ID } from '@metaplex-foundation/mpl-token-metadata';
import { PROGRAM_ID as AUTH_PROG_ID } from '@metaplex-foundation/mpl-token-auth-rules';
import { Honey } from '../artifacts/honey';
import HoneyIdl from '../artifacts/honey.json';

export interface PlaceBidParams {
  bid_limit: number;
  market: PublicKey;
  bidder: PublicKey;
  bid_mint: PublicKey;
  exponent: number;
  deposit_source?: PublicKey;
}

export interface IncreaseBidParams {
  bid_increase: number;
  market: PublicKey;
  bidder: PublicKey;
  bid_mint: PublicKey;
  exponent: number;
  deposit_source?: PublicKey;
}

export interface RevokeBidParams {
  market: PublicKey;
  bidder: PublicKey;
  bid_mint: PublicKey;
  withdraw_destination?: PublicKey;
}

export interface ExecuteBidParams {
  market: PublicKey;
  obligation: PublicKey;
  reserve: PublicKey;
  nftMint: PublicKey;
  payer: PublicKey;
  bidder: PublicKey;
}

const ROOT_AUTHORITY = new PublicKey('4mhZ7qW2EpryeT9YkBGwfWRVE75pJsFdqCGB7WpKdic2');

type DerivedAccountSeed = HasPublicKey | ToBytes | Uint8Array | string;

export class LiquidatorClient {
  conn: anchor.web3.Connection;

  constructor(public program: anchor.Program) {
    this.conn = program.provider.connection;
  }

  /**
   * Create a new client for interacting with the Honey lending program.
   * @param provider The provider with wallet/network access that can be used to send transactions.
   * @returns The client
   */
  static async connect(
    provider: anchor.AnchorProvider | anchor.Provider,
    honeyPubKey: string,
    devnet?: boolean,
  ): Promise<LiquidatorClient> {
    const HONEY_PROGRAM_ID = new PublicKey(honeyPubKey);
    const program = new anchor.Program(HoneyIdl as anchor.Idl, HONEY_PROGRAM_ID, provider) as anchor.Program<Honey>;
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
  /**
   * @description
   * @params
   * @returns
  */
  async placeBid(params: PlaceBidParams): Promise<TxResponse> {
    // return if bid not greater than 0
    if (params.bid_limit <= 0) return [TxnResponse.Failed, ['Bid limit should be greater than 0']];
    // set all bid constants
    const bid = await this.findBidAccount(params.market, params.bidder);
    const bid_escrow = await this.findEscrowAccount(params.market, params.bidder);
    const bid_escrow_authority = await this.findBidEscrowAuthorityAccount(bid_escrow.address);
    const market_authority = await this.findMarketAuthority(params.market);
    const bidder = params.bidder;
    // set bidding amount based on exponent
    const amount = params.bid_limit * params.exponent; /* exponent contains the number of decimals for the token */
    const amountBN = new anchor.BN(amount);
    console.log('@@-- amount ', amount)
    console.log('@@-- amount BN', amountBN)
    // init bumps
    const bumps = {
      bid: bid.bumpSeed,
      bidEscrow: bid_escrow.bumpSeed,
      bidEscrowAuthority: bid_escrow_authority.bumpSeed,
    };
    // generate a keypair for transactions 
    const depositKeypair = Keypair.generate();
    // if currency is not SOL we fetch ATA based on SPL mint and bidders address - returns / needs to be a public key
    const depositSource =
      params.bid_mint.toString() == NATIVE_MINT.toString()
        ? depositKeypair.publicKey
        : await getAssociatedTokenAddress(params.bid_mint, params.bidder);
    try {
      // start with instructions 
      const result = await this.program.methods
        .placeLiquidateBid(bumps, amountBN)
        .accounts({
          market: params.market,
          marketAuthority: market_authority.address,
          bid: bid.address,
          bidder: params.bidder,
          depositSource: depositSource,
          bidMint: params.bid_mint,
          bidEscrow: bid_escrow.address,
          bidEscrowAuthority: bid_escrow_authority.address,
          // system accounts
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .preInstructions(
          params.bid_mint.toString() == NATIVE_MINT.toString()
            ? [
                SystemProgram.createAccount({
                  fromPubkey: bidder,
                  newAccountPubkey: depositSource,
                  space: TokenAccountLayout.span,
                  lamports: (await getMinimumBalanceForRentExemptAccount(this.program.provider.connection)) + amount, // rent + amount
                  programId: TOKEN_PROGRAM_ID,
                }),
                // init token account
                createInitializeAccount2Instruction(depositSource, NATIVE_MINT, bidder),
              ]
            : [],
        )
        .postInstructions(
          params.bid_mint.toString() == NATIVE_MINT.toString() ? [createCloseAccountInstruction(depositSource, bidder, bidder)] : [],
        )
        .signers(params.bid_mint.toString() == NATIVE_MINT.toString() ? [depositKeypair] : [])
        .rpc();
      return [TxnResponse.Success, [result]];
    } catch (err) {
      console.error(`Error placing bid: ${err}`);
      return [TxnResponse.Failed, []];
    }
  }

  async increaseBid(params: IncreaseBidParams): Promise<TxResponse> {
    if (params.bid_increase <= 0) return [TxnResponse.Failed, ['Bid increase amount should be greater than 0']];
    
    const bid = await this.findBidAccount(params.market, params.bidder);
    const bid_escrow = await this.findEscrowAccount(params.market, params.bidder);
    const bid_escrow_authority = await this.findBidEscrowAuthorityAccount(bid_escrow.address);
    const market_authority = await this.findMarketAuthority(params.market);

    const bumps = {
      bid: bid.bumpSeed,
      bidEscrow: bid_escrow.bumpSeed,
      bidEscrowAuthority: bid_escrow_authority.bumpSeed,
    };

    const amount = params.bid_increase * params.exponent; /* exponent contains the number of decimals for the token */
    const amountBN = new anchor.BN(amount);

    const bidder = params.bidder;

    // generate a keypair for transactions 
    const depositKeypair = Keypair.generate();
    // if currency is not SOL we fetch ATA based on SPL mint and bidders address - returns / needs to be a public key
    const depositSource =
      params.bid_mint.toString() == NATIVE_MINT.toString()
        ? depositKeypair.publicKey
        : await getAssociatedTokenAddress(params.bid_mint, params.bidder);

    try {
      const result = await this.program.methods
        .increaseLiquidateBid(bumps, amountBN)
        .accounts({
          market: params.market,
          marketAuthority: market_authority.address,
          bid: bid.address,
          bidder: params.bidder,
          depositSource: depositSource,
          bidMint: params.bid_mint,
          bidEscrow: bid_escrow.address,
          bidEscrowAuthority: bid_escrow_authority.address,
          // system accounts
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .preInstructions(
          params.bid_mint.toString() == NATIVE_MINT.toString()
          ?
          [
          SystemProgram.createAccount({
            fromPubkey: bidder,
            newAccountPubkey: depositSource,
            space: TokenAccountLayout.span,
            lamports: (await getMinimumBalanceForRentExemptAccount(this.program.provider.connection)) + amount, // rent + amount
            programId: TOKEN_PROGRAM_ID,
          }),
          // init token account
          createInitializeAccount2Instruction(depositSource, NATIVE_MINT, bidder),
        ]
        : [],
        )
        .postInstructions(
          params.bid_mint.toString() == NATIVE_MINT.toString() ? [createCloseAccountInstruction(depositSource, bidder, bidder, [])] : [],
        )
        .signers(params.bid_mint.toString() == NATIVE_MINT.toString() ? [depositKeypair] : [])
        .rpc();
      console.log('increase bid tx result', result);
      return [TxnResponse.Success, [result]];
    } catch (err) {
      return [TxnResponse.Failed, []];
    }
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

    const bidder = params.bidder;
    // generate a keypair for transactions 
    const depositKeypair = Keypair.generate();
    // if currency is not SOL we fetch ATA based on SPL mint and bidders address - returns / needs to be a public key
    const depositSource =
      params.bid_mint.toString() == NATIVE_MINT.toString()
        ? depositKeypair.publicKey
        : await getAssociatedTokenAddress(params.bid_mint, params.bidder);


    try {
      const ix_result = await this.program.methods
        .revokeLiquidateBid(bumps)
        .accounts({
          market: params.market,
          marketAuthority: market_authority.address,
          bid: bid.address,
          bidder: params.bidder,
          bidEscrow: bid_escrow.address,
          bidEscrowAuthority: bid_escrow_authority.address,
          bidMint: params.bid_mint,
          withdrawDestination: depositSource,

          // system accounts
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .preInstructions(
         params.bid_mint.toString() == NATIVE_MINT.toString() ?
          [
          SystemProgram.createAccount({
            fromPubkey: bidder,
            newAccountPubkey: depositSource,
            space: TokenAccountLayout.span,
            lamports: await getMinimumBalanceForRentExemptAccount(this.program.provider.connection), // rent + amount
            programId: TOKEN_PROGRAM_ID,
          }),
          // init token account
          createInitializeAccount2Instruction(depositSource, NATIVE_MINT, bidder),
        ] : []
        )
        .postInstructions(
          params.bid_mint.toString() == NATIVE_MINT.toString() ? [createCloseAccountInstruction(depositSource, bidder, bidder, [])] : [],
          )
        .signers(params.bid_mint.toString() == NATIVE_MINT.toString() ? [depositKeypair] : [])
        .rpc();

      console.log('revoke bid result', ix_result);
      return [TxnResponse.Success, [ix_result]];
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

    const reserve = await this.program.account.reserve.fetch(params.reserve);
    const obligation = await this.program.account.obligation.fetch(params.obligation);
    const bidData = await this.program.account.bid.fetch(bid.address);
    // pay for these should be ther person getting liquidated
    // @ts-ignore
    const loanNoteAddress = await this.findLoanNoteAddress(params.reserve, params.obligation, obligation.owner);
    // @ts-ignore
    const loanNoteMint = await this.findLoanNoteMintAddress(params.reserve, reserve.tokenMint);
    const vault = await this.findVaultAddress(params.market, params.reserve);

    // find the registered nft to liqudiate
    const vaultedNFTMint = obligation.collateralNftMint[0];
    const vaultedNFT: PublicKey = await getAssociatedTokenAddress(vaultedNFTMint, market_authority.address, true);

    const receiverAccount: PublicKey = await getAssociatedTokenAddress(
      params.nftMint,
      // @ts-ignore
      bidData.bidder,
    );

    const liquidationFeeReceiver = await getAssociatedTokenAddress(
      // @ts-ignore
      bidData.bidMint,
      params.payer,
    );

    const leftoversReceiver = await getAssociatedTokenAddress(
      // @ts-ignore
      bidData.bidMint,
      ROOT_AUTHORITY,
    );

    await reserves[0].refreshOldReserves();

    const refreshIx = await reserves[0].makeRefreshIx();
    try {
      // @ts-ignore
      const result = await this.program.methods
        .executeLiquidateBid(bumps)
        .accounts({
          market: params.market,
          marketAuthority: market_authority.address,
          obligation: params.obligation,
          reserve: params.reserve,
          vault: vault.address,
          loanNoteMint: loanNoteMint.address,
          loanAccount: loanNoteAddress.address,
          bid: bid.address,
          bidder: new PublicKey(bidData.bidder),
          rootAuthority: ROOT_AUTHORITY,
          bidMint: new PublicKey(bidData.bidMint),
          bidEscrow: new PublicKey(bidData.bidEscrow),
          bidEscrowAuthority: bid_escrow_authority.address,
          payerAccount: new PublicKey(bidData.bidEscrow),
          nftMint: params.nftMint,
          collateralAccount: vaultedNFT,
          receiverAccount: receiverAccount,
          liquidationFeeReceiver,
          leftoversReceiver,
          payer: params.payer,
          // system accounts
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .preInstructions([refreshIx])
        .rpc();
      // tx.add(refreshIx);
      // tx.add(ix);
      // const result = await this.program.provider.sendAndConfirm(tx, [], { skipPreflight: true });
      return [TxnResponse.Success, [result]];
    } catch (err) {
      console.log('error', err);
      return [TxnResponse.Failed, []];
    }
  }

  /**
   * Execute a liquidation bid.
   * @param params
   * @returns
   */
  async executePnftBid(reserves: HoneyReserve[], params: ExecuteBidParams) {
    const bid = await this.findBidAccount(params.market, params.bidder);
    const bid_escrow = await this.findEscrowAccount(params.market, params.bidder);
    const bid_escrow_authority = await this.findBidEscrowAuthorityAccount(bid_escrow.address);
    const market_authority = await this.findMarketAuthority(params.market);

    const bumps = {
      bid: bid.bumpSeed,
      bidEscrow: bid_escrow.bumpSeed,
      bidEscrowAuthority: bid_escrow_authority.bumpSeed,
    };

    const reserve = await this.program.account.reserve.fetch(params.reserve);
    const obligation = await this.program.account.obligation.fetch(params.obligation);
    const bidData = await this.program.account.bid.fetch(bid.address);

    // pay for these should be ther person getting liquidated
    // @ts-ignore
    const loanNoteAddress = await this.findLoanNoteAddress(params.reserve, params.obligation, obligation.owner);
    // @ts-ignore
    const loanNoteMint = await this.findLoanNoteMintAddress(params.reserve, reserve.tokenMint);
    const vault = await this.findVaultAddress(params.market, params.reserve);

    // find the registered nft to liqudiate
    const vaultedNFTMint = obligation.collateralNftMint[0];
    const vaultedNFT: PublicKey = await getAssociatedTokenAddress(vaultedNFTMint, market_authority.address, true);

    const receiverAccount: PublicKey = await getAssociatedTokenAddress(
      params.nftMint,
      // @ts-ignore
      bidData.bidder,
    );

    const liquidationFeeReceiver = await getAssociatedTokenAddress(
      // @ts-ignore
      bidData.bidMint,
      params.payer,
    );

    console.log('liquidationFeeReceiver', liquidationFeeReceiver.toString());

    const leftoversReceiver = await getAssociatedTokenAddress(
      // @ts-ignore
      bidData.bidMint,
      bidData.bidder,
    );
    console.log('leftoversReceiver', leftoversReceiver.toString());
    console.log('bid', bid.address.toString());
    console.log('bidData.bidder', bidData.bidder.toString());

    const refreshIx = await reserves[0].makeRefreshIx();
    // const tx = new Transaction().add(refreshIx);

    const [nftMetadata, metadataBump] = await PublicKey.findProgramAddress(
      [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), params.nftMint.toBuffer()],
      METADATA_PROGRAM_ID,
    );

    //pnft
    const {
      meta,
      ownerTokenRecordBump,
      ownerTokenRecordPda,
      destTokenRecordBump,
      destTokenRecordPda,
      ruleSet,
      nftEditionPda,
      authDataSerialized,
    } = await prepPnftAccounts(this.conn, {
      nftMint: params.nftMint,
      destAta: receiverAccount,
      authData: null, //currently useless
      sourceAta: vaultedNFT,
    });
    const remainingAccounts = [];
    if (!!ruleSet) {
      remainingAccounts.push({
        pubkey: ruleSet,
        isSigner: false,
        isWritable: false,
      });
    }

    try {
      const tx = new Transaction();
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 500000,
      });
      tx.add(modifyComputeUnits);
      tx.add(refreshIx);
      tx.add(
        await this.program.methods
          .executeLiquidatePnftBid(bumps, authDataSerialized, !!ruleSet)
          .accounts({
            market: params.market,
            marketAuthority: market_authority.address,
            obligation: params.obligation,
            reserve: params.reserve,
            vault: vault.address,
            loanNoteMint: loanNoteMint.address,
            loanAccount: loanNoteAddress.address,
            collateralAccount: vaultedNFT,
            bid: bid.address,
            bidder: new PublicKey(bidData.bidder),
            rootAuthority: ROOT_AUTHORITY,
            bidMint: new PublicKey(bidData.bidMint),
            bidEscrow: new PublicKey(bidData.bidEscrow),
            bidEscrowAuthority: bid_escrow_authority.address,
            payerAccount: new PublicKey(bidData.bidEscrow),
            nftMint: params.nftMint,
            nftMetadata,
            nftEdition: nftEditionPda,
            ownerTokenRecord: ownerTokenRecordPda,
            destTokenRecord: destTokenRecordPda,
            pnftShared: {
              authorizationRulesProgram: AUTH_PROG_ID,
              tokenMetadataProgram: TMETA_PROG_ID,
              instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
            },
            receiverAccount: receiverAccount,
            liquidationFeeReceiver,
            leftoversReceiver,
            payer: params.payer,
            // system accounts
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .remainingAccounts(remainingAccounts)
          .instruction(),
      );

      const result = await this.program.provider.sendAndConfirm(tx, [], { skipPreflight: true });
      console.log(result);
      return [TxnResponse.Success, [result]];
    } catch (err) {
      console.log('error', err);
      return [TxnResponse.Failed, []];
    }
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