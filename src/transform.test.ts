import { expect, test } from 'vitest'
import { transform } from './transform'

const code = `import { graphql } from './src/__generated__/gql'
import { FragmentType, useFragment } from './src/__generated__/'

const UserFragment = graphql(\`
  fragment UserFragment on User {
    id
    name
  }
\`)

graphql(\`
  fragment UserFirstNameFragment on User {
    firstName
  }
\`)

const Query = graphql(\`
  query UsersQuery {
    users {
      id
      ...UserFragment
    }
  }
\`)

const User = (props: { user: FragmentType<typeof UserFragment> }) => {
  const user = useFragment(UserFragment, props.user)
  return <div>{user.name}:{user.id}</div>
}

export const Users = () => {
  const { data } = useQuery(Query)
  return <div>{data.users.map(user => <User key={user.id} user={user} />)}
}
`

test('code transformation', () => {
  const expected = `import { UserFragmentFragmentDoc as _transformed_UserFragmentFragmentDoc, UsersQueryDocument as _transformed_UsersQueryDocument } from './src/__generated__/graphql'
import { graphql } from './src/__generated__/gql'
import { FragmentType, useFragment } from './src/__generated__/'

const UserFragment = _transformed_UserFragmentFragmentDoc



const Query = _transformed_UsersQueryDocument

const User = (props: { user: FragmentType<typeof UserFragment> }) => {
  const user = props.user
  return <div>{user.name}:{user.id}</div>
}

export const Users = () => {
  const { data } = useQuery(Query)
  return <div>{data.users.map(user => <User key={user.id} user={user} />)}
}
`

  expect(transform({ code, artifact: './src/__generated__' }).toString()).toBe(expected)
})

test('code transformation with DocumentNode dictionary', () => {
  const expected = `const _transformed_UserFragmentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFragment"}}]}
const _transformed_UsersQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UsersQuery"}}]}
import { graphql } from './src/__generated__/gql'
import { FragmentType, useFragment } from './src/__generated__/'

const UserFragment = _transformed_UserFragmentFragmentDoc



const Query = _transformed_UsersQueryDocument

const User = (props: { user: FragmentType<typeof UserFragment> }) => {
  const user = props.user
  return <div>{user.name}:{user.id}</div>
}

export const Users = () => {
  const { data } = useQuery(Query)
  return <div>{data.users.map(user => <User key={user.id} user={user} />)}
}
`

  const artifact = {
    UsersQueryDocument: {
      kind: 'Document',
      definitions: [
        {
          kind: 'OperationDefinition',
          operation: 'query',
          name: { kind: 'Name', value: 'UsersQuery' },
          /* ...snip ... */
        },
      ],
    },
    UserFragmentFragmentDoc: {
      kind: 'Document',
      definitions: [
        {
          kind: 'FragmentDefinition',
          name: { kind: 'Name', value: 'UserFragment' },
          /* ...snip ... */
        },
      ],
    },
    UserFirstNameFragmentFragmentDoc: {
      kind: 'Document',
      definitions: [
        {
          kind: 'FragmentDefinition',
          name: { kind: 'Name', value: 'UserFirstFragment' },
          /* ...snip ... */
        },
      ],
    },
  }

  expect(transform({ code, artifact }).toString()).toBe(expected)
})
