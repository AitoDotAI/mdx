const unified = require('unified')
const toMDAST = require('remark-parse')
const squeeze = require('remark-squeeze-paragraphs')
const toMDXAST = require('./md-ast-to-mdx-ast')
const mdxAstToMdxHast = require('./mdx-ast-to-mdx-hast')
const mdxHastToJsx = require('./mdx-hast-to-jsx')

const {
  isImport,
  isExport,
  isExportDefault,
  BLOCKS_REGEX,
  EMPTY_NEWLINE
} = require('./util')

const DEFAULT_OPTIONS = {
  footnotes: true,
  mdPlugins: [],
  hastPlugins: [],
  compilers: [],
  blocks: [BLOCKS_REGEX],
  inputType: 'markdown'
}

const tokenizeEsSyntax = (eat, value) => {
  const index = value.indexOf(EMPTY_NEWLINE)
  const subvalue = index !== -1 ? value.slice(0, index) : value

  if (isExport(subvalue)) {
    return eat(subvalue)({
      type: 'export',
      default: isExportDefault(subvalue),
      value: subvalue
    })
  }

  if (isImport(subvalue)) {
    return eat(subvalue)({type: 'import', value: subvalue})
  }
}

tokenizeEsSyntax.locator = (value, _fromIndex) => {
  return isExport(value) || isImport(value) ? -1 : 1
}

function esSyntax() {
  const Parser = this.Parser
  const tokenizers = Parser.prototype.blockTokenizers
  const methods = Parser.prototype.blockMethods

  tokenizers.esSyntax = tokenizeEsSyntax

  methods.splice(methods.indexOf('paragraph'), 0, 'esSyntax')
}

function createMdxAstCompiler(options) {
  const mdPlugins = options.mdPlugins

  const fn = unified()
  if (options.inputType === 'markdown') {
    // Parse to MDAST and tokenize only if the input is raw markdown
    fn.use(toMDAST, options).use(esSyntax)
  }

  fn.use(squeeze, options)

  mdPlugins.forEach(plugin => {
    // Handle [plugin, pluginOptions] syntax
    if (Array.isArray(plugin) && plugin.length > 1) {
      fn.use(plugin[0], plugin[1])
    } else {
      fn.use(plugin, options)
    }
  })

  fn.use(toMDXAST, options).use(mdxAstToMdxHast, options)

  return fn
}

function applyHastPluginsAndCompilers(compiler, options) {
  const hastPlugins = options.hastPlugins
  const compilers = options.compilers

  hastPlugins.forEach(plugin => {
    // Handle [plugin, pluginOptions] syntax
    if (Array.isArray(plugin) && plugin.length > 1) {
      compiler.use(plugin[0], plugin[1])
    } else {
      compiler.use(plugin, options)
    }
  })

  compiler.use(mdxHastToJsx, options)

  for (const compilerPlugin of compilers) {
    compiler.use(compilerPlugin, options)
  }

  return compiler
}

function createCompiler(options) {
  const opts = Object.assign({}, DEFAULT_OPTIONS, options)
  const compiler = createMdxAstCompiler(opts)
  const compilerWithPlugins = applyHastPluginsAndCompilers(compiler, opts)

  return compilerWithPlugins
}

function sync(mdx, options = {}) {
  const compiler = createCompiler(options)

  const fileOpts = {contents: mdx}
  if (options.filepath) {
    fileOpts.path = options.filepath
  }

  const {contents} = compiler.processSync(fileOpts)

  return contents
}

async function compile(mdx, options = {}) {
  const compiler = createCompiler(options)

  const fileOpts = {contents: mdx}
  if (options.filepath) {
    fileOpts.path = options.filepath
  }

  const {contents} = await compiler.process(fileOpts)

  return contents
}

compile.sync = sync
compile.createCompiler = createCompiler
compile.esSyntax = esSyntax

module.exports = compile
exports = compile
exports.sync = sync
exports.createMdxAstCompiler = createMdxAstCompiler
exports.default = compile
