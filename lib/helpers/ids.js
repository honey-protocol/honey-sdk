"use strict";
// import farms from '../pages/FarmPage/farms.json';
Object.defineProperty(exports, "__esModule", { value: true });
exports.programIds = exports.setProgramIds = exports.PROGRAM_IDS = exports.DEX_ID = exports.JET_ID = exports.METADATA_PROGRAM_ID = exports.QUARRY_KEYS = exports.MINE_PROGRAM_ID = void 0;
exports.PROGRAM_IDS = [
    {
        network: 'localnet',
        farm: () => ({
            MINE_PROGRAM_ID: '2gQgPpcni87aq5A6fPv32a7Z7cTJ1cFExyXorPjjLV5G',
            METADATA_PROGRAM_ID: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
        }),
        jet: () => ({
            JET_ID: 'BcJAQhVWfgSqUi6R9RqJKAmua4oFhNJzxTMvfDQcHJ3Z',
            DEX_ID: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
        }),
    },
    {
        network: 'mainnet-beta',
        farm: () => ({
            MINE_PROGRAM_ID: '2gQgPpcni87aq5A6fPv32a7Z7cTJ1cFExyXorPjjLV5G',
            METADATA_PROGRAM_ID: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
        }),
        jet: () => ({
            JET_ID: 'HVtPSjE6Go3A1HhMg8rPivrSTp84gS3kNnUKLhKSfbYR',
            DEX_ID: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin', // localnet used here
        }),
    },
    {
        network: 'devnet',
        farm: () => ({
            MINE_PROGRAM_ID: '2gQgPpcni87aq5A6fPv32a7Z7cTJ1cFExyXorPjjLV5G',
            METADATA_PROGRAM_ID: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
        }),
        jet: () => ({
            JET_ID: 'GK53SsfAuRrPE1bEAa5isEDK6GjbK3Go7KcWZQtxQijn',
            DEX_ID: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin', // localnet used here
        }),
    },
];
const setProgramIds = (network) => {
    const instance = exports.PROGRAM_IDS.find((id) => id.network === network);
    if (!instance)
        return;
    const farm = instance.farm();
    exports.MINE_PROGRAM_ID = farm.MINE_PROGRAM_ID;
    exports.METADATA_PROGRAM_ID = farm.METADATA_PROGRAM_ID;
    const jet = instance.jet();
    exports.JET_ID = jet.JET_ID;
};
exports.setProgramIds = setProgramIds;
const programIds = () => ({
    farm: { MINE_PROGRAM_ID: exports.MINE_PROGRAM_ID, QUARRY_KEYS: exports.QUARRY_KEYS, METADATA_PROGRAM_ID: exports.METADATA_PROGRAM_ID },
    jet: { JET_ID: exports.JET_ID, DEX_ID: exports.DEX_ID },
});
exports.programIds = programIds;
//# sourceMappingURL=ids.js.map