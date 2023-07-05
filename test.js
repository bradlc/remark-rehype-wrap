import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { remarkRehypeWrap } from './index.js'
import { remark } from 'remark'
import { rehype } from 'rehype'
import remarkMdx from 'remark-mdx'

async function processMdx(string, ...options) {
  return String(
    await remark()
      .use(remarkMdx)
      .use(remarkRehypeWrap, ...options)
      .process(string)
  ).trim()
}

async function processRehype(string, ...options) {
  return String(
    await rehype()
      .data('settings', { fragment: true })
      .use(remarkRehypeWrap, ...options)
      .process(string)
  ).trim()
}

test('mdx', async () => {
  let processed = await processMdx(`# Hello world`, {
    node: { type: 'mdxJsxFlowElement', name: 'Foo' },
    start: 'heading',
  })
  assert.equal(
    processed,
    `<Foo>
  # Hello world
</Foo>`
  )
})

test('rehype', async () => {
  let processed = await processRehype(`<h1>Hello world</h1>`, {
    node: { type: 'element', tagName: 'div' },
    start: 'element[tagName=h1]',
  })
  assert.equal(processed, '<div><h1>Hello world</h1></div>')
})

test('rehype nested', async () => {
  let processed = await processRehype(
    ['<h1>Hello world</h1>', '<p>Hello world</p>', '<p>Hello world</p>'].join('\n\n'),
    {
      node: { type: 'element', tagName: 'div' },
      start: 'element[tagName=h1]',
    },
    {
      node: { type: 'element', tagName: 'div' },
      start: { selector: 'element[tagName=h1]', inclusive: false },
    }
  )
  assert.equal(
    processed,
    ['<div><h1>Hello world</h1><div>', '<p>Hello world</p>', '<p>Hello world</p></div></div>'].join(
      '\n\n'
    )
  )
})

// test('steal props', async () => {
//   let processed = await processRehype(['<h1 id="intro">Hello world</h1>'].join('\n\n'), {
//     node: { type: 'element', tagName: 'div' },
//     start: 'element[tagName=h1]',
//     props: 'element[tagName=h1]',
//   })
//   assert.equal(processed, ['<div id="intro"><h1>Hello world</h1></div>'].join('\n\n'))
// })

test('transform', async () => {
  let processed = await processRehype(['<h1 id="intro">Hello world</h1>'].join('\n\n'), {
    node: { type: 'element', tagName: 'div' },
    start: 'element[tagName=h1]',
    transform: (node) => {
      // steal the properties from the `h1` and put them on the wrapper
      let heading = node.children[0]
      node.properties = heading.properties
      heading.properties = {}
      return node
    },
  })
  assert.equal(processed, ['<div id="intro"><h1>Hello world</h1></div>'].join('\n\n'))
})

test('no recursion', async () => {
  let processed = await processRehype(
    ['<p>Hello world</p>', '<p>Lorem ipsum</p>', '<div></div>'].join('\n\n'),
    {
      node: { type: 'element', tagName: 'div' },
      start: 'element[tagName=p]',
      end: 'element[tagName=div]',
    }
  )
  assert.equal(
    processed,
    ['<div><p>Hello world</p>', '<p>Lorem ipsum</p>', '</div><div></div>'].join('\n\n')
  )
})

test.run()
