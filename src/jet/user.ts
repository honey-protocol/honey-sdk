import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";

import { Amount, DEX_ID, DEX_ID_DEVNET } from ".";
import { DerivedAccount, JetClient } from "./client";
import { JetMarket, JetMarketReserveInfo } from "./market";
import {
  AccountLayout as TokenAccountLayout,
  AccountInfo as TokenAccount,
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  Token,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { JetReserve, ReserveData, ReserveStateData } from "./reserve";
import { InstructionAndSigner, parseObligationAccount, sendAllTransactions } from "../helpers/jet/programUtil";
import { METADATA_PROGRAM_ID } from "../helpers/ids";
import * as util from "./util";
import * as BL from "@solana/buffer-layout";

export class TokenAmount {
  constructor(public mint: PublicKey, public amount: anchor.BN) { }
}

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
};
export interface ToBytes {
  toBytes(): Uint8Array;
};

export const ObligationStateStruct = BL.struct([
  BL.u32("version"),
  BL.u32("_reserved0"),
  util.pubkeyField("market"),
  util.pubkeyField("owner"),
  BL.blob(184, '_reserved1'),
  BL.seq(util.pubkeyField('collateral_nft_mint'), 11), // 4 byte alignment because a u32 is following
  BL.blob(256, 'cached'),
  BL.blob(2048, 'collateral'),
  BL.blob(2048, 'loans')
]);

export const PositionStruct = BL.struct([
  util.pubkeyField("account"),
  util.numberField("amount"),
  BL.u32('side'),
  BL.u16('reserve_index'),
  BL.blob(66)
]);

export interface Obligation {

}

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
    public reserves: JetReserve[]
  ) {
    this.conn = this.client.program.provider.connection;
  }

  static async load(
    client: JetClient,
    market: JetMarket,
    address: PublicKey,
    reserves: JetReserve[]
  ): Promise<JetUser> {
    const obligationAccount = await client.findDerivedAccount([
      "obligation",
      market.address,
      address,
    ]);
    const user = new JetUser(client, market, address, obligationAccount, reserves);

    user.refresh();
    return user;
  }

  async getObligationData(): Promise<any> {
    const data = await this.conn.getAccountInfo(this.obligation.address);
    if (!data) return;
    const parsed = parseObligationAccount(data.data, this.client.program.coder);

    // const loansData = new Uint8Array(data.loans);
    // const loans = PositionStruct.decode(loansData);
    // console.log("loans ", loans);

    // const collateralData = new Uint8Array(data.collateral);
    // const collateral = PositionStruct.decode(collateralData);
    // console.log('collateral ', collateral);

    return parsed;
  }

  // async liquidateDex(
  //   loanReserve: JetReserve,
  //   collateralReserve: JetReserve
  // ): Promise<string> {
  //   const tx = await this.makeLiquidateDexTx(loanReserve, collateralReserve);
  //   return await this.client.program.provider.send(tx);
  // }

  // async makeLiquidateDexTx(
  //   loanReserve: JetReserve,
  //   collateralReserve: JetReserve
  // ): Promise<Transaction> {
  //   const loanDexAccounts = await loanReserve.loadDexMarketAccounts();
  //   const collateralDexAccounts =
  //     await collateralReserve.loadDexMarketAccounts();
  //   const loanAccounts = await this.findReserveAccounts(loanReserve);
  //   const collateralAccounts = await this.findReserveAccounts(
  //     collateralReserve
  //   );

  //   const tx = new Transaction();

  //   tx.add(loanReserve.makeRefreshIx());
  //   tx.add(collateralReserve.makeRefreshIx());

  //   tx.add(
  //     this.client.program.instruction.liquidateDex({
  //       accounts: {
  //         sourceMarket: collateralDexAccounts,
  //         targetMarket: loanDexAccounts,

  //         market: this.market.address,
  //         marketAuthority: this.market.marketAuthority,

  //         obligation: this.obligation.address,

  //         loanReserve: loanReserve.address,
  //         loanReserveVault: loanReserve.data.vault,
  //         loanNoteMint: loanReserve.data.loanNoteMint,
  //         loanAccount: loanAccounts.loan.address,

  //         collateralReserve: collateralReserve.address,
  //         collateralReserveVault: collateralReserve.data.vault,
  //         depositNoteMint: collateralReserve.data.depositNoteMint,
  //         collateralAccount: collateralAccounts.collateral.address,

  //         dexSwapTokens: loanReserve.data.dexSwapTokens,
  //         dexProgram: this.client.devnet ? DEX_ID_DEVNET : DEX_ID,

  //         tokenProgram: TOKEN_PROGRAM_ID,
  //         rent: SYSVAR_RENT_PUBKEY
  //       },
  //     })
  //   );

  //   return tx;
  // }

  async liquidate(
    loanReserve: JetReserve,
    collateralReserve: JetReserve,
    payerAccount: PublicKey,
    receiverAccount: PublicKey,
    amount: Amount
  ): Promise<string> {
    const tx = await this.makeLiquidateTx(
      loanReserve,
      collateralReserve,
      payerAccount,
      receiverAccount,
      amount
    );
    return await this.client.program.provider.send(tx);
  }

  async makeLiquidateTx(
    _loanReserve: JetReserve,
    _collateralReserve: JetReserve,
    _payerAccount: PublicKey,
    _receiverAccount: PublicKey,
    _amount: Amount
  ): Promise<Transaction> {
    throw new Error("not yet implemented");
  }

  async repay(
    reserve: JetReserve,
    tokenAccount: PublicKey,
    amount: Amount
  ): Promise<string> {
    const ixs = await this.makeRepayTx(reserve, tokenAccount, amount);
    const [res, txids] = await sendAllTransactions(this.client.program.provider, ixs);
    console.log(res, txids);
    return "filler";
  }

  async makeRepayTx(
    reserve: JetReserve,
    tokenAccount: PublicKey,
    amount: Amount
  ) {
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

      // Do our best to estimate the lamports we need
      // 1.002 is a bit of room for interest
      // const lamports = amount.units.loanNotes
      // ? reserve.loanNoteExchangeRate.mul(amount.value).div(new BN(Math.pow(10, 15))).muln(1.002)
      // : amount.value;

      const rent = await this.conn.getMinimumBalanceForRentExemption(TokenAccountLayout.span);
      createTokenAccountIx = SystemProgram.createAccount({
        fromPubkey: this.address,
        newAccountPubkey: depositSourcePubkey,
        programId: TOKEN_PROGRAM_ID,
        space: TokenAccountLayout.span,
        lamports: parseInt(amount.value.addn(rent).toString())
        // lamports: parseInt(lamports.addn(rent).toString())
      })

      initTokenAccountIx = Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID,
        NATIVE_MINT,
        depositSourcePubkey,
        this.address
      );

      closeTokenAccountIx = Token.createCloseAccountInstruction(
        TOKEN_PROGRAM_ID,
        depositSourcePubkey,
        this.address,
        this.address,
        []);
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
    })

    const ixs = [
      {
        ix: [
          createTokenAccountIx,
          initTokenAccountIx,
          refreshReserveIx,
          repayIx,
          closeTokenAccountIx,
        ].filter(ix => ix) as TransactionInstruction[],
        signers: [depositSourceKeypair].filter(signer => signer) as Signer[]
      }
    ]

    return ixs;
  }

  async withdrawNFT(
    tokenAccount: PublicKey,
    tokenMint: PublicKey,
    updateAuthority: PublicKey,
    reserves: JetReserve[]
  ): Promise<string> {
    const tx = await this.makeNFTWithdrawTx(tokenAccount, tokenMint, updateAuthority, reserves);
    return await this.client.program.provider.send(tx, [], {skipPreflight:true});
  }

  async makeNFTWithdrawTx(
    tokenAccount: PublicKey,
    tokenMint: PublicKey,
    updateAuthority: PublicKey,
    reserves: JetReserve[]
  ): Promise<Transaction> {
    const tx = new Transaction();

    const [obligationAddress, obligationBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("obligation"),
        this.market.address.toBuffer(),
        this.address.toBuffer()
      ],
      this.client.program.programId
    );

    const [collateralAddress, collateralBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("nft"),
        this.market.address.toBuffer(),
        tokenMint.toBuffer(),
        this.address.toBuffer()
      ],
      this.client.program.programId
    );

    const metadataPubKey = new PublicKey(METADATA_PROGRAM_ID);
    const [nftMetadata, metadataBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        metadataPubKey.toBuffer(),
        tokenMint.toBuffer()
      ],
      metadataPubKey
    );
    const withdrawNFTBumpSeeds = {
      collateralAccount: collateralBump
    };

    reserves.forEach((reserve) => tx.add(reserve.makeRefreshIx()));
    
    tx.add(
      await this.client.program.instruction.withdrawNft(
        withdrawNFTBumpSeeds,
        metadataBump,
        {
          accounts: {
            market: this.market.address,
            marketAuthority: this.market.marketAuthority,
            obligation: obligationAddress,

            depositNftMint: tokenMint,
            updateAuthority: updateAuthority,
            metadata: nftMetadata,
            owner: this.address,
            collateralAccount: collateralAddress,
            tokenProgram: TOKEN_PROGRAM_ID,

            depositTo: tokenAccount
          }
        })
    );

    return tx;
  }


  async depositNFT(
    tokenAccount: PublicKey,
    tokenMint: PublicKey,
    updateAuthority: PublicKey
  ): Promise<string> {
    const tx = await this.makeNFTDepositTx(tokenAccount, tokenMint, updateAuthority);
    return await this.client.program.provider.send(tx, [], { skipPreflight: true });
  }

  async makeNFTDepositTx(
    tokenAccount: PublicKey,
    tokenMint: PublicKey,
    updateAuthority: PublicKey
  ) {
    const tx = new Transaction();

    const [obligationAddress, obligationBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("obligation"),
        this.market.address.toBuffer(),
        this.address.toBuffer()
      ],
      this.client.program.programId
    );

    if (!await this.conn.getAccountInfo(obligationAddress)) {
      console.log("create obligation account");
      const initObligationIx = await this.client.program.rpc.initObligation(
        obligationBump,
        {
          accounts: {
            market: this.market.address,
            marketAuthority: this.market.marketAuthority,
            obligation: obligationAddress,

            borrower: this.address,
            tokenProgram: TOKEN_PROGRAM_ID,

            systemProgram: anchor.web3.SystemProgram.programId,
          }
        });
      console.log(initObligationIx);
      // tx.add(initObligationIx);
    }

    const [collateralAddress, collateralBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("nft"),
        this.market.address.toBuffer(),
        tokenMint.toBuffer(),
        this.address.toBuffer()
      ],
      this.client.program.programId
    );

    const metadataPubKey = new PublicKey(METADATA_PROGRAM_ID);
    const [nftMetadata, metadataBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        metadataPubKey.toBuffer(),
        tokenMint.toBuffer()
      ],
      metadataPubKey
    );

    const derivedMetadata = await this.findNftMetadata(tokenMint);
    if (!await this.conn.getAccountInfo(collateralAddress)) {
      const ix = await this.client.program.instruction.initNftAccount(
        collateralBump,
        metadataBump,
        {
          accounts: {
            market: this.market.address,
            marketAuthority: this.market.marketAuthority,
            obligation: obligationAddress,

            depositNftMint: tokenMint,
            updateAuthority: updateAuthority, // should make a call to get this info or just do it on the program side
            metadata: nftMetadata,
            owner: this.address,
            collateralAccount: collateralAddress,
            tokenProgram: TOKEN_PROGRAM_ID,

            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            systemProgram: anchor.web3.SystemProgram.programId,
          }
        });
      const tx = new Transaction();
      tx.add(ix);
      await this.client.program.provider.send(tx, [], {skipPreflight: true});
    }

    const DepositNFTBumpSeeds = {
      collateralAccount: collateralBump
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
          updateAuthority: updateAuthority,
          metadata: derivedMetadata.address,
          owner: this.address,
          collateralAccount: collateralAddress,
          tokenProgram: TOKEN_PROGRAM_ID,

          depositSource: tokenAccount,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        }
      });
    tx.add(depositNFTIx);
    return tx;
  }

  async withdrawCollateral(
    reserve: JetReserve,
    amount: Amount,
    nftReserves?: JetReserve[]
  ): Promise<string[]> {
    const ixs = await this.makeWithdrawCollateralTx(reserve, amount, nftReserves);
    const [res, txids] = await sendAllTransactions(this.client.program.provider, ixs);
    return txids;
  }

  async makeWithdrawCollateralTx(
    reserve: JetReserve,
    amount: Amount,
    nftReserves?: JetReserve[]
  ): Promise<InstructionAndSigner[]> {
    const accounts = await this.findReserveAccounts(reserve);
    const bumpSeeds = {
      collateralAccount: accounts.collateral.bumpSeed,
      depositAccount: accounts.deposits.bumpSeed,
    };

    const refreshReserveIxs: TransactionInstruction[] = [];
    let currentReserveRefreshIx: TransactionInstruction | null = null

    // need to refresh all reserves in market to withdraw
    this.reserves.forEach((reserve) => {
      if (reserve.address.equals(new PublicKey("5mT9SgBQnrn5sY2WN5Uv5VFJ8pQ5KovrnEMS3ve7Z177"))) // shouldnt be hardcoded but needs to to avoid the transaction size limit
        currentReserveRefreshIx = reserve.makeRefreshIx();

      refreshReserveIxs.push(reserve.makeRefreshIx())
    });

    if (nftReserves) {
      nftReserves.forEach((reserve) => {
        if (reserve.address.equals(new PublicKey("5mT9SgBQnrn5sY2WN5Uv5VFJ8pQ5KovrnEMS3ve7Z177"))) // shouldnt be hardcoded but needs to to avoid the transaction size limit
          currentReserveRefreshIx = reserve.makeRefreshIx();
        refreshReserveIxs.push(reserve.makeRefreshIx());
      })
    }

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

    // const splitRefreshIdx = this.split(refreshReserveIxs, 4);
    const ixs = [
      // ...splitRefreshIdx.map((chunk) => {
      //   return {
      //     ix: [
      //       ...chunk
      //     ].filter(ix => ix) as TransactionInstruction[]
      //   }
      // }),
      {
        ix: [
          currentReserveRefreshIx,
          ...refreshReserveIxs,
          withdrawCollateralIx
        ].filter(ix => ix) as TransactionInstruction[]
      }
    ]
    return ixs;
  }

  split(array: TransactionInstruction[], n: any) {
    let [...arr] = array;
    var res = [];
    while (arr.length) {
      res.push(arr.splice(0, n));
    }
    return res;
  }

  async withdraw(
    reserve: JetReserve,
    tokenAccount: PublicKey,
    amount: Amount
  ): Promise<string> {
    const [createTx, tx, signers] = await this.makeWithdrawTx(reserve, tokenAccount, amount);
    if (createTx) {
      await this.client.program.provider.send(createTx, signers);
      return await this.client.program.provider.send(tx);
    } else {
      return await this.client.program.provider.send(tx);
    }
  }

  async makeWithdrawTx(
    reserve: JetReserve,
    tokenAccount: PublicKey,
    amount: Amount,
  ): Promise<[Transaction | undefined, Transaction, Signer[] | undefined]> {
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
    const walletTokenExists = await this.conn.getAccountInfo(
      tokenAccount
    );

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
      })
      initWsolIx = Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID,
        reserve.data.tokenMint,
        withdrawAccount,
        this.address);

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
        this.address);
      supplementalTx.add(createAssociatedTokenAccountIx);
    }

    tx.add(reserve.makeRefreshIx());
    tx.add(
      this.client.program.instruction.withdraw(
        accounts.deposits.bumpSeed,
        amount,
        {
          accounts: {
            market: this.market.address,
            marketAuthority: this.market.marketAuthority,

            withdrawAccount: withdrawAccount,
            depositAccount: accounts.deposits.address,
            depositor: this.address,

            reserve: reserve.address,
            vault: reserve.data.vault,
            depositNoteMint: reserve.data.depositNoteMint,

            tokenProgram: TOKEN_PROGRAM_ID,
          },
        }
      )
    );

    if (reserve.data.tokenMint.equals(NATIVE_MINT) && wsolKeypair) {
      closeWsolIx = Token.createCloseAccountInstruction(
        TOKEN_PROGRAM_ID,
        withdrawAccount,
        this.address,
        this.address,
        []);
      tx.add(closeWsolIx);
    }
    if (supplementalTx) {
      if (signer && signer?.length > 0) {
        return [supplementalTx, tx, signer]
      } else
        return [supplementalTx, tx, undefined];
    }
    else
      return [undefined, tx, undefined]
  }

  async deposit(
    reserve: JetReserve,
    tokenAccount: PublicKey,
    amount: Amount
  ): Promise<string> {
    console.log({ reserve, tokenAccount: tokenAccount.toString(), amount: amount.value.toString() })
    const tx = await this.makeDepositTx(reserve, tokenAccount, amount);
    const transaction = tx[0];
    const signers = tx[1];
    return await this.client.program.provider.send(transaction, signers);
  }

  async makeDepositTx(
    reserve: JetReserve,
    tokenAccount: PublicKey,
    amount: Amount
  ): Promise<[Transaction, Keypair[]]> {
    const accounts = await this.findReserveAccounts(reserve);
    const depositAccountInfo = await this.conn.getAccountInfo(
      accounts.deposits.address
    );

    let depositSourcePubkey = tokenAccount;

    // Optional signers
    let depositSourceKeypair: Keypair | undefined;

    // Optional instructions
    // Create wrapped sol ixs
    let createTokenAccountIx: TransactionInstruction | undefined;
    let initTokenAccountIx: TransactionInstruction | undefined;
    let closeTokenAccountIx: TransactionInstruction | undefined;

    // Initialize Obligation, deposit notes, collateral notes
    let initObligationIx: TransactionInstruction | undefined;
    let initDepositAccountIx: TransactionInstruction | undefined;
    let initCollateralAccountIx: TransactionInstruction | undefined;

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
        lamports: parseInt(amount.value.addn(rent).toString())
      })

      initTokenAccountIx = Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID,
        NATIVE_MINT,
        depositSourcePubkey,
        this.address
      );

      closeTokenAccountIx = Token.createCloseAccountInstruction(
        TOKEN_PROGRAM_ID,
        depositSourcePubkey,
        this.address,
        this.address,
        []);

      tx.add(createTokenAccountIx);
      tx.add(initTokenAccountIx);
    }

    if (depositAccountInfo == null) {
      tx.add(this.makeInitDepositAccountIx(reserve, accounts.deposits));
    }

    tx.add(reserve.makeRefreshIx());
    tx.add(
      this.client.program.instruction.deposit(
        accounts.deposits.bumpSeed,
        amount,
        {
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
        }
      )
    );

    const signers = [depositSourceKeypair].filter(signer => signer) as Keypair[];
    if (closeTokenAccountIx)
      tx.add(closeTokenAccountIx);

    return [tx, signers];
  }

  async depositCollateral(
    reserve: JetReserve,
    amount: Amount
  ): Promise<string> {
    const tx = await this.makeDepositCollateralTx(reserve, amount);
    return await this.client.program.provider.send(tx);
  }

  async makeDepositCollateralTx(reserve: JetReserve, amount: Amount) {
    const accounts = await this.findReserveAccounts(reserve);
    const obligationAccountInfo = await this.conn.getAccountInfo(
      this.obligation.address
    );
    const collateralAccountInfo = await this.conn.getAccountInfo(
      accounts.collateral.address
    );

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
      })
    );

    return tx;
  }

  async borrow(
    reserve: JetReserve,
    receiver: PublicKey,
    amount: Amount,
    nftToBorrowAgainst: any,
  ): Promise<string[]> {
    const ixs = await this.makeBorrowTx(reserve, receiver, amount, nftToBorrowAgainst);
    const [res, txids] = await sendAllTransactions(this.client.program.provider, ixs);
    console.log(res, txids);
    return txids;
  }

  async makeBorrowTx(
    reserve: JetReserve,
    receiver: PublicKey,
    amount: Amount,
    nftToBorrowAgainst: any,
  ): Promise<InstructionAndSigner[]> {

    let receiverAccount: PublicKey = receiver;
    // Create token account ix
    let createTokenAccountIx: TransactionInstruction | undefined;

    // Wrapped sol ixs
    let wsolKeypair: Keypair | undefined;
    let createWsolTokenAccountIx: TransactionInstruction | undefined;
    let initWsoltokenAccountIx: TransactionInstruction | undefined;
    let closeTokenAccountIx: TransactionInstruction | undefined;

    const accounts = await this.findReserveAccounts(reserve);
    const loanAccountInfo = await this.conn.getAccountInfo(
      accounts.loan.address
    );

    const walletTokenExists = await this.conn.getAccountInfo(
      receiverAccount
    );

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
      })
      initWsoltokenAccountIx = Token.createInitAccountInstruction(
        TOKEN_PROGRAM_ID,
        reserve.data.tokenMint,
        wsolKeypair.publicKey,
        this.address);
    } else if (!walletTokenExists) {
      // Create the wallet token account if it doesn't exist
      createTokenAccountIx = Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        reserve.data.tokenMint,
        receiverAccount,
        this.address,
        this.address);
    }

    let initLoanAccountIx;
    if (loanAccountInfo == null) {
      initLoanAccountIx = this.makeInitLoanAccountIx(reserve, accounts.loan);
    }

    const refreshReserveIxs: TransactionInstruction[] = [];
    let currentReserveRefreshIx: TransactionInstruction | null = null

    this.reserves.forEach((r) => {
      // if (r.address.equals(new PublicKey("5mT9SgBQnrn5sY2WN5Uv5VFJ8pQ5KovrnEMS3ve7Z177"))) // shouldnt be hardcoded but needs to to avoid the transaction size limit
      //   currentReserveRefreshIx = r.makeRefreshIx();
      // if (!r.address.equals(reserve.address))
        refreshReserveIxs.push(r.makeRefreshIx());
    })

    const [feeReceiverAccount, feeReceiverAccountBump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("honey-protocol-fee"),
        new PublicKey('So11111111111111111111111111111111111111112').toBuffer(),
      ],
      this.client.program.programId
    );

    // const market = await JetMarket.fetchData(this.client, this.market.address);
    // const reservee = await JetReserve.load(this.client, new PublicKey('FabMjmMvRjbTUqJfRdkm3CFrcchAdW7HFEkHicZBLufK'));


    const borrowSeeds = {
      loanAccount: accounts.loan.bumpSeed,
      feeReceiverAccount: feeReceiverAccountBump
    }
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
        feeReceiverAccount: feeReceiverAccount,
        receiverAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    }
    )


    if (reserve.data.tokenMint.equals(NATIVE_MINT)) {
      closeTokenAccountIx = Token.createCloseAccountInstruction(
        TOKEN_PROGRAM_ID,
        receiverAccount,
        this.address,
        this.address,
        []);
    }

    // const nftReserveDeposited = refreshReserveIxs.pop();
    const splitRefreshIdx = this.split(refreshReserveIxs, 4);
    const ixs = [
      // ...splitRefreshIdx.map((chunk) => {
      //   return {
      //     ix: [
      //       ...chunk
      //     ].filter(ix => ix) as TransactionInstruction[]
      //   }
      // }),
      {
        ix: [
          createTokenAccountIx,
          createWsolTokenAccountIx,
          initWsoltokenAccountIx,
          initLoanAccountIx
        ].filter(ix => ix) as TransactionInstruction[],
        signers: [wsolKeypair].filter(ix => ix) as Signer[]
      },
      {
        ix: [
          ...refreshReserveIxs,
          borrowIx,
          closeTokenAccountIx
        ].filter(ix => ix) as TransactionInstruction[]
      }
    ]
    return ixs;
  }


  private makeInitDepositAccountIx(
    reserve: JetReserve,
    account: DerivedAccount
  ): TransactionInstruction {
    return this.client.program.instruction.initDepositAccount(
      account.bumpSeed,
      {
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
      }
    );
  }

  private async makeInitNFTCollateralAccountIx(
    tokenMint: PublicKey,
    nftCollateral: DerivedAccount,
    metadata: DerivedAccount,
    updateAuthority: PublicKey
  ): Promise<TransactionInstruction> {
    return this.client.program.instruction.initNftAccount(
      nftCollateral.bumpSeed,
      metadata.bumpSeed,
      {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,
          obligation: this.obligation.address,

          depositNftMint: tokenMint,
          updateAuthority: updateAuthority,
          metadata: metadata.address,
          owner: this.address,
          collateralAccount: nftCollateral.address,
          tokenProgram: TOKEN_PROGRAM_ID,

          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          systemProgram: anchor.web3.SystemProgram.programId,
        }
      });
  }

  private makeInitCollateralAccountIx(
    reserve: JetReserve,
    account: DerivedAccount
  ): TransactionInstruction {
    return this.client.program.instruction.initCollateralAccount(
      account.bumpSeed,
      {
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
      }
    );
  }

  private makeInitLoanAccountIx(
    reserve: JetReserve,
    account: DerivedAccount
  ): TransactionInstruction {
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
    return this.client.program.instruction.initObligation(
      this.obligation.bumpSeed,
      {
        accounts: {
          market: this.market.address,
          marketAuthority: this.market.marketAuthority,

          obligation: this.obligation.address,
          borrower: this.address,

          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        },
      }
    );
  }

  async refresh() {
    this._loans = [];
    this._deposits = [];
    this._collateral = [];

    for (const reserve of this.market.reserves) {
      if (reserve.address.toBase58() == PublicKey.default.toBase58()) {
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

  private async refreshAccount(
    appendTo: TokenAmount[],
    account: DerivedAccount
  ) {
    try {
      const info = await this.conn.getAccountInfo(account.address);

      if (info == null) {
        return;
      }

      const tokenAccount: TokenAccount = TokenAccountLayout.decode(info.data);

      appendTo.push({
        mint: new PublicKey(tokenAccount.mint),
        amount: new anchor.BN(tokenAccount.amount, undefined, "le"),
      });
    } catch (e) {
      console.log(`error getting user account: ${e}`);
      // ignore error, which should mean it's an invalid/uninitialized account
    }
  }

  // private async findNFTCollateralAccount(
  //   tokenMint: PublicKey
  // ): Promise<DerivedAccount> {
  //   const derivedNFT = await this.client.findDerivedAccount([
  //     "nft",
  //     this.market.address,
  //     tokenMint,
  //     this.address,
  //   ]);
  //   return derivedNFT;
  // }

  private async findNftMetadata(
    tokenMint: PublicKey
  ): Promise<DerivedAccount> {
    const metadataPubKey = new PublicKey(METADATA_PROGRAM_ID);
    const [address, bump] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        metadataPubKey.toBuffer(),
        tokenMint.toBuffer()
      ],
      metadataPubKey);
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
    seeds: (HasPublicKey | ToBytes | Uint8Array | string)[]
  ): Promise<[PublicKey, number]> {
    const seed_bytes = seeds.map((s) => {
      if (typeof s == "string") {
        return new TextEncoder().encode(s);
      } else if ("publicKey" in s) {
        return s.publicKey.toBytes();
      } else if ("toBytes" in s) {
        return s.toBytes();
      } else {
        return s;
      }
    });

    return await anchor.web3.PublicKey.findProgramAddress(seed_bytes, programId);
  };

  /** Find reserve deposit note account for wallet */
  private async findDepositNoteAddress(program: anchor.Program, reserve: PublicKey, wallet: PublicKey)
    : Promise<[depositNotePubkey: PublicKey, depositAccountBump: number]> {
    return await this.findProgramAddress(
      program.programId,
      ["deposits", reserve, wallet]
    );
  };

  /** Find loan note token account for the reserve, obligation and wallet. */
  private async findLoanNoteAddress(program: anchor.Program, reserve: PublicKey, obligation: PublicKey, wallet: PublicKey)
    : Promise<[loanNotePubkey: PublicKey, loanNoteBump: number]> {
    return await this.findProgramAddress(
      program.programId,
      ["loan", reserve, obligation, wallet]
    );
  };

  /** Find collateral account for the reserve, obligation and wallet. */
  private async findCollateralAddress(program: anchor.Program, reserve: PublicKey, obligation: PublicKey, wallet: PublicKey)
    : Promise<[collateralPubkey: PublicKey, collateralBump: number]> {
    return await this.findProgramAddress(
      program.programId,
      ["collateral", reserve, obligation, wallet]
    );
  };

  private async findReserveAccounts(
    reserve: JetMarketReserveInfo | JetReserve
  ): Promise<UserReserveAccounts> {
    const reserveAddress = typeof reserve.address == 'string' ? new PublicKey(reserve.address) : reserve.address;
    const deposits = await this.findDepositNoteAddress(this.client.program, reserveAddress, this.address);
    const loan = await this.findLoanNoteAddress(this.client.program, reserveAddress, this.obligation.address, this.address);
    const collateral = await this.findCollateralAddress(this.client.program, reserveAddress, this.obligation.address, this.address);

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
