"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawCollateral = exports.withdraw = exports.depositCollateral = exports.deposit = void 0;
const JetTypes_1 = require("../helpers/JetTypes");
const wrappers_1 = require("../wrappers");
const borrow_1 = require("./borrow");
const deposit = async (HoneyUser, tokenAmount, depositTokenMint, depositReserves) => {
    const depositReserve = depositReserves.filter((reserve) => reserve.data.tokenMint.equals(depositTokenMint))[0];
    const associatedTokenAccount = await (0, borrow_1.deriveAssociatedTokenAccount)(depositTokenMint, HoneyUser.address);
    const amount = wrappers_1.Amount.tokens(tokenAmount);
    if (!associatedTokenAccount) {
        console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
        return [JetTypes_1.TxnResponse.Failed, []];
    }
    return await HoneyUser.deposit(depositReserve, associatedTokenAccount, amount);
};
exports.deposit = deposit;
const depositCollateral = async (HoneyUser, tokenAmount, depositTokenMint, depositReserves) => {
    const depositReserve = depositReserves.filter((reserve) => reserve.data.tokenMint.equals(depositTokenMint))[0];
    return await HoneyUser.depositCollateral(depositReserve, wrappers_1.Amount.tokens(tokenAmount));
};
exports.depositCollateral = depositCollateral;
const withdraw = async (HoneyUser, tokenAmount, withdrawTokenMint, withdrawReserves) => {
    const withdrawReserve = withdrawReserves.filter((reserve) => reserve.data.tokenMint.equals(withdrawTokenMint))[0];
    const associatedTokenAccount = await (0, borrow_1.deriveAssociatedTokenAccount)(withdrawTokenMint, HoneyUser.address);
    const amount = wrappers_1.Amount.tokens(tokenAmount);
    if (!associatedTokenAccount) {
        console.error(`Could not find the associated token account: ${associatedTokenAccount}`);
        return [JetTypes_1.TxnResponse.Failed, []];
    }
    return await HoneyUser.withdraw(withdrawReserve, associatedTokenAccount, amount);
};
exports.withdraw = withdraw;
const withdrawCollateral = async (HoneyUser, tokenAmount, withdrawTokenMint, withdrawReserves) => {
    const withdrawReserve = withdrawReserves.find((reserve) => reserve.data.tokenMint.equals(withdrawTokenMint));
    if (!withdrawReserve) {
        console.error(`Reserve with token mint ${withdrawTokenMint} does not exist`);
        return [JetTypes_1.TxnResponse.Failed, []];
    }
    const withdrawCollateralTx = await HoneyUser.withdrawCollateral(withdrawReserve, wrappers_1.Amount.tokens(tokenAmount));
    return withdrawCollateralTx;
};
exports.withdrawCollateral = withdrawCollateral;
//# sourceMappingURL=lend.js.map