let JET_IDL: String;
let FARM_IDL: String;

export const PROGRAM_IDLS = [
  {
    name: 'localnet',
    farm: require('../src/idl/mainnet-beta/farm.json'),
    jet: require('../src/idl/devnet/jet.json'),
  },
  {
    name: 'mainnet-beta',
    farm: require('../src/idl/mainnet-beta/farm.json'),
    jet: require('../src/idl/mainnet-beta/jet.json'),
  },
  {
    name: 'devnet',
    farm: require('../src/idl/mainnet-beta/farm.json'),
    jet: require('../src/idl/devnet/jet.json'),
  },
];

export const setProgramIdls = (env: String) => {
  const instance = PROGRAM_IDLS.find((idl) => idl.name === env);
  if (!instance) return;

  JET_IDL = instance.jet;
  FARM_IDL = instance.farm;
};

export const programIdls = () => ({
  farm: FARM_IDL,
  jet: JET_IDL,
});
