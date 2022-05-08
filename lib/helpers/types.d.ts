import { PublicKey } from '@solana/web3.js';
import { SolongWallet, Wallet } from './walletType';
export declare type TAsset = {
    name: String;
    value: number;
};
export declare type TBorrowPosition = {
    collateralTokenId: String;
    stakeTime: number;
    assetsBorrowed: TAsset[];
    name: String;
    image: String;
    liquidationThreshold: number;
    totalInterest: number;
    tokenId: PublicKey;
};
declare type TUserDepositedAsset = {
    sol: number;
    usdc: number;
};
declare type TUserBorrowStatus = {
    numOfPositions: number;
    positionHealths: number[];
};
export declare type TPool = {
    id: string;
    publicKey: PublicKey;
    imageUrl: string;
    title: string;
    totalSupplied: number;
    totalBorrowed: number;
    userDeposit: TUserDepositedAsset;
    userBorrowStatus?: TUserBorrowStatus;
    borrowRate: number;
    APY: number;
    interestRate: number;
    collateralEvaluation: number;
};
export declare type SupportedWallet = Wallet | SolongWallet | null;
export {};
