const {assert} = require('../args.js');
const comment = /\/\/.*/g

/*
  delimeter
    (){}[]''
  keywords
  expression
    constant
    variable
    comparison
    operation
      +
      -
      *
*/

const operationLevels = [
  ['.', '->'],
  ['++', '--', '!', '~'],
  ['*', '/', '%'],
  ['+', '-'],
  ['<<', '>>'],
  ['<', '<=', '==', '!=', '>=', '>'],
  ['&'], ['^'], ['|'], ['&&'], ['||'],
  ['=', '+=', '-=', '*=', '/=', '<<=', '>>=', '&=', '^=', '|='],
  [',']
]

const keywords = ['if', 'else', 'while', 'hlt', 'push', 'pop', 'peek', 'poke', 'break', 'continue']
const registers = ['a', 'b']
const specials = ['SP', 'Z_FLAG', 'N_FLAG', 'V_FLAG', 'C_FLAG']
const delimeters = ['(', ')', '{', '}']

// r = operator on the right, l = operator on the left, b = binary
const opResolvers = []
function addResolver(to, res, constRes) {
  console.log(constRes);
  opResolvers.push({to, res, constRes})
}

function findResolver(operation, left, right) {
  for (let i = 0; i < opResolvers.length; i++) {
    const {to, res, sides, constRes} = opResolvers[i]

    if (operation.value == to) {
      if (left && left.type == 'expression' && right && right.type == 'expression') {
        if (left.expr == 'constant' && right.expr == 'constant') {
          return {
            line: operation.line,
            type: 'expression',
            expr: 'constant',
            value: constRes(left.value, right.value)
          }
        } else {
          return {
            line: operation.line,
            type: 'expression',
            expr: 'expr',
            to,
            res,
            left,
            right
          }
        }
      }
    }
  }
}

// addResolver('++', (l, r) => `inc ${r}`, 'r')
// addResolver('++', (l, r) => `inc ${l}`, 'l')
addResolver('*',  (l, r) => `mul ${l}, ${r}`, (l, r) => l * r)
addResolver('+',  (l, r) => `add ${l}, ${r}`, (l, r) => l + r)
addResolver('-',  (l, r) => `sub ${l}, ${r}`, (l, r) => l - r)
addResolver('=',  (l, r) => `mov ${l}, ${r}`, (l, r) => l = r)

module.exports = new class Transpiler {
  purify(source) {
    let line = 0

    return source.split('\n')
      .map(el => el.trim())
      .map(el => {
        const comm = el.match(comment, '')?.[0]
        el = el.replace(comm, '').trim()
        return {
          line: el,
          lineNum: line++,
          comment: comm
        }
      })
      .filter(el => el.line != '')
      .map(el => {
        el.line = el.line
          .replaceAll(/([\(\{\[\'])/g, ' $& ') // opening
          .replaceAll(/([\)\}\]\'])/g, ' $& ') // closing
          .replaceAll(/([\w\s])(\+\+|\-\-)/g, '$1 $2') // post
          .replaceAll(/(\+\+|\-\-)([\w\s])/g, ' $1 $2') // pre
          .replaceAll(/([\w\s])([=/*+\-^!<>~])([\w\s])/g, '$1 $2 $3') // one lenght binary operators
          .replaceAll(/([\w\s])(\+\+|\-\-|&&|\|\||==|>=|<=)([\w\s])/g, '$1 $2 $3') // 2+ lenght binary operators
          .replaceAll(/\s\s+/g, ' ')
          .trim()

        return el
      })
  }

  firstLook(token, line) {
    if (!Number.isNaN(Number(token))) {
      return {
        line,
        type: 'expression',
        expr: 'constant',
        value: Number(token)
      }
    }

    for (let i = 0; i < operationLevels.length; i++) {
      const ops = operationLevels[i]

      if (ops.includes(token)) {
        return {
          line,
          type: 'expression',
          expr: 'operator',
          level: i,
          value: token
        }
      }
    }

    if (keywords.includes(token)) {
      return {
        line,
        type: 'keyword',
        value: token
      }
    }

    if (specials.includes(token)) {
      return {
        type: 'expression',
        expr: 'special',
        value: token
      }
    }

    if (registers.includes(token)) {
      return {
        type: 'expression',
        expr: 'register',
        value: token
      }
    }

    if (delimeters.includes(token)) {
      return {
        type: 'delimeter',
        value: token
      }
    }

    assert(false, `Unexpected token: ${token}\n  at line: ${line}`)
  }

  secondLook(line) {
    for (let level = 0; level < operationLevels.length; level++) {
      for (let i = 1; i < line.length - 1; i++) {

        if (line[i].type == 'expression' && line[i].expr == 'operator' && line[i].level == level) {
          const newExpr = findResolver(line[i], line[i - 1], line[i + 1])
          line.splice(i - 1, 3, newExpr)
          i--
        }
      }
    }

    return line
  }

  tokenize(lines) {
    lines.forEach(line => {
      const first = []

      line.line.split(' ').forEach(token => {
        first.push(this.firstLook(token, line.lineNum))
      })

      const second = this.secondLook(first, line.lineNum)
      line.line = second

      console.log(second);
    })
  }

  transpile(source, verbose) {
    const pure = this.purify(source)
    const tokens = this.tokenize(pure)

    // console.log(tokens);

    return {
      type: 'fsm',
      data: source
    }
  }
}
