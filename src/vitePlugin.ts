import type { PluginContext } from 'rollup'
import type { FilterPattern, Plugin } from 'vite'
import {
  type Artifact,
  type TransformOptions,
  transform,
  transformOptionsDefault,
} from './transform'
import { documentNodeFilePath } from './util'

type Context = Pick<PluginContext, 'load' | 'resolve'>

const hasFunctionCall = (code: string, functionName: string) => code.includes(`${functionName}(`)

const getDocumentNodeDictionary = async (
  documentNodeFilePath: string,
  importer: string,
  ctx: Context,
) => {
  const resolveId = await ctx.resolve(documentNodeFilePath, importer)
  if (!resolveId) throw new Error(`Could not resolve artifact path: ${documentNodeFilePath}`)

  const modInfo = await ctx.load(resolveId)
  if (!modInfo.code) throw new Error(`Could not load artifact file: ${resolveId.id}`)

  return import(`data:text/javascript;base64,${btoa(modInfo.code)}`)
}

export type VitePluginOptions = TransformOptions & {
  artifactDirectory: string
  include?: FilterPattern
  exclude?: FilterPattern
  disableProductionBuildOptimization?: boolean
}

export const vitePlugin = ({
  useFragmentFunctionName = transformOptionsDefault.useFragmentFunctionName,
  graphqlFunctionName = transformOptionsDefault.graphqlFunctionName,
  disableProductionBuildOptimization = false,
  artifactDirectory,
  include,
  exclude,
}: VitePluginOptions): Plugin => {
  let filter: ReturnType<typeof import('vite')['createFilter']>
  let artifact: Artifact = artifactDirectory
  let ctx: Context

  return {
    name: 'vite-plugin-codegen-client-preset-transform',
    enforce: 'pre',
    async configResolved() {
      filter = (await import('vite')).createFilter(
        include || ['**/*.ts', '**/*.tsx'],
        exclude || /node_modules/,
      )
    },
    buildStart() {
      ctx = { load: this.load, resolve: this.resolve }
    },
    transform: async (code, id) => {
      if (!filter(id)) return
      if (
        !hasFunctionCall(code, graphqlFunctionName) &&
        !hasFunctionCall(code, useFragmentFunctionName)
      ) {
        return
      }

      if (
        !disableProductionBuildOptimization &&
        process.env.NODE_ENV === 'production' &&
        typeof artifact === 'string'
      ) {
        artifact = await getDocumentNodeDictionary(documentNodeFilePath(artifact), id, ctx)
      }

      const transformed = transform(
        { code, artifact },
        { graphqlFunctionName, useFragmentFunctionName },
      )
      return {
        code: transformed.toString(),
        map: transformed.generateMap({ source: id, hires: true }),
      }
    },
  }
}
