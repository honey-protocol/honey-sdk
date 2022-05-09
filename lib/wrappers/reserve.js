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
exports.HoneyReserve = void 0;
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const BL = __importStar(require("@solana/buffer-layout"));
const market_1 = require("./market");
const util = __importStar(require("./util"));
const anchor_1 = require("@project-serum/anchor");
const SECONDS_PER_HOUR = new anchor_1.BN(3600);
const SECONDS_PER_DAY = SECONDS_PER_HOUR.muln(24);
const SECONDS_PER_WEEK = SECONDS_PER_DAY.muln(7);
const MAX_ACCRUAL_SECONDS = SECONDS_PER_WEEK;
class HoneyReserve {
    constructor(client, market, address, data, state) {
        this.client = client;
        this.market = market;
        this.address = address;
        this.data = data;
        this.state = state;
        this.conn = this.client.program.provider.connection;
    }
    async refresh() {
        await this.market.refresh();
        const data = await this.client.program.account.reserve.fetch(this.address);
        const stateData = new Uint8Array(data.state);
        this.state = ReserveStateStruct.decode(stateData);
        this.data = data;
    }
    async sendRefreshTx() {
        const tx = new web3_js_1.Transaction().add(this.makeRefreshIx());
        return await this.client.program.provider.send(tx);
    }
    async refreshOldReserves() {
        if (!this.state) {
            console.log('State is not set, call refresh');
            return;
        }
        let accruedUntil = this.state.accruedUntil;
        while (accruedUntil.add(MAX_ACCRUAL_SECONDS).lt(new anchor_1.BN(Math.floor(Date.now() / 1000)))) {
            this.sendRefreshTx();
            accruedUntil = accruedUntil.add(MAX_ACCRUAL_SECONDS);
        }
    }
    makeRefreshIx() {
        return this.client.program.instruction.refreshReserve({
            accounts: {
                market: this.market.address,
                marketAuthority: this.market.marketAuthority,
                reserve: this.address,
                feeNoteVault: this.data.feeNoteVault,
                depositNoteMint: this.data.depositNoteMint,
                protocolFeeNoteVault: this.data.protocolFeeNoteVault,
                pythOraclePrice: this.data.pythOraclePrice || this.data.pythPrice,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            },
        });
    }
    async updateReserveConfig(params) {
        await this.client.program.rpc.updateReserveConfig(params.config, {
            accounts: {
                market: params.market,
                reserve: params.reserve,
                owner: params.owner.publicKey,
            },
            signers: [params.owner],
        });
    }
    static async load(client, address, maybeMarket) {
        const data = (await client.program.account.reserve.fetch(address));
        const market = maybeMarket || (await market_1.HoneyMarket.load(client, data.market));
        return new HoneyReserve(client, market, address, data);
    }
    /**
     * Derive all the associated accounts for a reserve.
     * @param address The reserve address to derive the accounts for.
     * @param tokenMint The address of the mint for the token stored in the reserve.
     * @param market The address of the market the reserve belongs to.
     */
    static async deriveAccounts(client, address, tokenMint) {
        return {
            vault: await client.findDerivedAccount(['vault', address]),
            feeNoteVault: await client.findDerivedAccount(['fee-vault', address]),
            protocolFeeNoteVault: await client.findDerivedAccount(['protocol-fee-vault', address]),
            dexSwapTokens: await client.findDerivedAccount(['dex-swap-tokens', address]),
            dexOpenOrdersA: await client.findDerivedAccount(['dex-open-orders-a', address]),
            dexOpenOrdersB: await client.findDerivedAccount(['dex-open-orders-b', address]),
            loanNoteMint: await client.findDerivedAccount(['loans', address, tokenMint]),
            depositNoteMint: await client.findDerivedAccount(['deposits', address, tokenMint]),
        };
    }
}
exports.HoneyReserve = HoneyReserve;
const ReserveStateStruct = BL.struct([
    util.u64Field('accruedUntil'),
    util.numberField('outstandingDebt'),
    util.numberField('uncollectedFees'),
    util.u64Field('totalDeposits'),
    util.u64Field('totalDepositNotes'),
    util.u64Field('totalLoanNotes'),
    BL.blob(416 + 16, '_RESERVED_'),
]);
//# sourceMappingURL=reserve.js.map