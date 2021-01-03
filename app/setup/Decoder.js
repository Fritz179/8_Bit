/*
  EEPROMS

  0: I/O high nibble(MARL, MARH, AI, BI, ALUI) low nibble(AO, BO, ALUO)
  1: Math (PCH, PCL, CIN, M, S0, S1, S2, S3)
  2: control (#NEXT, PCC)
*/
const opcodes = []
function defineOP(e0, e1, e2) {
 const i = opcodes.length

 opcodes[i] = [e0, e1, e2]

 return i
}

// xor all acive low at the end
const ALOW = defineOP(0, 0, 1 << 0)

const AO   = defineOP(0, 0, 0)
const BO   = defineOP(1, 0, 0)
const ALUO = defineOP(2, 0, 0)

const MARL = defineOP(0 << 4, 0, 0)
const MARH = defineOP(1 << 4, 0, 0)
const AI   = defineOP(2 << 4, 0, 0)
const BI   = defineOP(3 << 4, 0, 0)
const ALUI = defineOP(4 << 4, 0, 0)

const C = 1 << 2, M = 1<< 3, S0 = 1 << 4, S1 = 1 << 5, S2 = 1 << 6, S3 = 1 << 7
const ADDC = defineOP(0, S3 | S0, 0) // 0b10010000
const ADD  = defineOP(0, S3 | S0 | C, 0) // 0b10010100
const SUBB = defineOP(0, S2 | S1 | C, 0) // 0b01100100
const SUB  = defineOP(0, S3 | S0, 0) // 0b01100000
const DEC  = defineOP(0, S0 | S1 | S2 | S3 | C, 0)
const INC  = defineOP(0, 0, 0)
const AND  = defineOP(0, M | S3 | S1 | S0, 0)
const OR   = defineOP(0, M | S3 | S2 | S1, 0)
const XOR  = defineOP(0, M | S2 | S1, 0)
const XNOR = defineOP(0, M | S3 | S0, 0)
const NOR  = defineOP(0, M | S0, 0)
const NAND = defineOP(0, M | S2, 0)
const NOT  = defineOP(0, M, 0)
const SHRL = defineOP(0, S3 | S2 | C, 0)

const NEXT = defineOP(0, 0, 1 << 0)
const PCC  = defineOP(0, 0, 1 << 1)

// flags
const CF  = 1 << 1
const ZF  = 1 << 2
const VF  = 1 << 3
const NF  = 1 << 4

const NCF = CF | 1
const NZF = ZF | 1
const NVF = VF | 1
const NNF = NF | 1

const CLK1 = 1 << 8
const CLK2 = 1 << 9
const CLK3 = 1 << 11
const CFB  = 1 << 10
const ZFB  = 1 << 12
const VFB  = 1 << 7
const NFB  = 1 << 6

/*
  INSTRUCTIONS
  step 0-6 (7 = RESET)
*/

const nameToInst = new Map()
const instToName = []
const instToOpcode = []
function defineIN(name, cycles, flags = []) {

  // after last cycle, reset T
  cycles[cycles.length - 1].push(NEXT, PCC)
  cycles = cycles.map((cycle, i) => {
    let opcode = [0, 0, 0]

    // invert active lows
    cycle.push(ALOW)

    // combine all parts to form complete opcode
    cycle.forEach(part => {
      opcode = opcode.map((old, j) => old ^ opcodes[part][j])
    })

    return opcode
  })

  const i = instToOpcode.length
  nameToInst.set(name, i)
  instToName[i] = name
  instToOpcode[i] = [cycles, flags]
}

const registers = [[[AO, AI], 'a'], [[BO, BI], 'b']]
registers.forEach(([[ao, ai], aName]) => {
  registers.forEach(([[bo, bi], bName]) => {
    if (aName != bName) {
      defineIN(`mov ${aName},${bName}`, [[ai, bo]])

      // ;[ADD, 'add'].forEach(([opCode, opName]) => {
      //   if (inName == 'b' || outName == 'b') {
      //     defineIN(`${opName} ${inName},${outName}`, [
      //       [inCode, outCode],
      //       [inCode, outCode]
      //     ])
      //   } else {
      //
      //   }
      // })

      // const binaryOps = [[ADD, 'add'], [SUB, 'sub']].forEach(([op, opName]) => {
      //   defineIN(`${opName} ${aName}`, [
      //     [ao, op],
      //     [ALUO, ai]
      //   ])
      // })
    }
  })

  const unaryOps = [[INC, 'inc'], [DEC, 'dec'], [SHRL, 'shrl'], [NOT, 'not']].forEach(([op, opName]) => {
    defineIN(`${opName} ${aName}`, [
      [ao, op],
      [ALUO, ai]
    ])
  })

  defineIN(`clear ${aName}`, [[ai]])
})

module.exports = new class Decoder {
  constructor() {
    // this.printInst()
    this.getEEPROM(0)
  }

  printInst() {
    nameToInst.forEach((inst, name) => {
      console.log(this.toHex(inst, 2), name, instToOpcode[inst]);
    })
  }

  toHex(num, padding = 1) {
    let hex = num.toString(16)
    while (hex.length < padding) {
      hex = '0' + hex
    }
    return '0x' + hex
  }

  getEEPROM(num) {
    const data = []

    for (let i = 0; i < 8192; i++) {
      const inst = i & 0xff
      const clk = (!!(i & CLK1) << 0) + (!!(i & CLK2) << 1) + (!!(i & CLK3) << 2)

      const opcode = instToOpcode[inst]
      if (opcode && !(i & (1 << 10)) && !(i & (1 << 12))) {
        const cycle = opcode[0][clk]
        if (cycle) {
          console.log(this.toHex(inst, 2), instToName[inst], i, clk, cycle);
          data.push(cycle[0])
        }
      } else {
        data.push(0)
      }
    }

    console.log(data);
  }
}
