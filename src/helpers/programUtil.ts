import { BN } from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import {
  MintInfo,
  MintLayout,
  AccountInfo as TokenAccountInfo,
  AccountLayout as TokenAccountLayout,
} from '@solana/spl-token';
import {
  AccountInfo,
  Commitment,
  ConfirmOptions,
  Connection,
  Context,
  PublicKey,
  Signer,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import type {
  HasPublicKey,
  IdlMetadata,
  HoneyMarketReserveInfo,
  MarketAccount,
  ObligationAccount,
  ObligationPositionStruct,
  ReserveAccount,
  ReserveConfigStruct,
  ToBytes,
  User,
  SlopeTxn,
  CustomProgramError,
  MarketMetadata,
} from './honeyTypes';
import { TxnResponse } from './honeyTypes';
import { MarketReserveInfoList, PositionInfoList, ReserveStateLayout } from './layout';
import { TokenAmount } from './util';
import bs58 from 'bs58';

// Find PDA functions and jet algorithms that are reimplemented here

export const SOL_DECIMALS = 9;
export const NULL_PUBKEY = new PublicKey('11111111111111111111111111111111');

// Find PDA addresses
/** Find market authority. */
export const findMarketAuthorityAddress = async (
  program: anchor.Program,
  market: PublicKey,
): Promise<[marketAuthorityPubkey: PublicKey, marketAuthorityBump: number]> => {
  return findProgramAddress(program.programId, [market.toBuffer()]);
};

/** Find reserve deposit note mint. */
export const findDepositNoteMintAddress = async (
  program: anchor.Program,
  reserve: PublicKey,
  reserveTokenMint: PublicKey,
): Promise<[depositNoteMintPubkey: PublicKey, depositNoteMintBump: number]> => {
  return await findProgramAddress(program.programId, ['deposits', reserve, reserveTokenMint]);
};

/** Find reserve loan note mint. */
export const findLoanNoteMintAddress = async (
  program: anchor.Program,
  reserve: PublicKey,
  reserveTokenMint: PublicKey,
): Promise<[loanNoteMintPubkey: PublicKey, loanNoteMintBump: number]> => {
  return await findProgramAddress(program.programId, ['loans', reserve, reserveTokenMint]);
};

/** Find reserve deposit note destination account for wallet. */
export const findDepositNoteDestAddress = async (
  program: anchor.Program,
  reserve: PublicKey,
  wallet: PublicKey,
): Promise<[depositNoteDestPubkey: PublicKey, depositNoteDestBump: number]> => {
  return await findProgramAddress(program.programId, [reserve, wallet]);
};

/** Find reserve vault token account. */
export const findVaultAddress = async (
  program: anchor.Program,
  market: PublicKey,
  reserve: PublicKey,
): Promise<[vaultPubkey: PublicKey, vaultBump: number]> => {
  return await findProgramAddress(program.programId, [market, reserve]);
};

export const findFeeNoteVault = async (
  program: anchor.Program,
  reserve: PublicKey,
): Promise<[feeNoteVaultPubkey: PublicKey, feeNoteVaultBump: number]> => {
  return await findProgramAddress(program.programId, ['fee-vault', reserve]);
};

/** Find reserve deposit note account for wallet */
export const findDepositNoteAddress = async (
  program: anchor.Program,
  reserve: PublicKey,
  wallet: PublicKey,
): Promise<[depositNotePubkey: PublicKey, depositAccountBump: number]> => {
  return await findProgramAddress(program.programId, ['deposits', reserve, wallet]);
};

/**
 * Find the obligation for the wallet.
 */
export const findObligationAddress = async (
  program: anchor.Program,
  market: PublicKey,
  wallet: PublicKey,
): Promise<[obligationPubkey: PublicKey, obligationBump: number]> => {
  return await findProgramAddress(program.programId, ['obligation', market, wallet]);
};

/** Find loan note token account for the reserve, obligation and wallet. */
export const findLoanNoteAddress = async (
  program: anchor.Program,
  reserve: PublicKey,
  obligation: PublicKey,
  wallet: PublicKey,
): Promise<[loanNotePubkey: PublicKey, loanNoteBump: number]> => {
  return await findProgramAddress(program.programId, ['loan', reserve, obligation, wallet]);
};

/** Find collateral account for the reserve, obligation and wallet. */
export const findCollateralAddress = async (
  program: anchor.Program,
  reserve: PublicKey,
  obligation: PublicKey,
  wallet: PublicKey,
): Promise<[collateralPubkey: PublicKey, collateralBump: number]> => {
  return await findProgramAddress(program.programId, ['collateral', reserve, obligation, wallet]);
};

/**
 * Find a program derived address
 * @param programId The program the address is being derived for
 * @param seeds The seeds to find the address
 * @returns The address found and the bump seed required
 */
export const findProgramAddress = async (
  programId: PublicKey,
  seeds: (HasPublicKey | ToBytes | Uint8Array | string)[],
): Promise<[PublicKey, number]> => {
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
};

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
export const getTokenAccountAndSubscribe = async function (
  connection: Connection,
  publicKey: anchor.web3.PublicKey,
  decimals: number,
  callback: (amount: TokenAmount | undefined, context: Context) => void,
  commitment?: Commitment,
): Promise<number> {
  return await getAccountInfoAndSubscribe(
    connection,
    publicKey,
    (account, context) => {
      if (account !== null) {
        if (account.data.length !== 165) {
          console.log('account data length', account.data.length);
        }
        const decoded = parseTokenAccount(account, publicKey);
        const amount = TokenAmount.tokenAccount(decoded.data, decimals);
        callback(amount, context);
      } else {
        callback(undefined, context);
      }
    },
    commitment,
  );
};

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
export const getMintInfoAndSubscribe = async function (
  connection: Connection,
  publicKey: anchor.web3.PublicKey,
  callback: (amount: TokenAmount | undefined, context: Context) => void,
  commitment?: Commitment | undefined,
): Promise<number> {
  return await getAccountInfoAndSubscribe(
    connection,
    publicKey,
    (account, context) => {
      if (account != null) {
        let mintInfo = MintLayout.decode(account.data) as MintInfo;
        let amount = TokenAmount.mint(mintInfo);
        callback(amount, context);
      } else {
        callback(undefined, context);
      }
    },
    commitment,
  );
};

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
export const getProgramAccountInfoAndSubscribe = async function <T>(
  connection: anchor.web3.Connection,
  publicKey: anchor.web3.PublicKey,
  coder: anchor.Coder,
  accountType: string,
  callback: (acc: AccountInfo<T> | undefined, context: Context) => void,
  commitment?: Commitment | undefined,
): Promise<number> {
  return await getAccountInfoAndSubscribe(
    connection,
    publicKey,
    (account, context) => {
      if (account != null) {
        const decoded: AccountInfo<T> = {
          ...account,
          data: coder.accounts.decode(accountType, account.data) as T,
        };
        callback(decoded, context);
      } else {
        callback(undefined, context);
      }
    },
    commitment,
  );
};

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
export const getAccountInfoAndSubscribe = async function (
  connection: anchor.web3.Connection,
  publicKey: anchor.web3.PublicKey,
  callback: (acc: AccountInfo<Buffer> | null, context: Context) => void,
  commitment?: Commitment | undefined,
): Promise<number> {
  let latestSlot: number = -1;
  let subscriptionId = connection.onAccountChange(
    publicKey,
    (account: AccountInfo<Buffer>, context: Context) => {
      if (context.slot >= latestSlot) {
        latestSlot = context.slot;
        callback(account, context);
      }
    },
    commitment,
  );

  const response = await connection.getAccountInfoAndContext(publicKey, commitment);
  if (response.context.slot >= latestSlot) {
    latestSlot = response.context.slot;
    if (response.value != null) {
      callback(response.value, response.context);
    } else {
      callback(null, response.context);
    }
  }

  return subscriptionId;
};

export const sendTransaction = async (
  provider: anchor.Provider,
  instructions: TransactionInstruction[],
  signers?: Signer[],
  skipConfirmation?: boolean,
): Promise<[res: TxnResponse, txid: string[]]> => {
  if (!provider.wallet?.publicKey) {
    throw new Error('Wallet is not connected');
  }
  // Building phase
  let transaction = new Transaction();
  transaction.instructions = instructions;
  transaction.recentBlockhash = (await provider.connection.getRecentBlockhash()).blockhash;
  transaction.feePayer = provider.wallet.publicKey;

  // Signing phase
  if (signers && signers.length > 0) {
    transaction.partialSign(...signers);
  }
  //Slope wallet funcs only take bs58 strings
  // if (user.wallet?.name === 'Slope') {
  //   try {
  //     const { msg, data } = await provider.wallet.signTransaction(bs58.encode(transaction.serializeMessage()) as any) as unknown as SlopeTxn;
  //     if (!data.publicKey || !data.signature) {
  //       throw new Error("Transaction Signing Failed");
  //     }
  //     transaction.addSignature(new PublicKey(data.publicKey), bs58.decode(data.signature));
  //   } catch (err) {
  //     console.log('Signing Transactions Failed', err);
  //     return [TxnResponse.Cancelled, []];
  //   }
  // } else {
  try {
    transaction = await provider.wallet.signTransaction(transaction);
  } catch (err) {
    console.log('Signing Transactions Failed', err, [TxnResponse.Failed, null]);
    // wallet refused to sign
    return [TxnResponse.Cancelled, []];
  }
  // }

  // Sending phase
  const rawTransaction = transaction.serialize();
  const txid = await provider.connection.sendRawTransaction(rawTransaction, provider.opts);

  // Confirming phase
  let res = TxnResponse.Success;
  if (!skipConfirmation) {
    const status = (await provider.connection.confirmTransaction(txid, provider.opts.commitment)).value;

    if (status?.err && txid.length) {
      res = TxnResponse.Failed;
    }
  }
  return [res, [txid]];
};

export const inDevelopment: boolean = true;

export const explorerUrl = (txid: string) => {
  const clusterParam = inDevelopment ? `?cluster=devnet` : '';
  return `https://explorer.solana.com/transaction/${txid}${clusterParam}`;
};

let customProgramErrors: CustomProgramError[];
//Take error code and and return error explanation
export const getErrNameAndMsg = (errCode: number): string => {
  const code = Number(errCode);

  if (code >= 100 && code < 300) {
    return `This is an Anchor program error code ${code}. Please check here: https://github.com/project-serum/anchor/blob/master/lang/src/error.rs`;
  }

  for (let i = 0; i < customProgramErrors.length; i++) {
    const err = customProgramErrors[i];
    if (err.code === code) {
      return `\n\nCustom Program Error Code: ${errCode} \n- ${err.name} \n- ${err.msg}`;
    }
  }
  return `No matching error code description or translation for ${errCode}`;
};

//get the custom program error code if there's any in the error message and return parsed error code hex to number string

/**
 * Get the custom program error code if there's any in the error message and return parsed error code hex to number string
 * @param errMessage string - error message that would contain the word "custom program error:" if it's a customer program error
 * @returns [boolean, string] - probably not a custom program error if false otherwise the second element will be the code number in string
 */
export const getCustomProgramErrorCode = (errMessage: string): [boolean, string] => {
  const index = errMessage.indexOf('custom program error:');
  if (index == -1) {
    return [false, 'May not be a custom program error'];
  } else {
    return [true, `${parseInt(errMessage.substring(index + 22, index + 28).replace(' ', ''), 16)}`];
  }
};

/**
 * Transaction errors contain extra goodies like a message and error code. Log them
 * @param error An error object from anchor.
 * @returns A stringified error.
 */
export const transactionErrorToString = (error: any) => {
  if (error.code) {
    return `Code ${error.code}: ${error.msg}\n${error.logs}\n${error.stack}`;
  } else {
    return `${error} ${getErrNameAndMsg(Number(getCustomProgramErrorCode(JSON.stringify(error))[1]))}`;
  }
};

export interface InstructionAndSigner {
  ix: TransactionInstruction[];
  signers?: Signer[];
}

export const simulateAllTransactions = async (
  provider: anchor.Provider,
  transactions: InstructionAndSigner[],
  skipConfirmation?: boolean,
): Promise<[res: TxnResponse, txids: string[]]> => {
  if (!provider.wallet?.publicKey) {
    throw new Error('Wallet is not connected');
  }

  // Building and partial sign phase
  const recentBlockhash = await provider.connection.getRecentBlockhash();
  const txs: Transaction[] = [];
  for (const tx of transactions) {
    if (tx.ix.length == 0) {
      continue;
    }
    let transaction = new Transaction();
    transaction.instructions = tx.ix;
    transaction.recentBlockhash = recentBlockhash.blockhash;
    transaction.feePayer = provider.wallet.publicKey;
    if (tx.signers && tx.signers.length > 0) {
      transaction.partialSign(...tx.signers);
    }
    txs.push(transaction);
  }

  // Signing phase
  let signedTransactions: Transaction[] = [];
  try {
    if (!provider.wallet.signAllTransactions) {
      for (let i = 0; i < txs.length; i++) {
        const signedTxn = await provider.wallet.signTransaction(txs[i]);
        signedTransactions.push(signedTxn);
      }
    } else {
      signedTransactions = await provider.wallet.signAllTransactions(txs);
    }
  } catch (err) {
    console.log('Signing All Transactions Failed', err);
    // wallet refused to sign
    return [TxnResponse.Cancelled, []];
  }
  // }

  // Sending phase
  console.log('Transactions', txs);
  let res = TxnResponse.Success;
  const txids: string[] = [];
  for (let i = 0; i < signedTransactions.length; i++) {
    const transaction = signedTransactions[i];

    // Transactions can be simulated against an old slot that
    // does not include previously sent transactions. In most
    // conditions only the first transaction can be simulated
    // safely
    const skipPreflightSimulation = i !== 0;
    const opts: ConfirmOptions = {
      ...provider.opts,
      skipPreflight: skipPreflightSimulation,
    };

    const { value } = await provider.connection.simulateTransaction(transaction);
    if (value.err) {
      res = TxnResponse.Failed;
    }
  }
  return [res, txids];
};

export const sendAllTransactions = async (
  provider: anchor.Provider,
  transactions: InstructionAndSigner[],
  skipConfirmation?: boolean,
): Promise<[res: TxnResponse, txids: string[]]> => {
  if (!provider.wallet?.publicKey) {
    throw new Error('Wallet is not connected');
  }

  // Building and partial sign phase
  const recentBlockhash = await provider.connection.getRecentBlockhash();
  const txs: Transaction[] = [];
  for (const tx of transactions) {
    if (tx.ix.length == 0) {
      continue;
    }
    let transaction = new Transaction();
    transaction.instructions = tx.ix;
    transaction.recentBlockhash = recentBlockhash.blockhash;
    transaction.feePayer = provider.wallet.publicKey;
    if (tx.signers && tx.signers.length > 0) {
      transaction.partialSign(...tx.signers);
    }
    txs.push(transaction);
  }

  // Signing phase
  let signedTransactions: Transaction[] = [];
  try {
    if (!provider.wallet.signAllTransactions) {
      for (let i = 0; i < txs.length; i++) {
        const signedTxn = await provider.wallet.signTransaction(txs[i]);
        signedTransactions.push(signedTxn);
      }
    } else {
      signedTransactions = await provider.wallet.signAllTransactions(txs);
    }
  } catch (err) {
    console.log('Signing All Transactions Failed', err);
    // wallet refused to sign
    return [TxnResponse.Cancelled, []];
  }
  // }

  // Sending phase
  console.log('Transactions', txs);
  let res = TxnResponse.Success;
  const txids: string[] = [];
  for (let i = 0; i < signedTransactions.length; i++) {
    const transaction = signedTransactions[i];

    // Transactions can be simulated against an old slot that
    // does not include previously sent transactions. In most
    // conditions only the first transaction can be simulated
    // safely
    const skipPreflightSimulation = i !== 0;
    const opts: ConfirmOptions = {
      ...provider.opts,
      skipPreflight: skipPreflightSimulation,
    };

    const rawTransaction = transaction.serialize();
    const txid = await provider.connection.sendRawTransaction(rawTransaction, opts);
    txids.push(txid);

    // Confirming phase
    if (!skipConfirmation) {
      const status = (await provider.connection.confirmTransaction(txid, provider.opts.commitment)).value;

      if (status?.err) {
        res = TxnResponse.Failed;
      }
    }
  }
  return [res, txids];
};

export const parseTokenAccount = (account: AccountInfo<Buffer>, accountPubkey: PublicKey) => {
  const data = TokenAccountLayout.decode(account.data);

  // PublicKeys and BNs are currently Uint8 arrays and
  // booleans are really Uint8s. Convert them
  const decoded: AccountInfo<TokenAccountInfo> = {
    ...account,
    data: {
      address: accountPubkey,
      mint: new PublicKey(data.mint),
      owner: new PublicKey(data.owner),
      amount: new BN(data.amount, undefined, 'le'),
      delegate: (data as any).delegateOption ? new PublicKey(data.delegate!) : null,
      delegatedAmount: new BN(data.delegatedAmount, undefined, 'le'),
      isInitialized: (data as any).state != 0,
      isFrozen: (data as any).state == 2,
      isNative: !!(data as any).isNativeOption,
      rentExemptReserve: new BN(0, undefined, 'le'), //  Todo: calculate. I believe this is lamports minus rent for wrapped sol
      closeAuthority: (data as any).closeAuthorityOption ? new PublicKey(data.closeAuthority!) : null,
    },
  };
  return decoded;
};

export const parseObligationAccount = (account: Buffer, coder: anchor.Coder) => {
  let obligation = coder.accounts.decode<ObligationAccount>('Obligation', account);

  const parsePosition = (position: any) => {
    const pos: ObligationPositionStruct = {
      account: new PublicKey(position.account),
      amount: new BN(position.amount),
      side: position.side,
      reserveIndex: position.reserveIndex,
      _reserved: [],
    };
    return pos;
  };

  obligation.collateral = PositionInfoList.decode(Buffer.from(obligation.collateral as any as number[])).map(
    parsePosition,
  );
  obligation.loans = PositionInfoList.decode(Buffer.from(obligation.loans as any as number[])).map(parsePosition);

  return obligation;
};

export const parseU192 = (data: Buffer | number[]) => {
  return new BN(data, undefined, 'le');
};

export const parseIdlMetadata = (idlMetadata: IdlMetadata): IdlMetadata => {
  return {
    ...idlMetadata,
    address: new PublicKey(idlMetadata.address),
    market: {
      market: new PublicKey(idlMetadata.market.market),
      marketAuthority: new PublicKey(idlMetadata.market.marketAuthority),
    } as MarketMetadata,
    reserves: idlMetadata.reserves
      ? (idlMetadata.reserves.map((reserve) => {
          return {
            ...reserve,
            accounts: toPublicKeys(reserve.accounts),
          };
        }) as any)
      : [],
  };
};

/**
 * Convert some object of fields with address-like values,
 * such that the values are converted to their `PublicKey` form.
 * @param obj The object to convert
 */
export function toPublicKeys(obj: Record<string, string | PublicKey | HasPublicKey>): Record<string, PublicKey> {
  const newObj: Record<string, PublicKey> = {};

  for (const key in obj) {
    const value = obj[key];

    if (typeof value == 'string') {
      newObj[key] = new PublicKey(value);
    } else if ('publicKey' in value) {
      newObj[key] = value.publicKey;
    } else {
      newObj[key] = value;
    }
  }

  return newObj;
}

/** Linear interpolation between (x0, y0) and (x1, y1)
 */
const interpolate = (x: number, x0: number, x1: number, y0: number, y1: number): number => {
  console.assert!(x >= x0);
  console.assert!(x <= x1);

  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
};

/** Continuous Compounding Rate
 */
export const getCcRate = (reserveConfig: ReserveConfigStruct, utilRate: number): number => {
  const basisPointFactor = 10000;
  let util1 = reserveConfig.utilizationRate1 / basisPointFactor;
  let util2 = reserveConfig.utilizationRate2 / basisPointFactor;
  let borrow0 = reserveConfig.borrowRate0 / basisPointFactor;
  let borrow1 = reserveConfig.borrowRate1 / basisPointFactor;
  let borrow2 = reserveConfig.borrowRate2 / basisPointFactor;
  let borrow3 = reserveConfig.borrowRate3 / basisPointFactor;

  if (utilRate <= util1) {
    return interpolate(utilRate, 0, util1, borrow0, borrow1);
  } else if (utilRate <= util2) {
    return interpolate(utilRate, util1, util2, borrow1, borrow2);
  } else {
    return interpolate(utilRate, util2, 1, borrow2, borrow3);
  }
};

/** Borrow rate
 */
export const getBorrowRate = (ccRate: number, fee: number): number => {
  const basisPointFactor = 10000;
  fee = fee / basisPointFactor;
  const secondsPerYear: number = 365 * 24 * 60 * 60;
  const rt = ccRate / secondsPerYear;

  return Math.log1p((1 + fee) * Math.expm1(rt)) * secondsPerYear;
};

/** Deposit rate
 */
export const getDepositRate = (ccRate: number, utilRatio: number): number => {
  const secondsPerYear: number = 365 * 24 * 60 * 60;
  const rt = ccRate / secondsPerYear;

  return Math.log1p(Math.expm1(rt)) * secondsPerYear * utilRatio;
};
