import { BN } from "@project-serum/anchor";
import { DexInstructions, Market } from "@project-serum/serum";
import { NATIVE_MINT, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Signer, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { HasPublicKey, NonNullWalletType, WalletType } from "./jet/JetTypes";

export const DEX_ID = new PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");

export const DEX_ID_DEVNET = new PublicKey("DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY");

export interface CreateMarketInfo {
  baseToken: Token;
  quoteToken: Token;
  baseLotSize: number;
  quoteLotSize: number;
  feeRateBps: number;
}

export class SerumUtils {

  private dex_id: PublicKey;
  private connection: Connection;
  private wallet: NonNullWalletType;

  constructor(connection: Connection, wallet: NonNullWalletType, devnet: boolean) {
    this.connection = connection;
    this.wallet = wallet;
    this.dex_id = devnet ? DEX_ID_DEVNET : DEX_ID;
  }

  /**
   * Create a new Serum market
   * @returns
   */
    public async createMarket(info: CreateMarketInfo): Promise<Market> {
    const market = Keypair.generate();
    const requestQueue = Keypair.generate();
    const eventQueue = Keypair.generate();
    const bids = Keypair.generate();
    const asks = Keypair.generate();
    const quoteDustThreshold = new BN(100);

    const [vaultOwner, vaultOwnerBump] = await this.findVaultOwner(
        market.publicKey
    );

    const [baseVault, quoteVault] = await Promise.all([
        this.createTokenAccount(
            info.baseToken,
            vaultOwner,
            new BN(0)
        ),
        this.createTokenAccount(
            info.quoteToken,
            vaultOwner,
            new BN(0)
            ),
        ]);
    
    let transaction = new Transaction({
      feePayer: this.wallet.publicKey,
      recentBlockhash: await (await this.connection.getRecentBlockhash()).blockhash
    })
    transaction.add(
      await this.createAccountIx(
          market.publicKey,
          Market.getLayout(this.dex_id).span,
          this.dex_id
      ),
      await this.createAccountIx(
          requestQueue.publicKey,
          5132,
          this.dex_id
      ),
      await this.createAccountIx(
          eventQueue.publicKey,
          262156,
          this.dex_id
      ),
      await this.createAccountIx(bids.publicKey, 65548, this.dex_id),
      await this.createAccountIx(asks.publicKey, 65548, this.dex_id),
      DexInstructions.initializeMarket(
          toPublicKeys({
              market,
              requestQueue,
              eventQueue,
              bids,
              asks,
              baseVault,
              quoteVault,
              baseMint: info.baseToken.publicKey,
              quoteMint: info.quoteToken.publicKey,

              baseLotSize: new BN(info.baseLotSize),
              quoteLotSize: new BN(info.quoteLotSize),

              feeRateBps: info.feeRateBps,
              vaultSignerNonce: vaultOwnerBump,

              quoteDustThreshold,
              programId: this.dex_id,
          })
      )
    );

    await this.sendAndConfirmTransaction(transaction, [
        market,
        requestQueue,
        eventQueue,
        bids,
        asks,
    ]);

    return await Market.load(
        this.connection,
        market.publicKey,
        undefined,
        this.dex_id
    );
}

  async createTokenAccount(
    token: Token,
    owner: PublicKey | HasPublicKey,
    amount: BN
): Promise<PublicKey> {
    if ("publicKey" in owner) {
        owner = owner.publicKey;
    }

    if (token.publicKey == NATIVE_MINT) {
        const account = await Token.createWrappedNativeAccount(
            this.connection,
            TOKEN_PROGRAM_ID,
            owner,
            this.wallet.publicKey,
            amount.toNumber()
        );
        return account;
    } else {
        const account = await token.createAccount(owner);
        if (amount.toNumber() > 0) {
            await token.mintTo(account, this.wallet.publicKey, [], amount.toNumber());
        }
        return account;
    }
}

  async findVaultOwner(market: PublicKey): Promise<[PublicKey, BN]> {
    const bump = new BN(0);

    while (bump.toNumber() < 255) {
        try {
            const vaultOwner = await PublicKey.createProgramAddress(
                [market.toBuffer(), bump.toArrayLike(Buffer, "le", 8)],
                this.dex_id
            );

            return [vaultOwner, bump];
        } catch (_e) {
            bump.iaddn(1);
        }
    }

    throw new Error("no seed found for vault owner");
  }

  private async createAccountIx(
    account: PublicKey,
    space: number,
    programId: PublicKey
  ): Promise<TransactionInstruction> {
    return SystemProgram.createAccount({
        newAccountPubkey: account,
        fromPubkey: this.wallet.publicKey,
        lamports: await this.connection
            .getMinimumBalanceForRentExemption(space),
        space,
        programId,
    });
  }

async sendAndConfirmTransaction(
    transaction: Transaction,
    signers: Signer[]
  ): Promise<string> {
      return await sendAndConfirmTransaction(
          this.connection,
          transaction,
          signers.concat(this.wallet.publicKey)
      );
  }
}

/**
 * Convert some object of fields with address-like values,
 * such that the values are converted to their `PublicKey` form.
 * @param obj The object to convert
 */
 export function toPublicKeys(
  obj: Record<string, string | PublicKey | HasPublicKey | any>
): any {
  const newObj:any = {};

  for (const key in obj) {
      const value = obj[key];

      if (typeof value == "string") {
          newObj[key] = new PublicKey(value);
      } else if (typeof value == "object" && "publicKey" in value) {
          newObj[key] = value.publicKey;
      } else {
          newObj[key] = value;
      }
  }

  return newObj;
}