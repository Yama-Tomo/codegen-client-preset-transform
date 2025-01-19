import { type LibraryFormats, defineConfig } from 'vite'
import pkg from './package.json'

const outputExtensions: Record<string, string> = { es: 'mjs', cjs: 'cjs' } satisfies Partial<
  Record<LibraryFormats, string>
>
const externalPackages = Object.keys(pkg.dependencies).concat(Object.keys(pkg.peerDependencies))

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      formats: Object.keys(outputExtensions) as LibraryFormats[],
      entry: `${__dirname}/src/index.ts`,
      fileName: (format, entryName) => `${entryName}.${outputExtensions[format]}`,
    },
    rollupOptions: { external: externalPackages },
  },
})
