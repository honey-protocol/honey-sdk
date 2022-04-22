import typescript from 'rollup-plugin-typescript2'

import pkg from './package.json'
import json from "@rollup/plugin-json";
import copy from 'rollup-plugin-copy'
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/index.ts',
    output: [{
        file: pkg.main,
        format: 'cjs',
        exports: 'named',
        sourcemap: true,
        strict: false
    }],
    plugins: [
        commonjs(),
        typescript({ objectHashIgnoreUnknownHack: true }),
        json(),
        copy({
            targets: [
                { src: 'src/idl/devnet/*.json', dest: 'dist/idl/devnet' },
                { src: 'src/idl/localnet/*.json', dest: 'dist/idl/localnet' },
                { src: 'src/idl/mainnet-beta/*.json', dest: 'dist/idl/mainnet-beta' },
            ]
        })
    ],
    external: ['react', 'react-dom']
}