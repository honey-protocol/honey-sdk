"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repay = exports.borrow = exports.withdrawNFT = exports.depositNFT = exports.getNFTAssociatedMetadata = exports.deriveAssociatedTokenAccount = void 0;
const mpl_token_metadata_1 = require("@metaplex-foundation/mpl-token-metadata");
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const JetTypes_1 = require("../helpers/JetTypes");
const wrappers_1 = require("../wrappers");
// Lend Actions
const deriveAssociatedTokenAccount = async (tokenMint, userPubkey) => {
    const associatedTokenAccount = await spl_token_1.Token.getAssociatedTokenAddress(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, tokenMint, userPubkey);
    if (!associatedTokenAccount)
        console.log('Associated Token Account could not be located');
    return associatedTokenAccount;
};
exports.deriveAssociatedTokenAccount = deriveAssociatedTokenAccount;
const getNFTAssociatedMetadata = async (connection, metadataPubKey) => {
    const data = await connection.getAccountInfo(metadataPubKey);
    if (!data)
        return;
    return data;
};
exports.getNFTAssociatedMetadata = getNFTAssociatedMetadata;
const depositNFT = async (connection, honeyUser, metadataPubKey) => {
    const associatedMetadata = await (0, exports.getNFTAssociatedMetadata)(connection, metadataPubKey);
    if (!associatedMetadata) {
        console.error(`Could not find NFT metadata account ${metadataPubKey}`);
        return [JetTypes_1.TxnResponse.Failed, []];
    }
    const tokenMetadata = new mpl_token_metadata_1.Metadata(metadataPubKey, associatedMetadata);
    const tokenMint = new web3_js_1.PublicKey(tokenMetadata.data.mint);
    const associatedTokenAccount = await (0, exports.deriveAssociatedTokenAccount)(tokenMint, honeyUser.address);
    if (!associatedTokenAccount) {
        console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
        return [JetTypes_1.TxnResponse.Failed, []];
    }
    return await honeyUser.depositNFT(associatedTokenAccount, tokenMint, new web3_js_1.PublicKey(tokenMetadata.data.updateAuthority));
};
exports.depositNFT = depositNFT;
const withdrawNFT = async (connection, honeyUser, metadataPubKey) => {
    const associatedMetadata = await (0, exports.getNFTAssociatedMetadata)(connection, metadataPubKey);
    if (!associatedMetadata) {
        console.error(`Could not find NFT metadata account ${metadataPubKey}`);
        return [JetTypes_1.TxnResponse.Failed, []];
    }
    const tokenMetadata = new mpl_token_metadata_1.Metadata(metadataPubKey, associatedMetadata);
    const tokenMint = new web3_js_1.PublicKey(tokenMetadata.data.mint);
    const associatedTokenAccount = await (0, exports.deriveAssociatedTokenAccount)(tokenMint, honeyUser.address);
    if (!associatedTokenAccount) {
        console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
        return [JetTypes_1.TxnResponse.Failed, []];
    }
    return await honeyUser.withdrawNFT(associatedTokenAccount, tokenMint, new web3_js_1.PublicKey(tokenMetadata.data.updateAuthority));
};
exports.withdrawNFT = withdrawNFT;
const borrow = async (honeyUser, borrowAmount, borrowTokenMint, borrowReserves) => {
    const amount = wrappers_1.Amount.tokens(borrowAmount);
    const associatedTokenAccount = await (0, exports.deriveAssociatedTokenAccount)(borrowTokenMint, honeyUser.address);
    const borrowReserve = borrowReserves.filter((reserve) => reserve.data.tokenMint.equals(borrowTokenMint))[0];
    if (!associatedTokenAccount) {
        console.error(`Ata could not be found`);
        return [JetTypes_1.TxnResponse.Failed, []];
    }
    const borrowTx = await honeyUser.borrow(borrowReserve, associatedTokenAccount, amount);
    return borrowTx;
};
exports.borrow = borrow;
const repay = async (honeyUser, repayAmount, repayTokenMint, repayReserves) => {
    const amount = wrappers_1.Amount.tokens(repayAmount); // basically just pay back double the loan for now
    const associatedTokenAccount = await (0, exports.deriveAssociatedTokenAccount)(repayTokenMint, honeyUser.address);
    const repayReserve = repayReserves.filter((reserve) => reserve.data.tokenMint.equals(repayTokenMint))[0];
    if (!associatedTokenAccount) {
        console.error(`Ata could not be found`);
        return [JetTypes_1.TxnResponse.Failed, []];
    }
    return await honeyUser.repay(repayReserve, associatedTokenAccount, amount);
};
exports.repay = repay;
//# sourceMappingURL=borrow.js.map