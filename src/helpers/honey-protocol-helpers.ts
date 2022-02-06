import * as anchor from '@project-serum/anchor';
import { BN, Program } from '@project-serum/anchor';
import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Token, TOKEN_PROGRAM_ID, u64 } from "@solana/spl-token";
import {
    findDepositNoteAddress, 
    findDepositNoteDestAddress, 
    findLoanNoteAddress, 
    findObligationAddress, 
    findCollateralAddress, 
    SOL_DECIMALS
} from './programUtil';
import { TokenAmount } from './util';
import { Asset, AssetStore, IdlMetadata, Market, Reserve, User } from './JetTypes';


export const getReserveStructures = async (idlMetadata: IdlMetadata): Promise<Record<string, Reserve>> => {
    // Setup reserve structures
    const reserves: Record<string, Reserve> = {};
    for (const reserveMeta of idlMetadata.reserves) {
        if (!reserveMeta) continue;
        const reserve: Reserve = {
            name: reserveMeta.name,
            abbrev: reserveMeta.abbrev,
            marketSize: TokenAmount.zero(reserveMeta.decimals),
            outstandingDebt: TokenAmount.zero(reserveMeta.decimals),
            utilizationRate: 0,
            depositRate: 0,
            borrowRate: 0,
            maximumLTV: 0,
            liquidationPremium: 0,
            price: 0,
            decimals: reserveMeta.decimals,
            depositNoteExchangeRate: new BN(0),
            loanNoteExchangeRate: new BN(0),
            accruedUntil: new BN(0),
            config: {
                utilizationRate1: 0,
                utilizationRate2: 0,
                borrowRate0: 0,
                borrowRate1: 0,
                borrowRate2: 0,
                borrowRate3: 0,
                minCollateralRatio: 0,
                liquidationPremium: 0,
                manageFeeCollectionThreshold: new BN(0),
                manageFeeRate: 0,
                loanOriginationFee: 0,
                liquidationSlippage: 0,
                _reserved0: 0,
                liquidationDexTradeMax: 0,
                _reserved1: [],
            },

            accountPubkey: reserveMeta.accounts.reserve,
            vaultPubkey: reserveMeta.accounts.vault,
            availableLiquidity: TokenAmount.zero(reserveMeta.decimals),
            feeNoteVaultPubkey: reserveMeta.accounts.feeNoteVault,
            tokenMintPubkey: reserveMeta.accounts.tokenMint,
            tokenMint: TokenAmount.zero(reserveMeta.decimals),
            faucetPubkey: reserveMeta.accounts.faucet ?? null,
            depositNoteMintPubkey: reserveMeta.accounts.depositNoteMint,
            depositNoteMint: TokenAmount.zero(reserveMeta.decimals),
            loanNoteMintPubkey: reserveMeta.accounts.loanNoteMint,
            loanNoteMint: TokenAmount.zero(reserveMeta.decimals),
            pythPricePubkey: reserveMeta.accounts.pythPrice,
            pythProductPubkey: reserveMeta.accounts.pythProduct,
        };
        reserves[reserveMeta.abbrev] = reserve;
    }
    return reserves;
};

// Get user token accounts
export const getAssetPubkeys = async (market: Market, user: User, program: Program): Promise<AssetStore | null> => {
    if (program == null || user.wallet === null) {
        return null;
    }

    const [obligationPubkey, obligationBump] = await findObligationAddress(program, market.accountPubkey, user.wallet.publicKey);

    const assetStore: AssetStore = {
        sol: new TokenAmount(new BN(0), SOL_DECIMALS),
        obligationPubkey,
        obligationBump,
        tokens: {}
    } as AssetStore;
    for (const assetAbbrev in market.reserves) {
        if (!assetAbbrev) continue;
        const reserve = market.reserves[assetAbbrev];
        const tokenMintPubkey = reserve.tokenMintPubkey;

        const [depositNoteDestPubkey, depositNoteDestBump] = await findDepositNoteDestAddress(program, reserve.accountPubkey, user.wallet.publicKey);
        const [depositNotePubkey, depositNoteBump] = await findDepositNoteAddress(program, reserve.accountPubkey, user.wallet.publicKey);
        const [loanNotePubkey, loanNoteBump] = await findLoanNoteAddress(program, reserve.accountPubkey, obligationPubkey, user.wallet.publicKey);
        const [collateralPubkey, collateralBump] = await findCollateralAddress(program, reserve.accountPubkey, obligationPubkey, user.wallet.publicKey);

        const asset: Asset = {
            tokenMintPubkey,
            walletTokenPubkey: await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, tokenMintPubkey, user.wallet.publicKey),
            walletTokenExists: false,
            walletTokenBalance: TokenAmount.zero(reserve.decimals), // be careful of what were setting for this on the idl / server
            depositNotePubkey,
            depositNoteBump,
            depositNoteExists: false,
            depositNoteBalance: TokenAmount.zero(reserve.decimals),
            depositBalance: TokenAmount.zero(reserve.decimals),
            depositNoteDestPubkey,
            depositNoteDestBump,
            depositNoteDestExists: false,
            depositNoteDestBalance: TokenAmount.zero(reserve.decimals),
            loanNotePubkey,
            loanNoteBump,
            loanNoteExists: false,
            loanNoteBalance: TokenAmount.zero(reserve.decimals),
            loanBalance: TokenAmount.zero(reserve.decimals),
            collateralNotePubkey: collateralPubkey,
            collateralNoteBump: collateralBump,
            collateralNoteExists: false,
            collateralNoteBalance: TokenAmount.zero(reserve.decimals),
            collateralBalance: TokenAmount.zero(reserve.decimals),
            maxDepositAmount: 0,
            maxWithdrawAmount: 0,
            maxBorrowAmount: 0,
            maxRepayAmount: 0
        };

        // Set user assets
        assetStore.tokens[assetAbbrev] = asset;
    }

    return assetStore
};