"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmptyMarketState = void 0;
const web3_js_1 = require("@solana/web3.js");
const getEmptyMarketState = () => ({
    marketInit: false,
    accountPubkey: web3_js_1.PublicKey.default,
    authorityPubkey: web3_js_1.PublicKey.default,
    minColRatio: 0,
    programMinColRatio: 0,
    totalValueLocked: 0,
    reserves: {},
    reservesArray: [],
    nativeValues: false,
    rerender: false,
});
exports.getEmptyMarketState = getEmptyMarketState;
//# sourceMappingURL=getEmptyMarket.js.map