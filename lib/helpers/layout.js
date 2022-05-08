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
exports.PositionInfoList = exports.PositionInfo = exports.ReserveStateLayout = exports.MarketReserveInfoList = exports.pubkeyField = exports.i64Field = exports.u64Field = exports.numberField = exports.PubkeyField = exports.SignedNumberField = exports.NumberField = void 0;
const anchor_1 = require("@project-serum/anchor");
const web3_js_1 = require("@solana/web3.js");
const BL = __importStar(require("@solana/buffer-layout"));
class NumberField extends BL.Layout {
    constructor(span, property) {
        super(span, property);
    }
    decode(b, offset) {
        const start = offset === undefined ? 0 : offset;
        const data = b.slice(start, start + this.span);
        return new anchor_1.BN(data, undefined, 'le');
    }
    encode(src, b, offset) {
        const start = offset === undefined ? 0 : offset;
        b.set(src.toArray('le'), start);
        return this.span;
    }
}
exports.NumberField = NumberField;
class SignedNumberField extends BL.Layout {
    constructor(span, property) {
        super(span, property);
    }
    decode(b, offset) {
        const start = offset == undefined ? 0 : offset;
        const data = b.slice(start, start + this.span);
        return new anchor_1.BN(data, undefined, 'le').fromTwos(this.span * 8);
    }
    encode(src, b, offset) {
        const start = offset == undefined ? 0 : offset;
        b.set(src.toTwos(this.span * 8).toArray('le'), start);
        return this.span;
    }
}
exports.SignedNumberField = SignedNumberField;
class PubkeyField extends BL.Layout {
    constructor(property) {
        super(32, property);
    }
    decode(b, offset) {
        const start = offset == undefined ? 0 : offset;
        const data = b.slice(start, start + this.span);
        return new web3_js_1.PublicKey(data);
    }
    encode(src, b, offset) {
        const start = offset == undefined ? 0 : offset;
        b.set(src.toBytes(), start);
        return this.span;
    }
}
exports.PubkeyField = PubkeyField;
function numberField(property) {
    return new NumberField(24, property);
}
exports.numberField = numberField;
function u64Field(property) {
    return new NumberField(8, property);
}
exports.u64Field = u64Field;
function i64Field(property) {
    return new SignedNumberField(8, property);
}
exports.i64Field = i64Field;
function pubkeyField(property) {
    return new PubkeyField(property);
}
exports.pubkeyField = pubkeyField;
const MAX_RESERVES = 32;
const ReserveInfoStruct = BL.struct([
    pubkeyField('reserve'),
    BL.blob(80, '_UNUSED_0_'),
    numberField('price'),
    numberField('depositNoteExchangeRate'),
    numberField('loanNoteExchangeRate'),
    numberField('minCollateralRatio'),
    BL.u16('liquidationBonus'),
    BL.blob(158, '_UNUSED_1_'),
    u64Field('lastUpdated'),
    BL.u8('invalidated'),
    BL.blob(7, '_UNUSED_1_'),
]);
exports.MarketReserveInfoList = BL.seq(ReserveInfoStruct, MAX_RESERVES);
/// Reserve
exports.ReserveStateLayout = BL.struct([
    i64Field('accruedUntil'),
    numberField('outstandingDebt'),
    numberField('uncollectedFees'),
    u64Field('totalDeposits'),
    u64Field('totalDepositNotes'),
    u64Field('totalLoanNotes'),
    BL.blob(416, '_UNUSED_0_'),
    u64Field('lastUpdated'),
    BL.u8('invalidated'),
    BL.blob(7, '_UNUSED_1_'),
]);
/// Obligation
exports.PositionInfo = BL.struct([
    pubkeyField('account'),
    numberField('amount'),
    BL.u32('side'),
    BL.u16('reserveIndex'),
    BL.blob(66, '_reserved'),
]);
exports.PositionInfoList = BL.seq(exports.PositionInfo, 16, 'positions');
//# sourceMappingURL=layout.js.map