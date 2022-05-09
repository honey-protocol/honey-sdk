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
exports.ConnectionProvider = exports.useNetwork = exports.useConnection = exports.ConnectionContext = void 0;
const web3_js_1 = require("@solana/web3.js");
const react_1 = __importStar(require("react"));
exports.ConnectionContext = (0, react_1.createContext)({});
function useConnection() {
    return (0, react_1.useContext)(exports.ConnectionContext).connection;
}
exports.useConnection = useConnection;
function useNetwork() {
    return (0, react_1.useContext)(exports.ConnectionContext).network;
}
exports.useNetwork = useNetwork;
const ConnectionProvider = ({ children, endpoint, network, config = { commitment: 'confirmed' }, }) => {
    const connection = (0, react_1.useMemo)(() => new web3_js_1.Connection(endpoint, config), [endpoint, config]);
    return react_1.default.createElement(exports.ConnectionContext.Provider, { value: { connection, network } }, children);
};
exports.ConnectionProvider = ConnectionProvider;
//# sourceMappingURL=connection.js.map