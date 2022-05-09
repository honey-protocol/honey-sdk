"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBorrowPositions = exports.METADATA_PROGRAM_ID = void 0;
const mpl_token_metadata_1 = require("@metaplex-foundation/mpl-token-metadata");
const web3_js_1 = require("@solana/web3.js");
const react_1 = require("react");
const __1 = require("..");
const honey_1 = require("../contexts/honey");
const useMarket_1 = require("./useMarket");
exports.METADATA_PROGRAM_ID = new web3_js_1.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const useBorrowPositions = (connection, wallet, jetId) => {
    const [status, setStatus] = (0, react_1.useState)({ loading: false });
    const { assetStore } = (0, honey_1.useHoney)();
    const { honeyUser } = (0, useMarket_1.useMarket)(connection, wallet, jetId);
    const fetchData = async () => {
        if (!honeyUser)
            return console.error('Could not find jet user');
        setStatus({ loading: true });
        const borrowPositions = [];
        const obligation = (await honeyUser.getObligationData());
        if (!obligation.market)
            return;
        const collateralNftMint = obligation.collateralNftMint;
        if (!collateralNftMint || collateralNftMint.length === 0)
            return;
        const promises = collateralNftMint.map(async (key, index) => {
            if (!key.equals(web3_js_1.PublicKey.default)) {
                const [nftMetadata, metadataBump] = await web3_js_1.PublicKey.findProgramAddress([Buffer.from('metadata'), exports.METADATA_PROGRAM_ID.toBuffer(), key.toBuffer()], exports.METADATA_PROGRAM_ID);
                const data = await (0, __1.getNFTAssociatedMetadata)(connection, nftMetadata);
                if (!data)
                    return;
                const tokenMetadata = new mpl_token_metadata_1.Metadata(nftMetadata, data);
                const arweaveData = await (await fetch(tokenMetadata.data.data.uri)).json();
                borrowPositions.push({
                    collateralTokenId: 'sadfk',
                    stakeTime: 14973132,
                    assetsBorrowed: [],
                    name: tokenMetadata.data.data.name,
                    image: arweaveData.image,
                    liquidationThreshold: 11.5,
                    totalInterest: 104.6,
                    tokenId: key,
                });
            }
        });
        await Promise.all(promises);
        obligation.loans.map((loan, index) => {
            borrowPositions[index]?.assetsBorrowed.push({
                name: 'sol',
                value: Math.round(assetStore?.tokens.SOL.loanNoteBalance.amount.toNumber() * 1000) / 1000,
            });
        });
        setStatus({ loading: false, data: borrowPositions });
    };
    // build borrow positions
    (0, react_1.useEffect)(() => {
        if (!assetStore || !honeyUser)
            return;
        fetchData();
    }, [honeyUser, assetStore]);
    return { ...status };
};
exports.useBorrowPositions = useBorrowPositions;
//# sourceMappingURL=useBorrowPositions.js.map