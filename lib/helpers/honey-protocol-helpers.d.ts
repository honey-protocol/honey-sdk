import { Program } from '@project-serum/anchor';
import { AssetStore, IdlMetadata, Market, Reserve, User } from './JetTypes';
import { SolongWallet, Wallet } from './walletType';
export declare const getReserveStructures: (idlMetadata: IdlMetadata) => Promise<Record<string, Reserve>>;
export declare const getAssetPubkeys: (market: Market, user: User, program: Program, wallet: Wallet | SolongWallet | null) => Promise<AssetStore | null>;
