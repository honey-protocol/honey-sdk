import { Keypair, PublicKey, Signer, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Amount } from '.';
import { HoneyClient } from './client';
import { HoneyMarket } from './market';
import { HoneyReserve } from './reserve';
import { InstructionAndSigner } from '../helpers/programUtil';
import * as BL from '@solana/buffer-layout';
import { TxResponse } from '../actions/types';
import { ObligationAccount } from '../helpers/JetTypes';
import { TokenAmount } from './token-amount';
export declare const METADATA_PROGRAM_ID: PublicKey;
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
export declare const ObligationStateStruct: BL.Structure;
export declare const PositionStruct: BL.Structure;
export declare const SOLVENT_PROGRAM: PublicKey;
export declare const SOLVENT_FEE_ACCOUNT_DEVNET: PublicKey;
export declare class HoneyUser implements User {
    private client;
    market: HoneyMarket;
    address: PublicKey;
    private obligation;
    reserves: HoneyReserve[];
    private _deposits;
    private _collateral;
    private _loans;
    private conn;
    private constructor();
    static load(client: HoneyClient, market: HoneyMarket, address: PublicKey, reserves: HoneyReserve[]): Promise<HoneyUser>;
    getObligationData(): Promise<ObligationAccount | Error>;
    liquidate(loanReserve: HoneyReserve, collateralReserve: HoneyReserve, payerAccount: PublicKey, receiverAccount: PublicKey, amount: Amount): Promise<string>;
    makeLiquidateTx(_loanReserve: HoneyReserve, _collateralReserve: HoneyReserve, _payerAccount: PublicKey, _receiverAccount: PublicKey, _amount: Amount): Promise<Transaction>;
    repay(reserve: HoneyReserve, tokenAccount: PublicKey, amount: Amount): Promise<TxResponse>;
    makeRepayTx(reserve: HoneyReserve, tokenAccount: PublicKey, amount: Amount): Promise<{
        ix: TransactionInstruction[];
        signers: Signer[];
    }[]>;
    withdrawNFT(tokenAccount: PublicKey, tokenMint: PublicKey, updateAuthority: PublicKey): Promise<TxResponse>;
    makeNFTWithdrawTx(tokenAccount: PublicKey, tokenMint: PublicKey, updateAuthority: PublicKey): Promise<Transaction>;
    depositNFT(tokenAccount: PublicKey, tokenMint: PublicKey, updateAuthority: PublicKey): Promise<TxResponse>;
    makeNFTDepositTx(tokenAccount: PublicKey, tokenMint: PublicKey, updateAuthority: PublicKey): Promise<TxResponse>;
    withdrawCollateral(reserve: HoneyReserve, amount: Amount): Promise<TxResponse>;
    makeWithdrawCollateralTx(reserve: HoneyReserve, amount: Amount): Promise<InstructionAndSigner[]>;
    withdraw(reserve: HoneyReserve, tokenAccount: PublicKey, amount: Amount): Promise<TxResponse>;
    makeWithdrawTx(reserve: HoneyReserve, tokenAccount: PublicKey, amount: Amount): Promise<TxResponse>;
    deposit(reserve: HoneyReserve, tokenAccount: PublicKey, amount: Amount): Promise<TxResponse>;
    makeDepositTx(reserve: HoneyReserve, tokenAccount: PublicKey, amount: Amount): Promise<[Transaction, Keypair[]]>;
    depositCollateral(reserve: HoneyReserve, amount: Amount): Promise<TxResponse>;
    makeDepositCollateralTx(reserve: HoneyReserve, amount: Amount): Promise<Transaction>;
    borrow(reserve: HoneyReserve, receiver: PublicKey, amount: Amount): Promise<TxResponse>;
    makeBorrowTx(reserve: HoneyReserve, receiver: PublicKey, amount: Amount): Promise<InstructionAndSigner[]>;
    private makeInitDepositAccountIx;
    private makeInitNFTCollateralAccountIx;
    private makeInitCollateralAccountIx;
    private makeInitLoanAccountIx;
    private makeInitObligationAccountIx;
    refresh(): Promise<void>;
    private refreshReserve;
    private refreshAccount;
    private findNftMetadata;
    /**
     * Find a program derived address
     * @param programId The program the address is being derived for
     * @param seeds The seeds to find the address
     * @returns The address found and the bump seed required
     */
    private findProgramAddress;
    /** Find reserve deposit note account for wallet */
    private findDepositNoteAddress;
    /** Find loan note token account for the reserve, obligation and wallet. */
    private findLoanNoteAddress;
    /** Find collateral account for the reserve, obligation and wallet. */
    private findCollateralAddress;
    private findReserveAccounts;
    /**
     * Get all the deposits held by the user, excluding those amounts being
     * used as collateral for a loan.
     */
    deposits(): TokenAmount[];
    /**
     * Get all the collateral deposits held by the user.
     */
    collateral(): TokenAmount[];
    /**
     * Get the loans held by the user
     */
    loans(): TokenAmount[];
}
