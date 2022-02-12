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
import { JetClient } from './client';
import { JetMarket, JetMarketReserveInfo } from './market';
import {
  AccountLayout as TokenAccountLayout,
  AccountInfo as TokenAccount,
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  Token,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { JetReserve } from './reserve';
import {
  InstructionAndSigner,
  parseObligationAccount,
  sendAllTransactions,
  transactionErrorToString,
} from '../helpers/programUtil';
import * as util from './util';
import * as BL from '@solana/buffer-layout';
import { TxResponse } from '../actions/types';
import { ObligationAccount, TxnResponse } from '../helpers/JetTypes';
import { TokenAmount } from './token-amount';

export const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
export interface User {
  address: PublicKey;

  deposits(): TokenAmount[];

  collateral(): TokenAmount[];

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

export class JetUser implements User {
  private _deposits: TokenAmount[] = [];
  private _collateral: TokenAmount[] = [];
  private _loans: TokenAmount[] = [];

  private conn: Connection;

  private constructor(
    private client: JetClient,
    public market: JetMarket,
    public address: PublicKey,
    private obligation: DerivedAccount,
    public reserves: JetReserve[],
  ) {
    this.conn = this.client.program.provider.connection;
  }

  static async load(
    client: JetClient,
    market: JetMarket,
    address: PublicKey,
    reserves: JetReserve[],
  ): Promise<JetUser> {
    const obligationAccount = await client.findDerivedAccount(['obligation', market.address, address]);
    const user = new JetUser(client, market, address, obligationAccount, reserves);
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
    loanReserve: JetReserve,
    collateralReserve: JetReserve,
    payerAccount: PublicKey,
    receiverAccount: PublicKey,
    amount: Amount,
  ): Promise<string> {
    const tx = await this.makeLiquidateTx(loanReserve, collateralReserve, payerAccount, receiverAccount, amount);
    return await this.client.program.provider.send(tx);
  }

  async makeLiquidateTx(
    _loanReserve: JetReserve,
    _collateralReserve: JetReserve,
    _payerAccount: PublicKey,
    _receiverAccount: PublicKey,
    _amount: Amount,
  ): Promise<Transaction> {
    throw new Error('not yet implemented');
  }

  async repay(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount): Promise<TxResponse> {
    const ixs = await this.makeRepayTx(reserve, tokenAccount, amount);
    try {
      return await sendAllTransactions(this.client.program.provider, ixs);
    } catch (err) {
      console.error(`Repay error: ${transactionErrorToString(err)}`);
      return [TxnResponse.Failed, []];
    }
  }

  async makeRepayTx(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount) {
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

    const refreshReserveIx = reserve.makeRefreshIx();
    const repayIx = this.client.program.instruction.repay(amount, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        payer: this.address,

        reserve: reserve.address,
        vault: reserve.data.vault,
        obligation: this.obligation.address,
        loanNoteMint: reserve.data.loanNoteMint,
        loanAccount: accounts.loan.address,
        payerAccount: depositSourcePubkey,

        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

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

  async withdrawNFT(
    tokenAccount: PublicKey,
    tokenMint: PublicKey,
    updateAuthority: PublicKey,
    reserves: JetReserve[],
  ): Promise<TxResponse> {
    const tx = await this.makeNFTWithdrawTx(tokenAccount, tokenMint, updateAuthority, reserves);
    try {
      const txid = await this.client.program.provider.send(tx);
      return [TxnResponse.Success, [txid]];
    } catch (err) {
      console.error(`Withdraw NFT error: ${transactionErrorToString(err)}`);
      return [TxnResponse.Failed, []];
    }
  }

  async makeNFTWithdrawTx(
    tokenAccount: PublicKey,
    tokenMint: PublicKey,
    updateAuthority: PublicKey,
    reserves: JetReserve[],
  ): Promise<Transaction> {
    const tx = new Transaction();

    const [obligationAddress, obligationBump] = await PublicKey.findProgramAddress(
      [Buffer.from('obligation'), this.market.address.toBuffer(), this.address.toBuffer()],
      this.client.program.programId,
    );

    const [collateralAddress, collateralBump] = await PublicKey.findProgramAddress(
      [Buffer.from('nft'), this.market.address.toBuffer(), tokenMint.toBuffer(), this.address.toBuffer()],
      this.client.program.programId,
    );

    const metadataPubKey = new PublicKey(METADATA_PROGRAM_ID);
    const [nftMetadata, metadataBump] = await PublicKey.findProgramAddress(
      [Buffer.from('metadata'), metadataPubKey.toBuffer(), tokenMint.toBuffer()],
      metadataPubKey,
    );
    const withdrawNFTBumpSeeds = {
      collateralAccount: collateralBump,
    };

    reserves.forEach((reserve) => tx.add(reserve.makeRefreshIx()));

    tx.add(
      await this.client.program.instruction.withdrawNft(withdrawNFTBumpSeeds, metadataBump, {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,
          obligation: obligationAddress,

          depositNftMint: tokenMint,
          updateAuthority,
          metadata: nftMetadata,
          owner: this.address,
          collateralAccount: collateralAddress,
          tokenProgram: TOKEN_PROGRAM_ID,

          depositTo: tokenAccount,
        },
      }),
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
      try {
        const txid = await this.client.program.rpc.initObligation(obligationBump, {
          accounts: {
            market: this.market.address,
            marketAuthority: this.market.marketAuthority,
            obligation: obligationAddress,

            borrower: this.address,
            tokenProgram: TOKEN_PROGRAM_ID,

            systemProgram: anchor.web3.SystemProgram.programId,
          },
        });
        txids.push(txid);
      } catch (err) {
        console.error(`Obligation account error: ${transactionErrorToString(err)}`);
        return [TxnResponse.Failed, []];
      }
    }

    const [collateralAddress, collateralBump] = await PublicKey.findProgramAddress(
      [Buffer.from('nft'), this.market.address.toBuffer(), tokenMint.toBuffer(), this.address.toBuffer()],
      this.client.program.programId,
    );

    const metadataPubKey = new PublicKey(METADATA_PROGRAM_ID);
    const [nftMetadata, metadataBump] = await PublicKey.findProgramAddress(
      [Buffer.from('metadata'), metadataPubKey.toBuffer(), tokenMint.toBuffer()],
      metadataPubKey,
    );

    const derivedMetadata = await this.findNftMetadata(tokenMint);
    const collateralData = await this.conn.getAccountInfo(collateralAddress);
    if (!collateralData) {
      const collateralTx = new Transaction();
      const ix = await this.client.program.instruction.initNftAccount(collateralBump, metadataBump, {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,
          obligation: obligationAddress,

          depositNftMint: tokenMint,
          updateAuthority, // should make a call to get this info or just do it on the program side
          metadata: nftMetadata,
          owner: this.address,
          collateralAccount: collateralAddress,
          tokenProgram: TOKEN_PROGRAM_ID,

          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      });
      collateralTx.add(ix);
      try {
        const txid = await this.client.program.provider.send(collateralTx);
        txids.push(txid);
      } catch (err) {
        console.error(`Collateral account error: ${transactionErrorToString(err)}`);
        return [TxnResponse.Failed, txids];
      }
    }

    const tx = new Transaction();
    const DepositNFTBumpSeeds = {
      collateralAccount: collateralBump,
    };
    const depositNFTIx = await this.client.program.instruction.depositNft(
      DepositNFTBumpSeeds,
      derivedMetadata.bumpSeed,
      {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,
          obligation: obligationAddress,

          depositNftMint: tokenMint,
          updateAuthority,
          metadata: derivedMetadata.address,
          owner: this.address,
          collateralAccount: collateralAddress,
          tokenProgram: TOKEN_PROGRAM_ID,

          depositSource: tokenAccount,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
      },
    );
    tx.add(depositNFTIx);
    try {
      const txid = await this.client.program.provider.send(tx);
      txids.push(txid);
      return [TxnResponse.Success, txids];
    } catch (err) {
      console.error(`Deposit NFT error: ${transactionErrorToString(err)}`);
      return [TxnResponse.Failed, txids];
    }
  }

  async withdrawCollateral(reserve: JetReserve, amount: Amount): Promise<TxResponse> {
    const ixs = await this.makeWithdrawCollateralTx(reserve, amount);
    return await sendAllTransactions(this.client.program.provider, ixs);
  }

  async makeWithdrawCollateralTx(reserve: JetReserve, amount: Amount): Promise<InstructionAndSigner[]> {
    const accounts = await this.findReserveAccounts(reserve);
    const bumpSeeds = {
      collateralAccount: accounts.collateral.bumpSeed,
      depositAccount: accounts.deposits.bumpSeed,
    };

    const refreshReserveIxs: TransactionInstruction[] = [];
    // need to refresh all reserves in market to withdraw
    this.reserves.forEach((jetReserve) => refreshReserveIxs.push(jetReserve.makeRefreshIx()));
    const withdrawCollateralIx = this.client.program.instruction.withdrawCollateral(bumpSeeds, amount, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        owner: this.address,
        obligation: this.obligation.address,

        reserve: reserve.address,
        collateralAccount: accounts.collateral.address,
        depositAccount: accounts.deposits.address,

        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    const ixs = [
      {
        ix: [...refreshReserveIxs, withdrawCollateralIx].filter((ix) => ix) as TransactionInstruction[],
      },
    ];
    return ixs;
  }

  async withdraw(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount): Promise<TxResponse> {
    return await this.makeWithdrawTx(reserve, tokenAccount, amount);
  }

  async makeWithdrawTx(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount): Promise<TxResponse> {
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
        const txid = await this.client.program.provider.send(supplementalTx, signer);
        txids.push(txid);
      } catch (err) {
        console.error(`Ata or wSOL account creation error: ${transactionErrorToString(err)}`);
        return [TxnResponse.Failed, txids];
      }
    }
    tx.add(reserve.makeRefreshIx());
    tx.add(
      this.client.program.instruction.withdraw(accounts.deposits.bumpSeed, amount, {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,
          withdrawAccount,
          depositAccount: accounts.deposits.address,
          depositor: this.address,

          reserve: reserve.address,
          vault: reserve.data.vault,
          depositNoteMint: reserve.data.depositNoteMint,

          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }),
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
      const txid = await this.client.program.provider.send(tx);
      txids.push(txid);
      return [TxnResponse.Success, txids];
    } catch (err) {
      console.error(`Withdraw collateral error: ${transactionErrorToString(err)}`);
      return [TxnResponse.Failed, txids];
    }
  }

  async deposit(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount): Promise<TxResponse> {
    const [transaction, signers] = await this.makeDepositTx(reserve, tokenAccount, amount);
    try {
      const txid = await this.client.program.provider.send(transaction, signers);
      return [TxnResponse.Success, [txid]];
    } catch (err) {
      console.error(`Deposit error: ${transactionErrorToString(err)}`);
      return [TxnResponse.Failed, []];
    }
  }

  async makeDepositTx(reserve: JetReserve, tokenAccount: PublicKey, amount: Amount): Promise<[Transaction, Keypair[]]> {
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
      tx.add(this.makeInitDepositAccountIx(reserve, accounts.deposits));
    }

    tx.add(reserve.makeRefreshIx());
    tx.add(
      this.client.program.instruction.deposit(accounts.deposits.bumpSeed, amount, {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,

          depositSource: depositSourcePubkey,
          depositAccount: accounts.deposits.address,
          depositor: this.address,

          reserve: reserve.address,
          vault: reserve.data.vault,
          depositNoteMint: reserve.data.depositNoteMint,

          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }),
    );

    const signers = [depositSourceKeypair].filter((signer) => signer) as Keypair[];
    if (closeTokenAccountIx) tx.add(closeTokenAccountIx);

    return [tx, signers];
  }

  async depositCollateral(reserve: JetReserve, amount: Amount): Promise<TxResponse> {
    const tx = await this.makeDepositCollateralTx(reserve, amount);
    try {
      const txid = await this.client.program.provider.send(tx);
      return [TxnResponse.Success, [txid]];
    } catch (err) {
      return [TxnResponse.Failed, []];
    }
  }

  async makeDepositCollateralTx(reserve: JetReserve, amount: Amount) {
    const accounts = await this.findReserveAccounts(reserve);
    const obligationAccountInfo = await this.conn.getAccountInfo(this.obligation.address);
    const collateralAccountInfo = await this.conn.getAccountInfo(accounts.collateral.address);

    const tx = new Transaction();

    if (obligationAccountInfo == null) {
      tx.add(this.makeInitObligationAccountIx());
    }
    if (collateralAccountInfo == null) {
      tx.add(this.makeInitCollateralAccountIx(reserve, accounts.collateral));
    }

    const bumpSeeds = {
      depositAccount: accounts.deposits.bumpSeed,
      collateralAccount: accounts.collateral.bumpSeed,
    };

    tx.add(reserve.makeRefreshIx());
    tx.add(
      this.client.program.instruction.depositCollateral(bumpSeeds, amount, {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,

          obligation: this.obligation.address,
          depositAccount: accounts.deposits.address,
          collateralAccount: accounts.collateral.address,
          owner: this.address,

          reserve: reserve.address,
          noteMint: reserve.data.depositNoteMint,

          tokenProgram: TOKEN_PROGRAM_ID,
        },
      }),
    );

    return tx;
  }

  async borrow(reserve: JetReserve, receiver: PublicKey, amount: Amount): Promise<TxResponse> {
    const ixs = await this.makeBorrowTx(reserve, receiver, amount);
    return await sendAllTransactions(this.client.program.provider, ixs);
  }

  async makeBorrowTx(reserve: JetReserve, receiver: PublicKey, amount: Amount): Promise<InstructionAndSigner[]> {
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
      initLoanAccountIx = this.makeInitLoanAccountIx(reserve, accounts.loan);
    }

    const refreshReserveIxs: TransactionInstruction[] = [];

    this.reserves.forEach((r) => {
      refreshReserveIxs.push(r.makeRefreshIx());
    });
    const [feeReceiverAccount, feeReceiverAccountBump] = await PublicKey.findProgramAddress(
      [Buffer.from('honey-protocol-fee'), new PublicKey('So11111111111111111111111111111111111111112').toBuffer()],
      this.client.program.programId,
    );

    const borrowSeeds = {
      loanAccount: accounts.loan.bumpSeed,
      feeReceiverAccount: feeReceiverAccountBump,
    };
    const borrowIx = this.client.program.instruction.borrow(borrowSeeds, amount, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        obligation: this.obligation.address,
        reserve: reserve.address,
        vault: reserve.data.vault,
        loanNoteMint: reserve.data.loanNoteMint,
        borrower: this.address,
        loanAccount: accounts.loan.address,
        tokenMint: new PublicKey('So11111111111111111111111111111111111111112'),
        feeReceiverAccount,
        receiverAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

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

  private makeInitDepositAccountIx(reserve: JetReserve, account: DerivedAccount): TransactionInstruction {
    return this.client.program.instruction.initDepositAccount(account.bumpSeed, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        reserve: reserve.address,
        depositNoteMint: reserve.data.depositNoteMint,

        depositor: this.address,
        depositAccount: account.address,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      },
    });
  }

  private async makeInitNFTCollateralAccountIx(
    tokenMint: PublicKey,
    nftCollateral: DerivedAccount,
    metadata: DerivedAccount,
    updateAuthority: PublicKey,
  ): Promise<TransactionInstruction> {
    return this.client.program.instruction.initNftAccount(nftCollateral.bumpSeed, metadata.bumpSeed, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,
        obligation: this.obligation.address,

        depositNftMint: tokenMint,
        updateAuthority,
        metadata: metadata.address,
        owner: this.address,
        collateralAccount: nftCollateral.address,
        tokenProgram: TOKEN_PROGRAM_ID,

        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });
  }

  private makeInitCollateralAccountIx(reserve: JetReserve, account: DerivedAccount): TransactionInstruction {
    return this.client.program.instruction.initCollateralAccount(account.bumpSeed, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        reserve: reserve.address,
        depositNoteMint: reserve.data.depositNoteMint,
        owner: this.address,
        obligation: this.obligation.address,
        collateralAccount: account.address,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      },
    });
  }

  private makeInitLoanAccountIx(reserve: JetReserve, account: DerivedAccount): TransactionInstruction {
    return this.client.program.instruction.initLoanAccount(account.bumpSeed, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        reserve: reserve.address,
        loanNoteMint: reserve.data.loanNoteMint,
        owner: this.address,
        obligation: this.obligation.address,
        loanAccount: account.address,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      },
    });
  }

  private makeInitObligationAccountIx(): TransactionInstruction {
    return this.client.program.instruction.initObligation(this.obligation.bumpSeed, {
      accounts: {
        market: this.market.address,
        marketAuthority: this.market.marketAuthority,

        obligation: this.obligation.address,
        borrower: this.address,

        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      },
    });
  }

  async refresh() {
    this._loans = [];
    this._deposits = [];
    this._collateral = [];

    for (const reserve of this.market.reserves) {
      if (reserve.address.toBase58() === PublicKey.default.toBase58()) {
        continue;
      }
      await this.refreshReserve(reserve);
    }
  }

  private async refreshReserve(reserve: JetMarketReserveInfo) {
    const accounts = await this.findReserveAccounts(reserve);

    await this.refreshAccount(this._deposits, accounts.deposits);
    await this.refreshAccount(this._loans, accounts.loan);
    await this.refreshAccount(this._collateral, accounts.collateral);
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

  private async findReserveAccounts(reserve: JetMarketReserveInfo | JetReserve): Promise<UserReserveAccounts> {
    const reserveAddress = typeof reserve.address === 'string' ? new PublicKey(reserve.address) : reserve.address;
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
      collateral: dCollateral,
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
   * Get all the collateral deposits held by the user.
   */
  collateral() {
    return this._collateral;
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
  collateral: DerivedAccount;
}
