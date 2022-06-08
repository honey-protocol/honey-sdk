import * as anchor from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { HasPublicKey, ToBytes } from '../helpers';
import devnetIdl from '../idl/devnet/honey.json';
import mainnetBetaIdl from '../idl/mainnet-beta/honey.json';
import { DerivedAccount } from './derived-account';

export interface PlaceBidParams {
    bid_limit: number;
    market: PublicKey;
    bidder: PublicKey;
    deposit_source: PublicKey;
    bid_mint: PublicKey;
}

export interface RevokeBidParams {
    market: PublicKey;
    bidder: PublicKey;
    withdraw_source: PublicKey;
    bid_mint: PublicKey;
}

export interface ExecuteBidParams {

}

type DerivedAccountSeed = HasPublicKey | ToBytes | Uint8Array | string;

export class LiquidatorClient {

    constructor(public program: anchor.Program) { }

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

        const tx = await this.program.rpc.placeLiquidateBid(
            params.bid_limit,
            bid_escrow_authority.bumpSeed,
            {
                accounts: {
                    market: params.market,
                    marketAuthority: market_authority.address,
                    bid: bid.address,
                    bidder: params.bidder,
                    bidEscrow: bid_escrow.address,
                    bidEscrowAuthority: bid_escrow_authority.address,
                    bidMint: params.bid_mint,
                    depositSource: params.deposit_source
                },
            },
        );

        return tx;
    }

    async revokeBid(params: RevokeBidParams) {
        const bid = await this.findBidAccount(params.market, params.bidder);
        const bid_escrow = await this.findEscrowAccount(params.market, params.bidder);
        const bid_escrow_authority = await this.findBidEscrowAuthorityAccount(bid_escrow.address);
        const market_authority = await this.findMarketAuthority(params.market);

        const tx = await this.program.rpc.placeRevokeBid(
            {
                accounts: {
                    market: params.market,
                    marketAuthority: market_authority.address,
                    bid: bid.address,
                    bidder: params.bidder,
                    bidEscrow: bid_escrow.address,
                    bidEscrowAuthority: bid_escrow_authority.address,
                    bidMint: params.bid_mint,
                    withdrawSource: params.withdraw_source
                },
            },
        );

        return tx;
    }

    async executeBid(params: ExecuteBidParams) {

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