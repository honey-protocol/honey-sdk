import * as anchor from '@project-serum/anchor';
import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { HasPublicKey, ToBytes } from '../helpers';
import devnetIdl from '../idl/devnet/honey.json';
import mainnetBetaIdl from '../idl/mainnet-beta/honey.json';
import { DerivedAccount } from './derived-account';
import {
    NATIVE_MINT,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    AccountLayout as TokenAccountLayout,
    Token
} from "@solana/spl-token";

export interface PlaceBidParams {
    bid_limit: number;
    market: PublicKey;
    bidder: PublicKey;
    bid_mint: PublicKey;
    deposit_source?: PublicKey;
}

export interface RevokeBidParams {
    market: PublicKey;
    bidder: PublicKey;
    withdraw_source: PublicKey;
    bid_mint: PublicKey;
}

export interface ExecuteBidParams {
    market: PublicKey;
    bidder: PublicKey;
    obligation: PublicKey
    reserve: PublicKey,
    loanNoteMint: PublicKey,
    loanReserveVault: PublicKey,
    collateralReserve: PublicKey,
    collateralAccount: PublicKey,
    loanAccount: PublicKey,
    vault: PublicKey,
    nftAccount: PublicKey,
    nftTokenAccount: PublicKey,
    nftTokenMint: PublicKey,
    nftMint: PublicKey,
    nftEscrow: PublicKey,
    payerAccount: PublicKey,
}

type DerivedAccountSeed = HasPublicKey | ToBytes | Uint8Array | string;

export class LiquidatorClient {
    conn: anchor.web3.Connection;

    constructor(public program: anchor.Program) {
        this.conn = program.provider.connection;
    }

    /**
        * Create a new client for interacting with the Jet lending program.
        * @param provider The provider with wallet/network access that can be used to send transactions.
        * @returns The client
    */
    static async connect(provider: anchor.Provider, honeyPubKey: string, devnet?: boolean): Promise<LiquidatorClient> {
        const idl = devnet ? devnetIdl : mainnetBetaIdl;
        const HONEY_PROGRAM_ID = new PublicKey(honeyPubKey);
        const program = new anchor.Program(idl as any, HONEY_PROGRAM_ID, provider);

        return new LiquidatorClient(program);
    }

    /**
        * Find a PDA
        * @param seeds
        * @returns
    */
    async findDerivedAccount(seeds: DerivedAccountSeed[]): Promise<DerivedAccount> {
        const seedBytes = seeds.map((s) => {
            if (typeof s === 'string') {
                return Buffer.from(s);
            } else if ('publicKey' in s) {
                return s.publicKey.toBytes();
            } else if ('toBytes' in s) {
                return s.toBytes();
            } else {
                return s;
            }
        });
        const [address, bumpSeed] = await PublicKey.findProgramAddress(seedBytes, this.program.programId);
        return new DerivedAccount(address, bumpSeed);
    }

    async placeBid(params: PlaceBidParams) {
        const bid = await this.findBidAccount(params.market, params.bidder);
        const bid_escrow = await this.findEscrowAccount(params.market, params.bidder);
        const bid_escrow_authority = await this.findBidEscrowAuthorityAccount(bid_escrow.address);
        const market_authority = await this.findMarketAuthority(params.market);

        const bumps = {
            bid: bid.bumpSeed,
            bidEscrow: bid_escrow.bumpSeed,
            bidEscrowAuthority: bid_escrow_authority.bumpSeed
        }

        const amount = params.bid_limit * 1e9; /* Wrapped SOL's decimals is 9 */
        const amountBN = new anchor.BN(amount);

        const bidder = params.bidder;
        const depositSource = Keypair.generate();

        const tx = new Transaction().add(
            // create token account
            SystemProgram.createAccount({
                fromPubkey: bidder,
                newAccountPubkey: depositSource.publicKey,
                space: TokenAccountLayout.span,
                lamports:
                    (await Token.getMinBalanceRentForExemptAccount(this.program.provider.connection)) + amount, // rent + amount
                programId: TOKEN_PROGRAM_ID,
            }),
            // init token account
            Token.createInitAccountInstruction(
                TOKEN_PROGRAM_ID,
                NATIVE_MINT,
                depositSource.publicKey,
                bidder
            ),
        );
        console.log(bumps);

        const ix = await this.program.instruction.placeLiquidateBid(
            bumps, 
            amountBN,
            {
                accounts: {
                    market: params.market,
                    marketAuthority: market_authority.address,
                    bid: bid.address,
                    bidder: params.bidder,
                    depositSource: depositSource.publicKey,
                    bidMint: params.bid_mint,
                    bidEscrow: bid_escrow.address,
                    bidEscrowAuthority: bid_escrow_authority.address,

                    // system accounts 
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
            },
        );
        tx.add(ix);
        tx.add(Token.createCloseAccountInstruction(
            TOKEN_PROGRAM_ID,
            depositSource.publicKey,
            bidder,
            bidder,
            []));

        const result = await this.program.provider.send(tx, [depositSource], { skipPreflight: true });
        console.log(result);
        return tx;
    }

    async revokeBid(params: RevokeBidParams) {
        const bid = await this.findBidAccount(params.market, params.bidder);
        const bid_escrow = await this.findEscrowAccount(params.market, params.bidder);
        const bid_escrow_authority = await this.findBidEscrowAuthorityAccount(bid_escrow.address);
        const market_authority = await this.findMarketAuthority(params.market);

        const tx = await this.program.rpc.revokeLiquidateBid(
            {
                accounts: {
                    market: params.market,
                    marketAuthority: market_authority.address,
                    bid: bid.address,
                    bidder: params.bidder,
                    bidEscrow: bid_escrow.address,
                    bidEscrowAuthority: bid_escrow_authority.address,
                    bidMint: params.bid_mint,
                    withdrawSource: params.withdraw_source,

                    // system accounts 
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
            },
        );

        return tx;
    }

    async executeBid(params: ExecuteBidParams) {
        const bid = await this.findBidAccount(params.market, params.bidder);
        const bid_escrow = await this.findEscrowAccount(params.market, params.bidder);
        const bid_escrow_authority = await this.findBidEscrowAuthorityAccount(bid_escrow.address);
        const market_authority = await this.findMarketAuthority(params.market);

        const tx = await this.program.rpc.executeLiquidateBid(
            {
                accounts: {
                    market: params.market,
                    marketAuthority: market_authority.address,
                    obligation: params.obligation,
                    reserve: params.reserve,
                    loanNoteMint: params.loanNoteMint,
                    loanReserveVault: params.loanReserveVault,
                    collateralReserve: params.collateralReserve,
                    collateralAccount: params.collateralAccount,
                    loanAccount: params.loanAccount,
                    vault: params.vault,

                    // nft liquidation
                    nftEscrow: params.nftEscrow,
                    nftMint: params.nftMint,
                    nftTokenAccount: params.nftTokenAccount,

                    bid: bid.address,
                    bidder: params.bidder,
                    bidEscrow: bid_escrow.address,
                    bidEscrowAuthority: bid_escrow_authority.address,

                    // account to pay down debt
                    payerAccount: params.payerAccount,

                    // system accounts 
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                    systemProgram: anchor.web3.SystemProgram.programId,
                },
            },
        );

        return tx;
    }

    async findBidAccount(market: PublicKey, bidder: PublicKey) {
        return await this.findDerivedAccount(["bid", market, bidder]);
    }

    async findEscrowAccount(market: PublicKey, bidder: PublicKey) {
        return await this.findDerivedAccount(["escrow", market, bidder]);
    }

    async findBidEscrowAuthorityAccount(bid_escrow_authority: PublicKey) {
        return await this.findDerivedAccount([bid_escrow_authority]);
    }

    async findMarketAuthority(market: PublicKey) {
        return await this.findDerivedAccount([market]);
    }
}