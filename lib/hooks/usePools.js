"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePools = void 0;
const web3_js_1 = require("@solana/web3.js");
const react_1 = require("react");
const honey_1 = require("../contexts/honey");
const useMarket_1 = require("./useMarket");
const usePools = (connection, wallet, jetId) => {
    const { market, user } = (0, honey_1.useHoney)();
    const { honeyUser } = (0, useMarket_1.useMarket)(connection, wallet, jetId);
    const [status, setStatus] = (0, react_1.useState)({ loading: false, data: [] });
    (0, react_1.useEffect)(() => {
        const fetchPools = async () => {
            if (!market.reserves.SOL || !honeyUser || !user.assets)
                return;
            setStatus({ loading: true, data: [] });
            const reserve = market.reserves.SOL;
            const obligation = (await honeyUser.getObligationData());
            if (!obligation.collateralNftMint)
                return;
            const collateralNftMint = obligation.collateralNftMint;
            const numOfPositions = !collateralNftMint || collateralNftMint.length === 0
                ? 0
                : collateralNftMint.filter((mint) => !mint.equals(web3_js_1.PublicKey.default)).length;
            const data = {
                id: '3uT1ULwpnxNRrtbrwnNvEoGG7jZhxiNuQ7Rnw4kaR2x8',
                imageUrl: 'https://www.arweave.net/rr6teTGplFJsnp0LdGNEqLPVU1gnFLGo5ay_HRNLTpY?ext=png',
                publicKey: web3_js_1.PublicKey.default,
                title: 'Test Net Bees',
                totalSupplied: reserve.marketSize.uiAmount,
                totalBorrowed: (reserve.marketSize.uiAmountFloat - reserve.availableLiquidity.uiAmountFloat).toString(),
                userDeposit: {
                    sol: user.assets.tokens.SOL.depositNoteBalance.uiAmountFloat,
                    usdc: 0,
                },
                userBorrowStatus: {
                    numOfPositions,
                    positionHealths: [0],
                },
                borrowRate: reserve.borrowRate,
                interestRate: reserve.depositRate,
                APY: reserve.borrowRate,
                collateralEvaluation: 5000, // todo do we need this?
            };
            setStatus({ loading: false, data: [data] });
        };
        fetchPools();
    }, [market.reserves, user.assets, honeyUser]);
    return { ...status };
};
exports.usePools = usePools;
//# sourceMappingURL=usePools.js.map