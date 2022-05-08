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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWalletAndAnchor = exports.providers = void 0;
const walletAdapter_1 = __importDefault(require("./walletAdapter"));
const anchor = __importStar(require("@project-serum/anchor"));
const connectWithPhantom = async () => {
    try {
        const { solana } = window;
        if (solana) {
            if (solana.isPhantom) {
                const response = await solana.connect({ onlyIfTrusted: false });
                return response;
            }
        }
        else {
            window.open('https://phantom.app/', '_blank')?.focus();
        }
    }
    catch (error) {
        console.log(error);
        throw error;
    }
};
const disconnectPhantom = async () => {
    try {
        const { solana } = window;
        await solana.disconnect();
    }
    catch (error) {
        throw error;
    }
};
const connectWithSolflareExtension = async () => {
    try {
        const { solflare } = window;
        if (solflare) {
            if (solflare.isSolflare) {
                await solflare.connect();
                return solflare;
            }
        }
        else {
            window.open('https://solflare.com/', '_blank')?.focus();
        }
    }
    catch (error) {
        console.log(error);
        throw error;
    }
};
const disconnectSolflareExtension = async () => {
    try {
        const { solflare } = window;
        await solflare.disconnect();
    }
    catch (error) {
        throw error;
    }
};
exports.providers = [
    {
        name: 'Phantom',
        logo: 'img/wallets/phantom.png',
        url: 'https://phantom.app/',
    },
    {
        name: 'Slope',
        logo: 'img/wallets/slope.png',
        url: 'https://slope.finance/',
    },
    {
        name: 'Solflare',
        logo: 'img/wallets/solflare.png',
        url: 'https://solflare.com/',
    },
    {
        name: 'Solong',
        logo: 'img/wallets/solong.png',
        url: 'https://solongwallet.com/',
    },
    {
        name: 'Sollet',
        logo: 'img/wallets/sollet.png',
        url: 'https://www.sollet.io/',
    },
    {
        name: 'Math Wallet',
        logo: 'img/wallets/math_wallet.png',
        url: 'https://mathwallet.org/en-us/',
    },
];
// Connect to user's wallet
const getWalletAndAnchor = async (provider) => {
    // Cast solana injected window type
    const solWindow = window;
    let wallet;
    // Wallet adapter or injected wallet setup
    if (provider.name === 'Phantom' && solWindow.solana?.isPhantom) {
        wallet = solWindow.solana;
    }
    else if (provider.name === 'Solflare' && solWindow.solflare?.isSolflare) {
        wallet = solWindow.solflare;
    }
    else if (provider.name === 'Slope' && !!solWindow.Slope) {
        wallet = new solWindow.Slope();
        const { data } = await wallet.connect();
        if (data.publicKey) {
            wallet.publicKey = new anchor.web3.PublicKey(data.publicKey);
        }
        wallet.on = (action, callback) => {
            if (callback)
                callback();
        };
    }
    else if (provider.name === 'Math Wallet' && solWindow.solana?.isMathWallet) {
        wallet = solWindow.solana;
        wallet.publicKey = new anchor.web3.PublicKey(await solWindow.solana.getAccount());
        wallet.on = (action, callback) => {
            if (callback)
                callback();
        };
        wallet.connect = (action, callback) => {
            if (callback)
                callback();
        };
    }
    else if (provider.name === 'Solong' && solWindow.solong) {
        wallet = solWindow.solong;
        wallet.publicKey = new anchor.web3.PublicKey(await solWindow.solong.selectAccount());
        wallet.on = (action, callback) => {
            if (callback)
                callback();
        };
        wallet.connect = (action, callback) => {
            if (callback)
                callback();
        };
    }
    else {
        wallet = new walletAdapter_1.default(provider.url);
    }
    // // Initiate wallet connection
    try {
        await wallet.connect();
    }
    catch (err) {
        console.error(err);
    }
    return wallet;
};
exports.getWalletAndAnchor = getWalletAndAnchor;
//# sourceMappingURL=connectWallet.js.map