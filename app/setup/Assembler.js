const {nameToInst, instToLen} = require('./Decoder.js');

const {assert} = require('../args.js');
const fileErr = '500 internal error: Invalid file?'
const validLine = /^\s*(\/\/|$)|\b(?<index>0x[0-9a-f]{4}), (?<inst>0x[0-9a-f]{2}):/
const comment = /\/\/.*/g
const validNumber = /0[xb][0-9a-fA-F]+|[0-9]+/

function assertLine(condition, message, line) {
  assert(condition, `Error: ${message}\n  On line: ${line}\n`)
}

function assertNum(num, message, line) {
  assertLine(typeof num == 'number', message, line)
}

module.exports = new class Assembler {
  tokenize({token, line, comment}) {
    const name = token.match(/.*:/)
    token = token.replace(/.*:\s*/, '')

    const jump = token.match(/^j\w+\s([a-zA-Z0-9]+)/)
    if (jump) token = token.replace(jump[1], '<to>')

    const number = token.match(validNumber)
    token = token.replace(validNumber, '<number>')

    assertLine(number <= 255, `Number larger than 255`, line)

    const out = { token, line, comment}

    if (number) out.number = Number(number[0])
    if (name) out.name = name[0].slice(0, name[0].length - 1)
    if (jump) out.jump = jump[1]

    return out
  }

  purify(prog) {
    let line = 0

    return prog.split('\n')
      .map(el => el
        .trim()
        .replace(/\s\s+/g, ' '))
      .map(el => {
        const comm = el.match(comment, '')?.[0]
        el = el.replace(comm, '').trim()
        return {
          token: el,
          line: line++,
          comment: comm
        }
      })
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
      curr.pos = pos

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

    return {
      type: 'token',
      data: tokens
    }
  }

  assemble(prog, verbose) {
    const pure = this.purify(prog)
    const code = this.resolve(pure)
    if (verbose) console.log(code);

    return this.convert(code, 'pretty')
  }

  convert(data, to) {
    if (data.type == to) return data

    if (data.type == 'token') {
      const tokens = data.data
      let out = ''

      const hex = (num = 0, len = 0) => num.toString(16).padStart(len, '0')
      const lineStart = (line, value, name = '') => {
        return name.padEnd(10, ' ') + `0x${hex(line, 4)}, 0x${hex(value, 2)}: `
      }

      tokens.forEach(({pos, token, inst, to, name, jump, comment, number}) => {
        if (name) name += ':'

        let line = lineStart(pos, inst, name) + token

        line = line.replace('<number>', `0x${hex(number)}`)
        line = line.replace('<to>', jump)

        if (comment) line = line.padEnd(40, ' ') + comment
        out += line + '\n'

        if (number) {
          out += lineStart(pos + 1, number) + '\n'
        }

        if (to >= 0) {
          out += lineStart(pos + 1, to)
          out += `(${to <= pos ? '-' : '+'}0x${hex(Math.abs(pos + 1 - to))})\n`
        }
      })

      return {
        type: 'pretty',
        data: out
      }
    }

    const out = []
    if (data.type == 'pretty') {
      data.data.split('\n').forEach((line, lineNum) => {
        const result = line.match(validLine)
        assert(result, fileErr)

        const {index, inst} = result.groups

        if (index || inst) {
          out[Number(index)] = Number(inst)
        }
      })

      // for (let i = 0; i < out.length; i++) {
      //   assert(out[i] >= 0, 'Hole in program :-)')
      // }

      return this.convert({
        type: 'eeprom',
        data: out
      }, to)
    }

    if (data.type == 'eeprom') {
      const out = []

      for (let i = 0; i < data.data.length; i++) {
        out[i] = data.data[i] || 0
      }

      return out
    }

    console.log(data, to);
    assert(false, fileErr)
  }

  validate(data) {
    if (data.indexOf('FASM_BIN') == 0) {
      return {
        type: 'eeprom',
        data: data.slice('FASM_BIN'.length).split('').map(c => c.charCodeAt(0))
      }
    }

    data.split('\n').forEach((line, lineNum) => {
      const valid = line.match(validLine)
      assert(valid, `Invalid line: ${lineNum},\n${line}\n`)
    })


    return {
      type: 'pretty',
      data
    }
  }
}
