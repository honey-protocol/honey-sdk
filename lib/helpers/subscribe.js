"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveValues = void 0;
const anchor_1 = require("@project-serum/anchor");
const programUtil_1 = require("./programUtil");
// Derive market reserve and user asset values, update global objects
const deriveValues = (reserve, market, user, asset) => {
    // Derive market reserve values
    reserve.marketSize = reserve.outstandingDebt.add(reserve.availableLiquidity);
    reserve.utilizationRate = reserve.marketSize.isZero()
        ? 0
        : reserve.outstandingDebt.uiAmountFloat / reserve.marketSize.uiAmountFloat;
    const ccRate = (0, programUtil_1.getCcRate)(reserve.config, reserve.utilizationRate);
    reserve.borrowRate = (0, programUtil_1.getBorrowRate)(ccRate, reserve.config.manageFeeRate);
    reserve.depositRate = (0, programUtil_1.getDepositRate)(ccRate, reserve.utilizationRate);
    // Update market total value locked and reserve array from new values
    let tvl = 0;
    let reservesArray = [];
    for (let r in market.reserves) {
        tvl += market.reserves[r].marketSize.muln(market.reserves[r].price)?.uiAmountFloat;
        reservesArray.push(market.reserves[r]);
    }
    market.totalValueLocked = tvl;
    market.reservesArray = reservesArray;
    // Derive user asset values
    if (asset && user) {
        asset.depositBalance = asset.depositNoteBalance
            .mulb(reserve.depositNoteExchangeRate)
            .divb(new anchor_1.BN(Math.pow(10, 15)));
        asset.loanBalance = asset.loanNoteBalance.mulb(reserve.loanNoteExchangeRate).divb(new anchor_1.BN(Math.pow(10, 15)));
        asset.collateralBalance = asset.collateralNoteBalance
            .mulb(reserve.depositNoteExchangeRate)
            .divb(new anchor_1.BN(Math.pow(10, 15)));
        // Update user obligation balances
        user.collateralBalances[reserve.abbrev] = asset.collateralBalance.uiAmountFloat;
        user.loanBalances[reserve.abbrev] = asset.loanBalance.uiAmountFloat;
        // Update user position object for UI
        user.position = {
            depositedValue: 0,
            borrowedValue: 0,
            colRatio: 0,
            utilizationRate: 0,
        };
        //update user positions
        for (let t in user.assets?.tokens) {
            user.position.depositedValue += user.collateralBalances[t] * market.reserves[t].price;
            user.position.borrowedValue += user.loanBalances[t] * market.reserves[t].price;
            user.position.colRatio = user.position.borrowedValue
                ? user.position.depositedValue / user.position.borrowedValue
                : 0;
            user.position.utilizationRate = user.position.depositedValue
                ? user.position.borrowedValue / user.position.depositedValue
                : 0;
        }
        //update user positions store
        // USER.update((data) => {
        //   data.position = user.position;
        //   return data;
        // });
        // Max deposit
        asset.maxDepositAmount = user.walletBalances[reserve.abbrev];
        // Max withdraw
        asset.maxWithdrawAmount = user.position.borrowedValue
            ? (user.position.depositedValue - market.programMinColRatio * user.position.borrowedValue) / reserve.price
            : asset.collateralBalance.uiAmountFloat;
        if (asset.maxWithdrawAmount > asset.collateralBalance.uiAmountFloat) {
            asset.maxWithdrawAmount = asset.collateralBalance.uiAmountFloat;
        }
        // Max borrow
        asset.maxBorrowAmount =
            (user.position.depositedValue / market.minColRatio - user.position.borrowedValue) / reserve.price;
        if (asset.maxBorrowAmount > reserve.availableLiquidity.uiAmountFloat) {
            asset.maxBorrowAmount = reserve.availableLiquidity.uiAmountFloat;
        }
        // Max repay
        if (user.walletBalances[reserve.abbrev] < asset.loanBalance.uiAmountFloat) {
            asset.maxRepayAmount = user.walletBalances[reserve.abbrev];
        }
        else {
            asset.maxRepayAmount = asset.loanBalance.uiAmountFloat;
        }
    }
    return { marketUpdate: market, userUpdate: user, assetUpdate: asset };
};
exports.deriveValues = deriveValues;
//# sourceMappingURL=subscribe.js.map