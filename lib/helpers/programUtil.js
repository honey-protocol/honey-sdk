"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDepositRate = exports.getBorrowRate = exports.getCcRate = exports.toPublicKeys = exports.parseIdlMetadata = exports.parseU192 = exports.parseObligationAccount = exports.parseReserveAccount = exports.parseMarketAccount = exports.parseTokenAccount = exports.sendAllTransactions = exports.simulateAllTransactions = exports.transactionErrorToString = exports.getCustomProgramErrorCode = exports.getErrNameAndMsg = exports.explorerUrl = exports.inDevelopment = exports.sendTransaction = exports.getAccountInfoAndSubscribe = exports.getProgramAccountInfoAndSubscribe = exports.getMintInfoAndSubscribe = exports.getTokenAccountAndSubscribe = exports.findProgramAddress = exports.findCollateralAddress = exports.findLoanNoteAddress = exports.findObligationAddress = exports.findDepositNoteAddress = exports.findFeeNoteVault = exports.findVaultAddress = exports.findDepositNoteDestAddress = exports.findLoanNoteMintAddress = exports.findDepositNoteMintAddress = exports.findMarketAuthorityAddress = exports.NULL_PUBKEY = exports.SOL_DECIMALS = void 0;
const anchor_1 = require("@project-serum/anchor");
const anchor = __importStar(require("@project-serum/anchor"));
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const buffer_1 = require("buffer");
const JetTypes_1 = require("./JetTypes");
const layout_1 = require("./layout");
const util_1 = require("./util");
// Find PDA functions and jet algorithms that are reimplemented here
exports.SOL_DECIMALS = 9;
exports.NULL_PUBKEY = new web3_js_1.PublicKey('11111111111111111111111111111111');
// Find PDA addresses
/** Find market authority. */
const findMarketAuthorityAddress = async (program, market) => {
    return (0, exports.findProgramAddress)(program.programId, [market.toBuffer()]);
};
exports.findMarketAuthorityAddress = findMarketAuthorityAddress;
/** Find reserve deposit note mint. */
const findDepositNoteMintAddress = async (program, reserve, reserveTokenMint) => {
    return await (0, exports.findProgramAddress)(program.programId, ['deposits', reserve, reserveTokenMint]);
};
exports.findDepositNoteMintAddress = findDepositNoteMintAddress;
/** Find reserve loan note mint. */
const findLoanNoteMintAddress = async (program, reserve, reserveTokenMint) => {
    return await (0, exports.findProgramAddress)(program.programId, ['loans', reserve, reserveTokenMint]);
};
exports.findLoanNoteMintAddress = findLoanNoteMintAddress;
/** Find reserve deposit note destination account for wallet. */
const findDepositNoteDestAddress = async (program, reserve, wallet) => {
    return await (0, exports.findProgramAddress)(program.programId, [reserve, wallet]);
};
exports.findDepositNoteDestAddress = findDepositNoteDestAddress;
/** Find reserve vault token account. */
const findVaultAddress = async (program, market, reserve) => {
    return await (0, exports.findProgramAddress)(program.programId, [market, reserve]);
};
exports.findVaultAddress = findVaultAddress;
const findFeeNoteVault = async (program, reserve) => {
    return await (0, exports.findProgramAddress)(program.programId, ['fee-vault', reserve]);
};
exports.findFeeNoteVault = findFeeNoteVault;
/** Find reserve deposit note account for wallet */
const findDepositNoteAddress = async (program, reserve, wallet) => {
    return await (0, exports.findProgramAddress)(program.programId, ['deposits', reserve, wallet]);
};
exports.findDepositNoteAddress = findDepositNoteAddress;
/**
 * Find the obligation for the wallet.
 */
const findObligationAddress = async (program, market, wallet) => {
    return await (0, exports.findProgramAddress)(program.programId, ['obligation', market, wallet]);
};
exports.findObligationAddress = findObligationAddress;
/** Find loan note token account for the reserve, obligation and wallet. */
const findLoanNoteAddress = async (program, reserve, obligation, wallet) => {
    return await (0, exports.findProgramAddress)(program.programId, ['loan', reserve, obligation, wallet]);
};
exports.findLoanNoteAddress = findLoanNoteAddress;
/** Find collateral account for the reserve, obligation and wallet. */
const findCollateralAddress = async (program, reserve, obligation, wallet) => {
    return await (0, exports.findProgramAddress)(program.programId, ['collateral', reserve, obligation, wallet]);
};
exports.findCollateralAddress = findCollateralAddress;
/**
 * Find a program derived address
 * @param programId The program the address is being derived for
 * @param seeds The seeds to find the address
 * @returns The address found and the bump seed required
 */
const findProgramAddress = async (programId, seeds) => {
    const SEEDBYTES = seeds.map((s) => {
        if (typeof s === 'string') {
            // return new TextEncoder().encode(s);
        }
        else if ('publicKey' in s) {
            return s.publicKey.toBytes();
        }
        else if ('toBytes' in s) {
            return s.toBytes();
        }
        else {
            return s;
        }
    });
    return await anchor.web3.PublicKey.findProgramAddress(SEEDBYTES, programId);
};
exports.findProgramAddress = findProgramAddress;
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
const getTokenAccountAndSubscribe = async function (connection, publicKey, decimals, callback, commitment) {
    return await (0, exports.getAccountInfoAndSubscribe)(connection, publicKey, (account, context) => {
        if (account !== null) {
            if (account.data.length !== 165) {
                console.log('account data length', account.data.length);
            }
            const decoded = (0, exports.parseTokenAccount)(account, publicKey);
            const amount = util_1.TokenAmount.tokenAccount(decoded.data, decimals);
            callback(amount, context);
        }
        else {
            callback(undefined, context);
        }
    }, commitment);
};
exports.getTokenAccountAndSubscribe = getTokenAccountAndSubscribe;
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
const getMintInfoAndSubscribe = async function (connection, publicKey, callback, commitment) {
    return await (0, exports.getAccountInfoAndSubscribe)(connection, publicKey, (account, context) => {
        if (account != null) {
            let mintInfo = spl_token_1.MintLayout.decode(account.data);
            let amount = util_1.TokenAmount.mint(mintInfo);
            callback(amount, context);
        }
        else {
            callback(undefined, context);
        }
    }, commitment);
};
exports.getMintInfoAndSubscribe = getMintInfoAndSubscribe;
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
const getProgramAccountInfoAndSubscribe = async function (connection, publicKey, coder, accountType, callback, commitment) {
    return await (0, exports.getAccountInfoAndSubscribe)(connection, publicKey, (account, context) => {
        if (account != null) {
            const decoded = {
                ...account,
                data: coder.accounts.decode(accountType, account.data),
            };
            callback(decoded, context);
        }
        else {
            callback(undefined, context);
        }
    }, commitment);
};
exports.getProgramAccountInfoAndSubscribe = getProgramAccountInfoAndSubscribe;
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
const getAccountInfoAndSubscribe = async function (connection, publicKey, callback, commitment) {
    let latestSlot = -1;
    let subscriptionId = connection.onAccountChange(publicKey, (account, context) => {
        if (context.slot >= latestSlot) {
            latestSlot = context.slot;
            callback(account, context);
        }
    }, commitment);
    const response = await connection.getAccountInfoAndContext(publicKey, commitment);
    if (response.context.slot >= latestSlot) {
        latestSlot = response.context.slot;
        if (response.value != null) {
            callback(response.value, response.context);
        }
        else {
            callback(null, response.context);
        }
    }
    return subscriptionId;
};
exports.getAccountInfoAndSubscribe = getAccountInfoAndSubscribe;
const sendTransaction = async (provider, instructions, signers, skipConfirmation) => {
    if (!provider.wallet?.publicKey) {
        throw new Error('Wallet is not connected');
    }
    // Building phase
    let transaction = new web3_js_1.Transaction();
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
    }
    catch (err) {
        console.log('Signing Transactions Failed', err, [JetTypes_1.TxnResponse.Failed, null]);
        // wallet refused to sign
        return [JetTypes_1.TxnResponse.Cancelled, []];
    }
    // }
    // Sending phase
    const rawTransaction = transaction.serialize();
    const txid = await provider.connection.sendRawTransaction(rawTransaction, provider.opts);
    // Confirming phase
    let res = JetTypes_1.TxnResponse.Success;
    if (!skipConfirmation) {
        const status = (await provider.connection.confirmTransaction(txid, provider.opts.commitment)).value;
        if (status?.err && txid.length) {
            res = JetTypes_1.TxnResponse.Failed;
        }
    }
    return [res, [txid]];
};
exports.sendTransaction = sendTransaction;
exports.inDevelopment = true;
const explorerUrl = (txid) => {
    const clusterParam = exports.inDevelopment ? `?cluster=devnet` : '';
    return `https://explorer.solana.com/transaction/${txid}${clusterParam}`;
};
exports.explorerUrl = explorerUrl;
let customProgramErrors;
//Take error code and and return error explanation
const getErrNameAndMsg = (errCode) => {
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
exports.getErrNameAndMsg = getErrNameAndMsg;
//get the custom program error code if there's any in the error message and return parsed error code hex to number string
/**
 * Get the custom program error code if there's any in the error message and return parsed error code hex to number string
 * @param errMessage string - error message that would contain the word "custom program error:" if it's a customer program error
 * @returns [boolean, string] - probably not a custom program error if false otherwise the second element will be the code number in string
 */
const getCustomProgramErrorCode = (errMessage) => {
    const index = errMessage.indexOf('custom program error:');
    if (index == -1) {
        return [false, 'May not be a custom program error'];
    }
    else {
        return [true, `${parseInt(errMessage.substring(index + 22, index + 28).replace(' ', ''), 16)}`];
    }
};
exports.getCustomProgramErrorCode = getCustomProgramErrorCode;
/**
 * Transaction errors contain extra goodies like a message and error code. Log them
 * @param error An error object from anchor.
 * @returns A stringified error.
 */
const transactionErrorToString = (error) => {
    if (error.code) {
        return `Code ${error.code}: ${error.msg}\n${error.logs}\n${error.stack}`;
    }
    else {
        return `${error} ${(0, exports.getErrNameAndMsg)(Number((0, exports.getCustomProgramErrorCode)(JSON.stringify(error))[1]))}`;
    }
};
exports.transactionErrorToString = transactionErrorToString;
const simulateAllTransactions = async (provider, transactions, skipConfirmation) => {
    if (!provider.wallet?.publicKey) {
        throw new Error('Wallet is not connected');
    }
    // Building and partial sign phase
    const recentBlockhash = await provider.connection.getRecentBlockhash();
    const txs = [];
    for (const tx of transactions) {
        if (tx.ix.length == 0) {
            continue;
        }
        let transaction = new web3_js_1.Transaction();
        transaction.instructions = tx.ix;
        transaction.recentBlockhash = recentBlockhash.blockhash;
        transaction.feePayer = provider.wallet.publicKey;
        if (tx.signers && tx.signers.length > 0) {
            transaction.partialSign(...tx.signers);
        }
        txs.push(transaction);
    }
    // Signing phase
    let signedTransactions = [];
    try {
        if (!provider.wallet.signAllTransactions) {
            for (let i = 0; i < txs.length; i++) {
                const signedTxn = await provider.wallet.signTransaction(txs[i]);
                signedTransactions.push(signedTxn);
            }
        }
        else {
            signedTransactions = await provider.wallet.signAllTransactions(txs);
        }
    }
    catch (err) {
        console.log('Signing All Transactions Failed', err);
        // wallet refused to sign
        return [JetTypes_1.TxnResponse.Cancelled, []];
    }
    // }
    // Sending phase
    console.log('Transactions', txs);
    let res = JetTypes_1.TxnResponse.Success;
    const txids = [];
    for (let i = 0; i < signedTransactions.length; i++) {
        const transaction = signedTransactions[i];
        // Transactions can be simulated against an old slot that
        // does not include previously sent transactions. In most
        // conditions only the first transaction can be simulated
        // safely
        const skipPreflightSimulation = i !== 0;
        const opts = {
            ...provider.opts,
            skipPreflight: skipPreflightSimulation,
        };
        const { value } = await provider.connection.simulateTransaction(transaction);
        if (value.err) {
            res = JetTypes_1.TxnResponse.Failed;
        }
    }
    return [res, txids];
};
exports.simulateAllTransactions = simulateAllTransactions;
const sendAllTransactions = async (provider, transactions, skipConfirmation) => {
    if (!provider.wallet?.publicKey) {
        throw new Error('Wallet is not connected');
    }
    // Building and partial sign phase
    const recentBlockhash = await provider.connection.getRecentBlockhash();
    const txs = [];
    for (const tx of transactions) {
        if (tx.ix.length == 0) {
            continue;
        }
        let transaction = new web3_js_1.Transaction();
        transaction.instructions = tx.ix;
        transaction.recentBlockhash = recentBlockhash.blockhash;
        transaction.feePayer = provider.wallet.publicKey;
        if (tx.signers && tx.signers.length > 0) {
            transaction.partialSign(...tx.signers);
        }
        txs.push(transaction);
    }
    // Signing phase
    let signedTransactions = [];
    try {
        if (!provider.wallet.signAllTransactions) {
            for (let i = 0; i < txs.length; i++) {
                const signedTxn = await provider.wallet.signTransaction(txs[i]);
                signedTransactions.push(signedTxn);
            }
        }
        else {
            signedTransactions = await provider.wallet.signAllTransactions(txs);
        }
    }
    catch (err) {
        console.log('Signing All Transactions Failed', err);
        // wallet refused to sign
        return [JetTypes_1.TxnResponse.Cancelled, []];
    }
    // }
    // Sending phase
    console.log('Transactions', txs);
    let res = JetTypes_1.TxnResponse.Success;
    const txids = [];
    for (let i = 0; i < signedTransactions.length; i++) {
        const transaction = signedTransactions[i];
        // Transactions can be simulated against an old slot that
        // does not include previously sent transactions. In most
        // conditions only the first transaction can be simulated
        // safely
        const skipPreflightSimulation = i !== 0;
        const opts = {
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
                res = JetTypes_1.TxnResponse.Failed;
            }
        }
    }
    return [res, txids];
};
exports.sendAllTransactions = sendAllTransactions;
const parseTokenAccount = (account, accountPubkey) => {
    const data = spl_token_1.AccountLayout.decode(account.data);
    // PublicKeys and BNs are currently Uint8 arrays and
    // booleans are really Uint8s. Convert them
    const decoded = {
        ...account,
        data: {
            address: accountPubkey,
            mint: new web3_js_1.PublicKey(data.mint),
            owner: new web3_js_1.PublicKey(data.owner),
            amount: new anchor_1.BN(data.amount, undefined, 'le'),
            delegate: data.delegateOption ? new web3_js_1.PublicKey(data.delegate) : null,
            delegatedAmount: new anchor_1.BN(data.delegatedAmount, undefined, 'le'),
            isInitialized: data.state != 0,
            isFrozen: data.state == 2,
            isNative: !!data.isNativeOption,
            rentExemptReserve: new anchor_1.BN(0, undefined, 'le'),
            closeAuthority: data.closeAuthorityOption ? new web3_js_1.PublicKey(data.closeAuthority) : null,
        },
    };
    return decoded;
};
exports.parseTokenAccount = parseTokenAccount;
const parseMarketAccount = (account, coder) => {
    let market = coder.accounts.decode('Market', account);
    let reserveInfoData = new Uint8Array(market.reserves);
    let reserveInfoList = layout_1.MarketReserveInfoList.decode(reserveInfoData);
    market.reserves = reserveInfoList;
    return market;
};
exports.parseMarketAccount = parseMarketAccount;
const parseReserveAccount = (account, coder) => {
    let reserve = coder.accounts.decode('Reserve', account);
    const reserveState = layout_1.ReserveStateLayout.decode(buffer_1.Buffer.from(reserve.state));
    reserve.state = reserveState;
    return reserve;
};
exports.parseReserveAccount = parseReserveAccount;
const parseObligationAccount = (account, coder) => {
    let obligation = coder.accounts.decode('Obligation', account);
    const parsePosition = (position) => {
        const pos = {
            account: new web3_js_1.PublicKey(position.account),
            amount: new anchor_1.BN(position.amount),
            side: position.side,
            reserveIndex: position.reserveIndex,
            _reserved: [],
        };
        return pos;
    };
    obligation.collateral = layout_1.PositionInfoList.decode(buffer_1.Buffer.from(obligation.collateral)).map(parsePosition);
    obligation.loans = layout_1.PositionInfoList.decode(buffer_1.Buffer.from(obligation.loans)).map(parsePosition);
    return obligation;
};
exports.parseObligationAccount = parseObligationAccount;
const parseU192 = (data) => {
    return new anchor_1.BN(data, undefined, 'le');
};
exports.parseU192 = parseU192;
const parseIdlMetadata = (idlMetadata) => {
    return {
        ...idlMetadata,
        address: new web3_js_1.PublicKey(idlMetadata.address),
        market: toPublicKeys(idlMetadata.market),
        reserves: idlMetadata.reserves.map((reserve) => {
            return {
                ...reserve,
                accounts: toPublicKeys(reserve.accounts),
            };
        }),
    };
};
exports.parseIdlMetadata = parseIdlMetadata;
/**
 * Convert some object of fields with address-like values,
 * such that the values are converted to their `PublicKey` form.
 * @param obj The object to convert
 */
function toPublicKeys(obj) {
    const newObj = {};
    for (const key in obj) {
        const value = obj[key];
        if (typeof value == 'string') {
            newObj[key] = new web3_js_1.PublicKey(value);
        }
        else if ('publicKey' in value) {
            newObj[key] = value.publicKey;
        }
        else {
            newObj[key] = value;
        }
    }
    return newObj;
}
exports.toPublicKeys = toPublicKeys;
/** Linear interpolation between (x0, y0) and (x1, y1)
 */
const interpolate = (x, x0, x1, y0, y1) => {
    console.assert(x >= x0);
    console.assert(x <= x1);
    return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
};
/** Continuous Compounding Rate
 */
const getCcRate = (reserveConfig, utilRate) => {
    const basisPointFactor = 10000;
    let util1 = reserveConfig.utilizationRate1 / basisPointFactor;
    let util2 = reserveConfig.utilizationRate2 / basisPointFactor;
    let borrow0 = reserveConfig.borrowRate0 / basisPointFactor;
    let borrow1 = reserveConfig.borrowRate1 / basisPointFactor;
    let borrow2 = reserveConfig.borrowRate2 / basisPointFactor;
    let borrow3 = reserveConfig.borrowRate3 / basisPointFactor;
    if (utilRate <= util1) {
        return interpolate(utilRate, 0, util1, borrow0, borrow1);
    }
    else if (utilRate <= util2) {
        return interpolate(utilRate, util1, util2, borrow1, borrow2);
    }
    else {
        return interpolate(utilRate, util2, 1, borrow2, borrow3);
    }
};
exports.getCcRate = getCcRate;
/** Borrow rate
 */
const getBorrowRate = (ccRate, fee) => {
    const basisPointFactor = 10000;
    fee = fee / basisPointFactor;
    const secondsPerYear = 365 * 24 * 60 * 60;
    const rt = ccRate / secondsPerYear;
    return Math.log1p((1 + fee) * Math.expm1(rt)) * secondsPerYear;
};
exports.getBorrowRate = getBorrowRate;
/** Deposit rate
 */
const getDepositRate = (ccRate, utilRatio) => {
    const secondsPerYear = 365 * 24 * 60 * 60;
    const rt = ccRate / secondsPerYear;
    return Math.log1p(Math.expm1(rt)) * secondsPerYear * utilRatio;
};
exports.getDepositRate = getDepositRate;
//# sourceMappingURL=programUtil.js.map