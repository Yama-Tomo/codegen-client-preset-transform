import type { FilterPattern, Plugin } from 'vite'
import { type TransformOptions, transform, transformOptionsDefault } from './transform.ts'

const hasFunctionCall = (code: string, functionName: string) => code.includes(`${functionName}(`)

export type VitePluginOptions = TransformOptions & {
  artifactDirectory: string
  include?: FilterPattern
  exclude?: FilterPattern
}

export const vitePlugin = ({
  useFragmentFunctionName = transformOptionsDefault.useFragmentFunctionName,
  graphqlFunctionName = transformOptionsDefault.graphqlFunctionName,
  artifactDirectory,
  include,
  exclude,
}: VitePluginOptions): Plugin => {
  let filter: ReturnType<typeof import('vite')['createFilter']>

  return {
    name: 'vite-plugin-codegen-client-preset-transform',
    enforce: 'pre',
    configResolved: async () => {
      filter = (await import('vite')).createFilter(
        include || ['**/*.ts', '**/*.tsx'],
        exclude || /node_modules/,
      )
    },
    transform: (code, id) => {
      if (!filter(id)) return
      if (
        !hasFunctionCall(code, graphqlFunctionName) &&
        !hasFunctionCall(code, useFragmentFunctionName)
      ) {
        return
      }

      const transformed = transform(
        { code, artifactDirectory },
        { graphqlFunctionName, useFragmentFunctionName },
      )
      return {
        code: transformed.toString(),
        map: transformed.generateMap({ source: id, hires: true }),
      }
    },
  }
}
