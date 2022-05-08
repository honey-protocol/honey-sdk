import * as anchor from '@project-serum/anchor';
import { AccountInfo as TokenAccountInfo } from '@solana/spl-token';
import { AccountInfo, Commitment, Connection, Context, PublicKey, Signer, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import type { HasPublicKey, IdlMetadata, MarketAccount, ObligationAccount, ReserveAccount, ReserveConfigStruct, ToBytes } from './JetTypes';
import { TxnResponse } from './JetTypes';
import { TokenAmount } from './util';
export declare const SOL_DECIMALS = 9;
export declare const NULL_PUBKEY: anchor.web3.PublicKey;
/** Find market authority. */
export declare const findMarketAuthorityAddress: (program: anchor.Program, market: PublicKey) => Promise<[marketAuthorityPubkey: PublicKey, marketAuthorityBump: number]>;
/** Find reserve deposit note mint. */
export declare const findDepositNoteMintAddress: (program: anchor.Program, reserve: PublicKey, reserveTokenMint: PublicKey) => Promise<[depositNoteMintPubkey: PublicKey, depositNoteMintBump: number]>;
/** Find reserve loan note mint. */
export declare const findLoanNoteMintAddress: (program: anchor.Program, reserve: PublicKey, reserveTokenMint: PublicKey) => Promise<[loanNoteMintPubkey: PublicKey, loanNoteMintBump: number]>;
/** Find reserve deposit note destination account for wallet. */
export declare const findDepositNoteDestAddress: (program: anchor.Program, reserve: PublicKey, wallet: PublicKey) => Promise<[depositNoteDestPubkey: PublicKey, depositNoteDestBump: number]>;
/** Find reserve vault token account. */
export declare const findVaultAddress: (program: anchor.Program, market: PublicKey, reserve: PublicKey) => Promise<[vaultPubkey: PublicKey, vaultBump: number]>;
export declare const findFeeNoteVault: (program: anchor.Program, reserve: PublicKey) => Promise<[feeNoteVaultPubkey: PublicKey, feeNoteVaultBump: number]>;
/** Find reserve deposit note account for wallet */
export declare const findDepositNoteAddress: (program: anchor.Program, reserve: PublicKey, wallet: PublicKey) => Promise<[depositNotePubkey: PublicKey, depositAccountBump: number]>;
/**
 * Find the obligation for the wallet.
 */
export declare const findObligationAddress: (program: anchor.Program, market: PublicKey, wallet: PublicKey) => Promise<[obligationPubkey: PublicKey, obligationBump: number]>;
/** Find loan note token account for the reserve, obligation and wallet. */
export declare const findLoanNoteAddress: (program: anchor.Program, reserve: PublicKey, obligation: PublicKey, wallet: PublicKey) => Promise<[loanNotePubkey: PublicKey, loanNoteBump: number]>;
/** Find collateral account for the reserve, obligation and wallet. */
export declare const findCollateralAddress: (program: anchor.Program, reserve: PublicKey, obligation: PublicKey, wallet: PublicKey) => Promise<[collateralPubkey: PublicKey, collateralBump: number]>;
/**
 * Find a program derived address
 * @param programId The program the address is being derived for
 * @param seeds The seeds to find the address
 * @returns The address found and the bump seed required
 */
export declare const findProgramAddress: (programId: PublicKey, seeds: (HasPublicKey | ToBytes | Uint8Array | string)[]) => Promise<[PublicKey, number]>;
/**
 * Fetch an account for the specified public key and subscribe a callback
 * to be invoked whenever the specified account changes.
 *
 * @param connection Connection to use
 * @param publicKey Public key of the account to monitor
 * @param callback Function to invoke whenever the account is changed
 * @param commitment Specify the commitment level account changes must reach before notification
 * @return subscription id
 */
export declare const getTokenAccountAndSubscribe: (connection: Connection, publicKey: anchor.web3.PublicKey, decimals: number, callback: (amount: TokenAmount | undefined, context: Context) => void, commitment?: Commitment) => Promise<number>;
/**
 * Fetch an account for the specified public key and subscribe a callback
 * to be invoked whenever the specified account changes.
 *
 * @param connection Connection to use
 * @param publicKey Public key of the account to monitor
 * @param callback Function to invoke whenever the account is changed
 * @param commitment Specify the commitment level account changes must reach before notification
 * @return subscription id
 */
export declare const getMintInfoAndSubscribe: (connection: Connection, publicKey: anchor.web3.PublicKey, callback: (amount: TokenAmount | undefined, context: Context) => void, commitment?: Commitment | undefined) => Promise<number>;
/**
 * Fetch an account for the specified public key and subscribe a callback
 * to be invoked whenever the specified account changes.
 *
 * @param connection Connection to use
 * @param publicKey Public key of the account to monitor
 * @param callback Function to invoke whenever the account is changed
 * @param commitment Specify the commitment level account changes must reach before notification
 * @return subscription id
 */
export declare const getProgramAccountInfoAndSubscribe: <T>(connection: anchor.web3.Connection, publicKey: anchor.web3.PublicKey, coder: anchor.Coder, accountType: string, callback: (acc: anchor.web3.AccountInfo<T>, context: Context) => void, commitment?: Commitment | undefined) => Promise<number>;
/**
 * Fetch an account for the specified public key and subscribe a callback
 * to be invoked whenever the specified account changes.
 *
 * @param connection Connection to use
 * @param publicKey Public key of the account to monitor
 * @param callback Function to invoke whenever the account is changed
 * @param commitment Specify the commitment level account changes must reach before notification
 * @return subscription id
 */
export declare const getAccountInfoAndSubscribe: (connection: anchor.web3.Connection, publicKey: anchor.web3.PublicKey, callback: (acc: AccountInfo<Buffer> | null, context: Context) => void, commitment?: Commitment | undefined) => Promise<number>;
export declare const sendTransaction: (provider: anchor.Provider, instructions: TransactionInstruction[], signers?: Signer[], skipConfirmation?: boolean) => Promise<[res: TxnResponse, txid: string[]]>;
export declare const inDevelopment: boolean;
export declare const explorerUrl: (txid: string) => string;
export declare const getErrNameAndMsg: (errCode: number) => string;
/**
 * Get the custom program error code if there's any in the error message and return parsed error code hex to number string
 * @param errMessage string - error message that would contain the word "custom program error:" if it's a customer program error
 * @returns [boolean, string] - probably not a custom program error if false otherwise the second element will be the code number in string
 */
export declare const getCustomProgramErrorCode: (errMessage: string) => [boolean, string];
/**
 * Transaction errors contain extra goodies like a message and error code. Log them
 * @param error An error object from anchor.
 * @returns A stringified error.
 */
export declare const transactionErrorToString: (error: any) => string;
export interface InstructionAndSigner {
    ix: TransactionInstruction[];
    signers?: Signer[];
}
export declare const simulateAllTransactions: (provider: anchor.Provider, transactions: InstructionAndSigner[], skipConfirmation?: boolean) => Promise<[res: TxnResponse, txids: string[]]>;
export declare const sendAllTransactions: (provider: anchor.Provider, transactions: InstructionAndSigner[], skipConfirmation?: boolean) => Promise<[res: TxnResponse, txids: string[]]>;
export declare const parseTokenAccount: (account: AccountInfo<Buffer>, accountPubkey: PublicKey) => anchor.web3.AccountInfo<TokenAccountInfo>;
export declare const parseMarketAccount: (account: Buffer, coder: anchor.Coder) => MarketAccount;
export declare const parseReserveAccount: (account: Buffer, coder: anchor.Coder) => ReserveAccount;
export declare const parseObligationAccount: (account: Buffer, coder: anchor.Coder) => ObligationAccount;
export declare const parseU192: (data: Buffer | number[]) => any;
export declare const parseIdlMetadata: (idlMetadata: IdlMetadata) => IdlMetadata;
/**
 * Convert some object of fields with address-like values,
 * such that the values are converted to their `PublicKey` form.
 * @param obj The object to convert
 */
export declare function toPublicKeys(obj: Record<string, string | PublicKey | HasPublicKey>): Record<string, PublicKey>;
/** Continuous Compounding Rate
 */
export declare const getCcRate: (reserveConfig: ReserveConfigStruct, utilRate: number) => number;
/** Borrow rate
 */
export declare const getBorrowRate: (ccRate: number, fee: number) => number;
/** Deposit rate
 */
export declare const getDepositRate: (ccRate: number, utilRatio: number) => number;
