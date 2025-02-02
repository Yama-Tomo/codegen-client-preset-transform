# codegen-client-preset-transform

Transform the code of a project that uses [client-preset](https://the-guild.dev/graphql/codegen/plugins/presets/preset-client) into a tree-shakeable code.

# Usage
## Vanilla JS
```typescript
import { transform } from '@yamatomo/codegen-client-preset-transform'

const transformedCode = transform({
  code: `... your code ...`,
  // Pass the path to the code generation directory.
  artifact: './path/to/'
}).toString()
```

Alternatively, a `DocumentNode` dictionary can be passed.

```typescript
import { transform } from '@yamatomo/codegen-client-preset-transform'
import documentNodeDict from './path/to/graphql'

const transformedCode = transform({
  code: `... your code ...`,
  artifact: documentNodeDict
}).toString()
```

## vite
```typescript
import { defineConfig } from 'vite'
import { vitePlugin as codegenClientPresetTransform } from '@yamatomo/codegen-client-preset-transform'

export default defineConfig({
  plugins: [
    codegenClientPresetTransform({ artifactDirectory: './path/to/' })
  ]
})
```
