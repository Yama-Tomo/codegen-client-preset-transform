import { parse as parseGql } from 'graphql'
import MagicString from 'magic-string'
import * as ts from 'typescript'

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
  transformData.importItems.push(
    `${operationOrFragmentName} as ${operationOrFragmentNameWithPrefix}`,
  )
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
    to: useFragmentSecondArg,
  })
}

type TransformData = {
  importItems: string[]
  codes: { from: string; to: string }[]
}

export type TransformOptions = {
  graphqlFunctionName?: string
  useFragmentFunctionName?: string
}

export const transformOptionsDefault = {
  graphqlFunctionName: 'graphql',
  useFragmentFunctionName: 'useFragment',
} satisfies TransformOptions

export const transform = (
  { code, artifactDirectory }: { code: string; artifactDirectory: string },
  optionsArg?: TransformOptions,
) => {
  const options = { ...transformOptionsDefault, ...optionsArg }
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
    magicString.prepend(
      `import { ${transformData.importItems.join(', ')} } from '${artifactDirectory}'\n`,
    )
  }
  for (const { from, to } of transformData.codes) {
    magicString.replace(from, to)
  }

  return magicString
}
