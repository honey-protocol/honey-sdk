"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
class WalletAdapter extends eventemitter3_1.default {
    constructor(provider, _network) {
        super();
        this._network = _network;
        this._publicKey = null;
        this._popup = null;
        this._handlerAdded = false;
        this._nextRequestId = 1;
        this._autoApprove = false;
        this._responsePromises = new Map();
        this.handleMessage = (e) => {
            if ((this._injectedProvider && e.source === window) ||
                (e.origin === this._providerUrl?.origin && e.source === this._popup)) {
                if (e.data.method === 'connected') {
                    const newPublicKey = new web3_js_1.PublicKey(e.data.params.publicKey);
                    if (!this._publicKey || !this._publicKey.equals(newPublicKey)) {
                        if (this._publicKey && !this._publicKey.equals(newPublicKey)) {
                            this.handleDisconnect();
                        }
                        this._publicKey = newPublicKey;
                        this._autoApprove = !!e.data.params.autoApprove;
                        this.emit('connect', this._publicKey);
                    }
                }
                else if (e.data.method === 'disconnected') {
                    this.handleDisconnect();
                }
                else if (e.data.result || e.data.error) {
                    const promises = this._responsePromises.get(e.data.id);
                    if (promises) {
                        const [resolve, reject] = promises;
                        if (e.data.result) {
                            resolve(e.data.result);
                        }
                        else {
                            reject(new Error(e.data.error));
                        }
                    }
                }
            }
        };
        this._beforeUnload = () => {
            void this.disconnect();
        };
        if (isInjectedProvider(provider)) {
            this._injectedProvider = provider;
        }
        else if (isString(provider)) {
            this._providerUrl = new URL(provider);
            this._providerUrl.hash = new URLSearchParams({
                origin: window.location.origin,
                network: this._network,
            }).toString();
        }
        else {
            throw new Error('provider parameter must be an injected provider or a URL string.');
        }
    }
    handleConnect() {
        if (!this._handlerAdded) {
            this._handlerAdded = true;
            window.addEventListener('message', this.handleMessage);
            window.addEventListener('beforeunload', this._beforeUnload);
        }
        if (this._injectedProvider) {
            return new Promise((resolve) => {
                void this.sendRequest('connect', {});
                resolve();
            });
        }
        else {
            window.name = 'parent';
            this._popup = window.open(this._providerUrl?.toString(), '_blank', 'location,resizable,width=460,height=675');
            return new Promise((resolve) => {
                this.once('connect', resolve);
            });
        }
    }
    handleDisconnect() {
        if (this._handlerAdded) {
            this._handlerAdded = false;
            window.removeEventListener('message', this.handleMessage);
            window.removeEventListener('beforeunload', this._beforeUnload);
        }
        if (this._publicKey) {
            this._publicKey = null;
            this.emit('disconnect');
        }
        this._responsePromises.forEach(([, reject], id) => {
            this._responsePromises.delete(id);
            reject(new Error('Wallet disconnected'));
        });
    }
    async sendRequest(method, params) {
        if (method !== 'connect' && !this.connected) {
            throw new Error('Wallet not connected');
        }
        const requestId = this._nextRequestId;
        ++this._nextRequestId;
        return new Promise((resolve, reject) => {
            this._responsePromises.set(requestId, [resolve, reject]);
            if (this._injectedProvider) {
                this._injectedProvider.postMessage({
                    jsonrpc: '2.0',
                    id: requestId,
                    method,
                    params: {
                        network: this._network,
                        ...params,
                    },
                });
            }
            else {
                this._popup?.postMessage({
                    jsonrpc: '2.0',
                    id: requestId,
                    method,
                    params,
                }, this._providerUrl?.origin ?? '');
                if (!this.autoApprove) {
                    this._popup?.focus();
                }
            }
        });
    }
    get publicKey() {
        return this._publicKey;
    }
    get connected() {
        return this._publicKey !== null;
    }
    get autoApprove() {
        return this._autoApprove;
    }
    async connect() {
        if (this._popup) {
            this._popup.close();
        }
        await this.handleConnect();
    }
    async disconnect() {
        if (this._injectedProvider) {
            await this.sendRequest('disconnect', {});
        }
        if (this._popup) {
            this._popup.close();
        }
        this.handleDisconnect();
    }
    async sign(data, display) {
        if (!(data instanceof Uint8Array)) {
            throw new Error('Data must be an instance of Uint8Array');
        }
        const response = (await this.sendRequest('sign', {
            data,
            display,
        }));
        const signature = bs58_1.default.decode(response.signature);
        const publicKey = new web3_js_1.PublicKey(response.publicKey);
        return {
            signature,
            publicKey,
        };
    }
    async signTransaction(transaction) {
        const response = (await this.sendRequest('signTransaction', {
            message: bs58_1.default.encode(transaction.serializeMessage()),
        }));
        const signature = bs58_1.default.decode(response.signature);
        const publicKey = new web3_js_1.PublicKey(response.publicKey);
        transaction.addSignature(publicKey, signature);
        return transaction;
    }
    async signAllTransactions(transactions) {
        const response = (await this.sendRequest('signAllTransactions', {
            messages: transactions.map((tx) => bs58_1.default.encode(tx.serializeMessage())),
        }));
        const signatures = response.signatures.map((s) => bs58_1.default.decode(s));
        const publicKey = new web3_js_1.PublicKey(response.publicKey);
        transactions = transactions.map((tx, idx) => {
            tx.addSignature(publicKey, signatures[idx]);
            return tx;
        });
        return transactions;
    }
}
exports.default = WalletAdapter;
function isString(a) {
    return typeof a === 'string';
}
function isInjectedProvider(a) {
    return isObject(a) && 'postMessage' in a && typeof a.postMessage === 'function';
}
function isObject(a) {
    return typeof a === 'object' && a !== null;
}
//# sourceMappingURL=walletAdapter.js.map