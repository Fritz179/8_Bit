const fs = require('fs');
const arguments = []

const helpMsg = 'Use -H for more help.'
const numErr = 'Invalid argument type, number is required.'
const pathErr = 'Invalid argument path, valid path is required.'

function assert(condition, message) {
  if (!condition) {
    console.log(message);
    console.log(helpMsg);
    console.log('\nFailed argument parsing! Exiting early...');
    process.exit()
  }
}

function help() {
  console.log('How to use fritz:\n');
  parsers.forEach(parser => {
    console.log(`  -${parser[0]}, --${parser[1]}`);
    console.log(`    ${parser[4]}\n`);
  })
}

let version
const ver = () => console.log(`V${version}`)

const parsers = [
  ['H', 'help',    help, null, 'Show this page'],
  ['V', 'version', ver,  null, 'Display current version'],
]

module.exports = {
  parse: (options, realVersion) => {
    const out = {}

    parsers.push(...options)

    const args = process.argv.splice(2)
    assert(realVersion, 'Invalid version')
    version = realVersion

    while (args.length) {
      const com = args.splice(0, 1)[0].replaceAll('-', '')
      const parser = parsers.find(parser => parser[0] == com || parser[1] == com)

      assert(parser, `Invalid option: ${com}`)
      out[com] = parser[1]

      const callback = parser[2]
      const getArgIndex = parser[3]

      if (getArgIndex === null) {
        callback()
        continue
      }

      const getArg = arguments[getArgIndex]

      if (!args[0] || args[0][0] == '-') {
        getArg()
        callback()
        continue
      }

      const arg = getArg(args.splice(0, 1)[0])
      callback(arg)
    }

    return out
  },

  path: (req) => {
    return arguments.push(arg => {
      if (req === null && !arg) return
      assert(arg, pathErr)

      return arg
    }) - 1
  },

  num: (min, max) => {
    return arguments.push(arg => {
      if (min === null && !arg) return

      assert(arg, numErr)
      arg = Number(arg)

      assert(!Number.isNaN(arg), numErr)

      if (min || max) {
        assert(arg >= min && arg <= max, `Number must be beetwen ${min} and ${max}`)
      }

      return arg
    }) - 1
  },


  read: (file) => {
    assert(fs.existsSync(file), `File ${file} does not exits...`)

    if (file.match('.bin')) {
      return fs.readFileSync(file, 'binary')
    } else {
      const data = fs.readFileSync(file, 'utf8')
      return data.replaceAll(/(\r\n|\r|\n)/g, '\n')
    }
  },

  write: (path, data, type) => {
    if (type) path = path.replace(/\..*/, type)

    if (type == '.bin') {
      path = path.replace(/\..*/, '.bin')
      data = 'FASM_BIN'.split('').map(c => c.charCodeAt(0)).concat(data)
      return fs.writeFileSync(path, new Uint8Array(data), 'binary');
    }

    fs.writeFileSync(path, data, 'utf-8')
  },

  assert
}


// const args = process.argv.splice(2)
// const out = {eeprom: -1, clear: -1}
// let err = false
//
// function assert(condition, message) {
//   if (!condition) {
//     console.log('Failed argument parsing!');
//     console.log(message);
//     err = true
//   }
// }
//
// while (args.length) {
//   const [arg, val] = args.splice(0, 2)
//   const num = Number(val)
//
//   if (!Number.isNaN(num)) {
//     switch (arg) {
//       case '-E': case '--eeprom':
//         assert(val >= 0 && val <= 2, 'Eeprom must be beetwen 0 anb 2 inclusive')
//         out.eeprom = val
//         continue
//       break;
//     }
//   }
//
//   switch (arg) {
//     case '-Z': case '--zero':
//       args.unshift(val)
//       out.clear = 0
//       continue
//     break;
//     case '-C': case '--compile':
//       let data
//       try {
//         data = fs.readFileSync(val, 'utf8')
//       } catch (e) {
//         assert(false, `Invalid path: ${val}`)
//       }
//
//       out.compile = data
//       continue
//     break;
//   }
//
//   assert(false, `Unknown command: ${arg}`)
// }
//
// module.exports = err ? -1 : out
