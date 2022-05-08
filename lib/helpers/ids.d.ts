export declare let MINE_PROGRAM_ID: string;
export declare let QUARRY_KEYS: string[];
export declare let METADATA_PROGRAM_ID: string;
export declare let JET_ID: string;
export declare let DEX_ID: string;
export declare const PROGRAM_IDS: {
    network: string;
    farm: () => {
        MINE_PROGRAM_ID: string;
        METADATA_PROGRAM_ID: string;
    };
    jet: () => {
        JET_ID: string;
        DEX_ID: string;
    };
}[];
export declare const setProgramIds: (network: string) => void;
export declare const programIds: () => {
    farm: {
        MINE_PROGRAM_ID: string;
        QUARRY_KEYS: string[];
        METADATA_PROGRAM_ID: string;
    };
    jet: {
        JET_ID: string;
        DEX_ID: string;
    };
};
