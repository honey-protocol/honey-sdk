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
exports.AnchorProvider = exports.useAnchor = void 0;
const react_1 = __importStar(require("react"));
const programUtil_1 = require("../helpers/programUtil");
const anchor = __importStar(require("@project-serum/anchor"));
const idls_1 = require("../helpers/idls");
const AnchorContext = react_1.default.createContext(null);
const useAnchor = () => {
    const context = (0, react_1.useContext)(AnchorContext);
    return context;
};
exports.useAnchor = useAnchor;
const AnchorProvider = ({ children, wallet, connection, network }) => {
    const [program, setProgram] = (0, react_1.useState)({});
    const [idlMetadata, setIdlMetadata] = (0, react_1.useState)({});
    const [coder, setAnchorCoder] = (0, react_1.useState)({});
    const [isConfigured, setIsConfigured] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // setup coder for anchor operations
        const setup = async () => {
            const idl = idls_1.PROGRAM_IDLS.filter((value) => value.name === network)[0];
            const parsedIdlMetadata = (0, programUtil_1.parseIdlMetadata)(idl.jet.metadata);
            setAnchorCoder(new anchor.Coder(idl.jet));
            setIdlMetadata(parsedIdlMetadata);
            const provider = new anchor.Provider(connection, wallet, anchor.Provider.defaultOptions());
            const anchorProgram = new anchor.Program(idl.jet, (new anchor.web3.PublicKey(idl.jet.metadata.address)), provider);
            setProgram(anchorProgram);
            setIsConfigured(true);
        };
        if (connection && wallet)
            setup();
    }, [connection, wallet]);
    return (react_1.default.createElement(AnchorContext.Provider, { value: {
            program,
            idlMetadata,
            coder,
            isConfigured
        } }, children));
};
exports.AnchorProvider = AnchorProvider;
//# sourceMappingURL=anchor.js.map