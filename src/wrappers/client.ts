import { PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { CreateMarketParams, HoneyMarket } from './market';
import { DerivedAccount } from './derived-account';
import { Honey } from '../artifacts/honey';
import HoneyIdl from '../artifacts/honey.json';
import { AnchorProvider, Program } from '@project-serum/anchor';

interface ToBytes {
  toBytes(): Uint8Array;
}

interface HasPublicKey {
  publicKey: PublicKey;
}

type DerivedAccountSeed = HasPublicKey | ToBytes | Uint8Array | string;

export class HoneyClient {
  constructor(public program: Program<Honey>, public devnet?: boolean) {}

  /**
   * Create a new client for interacting with the Honey lending program.
   * @param provider The provider with wallet/network access that can be used to send transactions.
   * @returns The client
   */
  static async connect(provider: AnchorProvider, honeyPubKey: string, devnet?: boolean): Promise<HoneyClient> {
    const HONEY_PROGRAM_ID = new PublicKey(honeyPubKey);
    const program = new Program(HoneyIdl as anchor.Idl, HONEY_PROGRAM_ID, provider) as Program<Honey>;

    return new HoneyClient(program, devnet);
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

  async createMarket(params: CreateMarketParams): Promise<HoneyMarket> {
    let account = params.account;

    if (account === undefined) {
      account = Keypair.generate();
    }

    const tx = await this.program.methods
      .initMarket(params.owner, params.quoteCurrencyName, params.quoteCurrencyMint, params.nftCollectionCreator)
      .accounts({
        market: account.publicKey,
        oraclePrice: params.nftOraclePrice,
      })
      .signers([account])
      .preInstructions([await this.program.account.market.createInstruction(account)])
      .rpc();

    await this.program.provider.connection.confirmTransaction(tx, 'processed');

    return HoneyMarket.load(this, account.publicKey);
  }
}
