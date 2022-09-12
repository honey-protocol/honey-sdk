import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { Amount, DerivedAccount } from '.';
import { HoneyClient } from './client';
import { HoneyMarket } from './market';
import {
  AccountLayout as TokenAccountLayout,
  AccountInfo as TokenAccount,
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  Token,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { HoneyReserve } from './reserve';
import { InstructionAndSigner, parseObligationAccount, sendAllTransactions } from '../helpers/programUtil';
import * as util from './util';
import * as BL from '@solana/buffer-layout';
import { TxResponse } from '../actions/types';
import { HoneyMarketReserveInfo, ObligationAccount, TxnResponse } from '../helpers/honeyTypes';
import { TokenAmount } from './token-amount';

export const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
export const SOLVENT_PROGRAM = new PublicKey('GwRvoU6vTXQAbS75KaMbm7o2iTYVtdEnF4mFUbZr9Cmb');
export const SOLVENT_FEE_ACCOUNT_DEVNET = new PublicKey('HkjFiwUW7qnREVm2PxBg8LUrCvjExrJjyYY51wsZTUK8');

export interface User {
  address: PublicKey;

  deposits(): TokenAmount[];

  /**
   * Get the loans held by the user
   */
  loans(): TokenAmount[];
}

export interface HasPublicKey {
  publicKey: PublicKey;
}
export interface ToBytes {
  toBytes(): Uint8Array;
}

export const ObligationStateStruct = BL.struct([
  BL.u32('version'),
  BL.u32('_reserved0'),
  util.pubkeyField('market'),
  util.pubkeyField('owner'),
  BL.blob(184, '_reserved1'),
  BL.seq(util.pubkeyField('collateral_nft_mint'), 11), // 4 byte alignment because a u32 is following
  BL.blob(256, 'cached'),
  BL.blob(2048, 'collateral'),
  BL.blob(2048, 'loans'),
]);

export const PositionStruct = BL.struct([
  util.pubkeyField('account'),
  util.numberField('amount'),
  BL.u32('side'),
  BL.u16('reserve_index'),
  BL.blob(66),
]);

export class HoneyUser implements User {
  private _deposits: TokenAmount[] = [];
  // private _collateral: TokenAmount[] = [];
  private _loans: TokenAmount[] = [];

  private conn: Connection;

  private constructor(
    private client: HoneyClient,
    public market: HoneyMarket,
    public address: PublicKey,
    private obligation: DerivedAccount,
    public reserves: HoneyReserve[],
  ) {
    this.conn = this.client.program.provider.connection;
  }

  static async load(
    client: HoneyClient,
    market: HoneyMarket,
    address: PublicKey,
    reserves: HoneyReserve[],
  ): Promise<HoneyUser> {
    const obligationAccount = await client.findDerivedAccount(['obligation', market.address, address]);
    const user = new HoneyUser(client, market, address, obligationAccount, reserves);
    user.refresh();
    return user;
  }

  async getObligationData(): Promise<ObligationAccount | Error> {
    const data = await this.conn.getAccountInfo(this.obligation.address);
    if (!data) return new Error('Could not get obligation data');
    const parsed = parseObligationAccount(data.data, this.client.program.coder);
    return parsed;
  }

  async liquidate(
    loanReserve: HoneyReserve,
    collateralReserve: HoneyReserve,
    payerAccount: PublicKey,
    receiverAccount: PublicKey,
    amount: Amount,
  ): Promise<string> {
    const tx = await this.makeLiquidateTx(loanReserve, collateralReserve, payerAccount, receiverAccount, amount);
    return await this.client.program.provider.sendAndConfirm(tx);
  }

  async makeLiquidateTx(
    _loanReserve: HoneyReserve,
    _collateralReserve: HoneyReserve,
    _payerAccount: PublicKey,
    _receiverAccount: PublicKey,
    _amount: Amount,
  ): Promise<Transaction> {
    throw new Error('not yet implemented');
  }

  async liquidateSolvent(
    loanReserve: HoneyReserve,
    collateralReserve: HoneyReserve,
    payerAccount: PublicKey,
    receiverAccount: PublicKey,
    amount: Amount,
  ): Promise<string> {
    const tx = await this.makeLiquidateSolventTx(loanReserve, collateralReserve, payerAccount, receiverAccount, amount);
    return await this.client.program.provider.sendAndConfirm(tx);
  }

  async makeLiquidateSolventTx(
    _loanReserve: HoneyReserve,
    _collateralReserve: HoneyReserve,
    _payerAccount: PublicKey,
    _receiverAccount: PublicKey,
    _amount: Amount,
  ): Promise<Transaction> {
    throw new Error('not yet implemented');
  }

  async repay(reserve: HoneyReserve, tokenAccount: PublicKey, amount: Amount): Promise<TxResponse> {
    const ixs = await this.makeRepayTx(reserve, tokenAccount, amount);
    try {
      return await sendAllTransactions(this.client.program.provider as anchor.AnchorProvider, ixs);
    } catch (err) {
      console.error(`Repay error: ${err}`);
      return [TxnResponse.Failed, []];
    }
  }

  async makeRepayTx(reserve: HoneyReserve, tokenAccount: PublicKey, amount: Amount) {
    const accounts = await this.findReserveAccounts(reserve);
    let depositSourcePubkey = tokenAccount;
    // Optional signers
    let depositSourceKeypair: Keypair | undefined;
    // Optional instructions
    // Create wrapped sol ixs
    let createTokenAccountIx: TransactionInstruction | undefined;
    let initTokenAccountIx: TransactionInstruction | undefined;
    let closeTokenAccountIx: TransactionInstruction | undefined;

    // When handling SOL, ignore existing wsol accounts and initialize a new wrapped sol account
    if (reserve.data.tokenMint.equals(NATIVE_MINT)) {
      // Overwrite the deposit source
      // The app will always wrap native sol, ignoring any existing wsol
      depositSourceKeypair = Keypair.generate();
      depositSourcePubkey = depositSourceKeypair.publicKey;

      // TODO: Need to derive the loanNoteExchangeRate
      // Do our best to estimate the lamports we need
      // 1.002 is a bit of room for interest
      // const lamports = amount.units.loanNotes
      // ? reserve.loanNoteExchangeRate.mul(amount.value).div(new anchor.BN(Math.pow(10, 15))).muln(1.002)
      // : amount.value;

      const rent = await this.conn.getMinimumBalanceForRentExemption(TokenAccountLayout.span);
      createTokenAccountIx = SystemProgram.createAccount({
        fromPubkey: this.address,
        newAccountPubkey: depositSourcePubkey,
        programId: TOKEN_PROGRAM_ID,
        space: TokenAccountLayout.span,
        lamports: Number(amount.value.addn(rent).toString()),
      });

      initTokenAccountIx = Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID,
        NATIVE_MINT,
        depositSourcePubkey,
        this.address,
      );

      closeTokenAccountIx = Token.createCloseAccountInstruction(
        TOKEN_PROGRAM_ID,
        depositSourcePubkey,
        this.address,
        this.address,
        [],
      );
    }

    const refreshReserveIx = await reserve.makeRefreshIx();
    const repayIx = await this.client.program.methods.repay(amount)
      .accounts({
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        payer: this.address,

        reserve: reserve.reserve,
        vault: reserve.data.vault,
        obligation: this.obligation.address,
        loanNoteMint: reserve.data.loanNoteMint,
        loanAccount: accounts.loan.address,
        payerAccount: depositSourcePubkey,

        tokenProgram: TOKEN_PROGRAM_ID,
      }).instruction();

    const ixs = [
      {
        ix: [createTokenAccountIx, initTokenAccountIx, refreshReserveIx, repayIx, closeTokenAccountIx].filter(
          (ix) => ix,
        ) as TransactionInstruction[],
        signers: [depositSourceKeypair].filter((signer) => signer) as Signer[],
      },
    ];

    return ixs;
  }

  async withdrawNFT(tokenAccount: PublicKey, tokenMint: PublicKey, updateAuthority: PublicKey): Promise<TxResponse> {
    const tx = await this.makeNFTWithdrawTx(tokenAccount, tokenMint, updateAuthority);
    try {
      const txid = await this.client.program.provider.sendAndConfirm(tx, [], { skipPreflight: true });
      return [TxnResponse.Success, [txid]];
    } catch (err) {
      console.error(`Withdraw NFT error: ${err}`);
      return [TxnResponse.Failed, []];
    }
  }

  async withdrawNFTSolvent(
    tokenAccount: PublicKey,
    tokenMint: PublicKey,
    depositor: PublicKey,
    updateAuthority: PublicKey,
  ): Promise<TxResponse> {
    const tx = await this.makeNFTWithdrawSolventTx(tokenAccount, tokenMint, depositor, updateAuthority);
    try {
      const txid = await this.client.program.provider.sendAndConfirm(tx, [], { skipPreflight: true });
      console.log('txid', txid);
      return [TxnResponse.Success, [txid]];
    } catch (err) {
      console.error(`Withdraw NFT for Solvent liquidation error: ${err}`);
      return [TxnResponse.Failed, []];
    }
  }

  async makeNFTWithdrawSolventTx(
    tokenAccount: PublicKey,
    tokenMint: PublicKey,
    depositor: PublicKey,
    nftCollectionCreator: PublicKey,
  ): Promise<Transaction> {
    const tx = new Transaction();

    const [obligationAddress, obligationBump] = await PublicKey.findProgramAddress(
      [Buffer.from('obligation'), this.market.address.toBuffer(), depositor.toBuffer()],
      this.client.program.programId,
    );

    const collateralAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      tokenMint,
      this.market.marketAuthority,
      true,
    );

    const [nftMetadata, metadataBump] = await PublicKey.findProgramAddress(
      [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), tokenMint.toBuffer()],
      METADATA_PROGRAM_ID,
    );

    await Promise.all(
      this.reserves.map(async (reserve) => {
        if (!reserve.reserve.equals(PublicKey.default)) tx.add(await reserve.makeRefreshIx());
      }),
    );
    tx.add(
      await this.client.program.methods.withdrawNftSolvent(metadataBump)
        .accounts({
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,
          obligation: obligationAddress,
          withdrawer: this.address,
          depositTo: tokenAccount,
          nftCollectionCreator,
          metadata: nftMetadata,
          depositNftMint: tokenMint,
          collateralAccount: collateralAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction()
    );

    return tx;
  }

  async makeNFTWithdrawTx(
    tokenAccount: PublicKey,
    tokenMint: PublicKey,
    nftCollectionCreator: PublicKey,
  ): Promise<Transaction> {
    const tx = new Transaction();

    const [obligationAddress, obligationBump] = await PublicKey.findProgramAddress(
      [Buffer.from('obligation'), this.market.address.toBuffer(), this.address.toBuffer()],
      this.client.program.programId,
    );

    const collateralAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      tokenMint,
      this.market.marketAuthority,
      true,
    );

    const [nftMetadata, metadataBump] = await PublicKey.findProgramAddress(
      [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), tokenMint.toBuffer()],
      METADATA_PROGRAM_ID,
    );

    await Promise.all(
      this.reserves.map(async (reserve) => {
        if (!reserve.reserve.equals(PublicKey.default)) tx.add(await reserve.makeRefreshIx());
      }),
    );

    tx.add(
      await this.client.program.methods.withdrawNft(metadataBump)
        .accounts({
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,
          obligation: obligationAddress,
          owner: this.address,
          depositTo: tokenAccount,
          nftCollectionCreator,
          metadata: nftMetadata,
          depositNftMint: tokenMint,
          collateralAccount: collateralAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
        }).instruction()
    );

    return tx;
  }

  async depositNFT(tokenAccount: PublicKey, tokenMint: PublicKey, updateAuthority: PublicKey): Promise<TxResponse> {
    return await this.makeNFTDepositTx(tokenAccount, tokenMint, updateAuthority);
  }

  async makeNFTDepositTx(
    tokenAccount: PublicKey,
    tokenMint: PublicKey,
    updateAuthority: PublicKey,
  ): Promise<TxResponse> {
    const txids = [];
    const [obligationAddress, obligationBump] = await PublicKey.findProgramAddress(
      [Buffer.from('obligation'), this.market.address.toBuffer(), this.address.toBuffer()],
      this.client.program.programId,
    );

    const obligationAccountData = await this.conn.getAccountInfo(obligationAddress);
    if (!obligationAccountData) {
      console.log('adding obligationAccountData', obligationAccountData);
      try {
        const obligationTx = new Transaction();
        const ix = await this.client.program.methods.initObligation(obligationBump)
          .accounts({
            market: this.market.address,
            marketAuthority: this.market.marketAuthority,
            obligation: obligationAddress,
            borrower: this.address,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: anchor.web3.SystemProgram.programId,
          }).instruction();

        obligationTx.add(ix);
        const txid = await this.client.program.provider.sendAndConfirm(obligationTx, [], { skipPreflight: true });
        txids.push(txid);
        console.log('added obligation account', txid);
      } catch (err) {
        console.error(`Obligation account: ${err}`);
        return [TxnResponse.Failed, []];
      }
    }

    const collateralAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      tokenMint,
      this.market.marketAuthority,
      true,
    );

    const derivedMetadata = await this.findNftMetadata(tokenMint);

    const tx = new Transaction();
    const depositNFTIx = await this.client.program.methods.depositNft(derivedMetadata.bumpSeed)
      .accounts({
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        obligation: obligationAddress,
        depositSource: tokenAccount,
        depositNftMint: tokenMint,
        nftCollectionCreator: updateAuthority,
        metadata: derivedMetadata.address,
        owner: this.address,
        collateralAccount: collateralAddress,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY
      }).instruction();

    tx.add(depositNFTIx);
    try {
      const txid = await this.client.program.provider.sendAndConfirm(tx, [], { skipPreflight: true });
      txids.push(txid);
      return [TxnResponse.Success, txids];
    } catch (err) {
      console.error(`Deposit NFT error: ${err}`);
      return [TxnResponse.Failed, txids];
    }
  }

  async withdraw(reserve: HoneyReserve, tokenAccount: PublicKey, amount: Amount): Promise<TxResponse> {
    return await this.makeWithdrawTx(reserve, tokenAccount, amount);
  }

  async makeWithdrawTx(reserve: HoneyReserve, tokenAccount: PublicKey, amount: Amount): Promise<TxResponse> {
    const accounts = await this.findReserveAccounts(reserve);
    const tx = new Transaction();
    let supplementalTx: Transaction | null = null;
    let signer: Signer[] | null = null;
    let withdrawAccount = tokenAccount;

    // Create token account ix
    let createAssociatedTokenAccountIx: TransactionInstruction | undefined;

    // Wrapped sol ixs
    let wsolKeypair: Keypair | undefined;
    let createWsolIx: TransactionInstruction | undefined;
    let initWsolIx: TransactionInstruction | undefined;
    let closeWsolIx: TransactionInstruction | undefined;
    const walletTokenExists = await this.conn.getAccountInfo(tokenAccount);

    if (reserve.data.tokenMint.equals(NATIVE_MINT)) {
      // Create a token account to receive wrapped sol.
      // There isn't an easy way to unwrap sol without
      // closing the account, so we avoid closing the
      // associated token account.
      supplementalTx = new Transaction();
      const rent = await Token.getMinBalanceRentForExemptAccount(this.conn);

      wsolKeypair = Keypair.generate();
      withdrawAccount = wsolKeypair.publicKey;
      createWsolIx = SystemProgram.createAccount({
        fromPubkey: this.address,
        newAccountPubkey: withdrawAccount,
        programId: TOKEN_PROGRAM_ID,
        space: TokenAccountLayout.span,
        lamports: rent,
      });
      initWsolIx = Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID,
        reserve.data.tokenMint,
        withdrawAccount,
        this.address,
      );

      supplementalTx.add(createWsolIx);
      supplementalTx.add(initWsolIx);
      signer = [wsolKeypair] as Signer[];
    } else if (!walletTokenExists) {
      // Create the wallet token account if it doesn't exist
      supplementalTx = new Transaction();
      createAssociatedTokenAccountIx = Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        this.address,
        withdrawAccount,
        this.address,
        this.address,
      );
      supplementalTx.add(createAssociatedTokenAccountIx);
    }

    const txids: string[] = [];
    if (supplementalTx && signer) {
      try {
        const txid = await this.client.program.provider.sendAndConfirm(supplementalTx, signer);
        txids.push(txid);
      } catch (err) {
        console.error(`Ata or wSOL account creation error: ${err}`);
        return [TxnResponse.Failed, txids];
      }
    }
    tx.add(await reserve.makeRefreshIx());
    tx.add(
      await this.client.program.methods.withdraw(accounts.deposits.bumpSeed, amount)
        .accounts({
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,
          reserve: reserve.reserve,
          vault: reserve.data.vault,
          depositNoteMint: reserve.data.depositNoteMint,
          depositor: this.address,
          depositAccount: accounts.deposits.address,
          withdrawAccount,
          honeyProgram: this.client.program.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        }).instruction()
    );

    if (reserve.data.tokenMint.equals(NATIVE_MINT) && wsolKeypair) {
      closeWsolIx = Token.createCloseAccountInstruction(
        TOKEN_PROGRAM_ID,
        withdrawAccount,
        this.address,
        this.address,
        [],
      );
      tx.add(closeWsolIx);
    }
    try {
      const txid = await this.client.program.provider.sendAndConfirm(tx);
      txids.push(txid);
      return [TxnResponse.Success, txids];
    } catch (err) {
      console.error(`Withdraw collateral error: ${err}`);
      return [TxnResponse.Failed, txids];
    }
  }

  async deposit(reserve: HoneyReserve, tokenAccount: PublicKey, amount: Amount): Promise<TxResponse> {
    const [transaction, signers] = await this.makeDepositTx(reserve, tokenAccount, amount);
    try {
      const txid = await this.client.program.provider.sendAndConfirm(transaction, signers, { skipPreflight: true });
      return [TxnResponse.Success, [txid]];
    } catch (err) {
      console.error(`Deposit error: ${err}`);
      return [TxnResponse.Failed, []];
    }
  }

  async makeDepositTx(
    reserve: HoneyReserve,
    tokenAccount: PublicKey,
    amount: Amount,
  ): Promise<[Transaction, Keypair[]]> {
    const accounts = await this.findReserveAccounts(reserve);
    const depositAccountInfo = await this.conn.getAccountInfo(accounts.deposits.address);

    let depositSourcePubkey = tokenAccount;

    // Optional signers
    let depositSourceKeypair: Keypair | undefined;

    // Optional instructions
    // Create wrapped sol ixs
    let createTokenAccountIx: TransactionInstruction | undefined;
    let initTokenAccountIx: TransactionInstruction | undefined;
    let closeTokenAccountIx: TransactionInstruction | undefined;
    const tx = new Transaction();

    // When handling SOL, ignore existing wsol accounts and initialize a new wrapped sol account
    if (reserve.data.tokenMint.equals(NATIVE_MINT)) {
      // Overwrite the deposit source
      // The app will always wrap native sol, ignoring any existing wsol
      depositSourceKeypair = Keypair.generate();
      depositSourcePubkey = depositSourceKeypair.publicKey;

      const rent = await this.conn.getMinimumBalanceForRentExemption(TokenAccountLayout.span);
      createTokenAccountIx = SystemProgram.createAccount({
        fromPubkey: this.address,
        newAccountPubkey: depositSourcePubkey,
        programId: TOKEN_PROGRAM_ID,
        space: TokenAccountLayout.span,
        lamports: Number(amount.value.addn(rent).toString()),
      });

      initTokenAccountIx = Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID,
        NATIVE_MINT,
        depositSourcePubkey,
        this.address,
      );

      closeTokenAccountIx = Token.createCloseAccountInstruction(
        TOKEN_PROGRAM_ID,
        depositSourcePubkey,
        this.address,
        this.address,
        [],
      );

      tx.add(createTokenAccountIx);
      tx.add(initTokenAccountIx);
    }

    if (depositAccountInfo == null) {
      tx.add(await this.makeInitDepositAccountIx(reserve, accounts.deposits));
    }

    tx.add(await reserve.makeRefreshIx());
    tx.add(
      await this.client.program.methods.depositTokens(accounts.deposits.bumpSeed, amount)
        .accounts({
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,

          depositSource: depositSourcePubkey,
          depositAccount: accounts.deposits.address,
          depositor: this.address,

          reserve: reserve.reserve,
          vault: reserve.data.vault,
          depositNoteMint: reserve.data.depositNoteMint,

          tokenProgram: TOKEN_PROGRAM_ID,
        }).instruction()
    );

    const signers = [depositSourceKeypair].filter((signer) => signer) as Keypair[];
    if (closeTokenAccountIx) tx.add(closeTokenAccountIx);

    return [tx, signers];
  }

  async borrow(reserve: HoneyReserve, receiver: PublicKey, amount: Amount): Promise<TxResponse> {
    const ixs = await this.makeBorrowTx(reserve, receiver, amount);
    return await sendAllTransactions(this.client.program.provider as anchor.AnchorProvider, ixs);
  }

  async makeBorrowTx(reserve: HoneyReserve, receiver: PublicKey, amount: Amount): Promise<InstructionAndSigner[]> {
    let receiverAccount: PublicKey = receiver;
    // Create token account ix
    let createTokenAccountIx: TransactionInstruction | undefined;

    // Wrapped sol ixs
    let wsolKeypair: Keypair | undefined;
    let createWsolTokenAccountIx: TransactionInstruction | undefined;
    let initWsoltokenAccountIx: TransactionInstruction | undefined;
    let closeTokenAccountIx: TransactionInstruction | undefined;

    const accounts = await this.findReserveAccounts(reserve);
    const loanAccountInfo = await this.conn.getAccountInfo(accounts.loan.address);

    const walletTokenExists = await this.conn.getAccountInfo(receiverAccount);

    if (reserve.data.tokenMint.equals(NATIVE_MINT)) {
      // Create a token account to receive wrapped sol.
      // There isn't an easy way to unwrap sol without
      // closing the account, so we avoid closing the
      // associated token account.
      const rent = await Token.getMinBalanceRentForExemptAccount(this.conn);

      wsolKeypair = Keypair.generate();
      receiverAccount = wsolKeypair.publicKey;
      createWsolTokenAccountIx = SystemProgram.createAccount({
        fromPubkey: this.address,
        newAccountPubkey: wsolKeypair.publicKey,
        programId: TOKEN_PROGRAM_ID,
        space: TokenAccountLayout.span,
        lamports: rent,
      });
      initWsoltokenAccountIx = Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID,
        reserve.data.tokenMint,
        wsolKeypair.publicKey,
        this.address,
      );
    } else if (!walletTokenExists) {
      // Create the wallet token account if it doesn't exist
      createTokenAccountIx = Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        reserve.data.tokenMint,
        receiverAccount,
        this.address,
        this.address,
      );
    }

    let initLoanAccountIx;
    if (loanAccountInfo == null) {
      initLoanAccountIx = await this.makeInitLoanAccountIx(reserve, accounts.loan);
    }

    const refreshReserveIxs: TransactionInstruction[] = [];

    await Promise.all(
      this.reserves.map(async (r) => {
        refreshReserveIxs.push(await r.makeRefreshIx());
      }),
    );

    // const [feeReceiverAccount, feeReceiverAccountBump] = await PublicKey.findProgramAddress(
    //   [Buffer.from('honey-protocol-fee'), reserve.data.tokenMint.toBuffer()],
    //   this.client.program.programId,
    // );

    const [loanAccountPK, loanAccountBump] = await PublicKey.findProgramAddress(
      [Buffer.from('loan'), reserve.reserve.toBuffer(), this.obligation.address.toBuffer(), this.address.toBuffer()],
      this.client.program.programId,
    );

    const borrowSeeds = {
      loanAccount: loanAccountBump,
      // feeReceiverAccount: feeReceiverAccountBump,
    };
    const borrowIx = await this.client.program.methods.borrow(borrowSeeds, amount)
      .accounts({
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        obligation: this.obligation.address,
        reserve: reserve.reserve,
        vault: reserve.data.vault,
        loanNoteMint: reserve.data.loanNoteMint,
        borrower: this.address,
        loanAccount: loanAccountPK,
        tokenMint: reserve.data.tokenMint,
        receiverAccount,
        nftSwitchboardPriceAggregator: this.market.nftSwitchboardPriceAggregator,
        tokenProgram: TOKEN_PROGRAM_ID,
      }).instruction();

    if (reserve.data.tokenMint.equals(NATIVE_MINT)) {
      closeTokenAccountIx = Token.createCloseAccountInstruction(
        TOKEN_PROGRAM_ID,
        receiverAccount,
        this.address,
        this.address,
        [],
      );
    }
    const ixs = [
      {
        ix: [createTokenAccountIx, createWsolTokenAccountIx, initWsoltokenAccountIx, initLoanAccountIx].filter(
          (ix) => ix,
        ) as TransactionInstruction[],
        signers: [wsolKeypair].filter((ix) => ix) as Signer[],
      },
      {
        ix: [...refreshReserveIxs, borrowIx, closeTokenAccountIx].filter((ix) => ix) as TransactionInstruction[],
      },
    ];
    return ixs;
  }

  private async makeInitDepositAccountIx(reserve: HoneyReserve, account: DerivedAccount): Promise<TransactionInstruction> {
    return await this.client.program.methods.initDepositAccount(account.bumpSeed)
      .accounts({
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        reserve: reserve.reserve,
        depositNoteMint: reserve.data.depositNoteMint,

        depositor: this.address,
        depositAccount: account.address,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      }).instruction()
  }

  private async makeInitLoanAccountIx(reserve: HoneyReserve, account: DerivedAccount): Promise<TransactionInstruction> {
    console.log('loan account ', account.address.toString());
    return await this.client.program.methods.initLoanAccount(account.bumpSeed)
      .accounts({
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        obligation: this.obligation.address,

        reserve: reserve.reserve,
        loanNoteMint: reserve.data.loanNoteMint,
        owner: this.address,
        loanAccount: account.address,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      }).instruction()
  }

  private async makeInitObligationAccountIx(): Promise<TransactionInstruction> {
    return await this.client.program.methods.initObligation(this.obligation.bumpSeed)
      .accounts({
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        obligation: this.obligation.address,
        borrower: this.address,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }).instruction();
  }

  async refresh() {
    this._loans = [];
    this._deposits = [];

    for (const reserve of this.market.reserves) {
      if (reserve.reserve.toBase58() === PublicKey.default.toBase58()) {
        continue;
      }
      await this.refreshReserve(reserve);
    }
  }

  private async refreshReserve(reserve: HoneyMarketReserveInfo) {
    const accounts = await this.findReserveAccounts(reserve);

    await this.refreshAccount(this._deposits, accounts.deposits);
    await this.refreshAccount(this._loans, accounts.loan);
  }

  private async refreshAccount(appendTo: TokenAmount[], account: DerivedAccount) {
    try {
      const info = await this.conn.getAccountInfo(account.address);

      if (info == null) {
        return;
      }

      const tokenAccount: TokenAccount = TokenAccountLayout.decode(info.data);

      appendTo.push({
        mint: new PublicKey(tokenAccount.mint),
        amount: new anchor.BN(tokenAccount.amount, undefined, 'le'),
      });
    } catch (e) {
      console.log(`error getting user account: ${e}`);
      // ignore error, which should mean it's an invalid/uninitialized account
    }
  }

  private async findNftMetadata(tokenMint: PublicKey): Promise<DerivedAccount> {
    const metadataPubKey = new PublicKey(METADATA_PROGRAM_ID);
    const [address, bump] = await PublicKey.findProgramAddress(
      [Buffer.from('metadata'), metadataPubKey.toBuffer(), tokenMint.toBuffer()],
      metadataPubKey,
    );
    return new DerivedAccount(address, bump);
  }

  /**
   * Find a program derived address
   * @param programId The program the address is being derived for
   * @param seeds The seeds to find the address
   * @returns The address found and the bump seed required
   */
  private async findProgramAddress(
    programId: PublicKey,
    seeds: (HasPublicKey | ToBytes | Uint8Array | string)[],
  ): Promise<[PublicKey, number]> {
    const SEEDBYTES = seeds.map((s) => {
      if (typeof s === 'string') {
        return new TextEncoder().encode(s);
      } else if ('publicKey' in s) {
        return s.publicKey.toBytes();
      } else if ('toBytes' in s) {
        return s.toBytes();
      } else {
        return s;
      }
    });

    return await anchor.web3.PublicKey.findProgramAddress(SEEDBYTES, programId);
  }

  /** Find reserve deposit note account for wallet */
  private async findDepositNoteAddress(
    program: anchor.Program,
    reserve: PublicKey,
    wallet: PublicKey,
  ): Promise<[depositNotePubkey: PublicKey, depositAccountBump: number]> {
    return await this.findProgramAddress(program.programId, ['deposits', reserve, wallet]);
  }

  /** Find loan note token account for the reserve, obligation and wallet. */
  private async findLoanNoteAddress(
    program: anchor.Program,
    reserve: PublicKey,
    obligation: PublicKey,
    wallet: PublicKey,
  ): Promise<[loanNotePubkey: PublicKey, loanNoteBump: number]> {
    return await this.findProgramAddress(program.programId, ['loan', reserve, obligation, wallet]);
  }

  /** Find collateral account for the reserve, obligation and wallet. */
  private async findCollateralAddress(
    program: anchor.Program,
    reserve: PublicKey,
    obligation: PublicKey,
    wallet: PublicKey,
  ): Promise<[collateralPubkey: PublicKey, collateralBump: number]> {
    return await this.findProgramAddress(program.programId, ['collateral', reserve, obligation, wallet]);
  }

  private async findReserveAccounts(reserve: HoneyMarketReserveInfo | HoneyReserve): Promise<UserReserveAccounts> {
    const reserveAddress = typeof reserve.reserve === 'string' ? new PublicKey(reserve.reserve) : reserve.reserve;
    const deposits = await this.findDepositNoteAddress(this.client.program, reserveAddress, this.address);
    const loan = await this.findLoanNoteAddress(
      this.client.program,
      reserveAddress,
      this.obligation.address,
      this.address,
    );
    const collateral = await this.findCollateralAddress(
      this.client.program,
      reserveAddress,
      this.obligation.address,
      this.address,
    );

    const dDeposits = new DerivedAccount(...deposits);
    const dLoan = new DerivedAccount(...loan);
    const dCollateral = new DerivedAccount(...collateral);
    return {
      deposits: dDeposits,
      loan: dLoan,
    };
  }

  /**
   * Get all the deposits held by the user, excluding those amounts being
   * used as collateral for a loan.
   */
  deposits() {
    return this._deposits;
  }

  /**
   * Get the loans held by the user
   */
  loans() {
    return this._loans;
  }
}

/**
 * The set of accounts that can be derived for a user, for each reserve in a market.
 */
interface UserReserveAccounts {
  deposits: DerivedAccount;
  loan: DerivedAccount;
}
