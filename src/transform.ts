import { parse as parseGql } from 'graphql'
import MagicString from 'magic-string'
import * as ts from 'typescript'
import { documentNodeFilePath } from './util'

const IMPORT_ITEM_PREFIX = '_transformed_'

const isFunctionCallExpression = (node: ts.Node, functionName: string): node is ts.CallExpression =>
  ts.isCallExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === functionName

const inlineGraphqlCall = (
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
  transformData: TransformData,
) => {
  const [firstArg] = node.arguments
  if (!ts.isNoSubstitutionTemplateLiteral(firstArg)) return

  const rawText = firstArg.rawText
  if (!rawText) return

  const ast = parseGql(rawText)
  const [firstDefinition] = ast.definitions
  if (
    firstDefinition.kind !== 'FragmentDefinition' &&
    firstDefinition.kind !== 'OperationDefinition'
  )
    return

  const name = firstDefinition.name?.value
  if (!name) return

  const isGraphqlCallResultAssignedToVariable = () => {
    let parentNode: undefined | ts.Node = node.parent
    while (parentNode) {
      if (ts.isVariableStatement(parentNode)) return true

      parentNode = parentNode.parent
    }

    return false
  }

  const graphqlCallExpression = node.getText(sourceFile)

  if (!isGraphqlCallResultAssignedToVariable()) {
    transformData.codes.push({ from: graphqlCallExpression, to: '' })
    return
  }

  const operationOrFragmentName =
    firstDefinition.kind === 'OperationDefinition' ? `${name}Document` : `${name}FragmentDoc`
  const operationOrFragmentNameWithPrefix = IMPORT_ITEM_PREFIX + operationOrFragmentName

  transformData.codes.push({ from: graphqlCallExpression, to: operationOrFragmentNameWithPrefix })
  transformData.importItems.push({
    name: operationOrFragmentName,
    alias: operationOrFragmentNameWithPrefix,
  })
}

const inlineUseFragmentCall = (
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
  transformData: TransformData,
) => {
  const [, secondArg] = node.arguments
  if (!secondArg) return

  const useFragmentCallExpression = node.getText(sourceFile)
  const useFragmentSecondArg = secondArg.getText(sourceFile)
  transformData.codes.push({
    from: useFragmentCallExpression,
    to: `(${useFragmentSecondArg})`,
  })
}

type TransformData = {
  importItems: { name: string; alias: string }[]
  codes: { from: string; to: string }[]
}

type CodeGenerationDirectory = string
type DocumentNodeDictionary = Record<string, unknown>
type Artifact = CodeGenerationDirectory | DocumentNodeDictionary

type Options = {
  graphqlFunctionName?: string
  useFragmentFunctionName?: string
}

const optionsDefault = {
  graphqlFunctionName: 'graphql',
  useFragmentFunctionName: 'useFragment',
} satisfies Options

export const transform = (
  { code, artifact }: { code: string; artifact: Artifact },
  optionsArg?: Options,
) => {
  const options = { ...optionsDefault, ...optionsArg }
  const transformData: TransformData = { importItems: [], codes: [] }

  const sourceFile = ts.createSourceFile('', code, ts.ScriptTarget.Latest, true)
  const visitor = (node: ts.Node): undefined => {
    if (isFunctionCallExpression(node, options.graphqlFunctionName)) {
      inlineGraphqlCall(node, sourceFile, transformData)
      return
    }

    if (isFunctionCallExpression(node, options.useFragmentFunctionName)) {
      inlineUseFragmentCall(node, sourceFile, transformData)
      return
    }

    ts.forEachChild(node, visitor)
  }
  ts.visitNode(sourceFile, visitor)

  const magicString = new MagicString(code)
  if (transformData.importItems.length) {
    if (typeof artifact === 'string') {
      const importItems = transformData.importItems.map(({ name, alias }) => `${name} as ${alias}`)

      magicString.prepend(
        `import { ${importItems.join(', ')} } from '${documentNodeFilePath(artifact)}'\n`,
      )
    } else {
      const variableDeclarations = transformData.importItems
        .map(({ name, alias }) => {
          if (!artifact[name]) throw new Error(`Could not find "${name}" in the artifact`)

          return `const ${alias} = ${JSON.stringify(artifact[name])}`
        })
        .join('\n')

      magicString.prepend(`${variableDeclarations}\n`)
    }
  }
  for (const { from, to } of transformData.codes) {
    magicString.replace(from, to)
  }

  return magicString
}
transform.optionsDefault = optionsDefault

export declare namespace transform {
  export type { Options, Artifact }
}
