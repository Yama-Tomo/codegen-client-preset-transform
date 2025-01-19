# codegen-client-preset-transform

Transform the code of a project that uses [client-preset](https://the-guild.dev/graphql/codegen/plugins/presets/preset-client) into a tree-shakeable code.

# Usage
## Vanilla JS
```typescript
import { transform } from '@yamatomo/codegen-client-preset-transform'

const transformedCode = transform({
  code: `... your code ...`,
  artifactDirectory: './path/to/graphql'
}).toString()
```

## vite
```typescript
import { defineConfig } from 'vite'
import { vitePlugin } from '@yamatomo/codegen-client-preset-transform'

export default defineConfig({
  plugins: [
    vitePlugin({ artifactDirectory: './path/to/graphql' })
  ]
})
```
