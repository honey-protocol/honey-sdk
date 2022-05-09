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
const anchor = __importStar(require("@project-serum/anchor"));
const util_1 = require("../helpers/util");
const getEmptyReserve = (reserveMeta) => {
    const reserve = {
        name: "NFT PLACEHOLDER",
        abbrev: "NFT ABBREV PLACEHOLDER",
        marketSize: util_1.TokenAmount.zero(0),
        outstandingDebt: util_1.TokenAmount.zero(0),
        utilizationRate: 0,
        depositRate: 0,
        borrowRate: 0,
        maximumLTV: 0,
        liquidationPremium: 0,
        price: 0,
        decimals: 0,
        depositNoteExchangeRate: new anchor.BN(0),
        loanNoteExchangeRate: new anchor.BN(0),
        accruedUntil: new anchor.BN(0),
        config: {
            utilizationRate1: 0,
            utilizationRate2: 0,
            borrowRate0: 0,
            borrowRate1: 0,
            borrowRate2: 0,
            borrowRate3: 0,
            minCollateralRatio: 0,
            liquidationPremium: 0,
            manageFeeCollectionThreshold: new anchor.BN(0),
            manageFeeRate: 0,
            loanOriginationFee: 0,
            liquidationSlippage: 0,
            _reserved0: 0,
            liquidationDexTradeMax: 0,
            _reserved1: [],
        },
        accountPubkey: reserveMeta.address,
        vaultPubkey: reserveMeta.data.vault,
        availableLiquidity: util_1.TokenAmount.zero(0),
        feeNoteVaultPubkey: reserveMeta.data.feeNoteVault,
        tokenMintPubkey: reserveMeta.data.tokenMint,
        tokenMint: util_1.TokenAmount.zero(0),
        faucetPubkey: null,
        depositNoteMintPubkey: reserveMeta.data.depositNoteMint,
        depositNoteMint: util_1.TokenAmount.zero(0),
        loanNoteMintPubkey: reserveMeta.data.loanNoteMint,
        loanNoteMint: util_1.TokenAmount.zero(0),
        pythPricePubkey: reserveMeta.data.pythPrice || reserveMeta.data.pythOraclePrice,
        pythProductPubkey: reserveMeta.data.pythProduct || reserveMeta.data.pythOracleProduct,
    };
    return reserve;
};
//# sourceMappingURL=getEmptyReserve.js.map