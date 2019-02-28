import React from 'react'
import {renderToString as render} from 'react-dom/server'
import mdxLib from '@mdx-js/mdx'
import remark from 'remark'
import slug from 'remark-slug'
import autolinkHeadings from 'remark-autolink-headings'
import addClasses from 'rehype-add-classes'

import MDX from '../src'

const components = {
  h1: props => <h1 style={{color: 'tomato'}} {...props} />
}

const scope = {
  Foo: _props => <div>Foobarbaz</div>
}

const mdx = `
# Hello, world

<Foo />
`

const defaultLayoutMdxast = remark()
  .use(mdxLib.esSyntax)
  .parse(mdx)

const mdxLayout = `
# Hello, world

<Foo />

export default ({ children, id }) => <div id={id}>{children}</div>
`

const customLayoutMdxast = remark()
  .use(mdxLib.esSyntax)
  .parse(mdxLayout)

describe('renders MDX with the proper components', () => {
  it('default layout', () => {
    const result = render(
      <MDX components={components} scope={scope} children={mdx} />
    )

    expect(result).toMatch(/style="color:tomato"/)
    expect(result).toMatch(/Foobarbaz/)
  })

  it('default layout as mdxast', () => {
    const result = render(
      <MDX components={components} scope={scope} mdxast={defaultLayoutMdxast} />
    )

    expect(result).toMatch(/style="color:tomato"/)
    expect(result).toMatch(/Foobarbaz/)
  })

  it('custom layout', () => {
    const result = render(
      <MDX
        components={components}
        scope={scope}
        children={mdxLayout}
        id="layout"
      />
    )

    expect(result).toMatch(/style="color:tomato"/)
    expect(result).toMatch(/Foobarbaz/)
    expect(result).toMatch(/id="layout"/)
  })

  it('custom layout as mdxast', () => {
    const result = render(
      <MDX
        components={components}
        scope={scope}
        mdxast={customLayoutMdxast}
        id="layout"
      />
    )

    expect(result).toMatch(/style="color:tomato"/)
    expect(result).toMatch(/Foobarbaz/)
    expect(result).toMatch(/id="layout"/)
  })
})

it('supports remark and rehype plugins', () => {
  const result = render(
    <MDX
      mdPlugins={[slug, autolinkHeadings]}
      hastPlugins={[[addClasses, {h1: 'title'}]]}
      components={components}
      scope={scope}
      children={mdx}
    />
  )

  expect(result).toContain(`id="hello-world"`)
  expect(result).toContain('class="title"')
})
