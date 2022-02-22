import * as anchor from "@project-serum/anchor";
import { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import {
    Amount,
    HoneyClient,
    HoneyMarket,
    HoneyReserve,
    HoneyUser,
    ReserveConfig
} from "../src/wrappers"
import { Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { MetadataDataData, MetadataData, CreateMetadata } from "@metaplex-foundation/mpl-token-metadata"
import * as chaiAsPromised from "chai-as-promised";
import { assert, use as chaiUse } from "chai";
import { ReserveAccount, ReserveStateStruct } from "../src/helpers/JetTypes";
import { ReserveStateLayout } from "../src/helpers/layout";
import * as splToken from "@solana/spl-token";
import { BN } from "@project-serum/anchor";
import { TestToken, TestUtils } from "./utils";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { CreateMarketParams } from "../src/wrappers/market";
import { CreateReserveParams } from "../src/wrappers/reserve";

// chaiUse(chaiAsPromised.default);

describe("honey", async () => {
    async function loadReserve(address: PublicKey) {
        const info = await provider.connection.getAccountInfo(address);
        let reserve = program.coder.accounts.decode<ReserveAccount>(
            "Reserve",
            info.data
        );
        const reserveState = ReserveStateLayout.decode(
            Buffer.from(reserve.state as any as number[])
        ) as ReserveStateStruct;
        reserve.state = reserveState;

        return reserve;
    }

    function displayReserveState(state: ReserveStateStruct) {
        console.log("accruedUntil:    ", state.accruedUntil.toString());
        console.log("invalidated:     ", state.invalidated);
        console.log("lastUpdated:     ", state.lastUpdated.toString());
        console.log(
            "outstandingDebt: ",
            state.outstandingDebt.div(bn(1e15)).toString()
        );
        console.log("totalDeposits:   ", state.totalDeposits.toString());
        console.log("totalLoanNotes:  ", state.totalLoanNotes.toString());
        console.log("uncollectedFees: ", state.uncollectedFees.toString());
    }

    function bn(z: number): BN {
        return new BN(z);
    }

    function compareReserveConfig(a: ReserveConfig, b: ReserveConfig): boolean {

        const keys = Object.keys(a);
        for (let key in keys) {

            let aField = a[keys[key]];
            let bField = b[keys[key]];

            if (BN.isBN(aField)) {
                if (aField.cmp(bField) != 0) {
                    return false;
                }
            } else if (aField != bField) {
                return false;
            }
        }

        return true;
    }

    async function checkBalance(tokenAccount: PublicKey): Promise<BN> {
        let info = await provider.connection.getAccountInfo(tokenAccount);
        const account: splToken.AccountInfo = splToken.AccountLayout.decode(
            info.data
        );

        return new BN(account.amount, undefined, "le");
    }

    async function checkWalletBalance(tokenAccount: PublicKey): Promise<number> {
        let info = await provider.connection.getAccountInfo(tokenAccount);
        let amount = info.lamports;

        return amount;
    }

    async function createTokenEnv(decimals: number, price: bigint) {
        let pythPrice = await testUtils.pyth.createPriceAccount();
        let pythProduct = await testUtils.pyth.createProductAccount();

        await testUtils.pyth.updatePriceAccount(pythPrice, {
            exponent: -9,
            aggregatePriceInfo: {
                price: price * 1000000000n,
            },
        });
        await testUtils.pyth.updateProductAccount(pythProduct, {
            priceAccount: pythPrice.publicKey,
            attributes: {
                quote_currency: "USD",
            },
        });

        return {
            token: await testUtils.createToken(decimals),
            pythPrice,
            pythProduct,
        } as TokenEnv;
    }

    async function createNFTEnv(token: Token, price: bigint) {
        let pythPrice = await testUtils.pyth.createPriceAccount();
        let pythProduct = await testUtils.pyth.createProductAccount();

        await testUtils.pyth.updatePriceAccount(pythPrice, {
            exponent: -9,
            aggregatePriceInfo: {
                price: price * 1000000000n,
            },
        });
        await testUtils.pyth.updateProductAccount(pythProduct, {
            priceAccount: pythPrice.publicKey,
            attributes: {
                quote_currency: "USD",
            },
        });

        return {
            token: token,
            pythPrice,
            pythProduct
        } as TokenEnv;
    }
    interface TokenEnv {
        token: TestToken;
        pythPrice: Keypair;
        pythProduct: Keypair;
        reserve?: HoneyReserve;
    }

    let IDL: anchor.Idl;
    const program: anchor.Program = anchor.workspace.Jet;
    const provider = anchor.Provider.local();
    const wallet = provider.wallet as Wallet;
    const nodewallet = provider.wallet as any as NodeWallet;

    const testUtils = new TestUtils(provider.connection, nodewallet);

    let jet: anchor.Program;
    let client: HoneyClient;
    let usdc: TokenEnv;
    let wsol: TokenEnv;

    const initialTokenAmount = 1e6 * 1e6;
    let usdcDeposit: number;

    let expectedLoanNotesBalance = bn(0);


    async function createTestUser(
        assets: Array<TokenEnv>,
        market: HoneyMarket
    ): Promise<TestUser> {
        const userWallet = await testUtils.createWallet(100000 * LAMPORTS_PER_SOL);
        const createUserTokens = async (asset: TokenEnv) => {
            const tokenAccount = await asset.token.getOrCreateAssociatedAccountInfo(
                userWallet.publicKey
            );

            await asset.token.mintTo(
                tokenAccount.address,
                wallet.publicKey,
                [],
                initialTokenAmount
            );
            return tokenAccount.address;
        };

        let tokenAccounts: Record<string, PublicKey> = {};
        for (const asset of assets) {
            tokenAccounts[asset.token.publicKey.toBase58()] = await createUserTokens(
                asset
            );
        }

        

        const provider = anchor.Provider.local();
        const userProgram = new anchor.Program(IDL, program.programId, provider);

        const client = new HoneyClient(userProgram);

        return {
            wallet: userWallet,
            tokenAccounts,
            client: await HoneyUser.load(client, market, userWallet.publicKey, []),
            marketMaker: client
        };
    }

    let userA: TestUser;
    let userB: TestUser;
    let userC: TestUser;
    let userD: TestUser;

    interface TestUser {
        wallet: Keypair;
        tokenAccounts: Record<string, PublicKey>;
        client: HoneyUser;
        marketMaker: HoneyClient;
    }

    let marketOwner: Keypair;
    let nftReserveFromMarket: HoneyReserve;
    let market: HoneyMarket;
    let jetNftMarket: HoneyMarket;
    let reserveConfig: ReserveConfig;
    let nftMint: Token;
    let nftEnv: TokenEnv;
    let userAssosciatedAccount: splToken.AccountInfo;
    let metadataData;

    before(async () => {
        IDL = program.idl;
        jet = new anchor.Program(IDL, program.programId, provider);
        client = new HoneyClient(jet);

        usdc = await createTokenEnv(6, 1n); // FIXME Break decimal symmetry
        wsol = await createTokenEnv(6, 100n); //       and ensure tests pass

        marketOwner = (provider.wallet as any as NodeWallet).payer;

        reserveConfig = {
            utilizationRate1: 8500,
            utilizationRate2: 9500,
            borrowRate0: 20000,
            borrowRate1: 20000,
            borrowRate2: 20000,
            borrowRate3: 20000,
            minCollateralRatio: 12500,
            liquidationPremium: 100,
            manageFeeRate: 50,
            manageFeeCollectionThreshold: new BN(10),
            loanOriginationFee: 10,
            liquidationSlippage: 300,
            liquidationDexTradeMax: new BN(100),
            confidenceThreshold: 200,
        } as ReserveConfig;

        // Create the Mint Account for the NFT
        nftMint = await splToken.Token.createMint(
            program.provider.connection,
            anchor.Wallet.payer,
            wallet.publicKey,
            null,
            0,
            splToken.TOKEN_PROGRAM_ID
        );

        // Get/Create the Associated Account for the user to hold the NFT
        userAssosciatedAccount =
            await nftMint.getOrCreateAssociatedAccountInfo(
                wallet.publicKey
            );

        // Mint 1 token to the user's associated account
        await nftMint.mintTo(
            userAssosciatedAccount.address,
            wallet.publicKey,
            [],
            1
        );

        // Reset mint_authority to null from the user to prevent further minting
        // await nftMint.setAuthority(
        //     nftMint.publicKey,
        //     null,
        //     "MintTokens",
        //     wallet.publicKey,
        //     []
        // );

        const METADATA_PROGRAM_ID = new PublicKey('BSNZJQjZEj8XHcS9Du1Cj1P2bYNn85ZjQr1MiRn3ET7V');

        const [metadataKey, metadataBump] = await PublicKey.findProgramAddress(
            [
                Buffer.from("metadata"),
                METADATA_PROGRAM_ID.toBuffer(),
                nftMint.publicKey.toBuffer()
            ],
            METADATA_PROGRAM_ID);

        // create metadata for nft 
        const metadataParams: CreateMetadataParams = {
            metadata: metadataKey,
            metadataData: new MetadataDataData({
                name: 'name',
                symbol: 'NME',
                uri: 'uri',
                sellerFeeBasisPoints: 0,
                creators: null
            }),
            updateAuthority: wallet.publicKey,
            mint: nftMint.publicKey,
            mintAuthority: wallet.publicKey
        };

        const createMetadata = new CreateMetadata(    
            { feePayer: wallet.publicKey },
            metadataParams
        );

        await provider.send(createMetadata, [], {skipPreflight:true});

        const metadataAccount = await provider.connection.getAccountInfo(metadataKey);

        metadataData = MetadataData.deserialize(metadataAccount.data);

        console.log(metadataData);

        nftEnv = await createNFTEnv(nftMint, 10n);

        // mock metadata
        // metadataAccount = await testUtils.pyth.config.createMetadataAccount(679);
        // testUtils.pyth.updateMetadataAccount(metadataAccount, {});
    });

    type CreateMetadataParams = {
        metadata: PublicKey;
        metadataData: MetadataDataData;
        updateAuthority: PublicKey;
        mint: PublicKey;
        mintAuthority: PublicKey;
    };

    it("creates lending market", async () => {
        market = await client.createMarket({
            owner: marketOwner.publicKey,
            quoteCurrencyMint: usdc.token.publicKey,
            quoteCurrencyName: "USD",
            oraclePrice: nftEnv.pythPrice.publicKey,
            oracleProduct: nftEnv.pythProduct.publicKey,
            updateAuthority: PublicKey.default
        } as CreateMarketParams);

        userA = await createTestUser([usdc, wsol], market);
        userB = await createTestUser([usdc, wsol], market);
    });

    it("transfers nft to userA", async () => {
        const fromAccount = await nftMint.getOrCreateAssociatedAccountInfo(wallet.publicKey);
        const toAccount = await nftMint.getOrCreateAssociatedAccountInfo(userA.wallet.publicKey);

        userA.tokenAccounts[nftMint.publicKey.toBase58()] = toAccount.address;
        await nftMint.transfer(
            fromAccount.address,
            toAccount.address,
            anchor.Wallet.payer,
            [],
            1
        );
    });

    it("creates reserves", async () => {
        for (let tokenEnv of [usdc, wsol]) {
            tokenEnv.reserve = await market.createReserve({
                tokenMint: tokenEnv.token.publicKey,
                pythOraclePrice: tokenEnv.pythPrice.publicKey,
                pythOracleProduct: tokenEnv.pythProduct.publicKey,
                config: reserveConfig,
            } as CreateReserveParams);
        }
    });

    it("userA deposits the nft into the market", async () => {
        const user = userA;
        const asset = nftEnv;

        const amount = Amount.depositNotes(1);
        const tokenAccountKey = userA.tokenAccounts[asset.token.publicKey.toBase58()];

        await user.client.deposit(asset.reserve, tokenAccountKey, amount);
        await user.client.depositCollateral(asset.reserve, amount);

        const vaultKey = usdc.reserve.data.vault;
        const notesKey = (
            await client.findDerivedAccount([
                "deposits",
                asset.reserve.address,
                user.client.address,
            ])
        ).address;
        const obligationKey = (
            await client.findDerivedAccount([
                "obligation",
                market.address,
                user.client.address,
            ])
        ).address;
        const collateralKey = (
            await client.findDerivedAccount([
                "collateral",
                asset.reserve.address,
                obligationKey,
                user.client.address,
            ])
        ).address;

        const collateralBalance = await checkBalance(collateralKey);
    });

    it("userB deposits usdc", async () => {
        const user = userB;
        const asset = usdc;

        usdcDeposit = 2000000000;
        const amount = Amount.tokens(usdcDeposit);
        const tokenAccountKey =
            user.tokenAccounts[asset.token.publicKey.toBase58()];


        const vaultKey = asset.reserve.data.vault;
        const notesKey = (
            await client.findDerivedAccount([
                "deposits",
                asset.reserve.address,
                user.client.address,
            ])
        ).address;
        const obligationKey = (
            await client.findDerivedAccount([
                "obligation",
                market.address,
                user.client.address,
            ])
        ).address;
        const collateralKey = (
            await client.findDerivedAccount([
                "collateral",
                asset.reserve.address,
                obligationKey,
                user.client.address,
            ])
        ).address;

        let tokenBalance = await checkBalance(vaultKey);
        assert.equal(tokenBalance.toString(), bn(0).toString());

        await user.client.deposit(asset.reserve, tokenAccountKey, amount);

        tokenBalance = await checkBalance(vaultKey);
        assert.equal(tokenBalance.toString(), bn(usdcDeposit).toString());

        let noteBalance = await checkBalance(notesKey);
        assert.equal(noteBalance.toString(), bn(usdcDeposit).toString());

        await user.client.depositCollateral(asset.reserve, amount);

        noteBalance = await checkBalance(notesKey);
        assert.equal(noteBalance.toString(), bn(0).toString());

        const collateralBalance = await checkBalance(collateralKey);
        console.log("collateral balance ", collateralBalance.toString());
        assert.equal(collateralBalance.toString(), bn(usdcDeposit).toString());
    });

    it("user A borrows usdc with NFT as collateral", async () => {
        const user = userA;
        const asset = usdc;
        const usdcBorrow = 500;
        const amount = Amount.tokens(usdcBorrow);
        const tokenAccountKey =
            user.tokenAccounts[asset.token.publicKey.toBase58()];

        const obligationKey = (
            await client.findDerivedAccount([
                "obligation",
                market.address,
                user.client.address,
            ])
        ).address;
        const notesKey = (
            await client.findDerivedAccount([
                "loan",
                asset.reserve.address,
                obligationKey,
                user.client.address,
            ])
        ).address;

        await market.refresh();
        await wsol.reserve.sendRefreshTx();
        await nftEnv.reserve.sendRefreshTx();

        const txId = await user.client.borrow(
            asset.reserve,
            tokenAccountKey,
            amount
        );
        await new Promise((r) => setTimeout(r, 500));
        const tx = await provider.connection.getTransaction(txId[1][0], {
            commitment: "confirmed",
        });

        const reserve = await loadReserve(asset.reserve.address);

        displayReserveState(reserve.state);

        const tokenBalance = await checkBalance(tokenAccountKey);
        const notesBalance = await checkBalance(notesKey);

        console.log("token balance ", tokenBalance.toString());
        console.log("notes balance ", notesBalance.toString());

        const expectedTokenBalance = bn(initialTokenAmount).add(amount.value);
        expectedLoanNotesBalance = bn(1e4)
            .add(bn(reserveConfig.loanOriginationFee))
            .mul(amount.value)
            .divRound(bn(1e4));

        assert.equal(tokenBalance.toString(), expectedTokenBalance.toString());
        assert.equal(notesBalance.toString(), expectedLoanNotesBalance.toString());
        assert.equal(
            reserve.state.outstandingDebt.div(bn(1e15)).toString(),
            expectedLoanNotesBalance.toString()
        );

        const nftReserve = await loadReserve(nftEnv.reserve.address);
        displayReserveState(nftReserve.state);
    });

    // TODO: Pyth Oracle might not be giving NFT correct value
    // it('userA fails to borrow beyond nft value', async () => {

    //     await testUtils.pyth.updatePriceAccount(nftEnv.pythPrice, {
    //         exponent: -9,
    //         aggregatePriceInfo: {
    //           price: 1n * 1000000000n,
    //         //   conf: 60000000n, // 600 bps or 6% of the price of USDC
    //         },
    //         twap: {
    //           valueComponent: 1000000000n,
    //         },
    //       });

    //     const user = userA;
    //     const asset = usdc;
    //     const usdcBorrow = 120000;
    //     const amount = Amount.tokens(usdcBorrow);
    //     const tokenAccountKey =
    //         user.tokenAccounts[asset.token.publicKey.toBase58()];

    //     await market.refresh();
    //     await wsol.reserve.sendRefreshTx();
    //     await nftEnv.reserve.sendRefreshTx();

    //     await expect(
    //         user.client.borrow(
    //             asset.reserve,
    //             tokenAccountKey,
    //             amount
    //         )
    //     ).to.be.rejectedWith("0x132");
    // });

    it('userA fails to withdraw nft collateral', async () => {
        const user = userA;

        const amount = Amount.tokens(1);

        // Give it some seconds for interest to accrue
        await new Promise((r) => setTimeout(r, 2000));

        await usdc.reserve.sendRefreshTx();
        const txs = await user.client.makeWithdrawCollateralTx(nftEnv.reserve, amount);
        let lastTxnResult;
        for (const tx of txs) {
            const txn = new Transaction();
            const latestBlockhash = await provider.connection.getLatestBlockhash();
            txn.instructions = tx.ix;
            txn.recentBlockhash = latestBlockhash.blockhash;
            lastTxnResult = await provider.simulate(txn, tx.signers);
        }
        assert.notStrictEqual(
            lastTxnResult.value.err,
            null,
            "expected instruction to failed"
        );
    });

    it('userA repays its loan plus interest', async () => {
        const user = userA;
        const asset = usdc;
        const amount = Amount.loanNotes(expectedLoanNotesBalance.toNumber());
        const tokenAccountKey =
            user.tokenAccounts[asset.token.publicKey.toBase58()];

        const txId = await user.client.repay(
            asset.reserve,
            tokenAccountKey,
            amount
        );

        const obligationKey = (
            await client.findDerivedAccount([
                "obligation",
                market.address,
                user.client.address,
            ])
        ).address;
        const notesKey = (
            await client.findDerivedAccount([
                "loan",
                asset.reserve.address,
                obligationKey,
                user.client.address,
            ])
        ).address;

        const notesBalance = await checkBalance(notesKey);

        expectedLoanNotesBalance = expectedLoanNotesBalance.sub(amount.value);

        assert.equal(notesBalance.toString(), expectedLoanNotesBalance.toString());

        const reserve = await loadReserve(asset.reserve.address);

        displayReserveState(reserve.state);
    });

    it("userA withdraws nft", async () => {
        const user = userA;
        const amount = Amount.tokens(1);
        const tokenAccountKey = user.tokenAccounts[nftEnv.token.publicKey.toBase58()];

        await usdc.reserve.sendRefreshTx();

        await user.client.withdrawCollateral(nftEnv.reserve, amount);
        await user.client.withdraw(nftEnv.reserve, tokenAccountKey, amount);

        const vaultKey = nftEnv.reserve.data.vault;
        const notesKey = (
            await client.findDerivedAccount([
                "deposits",
                nftEnv.reserve.address,
                user.client.address,
            ])
        ).address;
        const obligationKey = (
            await client.findDerivedAccount([
                "obligation",
                market.address,
                user.client.address,
            ])
        ).address;
        const collateralKey = (
            await client.findDerivedAccount([
                "collateral",
                nftEnv.reserve.address,
                obligationKey,
                user.client.address,
            ])
        ).address;

        let tokenBalance = await checkBalance(tokenAccountKey);
        let notesBalance = await checkBalance(notesKey);
        let collateralBalance = await checkBalance(collateralKey);
        let vaultBalance = await checkBalance(vaultKey);

        assert.equal(tokenBalance.toString(), bn(1).toString());
        assert.equal(notesBalance.toString(), "0");
        assert.equal(collateralBalance.toString(), "0");
        assert.equal(vaultBalance.toString(), "0");
    });

    // market creation
    it('userB creates a market for an NFT', async () => {
        // const user = userB;
        jetNftMarket = await client.createMarket({
            owner: marketOwner.publicKey,
            quoteCurrencyMint: usdc.token.publicKey,
            quoteCurrencyName: "USD",
            oraclePrice: nftEnv.pythPrice.publicKey,
            oracleProduct: nftEnv.pythProduct.publicKey,
            updateAuthority: wallet.publicKey
        });
        console.log("jet nft market ", jetNftMarket.address.toString());

        userC = await createTestUser([usdc, wsol], jetNftMarket);
        userD = await createTestUser([usdc, wsol], jetNftMarket);

    });

    it("creates reserves of usdc and wsol in new market", async () => {
        for (let tokenEnv of [usdc]) {
            usdc.reserve = await jetNftMarket.createReserve({
                tokenMint: tokenEnv.token.publicKey,
                pythOraclePrice: tokenEnv.pythPrice.publicKey,
                pythOracleProduct: tokenEnv.pythProduct.publicKey,
                config: reserveConfig,
            } as CreateReserveParams);
        }
    });

    it('userC deposits usdc', async () => {
        const user = userC;
        const asset = usdc;
        const amount = Amount.depositNotes(usdcDeposit);
        const tokenAccountKey =
            user.tokenAccounts[asset.token.publicKey.toBase58()];

        await userC.client.deposit(asset.reserve, tokenAccountKey, amount);
        await userC.client.depositCollateral(asset.reserve, amount);
    })

    // it('userD deposits their nft in the market', async () => {
    //     const user = userD;
    //     await user.client.depositNFT(
    //         nftReserveFromMarket,
    //         userAssosciatedAccount.address, 
    //         nftMint.publicKey, 
    //         wallet.publicKey
    //     );
    //     jetNftMarket.refresh();
    //     assert.equal(jetNftMarket.pythOraclePrice.toString(), nftEnv.pythPrice.publicKey.toString())
    //     assert.equal(jetNftMarket.pythOracleProduct.toString(), nftEnv.pythProduct.publicKey.toString())
    //     assert.equal(jetNftMarket.updateAuthority.toString(), PublicKey.default.toString())
    // });

    // it('userD withdraws their nft from the market', async () => {
    //     const user = userD;
    //     await userD.client.makeNFTWithdrawTx(usdc.reserve, userAssosciatedAccount.address, nftEnv.token.publicKey, PublicKey.default);
    //     await jetNftMarket.refresh();
    // });

    it('userD borrows with the nft they deposited to the market', async () => {
        const user = userD;
        const asset = usdc;
        const usdcBorrow = 1;
        const amount = Amount.tokens(usdcBorrow);
        const tokenAccountKey =
            user.tokenAccounts[asset.token.publicKey.toBase58()];

        const obligationKey = (
            await client.findDerivedAccount([
                "obligation",
                jetNftMarket.address,
                userD.client.address,
            ])
        ).address;

        const notesKey = (
            await client.findDerivedAccount([
                "loan",
                asset.reserve.address,
                obligationKey,
                userD.client.address,
            ])
        ).address;

        // await jetNftMarket.refresh();
        // await wsol.reserve.sendRefreshTx();
        // await nftEnv.reserve.sendRefreshTx();
        const txId = await userD.client.borrow(
            usdc.reserve,
            tokenAccountKey,
            amount
        );
        await new Promise((r) => setTimeout(r, 500));
        const tx = await provider.connection.getTransaction(txId[1][0], {
            commitment: "confirmed",
        });

        const reserve = await loadReserve(asset.reserve.address);

        displayReserveState(reserve.state);

        const tokenBalance = await checkBalance(tokenAccountKey);
        const notesBalance = await checkBalance(notesKey);

        console.log("token balance ", tokenBalance.toString());
        console.log("notes balance ", notesBalance.toString());

        const expectedTokenBalance = bn(initialTokenAmount).add(amount.value);
        expectedLoanNotesBalance = bn(1e4)
            .add(bn(reserveConfig.loanOriginationFee))
            .mul(amount.value)
            .divRound(bn(1e4));

        assert.equal(tokenBalance.toString(), expectedTokenBalance.toString());
        assert.equal(notesBalance.toString(), expectedLoanNotesBalance.toString());
        assert.equal(
            reserve.state.outstandingDebt.div(bn(1e15)).toString(),
            expectedLoanNotesBalance.toString()
        );

        const nftReserve = await loadReserve(nftEnv.reserve.address);
        displayReserveState(nftReserve.state);
    })


});

