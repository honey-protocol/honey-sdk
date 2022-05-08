"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmptyUserState = void 0;
const getEmptyUserState = () => ({
    // Location
    locale: null,
    geobanned: false,
    // Wallet
    connectingWallet: false,
    wallet: null,
    walletInit: false,
    tradeAction: '',
    // Assets and position
    assets: {},
    walletBalances: { '': 0 },
    collateralBalances: { '': 0 },
    loanBalances: { '': 0 },
    position: {
        depositedValue: 0,
        borrowedValue: 0,
        colRatio: 0,
        utilizationRate: 0,
    },
    // Transaction logs
    transactionLogs: [],
    transactionLogsInit: false,
    // Notifications
    notifications: [],
    addNotification: () => null,
    clearNotification: () => null,
    // Settings
    language: '',
    darkTheme: false,
    navExpanded: false,
    rpcNode: null,
    rpcPing: 0,
    rerender: false,
});
exports.getEmptyUserState = getEmptyUserState;
//# sourceMappingURL=getEmptyUser.js.map