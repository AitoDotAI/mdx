import React from 'react'
import {transform} from 'buble'
import mdx from '@aitodotai/mdx-js-mdx'
import {MDXTag} from '@mdx-js/tag'

export default ({
  scope = {},
  components = {},
  mdPlugins = [],
  hastPlugins = [],
  mdxast,
  children,
  ...props
}) => {
  const fullScope = {
    MDXTag,
    components,
    props,
    ...scope
  }

  const compiler = mdx.createCompiler({
    mdPlugins,
    hastPlugins,
    skipExport: true,
    inputType: mdxast ? 'mdxast' : 'markdown'
  })

  let jsx
  if (mdxast) {
    const tree = compiler().runSync(mdxast)
    jsx = compiler.stringify(tree)
  } else {
    jsx = compiler.processSync({contents: children}).contents
  }

  const {code} = transform(jsx.trim())

  const keys = Object.keys(fullScope)
  const values = Object.values(fullScope)
  // eslint-disable-next-line no-new-func
  const fn = new Function(
    '_fn',
    'React',
    ...keys,
    `${code}

  return React.createElement(MDXContent, { components, ...props });`
  )

  return fn({}, React, ...values)
}
