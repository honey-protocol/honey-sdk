import { Connection } from '@solana/web3.js';
import { HoneyClient, HoneyMarket, HoneyUser, HoneyReserve } from '..';
import { SupportedWallet } from '../helpers/types';
export declare const useMarket: (connection: Connection, wallet: SupportedWallet, jetId: string) => {
    honeyClient: HoneyClient;
    setHoneyClient: import("react").Dispatch<import("react").SetStateAction<HoneyClient>>;
    honeyMarket: HoneyMarket;
    setHoneyMarket: import("react").Dispatch<import("react").SetStateAction<HoneyMarket>>;
    honeyUser: HoneyUser;
    setHoneyUser: import("react").Dispatch<import("react").SetStateAction<HoneyUser>>;
    honeyReserves: HoneyReserve[];
    setHoneyReserves: import("react").Dispatch<import("react").SetStateAction<HoneyReserve[]>>;
};
