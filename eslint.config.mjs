import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
   ...nextVitals,
   ...nextTs,
   {
      rules: {
         '@typescript-eslint/no-explicit-any': 'off',
         'react-hooks/immutability': 'warn',
         'react-hooks/preserve-manual-memoization': 'warn',
         'react-hooks/set-state-in-effect': 'warn',
         'react-hooks/static-components': 'warn',
      },
   },
   globalIgnores([
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
   ]),
])

export default eslintConfig
