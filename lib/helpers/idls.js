"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.programIdls = exports.setProgramIdls = exports.PROGRAM_IDLS = void 0;
let JET_IDL;
let FARM_IDL;
exports.PROGRAM_IDLS = [
    {
        name: 'localnet',
        // farm: require('../idl/mainnet-beta/farm.json'),
        jet: require('../idl/devnet/jet.json'),
    },
    {
        name: 'mainnet-beta',
        // farm: require('../idl/mainnet-beta/farm.json'),
        jet: require('../idl/mainnet-beta/jet.json'),
    },
    {
        name: 'devnet',
        // farm: require('../idl/mainnet-beta/farm.json'),
        jet: require('../idl/devnet/jet.json'),
    },
];
const setProgramIdls = (env) => {
    const instance = exports.PROGRAM_IDLS.find((idl) => idl.name === env);
    if (!instance)
        return;
    JET_IDL = instance.jet;
    // FARM_IDL = instance.farm;
};
exports.setProgramIdls = setProgramIdls;
const programIdls = () => ({
    // farm: FARM_IDL,
    jet: JET_IDL,
});
exports.programIdls = programIdls;
//# sourceMappingURL=idls.js.map