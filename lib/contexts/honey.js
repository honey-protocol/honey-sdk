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
exports.HoneyProvider = exports.useHoney = void 0;
const react_1 = __importStar(require("react"));
const programUtil_1 = require("../helpers/programUtil");
const subscribe_1 = require("../helpers/subscribe");
const util_1 = require("../helpers/util");
const anchor_1 = require("./anchor");
const getEmptyMarket_1 = require("./getEmptyMarket");
const anchor = __importStar(require("@project-serum/anchor"));
const layout_1 = require("../helpers/layout");
const client_1 = require("@pythnetwork/client");
const getEmptyUser_1 = require("./getEmptyUser");
const spl_token_1 = require("@solana/spl-token");
const honey_protocol_helpers_1 = require("../helpers/honey-protocol-helpers");
const HoneyContext = react_1.default.createContext({
    market: (0, getEmptyMarket_1.getEmptyMarketState)(),
    user: (0, getEmptyUser_1.getEmptyUserState)(),
    assetStore: null
});
const useHoney = () => {
    const context = (0, react_1.useContext)(HoneyContext);
    return context;
};
exports.useHoney = useHoney;
function HoneyProvider(props) {
    const { program, idlMetadata, coder, isConfigured } = (0, anchor_1.useAnchor)();
    const [market, setMarket] = (0, react_1.useState)((0, getEmptyMarket_1.getEmptyMarketState)());
    const [user, setUser] = (0, react_1.useState)((0, getEmptyUser_1.getEmptyUserState)());
    const [assetStore, setAssetStore] = (0, react_1.useState)(null);
    const wallet = props.wallet;
    (0, react_1.useEffect)(() => {
        const fetchReserves = async () => {
            const reserveStructures = await (0, honey_protocol_helpers_1.getReserveStructures)(idlMetadata);
            console.log({ idlMetadata });
            setMarket(current => ({
                ...current,
                accountPubkey: idlMetadata.market.market,
                authorityPubkey: idlMetadata.market.marketAuthority,
                reserves: reserveStructures,
                currentReserve: reserveStructures.SOL,
            }));
        };
        if (isConfigured)
            fetchReserves();
    }, [idlMetadata]);
    (0, react_1.useEffect)(() => {
        if (!program?.provider?.connection ||
            !idlMetadata || !user || !coder ||
            Object.keys(market.reserves).length === 0 ||
            !user.assets?.tokens)
            return;
        const subscribeToMarket = async () => {
            let promise;
            const promises = [];
            promise = (0, programUtil_1.getAccountInfoAndSubscribe)(program.provider.connection, idlMetadata?.market.market, account => {
                if (account != null) {
                    console.assert(layout_1.MarketReserveInfoList.span === 12288);
                    const decoded = (0, programUtil_1.parseMarketAccount)(account.data, coder);
                    for (const reserveStruct of decoded.reserves) {
                        for (const abbrev in market.reserves) {
                            if (market.reserves[abbrev].accountPubkey.equals(reserveStruct.reserve)) {
                                const reserve = market.reserves[abbrev];
                                reserve.liquidationPremium = reserveStruct.liquidationBonus;
                                reserve.depositNoteExchangeRate = reserveStruct.depositNoteExchangeRate;
                                reserve.loanNoteExchangeRate = reserveStruct.loanNoteExchangeRate;
                                const { marketUpdate, userUpdate, assetUpdate } = (0, subscribe_1.deriveValues)(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                                console.log(marketUpdate, userUpdate, assetUpdate);
                            }
                        }
                    }
                }
            });
            for (const reserveMeta of idlMetadata.reserves) {
                // Reserve
                promise = (0, programUtil_1.getAccountInfoAndSubscribe)(program.provider.connection, reserveMeta.accounts.reserve, account => {
                    if (account != null) {
                        const decoded = (0, programUtil_1.parseReserveAccount)(account.data, coder);
                        // Hardcoding min c-ratio to 130% for now
                        // market.minColRatio = decoded.config.minCollateralRatio / 10000;
                        const reserve = market.reserves[reserveMeta.abbrev];
                        reserve.maximumLTV = decoded.config.minCollateralRatio;
                        reserve.liquidationPremium = decoded.config.liquidationPremium;
                        reserve.outstandingDebt = new util_1.TokenAmount(decoded.state.outstandingDebt, reserveMeta.decimals).divb(new anchor.BN(Math.pow(10, 15)));
                        reserve.accruedUntil = decoded.state.accruedUntil;
                        reserve.config = decoded.config;
                        const { marketUpdate, userUpdate, assetUpdate } = (0, subscribe_1.deriveValues)(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                        console.log(marketUpdate, userUpdate, assetUpdate);
                    }
                });
                promises.push(promise);
                // Deposit Note Mint
                promise = (0, programUtil_1.getMintInfoAndSubscribe)(program.provider.connection, reserveMeta.accounts.depositNoteMint, amount => {
                    if (amount != null) {
                        const reserve = market.reserves[reserveMeta.abbrev];
                        reserve.depositNoteMint = amount;
                        const { marketUpdate, userUpdate, assetUpdate } = (0, subscribe_1.deriveValues)(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                        console.log(marketUpdate, userUpdate, assetUpdate);
                    }
                });
                promises.push(promise);
                // Loan Note Mint
                promise = (0, programUtil_1.getMintInfoAndSubscribe)(program.provider.connection, reserveMeta.accounts.loanNoteMint, amount => {
                    if (amount != null) {
                        const reserve = market.reserves[reserveMeta.abbrev];
                        reserve.loanNoteMint = amount;
                        const { marketUpdate, userUpdate, assetUpdate } = (0, subscribe_1.deriveValues)(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                        console.log(marketUpdate, userUpdate, assetUpdate);
                    }
                });
                promises.push(promise);
                // Reserve Vault
                promise = (0, programUtil_1.getTokenAccountAndSubscribe)(program.provider.connection, reserveMeta.accounts.vault, reserveMeta.decimals, amount => {
                    if (amount != null) {
                        const reserve = market.reserves[reserveMeta.abbrev];
                        reserve.availableLiquidity = amount;
                        const { marketUpdate, userUpdate, assetUpdate } = (0, subscribe_1.deriveValues)(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                        console.log(marketUpdate, userUpdate, assetUpdate);
                    }
                });
                promises.push(promise);
                // Reserve Token Mint
                promise = (0, programUtil_1.getMintInfoAndSubscribe)(program.provider.connection, reserveMeta.accounts.tokenMint, amount => {
                    if (amount != null) {
                        const reserve = market.reserves[reserveMeta.abbrev];
                        reserve.tokenMint = amount;
                        const { marketUpdate, userUpdate, assetUpdate } = (0, subscribe_1.deriveValues)(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                        console.log(marketUpdate, userUpdate, assetUpdate);
                    }
                });
                promises.push(promise);
                // Pyth Price
                promise = (0, programUtil_1.getAccountInfoAndSubscribe)(program.provider.connection, reserveMeta.accounts.pythPrice, account => {
                    if (account != null) {
                        const reserve = market.reserves[reserveMeta.abbrev];
                        reserve.price = (0, client_1.parsePriceData)(account.data).price || 90; // default to 90 for now
                        const { marketUpdate, userUpdate, assetUpdate } = (0, subscribe_1.deriveValues)(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                        console.log(marketUpdate, userUpdate, assetUpdate);
                    }
                });
                promises.push(promise);
            }
            await Promise.all(promises);
        };
        if (idlMetadata?.market?.market && program?.provider?.connection && market.reserves && user)
            subscribeToMarket();
    }, [idlMetadata?.market?.market, program?.provider?.connection, market.reserves, user]);
    (0, react_1.useEffect)(() => {
        const fetchAssets = async () => {
            const fetchedAssetStore = await (0, honey_protocol_helpers_1.getAssetPubkeys)(market, user, program, wallet);
            user.assets = fetchedAssetStore;
            setAssetStore(fetchedAssetStore);
        };
        if (market && user && program?.provider?.connection && wallet)
            fetchAssets();
    }, [market, user, program?.provider?.connection, wallet]);
    (0, react_1.useEffect)(() => {
        const subscribeToAssets = async () => {
            if (!user.assets)
                return;
            let promise;
            const promises = [];
            // Obligation
            promise = (0, programUtil_1.getAccountInfoAndSubscribe)(program.provider.connection, assetStore?.obligationPubkey, account => {
                if (account != null && user.assets) {
                    user.assets.obligation = {
                        ...account,
                        data: (0, programUtil_1.parseObligationAccount)(account.data, coder),
                    };
                }
                ;
            });
            promises.push(promise);
            // Wallet native SOL balance
            promise = (0, programUtil_1.getAccountInfoAndSubscribe)(program.provider.connection, wallet?.publicKey, account => {
                if (user.assets) {
                    const reserve = market.reserves.SOL;
                    // Need to be careful constructing a BN from a number.
                    // If the user has more than 2^53 lamports it will throw for not having enough precision.
                    user.assets.tokens.SOL.walletTokenBalance = new util_1.TokenAmount(new anchor.BN(account?.lamports.toString() ?? 0), programUtil_1.SOL_DECIMALS);
                    user.assets.sol = user.assets.tokens.SOL.walletTokenBalance;
                    user.walletBalances.SOL = user.assets.tokens.SOL.walletTokenBalance.uiAmountFloat;
                    const { marketUpdate, userUpdate, assetUpdate } = (0, subscribe_1.deriveValues)(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                    console.log(marketUpdate, userUpdate, assetUpdate);
                }
                return user;
            });
            promises.push(promise);
            for (const abbrev in user.assets.tokens) {
                if (!abbrev || abbrev !== "SOL")
                    continue;
                const asset = user.assets.tokens[abbrev];
                const reserve = market.reserves[abbrev];
                // Wallet token account
                promise = (0, programUtil_1.getTokenAccountAndSubscribe)(program.provider.connection, asset.walletTokenPubkey, reserve.decimals, amount => {
                    if (user.assets) {
                        user.assets.tokens[reserve.abbrev].walletTokenBalance = amount ?? new util_1.TokenAmount(new anchor.BN(0), reserve.decimals);
                        user.assets.tokens[reserve.abbrev].walletTokenExists = !!amount;
                        // Update wallet token balance
                        if (!asset.tokenMintPubkey.equals(spl_token_1.NATIVE_MINT)) {
                            user.walletBalances[reserve.abbrev] = asset.walletTokenBalance.uiAmountFloat;
                        }
                        const { marketUpdate, userUpdate, assetUpdate } = (0, subscribe_1.deriveValues)(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                        console.log(marketUpdate, userUpdate, assetUpdate);
                    }
                    return user;
                });
                promises.push(promise);
                // Reserve deposit notes
                promise = (0, programUtil_1.getTokenAccountAndSubscribe)(program.provider.connection, asset.depositNoteDestPubkey, reserve.decimals, amount => {
                    if (user.assets) {
                        user.assets.tokens[reserve.abbrev].depositNoteDestBalance = amount ?? util_1.TokenAmount.zero(reserve.decimals);
                        user.assets.tokens[reserve.abbrev].depositNoteDestExists = !!amount;
                        const { marketUpdate, userUpdate, assetUpdate } = (0, subscribe_1.deriveValues)(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                        console.log(marketUpdate, userUpdate, assetUpdate);
                    }
                    return user;
                });
                promises.push(promise);
                // Deposit notes account
                promise = (0, programUtil_1.getTokenAccountAndSubscribe)(program.provider.connection, asset.depositNotePubkey, reserve.decimals, amount => {
                    if (user.assets) {
                        user.assets.tokens[reserve.abbrev].depositNoteBalance = amount ?? util_1.TokenAmount.zero(reserve.decimals);
                        user.assets.tokens[reserve.abbrev].depositNoteExists = !!amount;
                        const { marketUpdate, userUpdate, assetUpdate } = (0, subscribe_1.deriveValues)(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                        console.log(marketUpdate, userUpdate, assetUpdate);
                    }
                });
                promises.push(promise);
                // Obligation loan notes
                promise = (0, programUtil_1.getTokenAccountAndSubscribe)(program.provider.connection, asset.loanNotePubkey, reserve.decimals, amount => {
                    if (user.assets) {
                        user.assets.tokens[reserve.abbrev].loanNoteBalance = amount ?? util_1.TokenAmount.zero(reserve.decimals);
                        user.assets.tokens[reserve.abbrev].loanNoteExists = !!amount;
                        const { marketUpdate, userUpdate, assetUpdate } = (0, subscribe_1.deriveValues)(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                        console.log(marketUpdate, userUpdate, assetUpdate);
                    }
                });
                promises.push(promise);
                // Obligation collateral notes
                promise = (0, programUtil_1.getTokenAccountAndSubscribe)(program.provider.connection, asset.collateralNotePubkey, reserve.decimals, amount => {
                    if (user.assets) {
                        user.assets.tokens[reserve.abbrev].collateralNoteBalance = amount ?? util_1.TokenAmount.zero(reserve.decimals);
                        user.assets.tokens[reserve.abbrev].collateralNoteExists = !!amount;
                        const { marketUpdate, userUpdate, assetUpdate } = (0, subscribe_1.deriveValues)(reserve, market, user, user.assets?.tokens[reserve.abbrev]);
                        console.log(marketUpdate, userUpdate, assetUpdate);
                    }
                });
                promises.push(promise);
            }
            Promise.all([promise]);
        };
        if (user.assets?.tokens && program?.provider?.connection && assetStore && wallet)
            subscribeToAssets();
    }, [user, program?.provider?.connection, assetStore, wallet]);
    const honeyContext = (0, react_1.useMemo)(() => ({
        market,
        user,
        assetStore
    }), [market, user, assetStore]);
    return (react_1.default.createElement(HoneyContext.Provider, { value: honeyContext }, props.children));
}
exports.HoneyProvider = HoneyProvider;
//# sourceMappingURL=honey.js.map