import { Wallet, MathWallet, SlopeWallet, SolongWallet, WalletProvider } from './walletType';
export declare const providers: WalletProvider[];
export declare const getWalletAndAnchor: (provider: WalletProvider) => Promise<Wallet | SolongWallet | MathWallet | SlopeWallet>;
