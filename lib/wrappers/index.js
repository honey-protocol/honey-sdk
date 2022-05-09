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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Amount = exports.PLACEHOLDER_ACCOUNT = exports.HoneyUser = exports.HoneyReserve = exports.MarketFlags = exports.HoneyMarket = exports.HoneyClient = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor = __importStar(require("@project-serum/anchor"));
var client_1 = require("./client");
Object.defineProperty(exports, "HoneyClient", { enumerable: true, get: function () { return client_1.HoneyClient; } });
var market_1 = require("./market");
Object.defineProperty(exports, "HoneyMarket", { enumerable: true, get: function () { return market_1.HoneyMarket; } });
Object.defineProperty(exports, "MarketFlags", { enumerable: true, get: function () { return market_1.MarketFlags; } });
var reserve_1 = require("./reserve");
Object.defineProperty(exports, "HoneyReserve", { enumerable: true, get: function () { return reserve_1.HoneyReserve; } });
var user_1 = require("./user");
Object.defineProperty(exports, "HoneyUser", { enumerable: true, get: function () { return user_1.HoneyUser; } });
__exportStar(require("./derived-account"), exports);
__exportStar(require("./token-amount"), exports);
exports.PLACEHOLDER_ACCOUNT = web3_js_1.PublicKey.default;
class Amount {
    constructor(units, value) {
        this.units = units;
        this.value = value;
    }
    static tokens(amount) {
        return new Amount({ tokens: {} }, new anchor.BN(amount));
    }
    static depositNotes(amount) {
        return new Amount({ depositNotes: {} }, new anchor.BN(amount));
    }
    static loanNotes(amount) {
        return new Amount({ loanNotes: {} }, new anchor.BN(amount));
    }
}
exports.Amount = Amount;
//# sourceMappingURL=index.js.map