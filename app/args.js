const fs = require('fs');

const args = process.argv.splice(2)
const out = {eeprom: -1, clear: -1}
let err = false

function assert(condition, message) {
  if (!condition) {
    console.log('Failed argument parsing!');
    console.log(message);
    err = true
  }
}

while (args.length) {
  const [arg, val] = args.splice(0, 2)
  const num = Number(val)

  if (!Number.isNaN(num)) {
    switch (arg) {
      case '-E': case '--eeprom':
        assert(val >= 0 && val <= 2, 'Eeprom must be beetwen 0 anb 2 inclusive')
        out.eeprom = val
        continue
      break;
    }
  }

  switch (arg) {
    case '-Z': case '--zero':
      args.unshift(val)
      out.clear = 0
      continue
    break;
    case '-C': case '--compile':
      let data
      try {
        data = fs.readFileSync(val, 'utf8')
      } catch (e) {
        assert(false, `Invalid path: ${val}`)
      }

      out.compile = data
      continue
    break;
  }

  assert(false, `Unknown command: ${arg}`)
}

module.exports = err ? -1 : out
