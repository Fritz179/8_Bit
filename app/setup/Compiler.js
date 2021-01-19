const {nameToInst, instToLen} = require('./Decoder.js');

let err = false
function assert(condition, message, line) {
  if (!condition) {
    console.log(message);
    console.log('  On line: ', line);
    err = true
  }
}

function assertNum(num, message, line) {
  assert(typeof num == 'number', message, line)
}

module.exports = new class Compiler {
  tokenize({token, line}) {
    const name = token.match(/.*:/)
    token = token.replace(/.*:\s*/, '')

    const jump = token.match(/^j\w+\s([a-zA-Z]+)/)
    if (jump) token = token.replace(jump[1], '<to>')

    const number = token.match(/[0-9]+/)
    token = token.replace(/[0-9]+/, '<to>')

    const out = { token, line }

    if (number) out.to = Number(number[0])
    if (name) out.name = name[0].slice(0, name[0].length - 1)
    if (jump) out.jump = jump[1]

    return out
  }

  purify(prog) {
    let line = 0

    return prog.split('\n')
      .map(el => el
        .replace(/\/\/.*/g, '')
        .trim()
        .replace(/\s\s+/g, ' '))
      .map(el => { return {token: el, line: line++}})
      .filter(el => el.token != '')
      .map(token => this.tokenize(token))
  }

  resolve(tokens) {
    const resolver = {}
    let pos = 0

    for (let i = 0; i < tokens.length; i++) {
      const curr = tokens[i]

      if (curr.name) {
        resolver[curr.name] = pos
      }

      const inst = nameToInst.get(curr.token)
      assertNum(inst, `invalid instruction: ${curr.token}`, curr.line)

      curr.inst = inst
      pos += instToLen[inst]
    }

    for (let i = 0; i < tokens.length; i++) {
      const curr = tokens[i]

      if (curr.jump) {
        const to = resolver[curr.jump]
        assertNum(to, `Cannot resolve name: ${curr.jump}`, curr.line)

        curr.to = to
      }
    }

    return tokens
  }

  convert(code) {
    const out = []

    for (let i = 0; i < code.length; i++) {
      const {inst, to} = code[i]
      out.push(inst)
      if (to) out.push(to)
    }

    return out
  }

  compile(prog) {
    const pure = this.purify(prog)
    const code = this.resolve(pure)

    if (err) return -1

    return this.convert(code)
  }


  toHex(num) {
    return `0x${num.toString(16)}`
  }
}
