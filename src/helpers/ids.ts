// import farms from '../pages/FarmPage/farms.json';

// farm
export let MINE_PROGRAM_ID: string;
export let QUARRY_KEYS: string[];
export let METADATA_PROGRAM_ID: string;

// jet
export let JET_ID: string;
export let DEX_ID: string;

export const PROGRAM_IDS = [
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
      JET_ID: 'HVtPSjE6Go3A1HhMg8rPivrSTp84gS3kNnUKLhKSfbYR', // devnet used  here
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

export const setProgramIds = (network: string) => {
  const instance = PROGRAM_IDS.find((id) => id.network === network);
  if (!instance) return;

  const farm = instance.farm();
  MINE_PROGRAM_ID = farm.MINE_PROGRAM_ID;
  METADATA_PROGRAM_ID = farm.METADATA_PROGRAM_ID;

  const jet = instance.jet();
  JET_ID = jet.JET_ID;
};

export const programIds = () => ({
  farm: { MINE_PROGRAM_ID, QUARRY_KEYS, METADATA_PROGRAM_ID },
  jet: { JET_ID, DEX_ID },
});
