import React, { ReactNode } from 'react';
import { AssetStore, Market, User } from '../helpers/JetTypes';
import { SolongWallet, Wallet } from '../helpers/walletType';
interface HoneyContext {
    market: Market;
    user: User;
    assetStore: AssetStore | null;
}
declare const HoneyContext: React.Context<HoneyContext>;
export declare const useHoney: () => HoneyContext;
export interface HoneyProps {
    children: ReactNode;
    wallet: Wallet | SolongWallet | null;
}
export declare function HoneyProvider(props: HoneyProps): JSX.Element;
export {};
