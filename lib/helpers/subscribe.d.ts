import type { Market, User, Asset, Reserve } from './JetTypes';
export declare const deriveValues: (reserve: Reserve, market: Market, user?: User, asset?: Asset) => {
    marketUpdate: Market;
    userUpdate: User;
    assetUpdate: Asset;
};
