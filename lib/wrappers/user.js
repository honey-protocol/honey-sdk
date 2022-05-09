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
exports.HoneyUser = exports.SOLVENT_FEE_ACCOUNT_DEVNET = exports.SOLVENT_PROGRAM = exports.PositionStruct = exports.ObligationStateStruct = exports.METADATA_PROGRAM_ID = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor = __importStar(require("@project-serum/anchor"));
const _1 = require(".");
const spl_token_1 = require("@solana/spl-token");
const programUtil_1 = require("../helpers/programUtil");
const util = __importStar(require("./util"));
const BL = __importStar(require("@solana/buffer-layout"));
const JetTypes_1 = require("../helpers/JetTypes");
exports.METADATA_PROGRAM_ID = new web3_js_1.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
exports.ObligationStateStruct = BL.struct([
    BL.u32('version'),
    BL.u32('_reserved0'),
    util.pubkeyField('market'),
    util.pubkeyField('owner'),
    BL.blob(184, '_reserved1'),
    BL.seq(util.pubkeyField('collateral_nft_mint'), 11),
    BL.blob(256, 'cached'),
    BL.blob(2048, 'collateral'),
    BL.blob(2048, 'loans'),
]);
exports.PositionStruct = BL.struct([
    util.pubkeyField('account'),
    util.numberField('amount'),
    BL.u32('side'),
    BL.u16('reserve_index'),
    BL.blob(66),
]);
exports.SOLVENT_PROGRAM = new web3_js_1.PublicKey('GwRvoU6vTXQAbS75KaMbm7o2iTYVtdEnF4mFUbZr9Cmb');
exports.SOLVENT_FEE_ACCOUNT_DEVNET = new web3_js_1.PublicKey('HkjFiwUW7qnREVm2PxBg8LUrCvjExrJjyYY51wsZTUK8');
class HoneyUser {
    constructor(client, market, address, obligation, reserves) {
        this.client = client;
        this.market = market;
        this.address = address;
        this.obligation = obligation;
        this.reserves = reserves;
        this._deposits = [];
        this._collateral = [];
        this._loans = [];
        this.conn = this.client.program.provider.connection;
    }
    static async load(client, market, address, reserves) {
        const obligationAccount = await client.findDerivedAccount(['obligation', market.address, address]);
        const user = new HoneyUser(client, market, address, obligationAccount, reserves);
        user.refresh();
        return user;
    }
    async getObligationData() {
        const data = await this.conn.getAccountInfo(this.obligation.address);
        if (!data)
            return new Error('Could not get obligation data');
        const parsed = (0, programUtil_1.parseObligationAccount)(data.data, this.client.program.coder);
        return parsed;
    }
    // async liquidateSolvent() {
    //   const tx = await this.makeLiquidateSolventIx()
    // }
    // // move to a better place
    // async makeLiquidateSolventIx(reserve: HoneyReserve) {
    //   const solventAuthorityBump = "figure out later";
    //   this.client.program.instruction.liquidateSolvent(solventAuthorityBump, {
    //     accounts: {
    //       market: this.market.address,
    //       marketAuthority: this.market.marketAuthority,
    //       reserve: reserve.address,
    //       vault,
    //       obligation,
    //       loanNoteMint,
    //       loanAccount,
    //       solventAuthority,
    //       bucketStateV2,
    //       nftDropletMint,
    //       nftMint,
    //       metadata,
    //       collateralAccount,
    //       solventTokenAc,
    //       solventMintFeeAc,
    //       nftDropletVault,
    //       dexSwapTokens,
    //       tokenProgram: TOKEN_PROGRAM_ID,
    //       solventProgram: SOLVENT_PROGRAM,
    //     }
    //   }
    //   )
    // }
    async liquidate(loanReserve, collateralReserve, payerAccount, receiverAccount, amount) {
        const tx = await this.makeLiquidateTx(loanReserve, collateralReserve, payerAccount, receiverAccount, amount);
        return await this.client.program.provider.send(tx);
    }
    async makeLiquidateTx(_loanReserve, _collateralReserve, _payerAccount, _receiverAccount, _amount) {
        throw new Error('not yet implemented');
    }
    async repay(reserve, tokenAccount, amount) {
        const ixs = await this.makeRepayTx(reserve, tokenAccount, amount);
        try {
            return await (0, programUtil_1.sendAllTransactions)(this.client.program.provider, ixs);
        }
        catch (err) {
            console.error(`Repay error: ${err}`);
            return [JetTypes_1.TxnResponse.Failed, []];
        }
    }
    async makeRepayTx(reserve, tokenAccount, amount) {
        const accounts = await this.findReserveAccounts(reserve);
        let depositSourcePubkey = tokenAccount;
        // Optional signers
        let depositSourceKeypair;
        // Optional instructions
        // Create wrapped sol ixs
        let createTokenAccountIx;
        let initTokenAccountIx;
        let closeTokenAccountIx;
        // When handling SOL, ignore existing wsol accounts and initialize a new wrapped sol account
        if (reserve.data.tokenMint.equals(spl_token_1.NATIVE_MINT)) {
            // Overwrite the deposit source
            // The app will always wrap native sol, ignoring any existing wsol
            depositSourceKeypair = web3_js_1.Keypair.generate();
            depositSourcePubkey = depositSourceKeypair.publicKey;
            // TODO: Need to derive the loanNoteExchangeRate
            // Do our best to estimate the lamports we need
            // 1.002 is a bit of room for interest
            // const lamports = amount.units.loanNotes
            // ? reserve.loanNoteExchangeRate.mul(amount.value).div(new anchor.BN(Math.pow(10, 15))).muln(1.002)
            // : amount.value;
            const rent = await this.conn.getMinimumBalanceForRentExemption(spl_token_1.AccountLayout.span);
            createTokenAccountIx = web3_js_1.SystemProgram.createAccount({
                fromPubkey: this.address,
                newAccountPubkey: depositSourcePubkey,
                programId: spl_token_1.TOKEN_PROGRAM_ID,
                space: spl_token_1.AccountLayout.span,
                lamports: Number(amount.value.addn(rent).toString()),
            });
            initTokenAccountIx = spl_token_1.Token.createInitAccountInstruction(spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.NATIVE_MINT, depositSourcePubkey, this.address);
            closeTokenAccountIx = spl_token_1.Token.createCloseAccountInstruction(spl_token_1.TOKEN_PROGRAM_ID, depositSourcePubkey, this.address, this.address, []);
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
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            },
        });
        const ixs = [
            {
                ix: [createTokenAccountIx, initTokenAccountIx, refreshReserveIx, repayIx, closeTokenAccountIx].filter((ix) => ix),
                signers: [depositSourceKeypair].filter((signer) => signer),
            },
        ];
        return ixs;
    }
    async withdrawNFT(tokenAccount, tokenMint, updateAuthority) {
        const tx = await this.makeNFTWithdrawTx(tokenAccount, tokenMint, updateAuthority);
        try {
            const txid = await this.client.program.provider.send(tx);
            return [JetTypes_1.TxnResponse.Success, [txid]];
        }
        catch (err) {
            console.error(`Withdraw NFT error: ${err}`);
            return [JetTypes_1.TxnResponse.Failed, []];
        }
    }
    async makeNFTWithdrawTx(tokenAccount, tokenMint, updateAuthority) {
        const tx = new web3_js_1.Transaction();
        const [obligationAddress, obligationBump] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from('obligation'), this.market.address.toBuffer(), this.address.toBuffer()], this.client.program.programId);
        const [collateralAddress, collateralBump] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from('nft'), this.market.address.toBuffer(), tokenMint.toBuffer(), this.address.toBuffer()], this.client.program.programId);
        const metadataPubKey = new web3_js_1.PublicKey(exports.METADATA_PROGRAM_ID);
        const [nftMetadata, metadataBump] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from('metadata'), metadataPubKey.toBuffer(), tokenMint.toBuffer()], metadataPubKey);
        // const withdrawNFTBumpSeeds = {
        //   collateralAccount: collateralBump,
        // };
        this.reserves.forEach((reserve) => tx.add(reserve.makeRefreshIx()));
        tx.add(await this.client.program.instruction.withdrawNft(
        // withdrawNFTBumpSeeds,
        metadataBump, {
            accounts: {
                market: this.market.address,
                marketAuthority: this.market.marketAuthority,
                obligation: obligationAddress,
                owner: this.address,
                depositTo: tokenAccount,
                nftCollectionCreator: updateAuthority,
                metadata: nftMetadata,
                depositNftMint: tokenMint,
                collateralAccount: collateralAddress,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID
            },
        }));
        return tx;
    }
    async depositNFT(tokenAccount, tokenMint, updateAuthority) {
        return await this.makeNFTDepositTx(tokenAccount, tokenMint, updateAuthority);
    }
    async makeNFTDepositTx(tokenAccount, tokenMint, updateAuthority) {
        const txids = [];
        const [obligationAddress, obligationBump] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from('obligation'), this.market.address.toBuffer(), this.address.toBuffer()], this.client.program.programId);
        const obligationAccountData = await this.conn.getAccountInfo(obligationAddress);
        if (!obligationAccountData) {
            console.log('adding obligationAccountData', obligationAccountData);
            try {
                const obligationTx = new web3_js_1.Transaction();
                const ix = await this.client.program.instruction.initObligation(obligationBump, {
                    accounts: {
                        market: this.market.address,
                        marketAuthority: this.market.marketAuthority,
                        obligation: obligationAddress,
                        borrower: this.address,
                        tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                        systemProgram: anchor.web3.SystemProgram.programId,
                    },
                });
                obligationTx.add(ix);
                const txid = await this.client.program.provider.send(obligationTx, [], { skipPreflight: true });
                txids.push(txid);
                console.log('added obligation account', txid);
            }
            catch (err) {
                console.error(`Obligation account: ${err}`);
                return [JetTypes_1.TxnResponse.Failed, []];
            }
        }
        // const collateralAddress = await deriveAssociatedTokenAccount(tokenMint, this.market.marketAuthority);
        const collateralAddress = await spl_token_1.Token.getAssociatedTokenAddress(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, tokenMint, this.market.marketAuthority, true);
        // const [collateralAddress, collateralBump] = await PublicKey.findProgramAddress(
        //   [
        //     Buffer.from('nft'),
        //     this.market.address.toBuffer(),
        //     tokenMint.toBuffer(),
        //     this.address.toBuffer()
        //   ],
        //   this.client.program.programId,
        // );
        const metadataPubKey = new web3_js_1.PublicKey(exports.METADATA_PROGRAM_ID);
        // const [nftMetadata, metadataBump] = await PublicKey.findProgramAddress(
        //   [Buffer.from('metadata'), metadataPubKey.toBuffer(), tokenMint.toBuffer()],
        //   metadataPubKey,
        // );
        const derivedMetadata = await this.findNftMetadata(tokenMint);
        const collateralData = await this.conn.getAccountInfo(collateralAddress);
        if (!collateralData) {
            console.log('adding collateralData', collateralData);
            console.log('accounts', {
                market: this.market.address.toString(),
                marketAuthority: this.market.marketAuthority.toString(),
                obligation: obligationAddress.toString(),
                depositNftMint: tokenMint.toString(),
                nftCollectionCreator: updateAuthority.toString(),
                metadata: derivedMetadata.address.toString(),
                owner: this.address.toString(),
                collateralAccount: collateralAddress.toString()
            });
            const collateralTx = new web3_js_1.Transaction();
            const ix = await this.client.program.instruction.initNftAccount(derivedMetadata.bumpSeed, {
                accounts: {
                    market: this.market.address,
                    marketAuthority: this.market.marketAuthority,
                    obligation: obligationAddress,
                    depositNftMint: tokenMint,
                    nftCollectionCreator: updateAuthority,
                    metadata: derivedMetadata.address,
                    owner: this.address,
                    collateralAccount: collateralAddress,
                    tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                    associatedTokenProgram: spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
            });
            collateralTx.add(ix);
            try {
                const txid = await this.client.program.provider.send(collateralTx, [], { skipPreflight: true });
                txids.push(txid);
            }
            catch (err) {
                console.error(`Collateral account: ${err}`);
                return [JetTypes_1.TxnResponse.Failed, txids];
            }
        }
        const tx = new web3_js_1.Transaction();
        // const DepositNFTBumpSeeds = {
        //   collateralAccount: collateralBump,
        // };
        const depositNFTIx = await this.client.program.instruction.depositNft(derivedMetadata.bumpSeed, // DepositNFTBumpSeeds,
        // derivedMetadata.bumpSeed,
        {
            accounts: {
                market: this.market.address,
                marketAuthority: this.market.marketAuthority,
                obligation: obligationAddress,
                depositSource: tokenAccount,
                depositNftMint: tokenMint,
                nftCollectionCreator: updateAuthority,
                metadata: derivedMetadata.address,
                owner: this.address,
                collateralAccount: collateralAddress,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                // rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                // systemProgram: anchor.web3.SystemProgram.programId,
            },
        });
        tx.add(depositNFTIx);
        try {
            const txid = await this.client.program.provider.send(tx);
            txids.push(txid);
            return [JetTypes_1.TxnResponse.Success, txids];
        }
        catch (err) {
            console.error(`Deposit NFT error: ${err}`);
            return [JetTypes_1.TxnResponse.Failed, txids];
        }
    }
    async withdrawCollateral(reserve, amount) {
        const ixs = await this.makeWithdrawCollateralTx(reserve, amount);
        return await (0, programUtil_1.sendAllTransactions)(this.client.program.provider, ixs);
    }
    async makeWithdrawCollateralTx(reserve, amount) {
        const accounts = await this.findReserveAccounts(reserve);
        const bumpSeeds = {
            collateralAccount: accounts.collateral.bumpSeed,
            depositAccount: accounts.deposits.bumpSeed,
        };
        const refreshReserveIxs = [];
        // need to refresh all reserves in market to withdraw
        this.reserves.forEach((HoneyReserve) => refreshReserveIxs.push(HoneyReserve.makeRefreshIx()));
        const withdrawCollateralIx = this.client.program.instruction.withdrawCollateral(bumpSeeds, amount, {
            accounts: {
                market: this.market.address,
                marketAuthority: this.market.marketAuthority,
                owner: this.address,
                obligation: this.obligation.address,
                reserve: reserve.address,
                collateralAccount: accounts.collateral.address,
                depositAccount: accounts.deposits.address,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            },
        });
        const ixs = [
            {
                ix: [...refreshReserveIxs, withdrawCollateralIx].filter((ix) => ix),
            },
        ];
        return ixs;
    }
    async withdraw(reserve, tokenAccount, amount) {
        return await this.makeWithdrawTx(reserve, tokenAccount, amount);
    }
    async makeWithdrawTx(reserve, tokenAccount, amount) {
        const accounts = await this.findReserveAccounts(reserve);
        const tx = new web3_js_1.Transaction();
        let supplementalTx = null;
        let signer = null;
        let withdrawAccount = tokenAccount;
        // Create token account ix
        let createAssociatedTokenAccountIx;
        // Wrapped sol ixs
        let wsolKeypair;
        let createWsolIx;
        let initWsolIx;
        let closeWsolIx;
        const walletTokenExists = await this.conn.getAccountInfo(tokenAccount);
        if (reserve.data.tokenMint.equals(spl_token_1.NATIVE_MINT)) {
            // Create a token account to receive wrapped sol.
            // There isn't an easy way to unwrap sol without
            // closing the account, so we avoid closing the
            // associated token account.
            supplementalTx = new web3_js_1.Transaction();
            const rent = await spl_token_1.Token.getMinBalanceRentForExemptAccount(this.conn);
            wsolKeypair = web3_js_1.Keypair.generate();
            withdrawAccount = wsolKeypair.publicKey;
            createWsolIx = web3_js_1.SystemProgram.createAccount({
                fromPubkey: this.address,
                newAccountPubkey: withdrawAccount,
                programId: spl_token_1.TOKEN_PROGRAM_ID,
                space: spl_token_1.AccountLayout.span,
                lamports: rent,
            });
            initWsolIx = spl_token_1.Token.createInitAccountInstruction(spl_token_1.TOKEN_PROGRAM_ID, reserve.data.tokenMint, withdrawAccount, this.address);
            supplementalTx.add(createWsolIx);
            supplementalTx.add(initWsolIx);
            signer = [wsolKeypair];
        }
        else if (!walletTokenExists) {
            // Create the wallet token account if it doesn't exist
            supplementalTx = new web3_js_1.Transaction();
            createAssociatedTokenAccountIx = spl_token_1.Token.createAssociatedTokenAccountInstruction(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, this.address, withdrawAccount, this.address, this.address);
            supplementalTx.add(createAssociatedTokenAccountIx);
        }
        const txids = [];
        if (supplementalTx && signer) {
            try {
                const txid = await this.client.program.provider.send(supplementalTx, signer);
                txids.push(txid);
            }
            catch (err) {
                console.error(`Ata or wSOL account creation error: ${err}`);
                return [JetTypes_1.TxnResponse.Failed, txids];
            }
        }
        tx.add(reserve.makeRefreshIx());
        tx.add(this.client.program.instruction.withdraw(accounts.deposits.bumpSeed, amount, {
            accounts: {
                market: this.market.address,
                marketAuthority: this.market.marketAuthority,
                withdrawAccount,
                depositAccount: accounts.deposits.address,
                depositor: this.address,
                reserve: reserve.address,
                vault: reserve.data.vault,
                depositNoteMint: reserve.data.depositNoteMint,
                honeyProgram: this.client.program.programId,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            },
        }));
        if (reserve.data.tokenMint.equals(spl_token_1.NATIVE_MINT) && wsolKeypair) {
            closeWsolIx = spl_token_1.Token.createCloseAccountInstruction(spl_token_1.TOKEN_PROGRAM_ID, withdrawAccount, this.address, this.address, []);
            tx.add(closeWsolIx);
        }
        try {
            const txid = await this.client.program.provider.send(tx);
            txids.push(txid);
            return [JetTypes_1.TxnResponse.Success, txids];
        }
        catch (err) {
            console.error(`Withdraw collateral error: ${err}`);
            return [JetTypes_1.TxnResponse.Failed, txids];
        }
    }
    async deposit(reserve, tokenAccount, amount) {
        const [transaction, signers] = await this.makeDepositTx(reserve, tokenAccount, amount);
        try {
            const txid = await this.client.program.provider.send(transaction, signers);
            return [JetTypes_1.TxnResponse.Success, [txid]];
        }
        catch (err) {
            console.error(`Deposit error: ${err}`);
            return [JetTypes_1.TxnResponse.Failed, []];
        }
    }
    async makeDepositTx(reserve, tokenAccount, amount) {
        const accounts = await this.findReserveAccounts(reserve);
        const depositAccountInfo = await this.conn.getAccountInfo(accounts.deposits.address);
        let depositSourcePubkey = tokenAccount;
        // Optional signers
        let depositSourceKeypair;
        // Optional instructions
        // Create wrapped sol ixs
        let createTokenAccountIx;
        let initTokenAccountIx;
        let closeTokenAccountIx;
        const tx = new web3_js_1.Transaction();
        // When handling SOL, ignore existing wsol accounts and initialize a new wrapped sol account
        if (reserve.data.tokenMint.equals(spl_token_1.NATIVE_MINT)) {
            // Overwrite the deposit source
            // The app will always wrap native sol, ignoring any existing wsol
            depositSourceKeypair = web3_js_1.Keypair.generate();
            depositSourcePubkey = depositSourceKeypair.publicKey;
            const rent = await this.conn.getMinimumBalanceForRentExemption(spl_token_1.AccountLayout.span);
            createTokenAccountIx = web3_js_1.SystemProgram.createAccount({
                fromPubkey: this.address,
                newAccountPubkey: depositSourcePubkey,
                programId: spl_token_1.TOKEN_PROGRAM_ID,
                space: spl_token_1.AccountLayout.span,
                lamports: Number(amount.value.addn(rent).toString()),
            });
            initTokenAccountIx = spl_token_1.Token.createInitAccountInstruction(spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.NATIVE_MINT, depositSourcePubkey, this.address);
            closeTokenAccountIx = spl_token_1.Token.createCloseAccountInstruction(spl_token_1.TOKEN_PROGRAM_ID, depositSourcePubkey, this.address, this.address, []);
            tx.add(createTokenAccountIx);
            tx.add(initTokenAccountIx);
        }
        if (depositAccountInfo == null) {
            tx.add(this.makeInitDepositAccountIx(reserve, accounts.deposits));
        }
        tx.add(reserve.makeRefreshIx());
        tx.add(this.client.program.instruction.deposit(accounts.deposits.bumpSeed, amount, {
            accounts: {
                market: this.market.address,
                marketAuthority: this.market.marketAuthority,
                depositSource: depositSourcePubkey,
                depositAccount: accounts.deposits.address,
                depositor: this.address,
                reserve: reserve.address,
                vault: reserve.data.vault,
                depositNoteMint: reserve.data.depositNoteMint,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            },
        }));
        const signers = [depositSourceKeypair].filter((signer) => signer);
        if (closeTokenAccountIx)
            tx.add(closeTokenAccountIx);
        return [tx, signers];
    }
    async depositCollateral(reserve, amount) {
        const tx = await this.makeDepositCollateralTx(reserve, amount);
        try {
            const txid = await this.client.program.provider.send(tx);
            return [JetTypes_1.TxnResponse.Success, [txid]];
        }
        catch (err) {
            return [JetTypes_1.TxnResponse.Failed, []];
        }
    }
    async makeDepositCollateralTx(reserve, amount) {
        const accounts = await this.findReserveAccounts(reserve);
        const obligationAccountInfo = await this.conn.getAccountInfo(this.obligation.address);
        const collateralAccountInfo = await this.conn.getAccountInfo(accounts.collateral.address);
        const tx = new web3_js_1.Transaction();
        if (obligationAccountInfo == null) {
            tx.add(this.makeInitObligationAccountIx());
        }
        const bumpSeeds = {
            depositAccount: accounts.deposits.bumpSeed,
            collateralAccount: accounts.collateral.bumpSeed,
        };
        tx.add(reserve.makeRefreshIx());
        tx.add(this.client.program.instruction.depositCollateral(bumpSeeds, amount, {
            accounts: {
                market: this.market.address,
                marketAuthority: this.market.marketAuthority,
                obligation: this.obligation.address,
                depositAccount: accounts.deposits.address,
                collateralAccount: accounts.collateral.address,
                owner: this.address,
                reserve: reserve.address,
                noteMint: reserve.data.depositNoteMint,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            },
        }));
        return tx;
    }
    async borrow(reserve, receiver, amount) {
        const ixs = await this.makeBorrowTx(reserve, receiver, amount);
        return await (0, programUtil_1.sendAllTransactions)(this.client.program.provider, ixs);
    }
    async makeBorrowTx(reserve, receiver, amount) {
        let receiverAccount = receiver;
        // Create token account ix
        let createTokenAccountIx;
        // Wrapped sol ixs
        let wsolKeypair;
        let createWsolTokenAccountIx;
        let initWsoltokenAccountIx;
        let closeTokenAccountIx;
        const accounts = await this.findReserveAccounts(reserve);
        const loanAccountInfo = await this.conn.getAccountInfo(accounts.loan.address);
        const walletTokenExists = await this.conn.getAccountInfo(receiverAccount);
        if (reserve.data.tokenMint.equals(spl_token_1.NATIVE_MINT)) {
            // Create a token account to receive wrapped sol.
            // There isn't an easy way to unwrap sol without
            // closing the account, so we avoid closing the
            // associated token account.
            const rent = await spl_token_1.Token.getMinBalanceRentForExemptAccount(this.conn);
            wsolKeypair = web3_js_1.Keypair.generate();
            receiverAccount = wsolKeypair.publicKey;
            createWsolTokenAccountIx = web3_js_1.SystemProgram.createAccount({
                fromPubkey: this.address,
                newAccountPubkey: wsolKeypair.publicKey,
                programId: spl_token_1.TOKEN_PROGRAM_ID,
                space: spl_token_1.AccountLayout.span,
                lamports: rent,
            });
            initWsoltokenAccountIx = spl_token_1.Token.createInitAccountInstruction(spl_token_1.TOKEN_PROGRAM_ID, reserve.data.tokenMint, wsolKeypair.publicKey, this.address);
        }
        else if (!walletTokenExists) {
            // Create the wallet token account if it doesn't exist
            createTokenAccountIx = spl_token_1.Token.createAssociatedTokenAccountInstruction(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, reserve.data.tokenMint, receiverAccount, this.address, this.address);
        }
        let initLoanAccountIx;
        if (loanAccountInfo == null) {
            initLoanAccountIx = this.makeInitLoanAccountIx(reserve, accounts.loan);
        }
        const refreshReserveIxs = [];
        this.reserves.forEach((r) => {
            refreshReserveIxs.push(r.makeRefreshIx());
        });
        const [feeReceiverAccount, feeReceiverAccountBump] = await web3_js_1.PublicKey.findProgramAddress([
            Buffer.from('honey-protocol-fee'),
            reserve.data.tokenMint.toBuffer(),
        ], this.client.program.programId);
        const [loanAccount, loanAccountBump] = await web3_js_1.PublicKey.findProgramAddress([
            Buffer.from('loan'),
            reserve.address.toBuffer(),
            this.obligation.address.toBuffer(),
            this.address.toBuffer(),
        ], this.client.program.programId);
        const borrowSeeds = {
            loanAccount: loanAccountBump,
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
                loanAccount: loanAccount,
                tokenMint: reserve.data.tokenMint,
                feeReceiverAccount,
                receiverAccount,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            },
        });
        if (reserve.data.tokenMint.equals(spl_token_1.NATIVE_MINT)) {
            closeTokenAccountIx = spl_token_1.Token.createCloseAccountInstruction(spl_token_1.TOKEN_PROGRAM_ID, receiverAccount, this.address, this.address, []);
        }
        const ixs = [
            {
                ix: [
                    createTokenAccountIx,
                    createWsolTokenAccountIx,
                    initWsoltokenAccountIx,
                    initLoanAccountIx
                ].filter((ix) => ix),
                signers: [wsolKeypair].filter((ix) => ix),
            },
            {
                ix: [
                    ...refreshReserveIxs,
                    borrowIx,
                    closeTokenAccountIx
                ].filter((ix) => ix),
            },
        ];
        return ixs;
    }
    makeInitDepositAccountIx(reserve, account) {
        return this.client.program.instruction.initDepositAccount(account.bumpSeed, {
            accounts: {
                market: this.market.address,
                marketAuthority: this.market.marketAuthority,
                reserve: reserve.address,
                depositNoteMint: reserve.data.depositNoteMint,
                depositor: this.address,
                depositAccount: account.address,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
                rent: web3_js_1.SYSVAR_RENT_PUBKEY,
            },
        });
    }
    async makeInitNFTCollateralAccountIx(tokenMint, nftCollateral, metadata, updateAuthority) {
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
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                systemProgram: anchor.web3.SystemProgram.programId,
            },
        });
    }
    makeInitCollateralAccountIx(reserve, account) {
        return this.client.program.instruction.initCollateralAccount(account.bumpSeed, {
            accounts: {
                market: this.market.address,
                marketAuthority: this.market.marketAuthority,
                reserve: reserve.address,
                depositNoteMint: reserve.data.depositNoteMint,
                owner: this.address,
                obligation: this.obligation.address,
                collateralAccount: account.address,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
                rent: web3_js_1.SYSVAR_RENT_PUBKEY,
            },
        });
    }
    makeInitLoanAccountIx(reserve, account) {
        return this.client.program.instruction.initLoanAccount(account.bumpSeed, {
            accounts: {
                market: this.market.address,
                marketAuthority: this.market.marketAuthority,
                reserve: reserve.address,
                loanNoteMint: reserve.data.loanNoteMint,
                owner: this.address,
                obligation: this.obligation.address,
                loanAccount: account.address,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
                rent: web3_js_1.SYSVAR_RENT_PUBKEY,
            },
        });
    }
    makeInitObligationAccountIx() {
        return this.client.program.instruction.initObligation(this.obligation.bumpSeed, {
            accounts: {
                market: this.market.address,
                marketAuthority: this.market.marketAuthority,
                obligation: this.obligation.address,
                borrower: this.address,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                systemProgram: web3_js_1.SystemProgram.programId,
            },
        });
    }
    async refresh() {
        this._loans = [];
        this._deposits = [];
        this._collateral = [];
        for (const reserve of this.market.reserves) {
            if (reserve.address.toBase58() === web3_js_1.PublicKey.default.toBase58()) {
                continue;
            }
            await this.refreshReserve(reserve);
        }
    }
    async refreshReserve(reserve) {
        const accounts = await this.findReserveAccounts(reserve);
        await this.refreshAccount(this._deposits, accounts.deposits);
        await this.refreshAccount(this._loans, accounts.loan);
        await this.refreshAccount(this._collateral, accounts.collateral);
    }
    async refreshAccount(appendTo, account) {
        try {
            const info = await this.conn.getAccountInfo(account.address);
            if (info == null) {
                return;
            }
            const tokenAccount = spl_token_1.AccountLayout.decode(info.data);
            appendTo.push({
                mint: new web3_js_1.PublicKey(tokenAccount.mint),
                amount: new anchor.BN(tokenAccount.amount, undefined, 'le'),
            });
        }
        catch (e) {
            console.log(`error getting user account: ${e}`);
            // ignore error, which should mean it's an invalid/uninitialized account
        }
    }
    async findNftMetadata(tokenMint) {
        const metadataPubKey = new web3_js_1.PublicKey(exports.METADATA_PROGRAM_ID);
        const [address, bump] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from('metadata'), metadataPubKey.toBuffer(), tokenMint.toBuffer()], metadataPubKey);
        return new _1.DerivedAccount(address, bump);
    }
    /**
     * Find a program derived address
     * @param programId The program the address is being derived for
     * @param seeds The seeds to find the address
     * @returns The address found and the bump seed required
     */
    async findProgramAddress(programId, seeds) {
        const SEEDBYTES = seeds.map((s) => {
            if (typeof s === 'string') {
                return new TextEncoder().encode(s);
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
    }
    /** Find reserve deposit note account for wallet */
    async findDepositNoteAddress(program, reserve, wallet) {
        return await this.findProgramAddress(program.programId, ['deposits', reserve, wallet]);
    }
    /** Find loan note token account for the reserve, obligation and wallet. */
    async findLoanNoteAddress(program, reserve, obligation, wallet) {
        return await this.findProgramAddress(program.programId, ['loan', reserve, obligation, wallet]);
    }
    /** Find collateral account for the reserve, obligation and wallet. */
    async findCollateralAddress(program, reserve, obligation, wallet) {
        return await this.findProgramAddress(program.programId, ['collateral', reserve, obligation, wallet]);
    }
    async findReserveAccounts(reserve) {
        const reserveAddress = typeof reserve.address === 'string' ? new web3_js_1.PublicKey(reserve.address) : reserve.address;
        const deposits = await this.findDepositNoteAddress(this.client.program, reserveAddress, this.address);
        const loan = await this.findLoanNoteAddress(this.client.program, reserveAddress, this.obligation.address, this.address);
        const collateral = await this.findCollateralAddress(this.client.program, reserveAddress, this.obligation.address, this.address);
        const dDeposits = new _1.DerivedAccount(...deposits);
        const dLoan = new _1.DerivedAccount(...loan);
        const dCollateral = new _1.DerivedAccount(...collateral);
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
exports.HoneyUser = HoneyUser;
//# sourceMappingURL=user.js.map