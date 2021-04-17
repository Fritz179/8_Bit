/*
  EEPROMS

  0: I/O high nibble(MARL, MARH, AI, BI, ALUI, SPLI, SPHI, RAMI) low nibble(AO, BO, ALUO, RAMO, PRAM, SPLO, SPHO)
  1: Math (PCH, PCL, CIN, M, S0, S1, S2, S3)
  2: control (#NEXT, PCC, SPC)
*/
const opcodes = []
function defineOP(e0, e1, e2) {
 const i = opcodes.length

 opcodes[i] = [e0, e1, e2]

 return i
}

// xor all acive low at the end
const ALOW = defineOP(0b11111111, 0b00000011, 0b00000001)

const AO   = defineOP((0b0000 ^ 15), 0, 0) // 0b1234
const BO   = defineOP((0b1000 ^ 15), 0, 0)
const ALUO = defineOP((0b0100 ^ 15), 0, 0)
const RAMO = defineOP((0b1100 ^ 15), 0, 0)
const PRAM = defineOP((0b0010 ^ 15), 0, 0)
const SPLO = defineOP((0b1010 ^ 15), 0, 0)
const SPHO = defineOP((0b0110 ^ 15), 0, 0)
const NOO  = defineOP((0b1111 ^ 15), 0, 0)

const MARL = defineOP((0b0000 ^ 15) << 4, 0, 0) // 0b1234
const MARH = defineOP((0b1000 ^ 15) << 4, 0, 0)
const AI   = defineOP((0b0100 ^ 15) << 4, 0, 0)
const BI   = defineOP((0b1100 ^ 15) << 4, 0, 0)
const ALUI = defineOP((0b0010 ^ 15) << 4, 0, 0)
const SPLI = defineOP((0b1010 ^ 15) << 4, 0, 0)
const SPHI = defineOP((0b0110 ^ 15) << 4, 0, 0)
const RAMI = defineOP((0b1110 ^ 15) << 4, 0, 0)
const NOI  = defineOP((0b1111 ^ 15) << 4, 0, 0)

const PCH  = defineOP(0, 1, 0)
const PCL  = defineOP(0, 2, 0)

const C = 1 << 2, M = 1 << 3, S0 = 1 << 4, S1 = 1 << 5, S2 = 1 << 6, S3 = 1 << 7
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
const SHL = defineOP(0, S3 | S2 | C, 0)

const NEXT = defineOP(0, 0, 1 << 0)
const PCC  = defineOP(0, 0, 1 << 1)

// flags
const ZF  = 1 << 0
const NF  = 1 << 1
const VF  = 1 << 2
const CF  = 1 << 3
const ALF = 0b1000 // Carry active low

const CLK1 = 1 << 8
const CLK2 = 1 << 9
const CLK3 = 1 << 11
const ZFB  = 1 << 12
const NFB  = 1 << 6
const VFB  = 1 << 7
const CFB  = 1 << 10

/*
  INSTRUCTIONS
  step 0-6 (7 = RESET)
*/

function compressOPS(cycle) {
  let opcode = [0, 0, 0]

  // invert active lows
  cycle.push(ALOW)

  // combine all parts to form complete opcode (j == eepromNUM)
  cycle.forEach(part => {
    opcode = opcode.map((old, j) => old ^ opcodes[part][j])
  })

  return opcode
}

function getLen(cycles) {
  let out = 0

  for (let i = 0; i < cycles.length; i++) {
    if (cycles[i][2] & opcodes[PCC][2]) out++
  }

  return out
}

const nameToInst = new Map()
const instToName = []
const instToOpcode = []
const instToLen = []

function defineIN(name, cycles) {
  const flagged = []
  let len = 0

  if (typeof cycles == 'function') {
    for (let i = 0; i < 16; i++) {
      const flagCycle = cycles(!!(i & ZF), !!(i & NF), !!(i & VF), !!(i & CF))

      // after last cycle, reset T
      flagCycle[flagCycle.length - 1].push(NEXT, PCC)

      flagged[i] = flagCycle.map(compressOPS)

      const newLen = getLen(flagged[i])
      if (newLen > len) len = newLen
    }
  } else {
    cycles[cycles.length - 1].push(NEXT, PCC)
    const comp = cycles.map(compressOPS)
    len = getLen(comp)
    for (let i = 0; i < 16; i++) {
      flagged[i] = comp
    }
  }

  const i = instToOpcode.length
  nameToInst.set(name, i)
  instToName[i] = name
  instToOpcode[i] = flagged
  instToLen[i] = len
}

// 0 - 63 2msb = 0 => ALUI
const registers = [[[AO, AI], 'a'], [[BO, BI], 'b']]
registers.forEach(([[rOut, rIn], rName]) => {
  const unaryOps = [[INC, 'inc'], [DEC, 'dec'], [SHL, 'shl'], [NOT, 'not']].forEach(([op, opName]) => {
    defineIN(`${opName} ${rName}`, [
      [rOut, op, ALUI],
      [ALUO, rIn]
    ])
  })
})

// JUMPS
const decide = jump => [jump ? [PRAM, PCC, PCL] : [PRAM, PCC], []]

defineIN('jmp <to>', decide(true))
const flags = ['z', 'n', 'v', 'c'].forEach((flag, i) => {
  [true, false].forEach(bool => {
    defineIN(`j${bool ? '' : 'n'}${flag} <to>`, (...condition) => {
      return decide(condition[i] == bool)
    })
  })
})

// END ALU
if (instToOpcode.length >= 0x40) console.log('Too many alu instructions');
instToOpcode.length = 0x40

// ops on reg
registers.forEach(([[ao, ai], aName]) => {
  registers.forEach(([[bo, bi], bName]) => {
    if (aName != bName) {
      defineIN(`mov ${aName}, ${bName}`, [[ai, bo]])
    }
  })

  defineIN(`clr ${aName}`, [[ai]])
  defineIN(`mov ${aName}, <number>`, [[ai, PRAM, PCC], []])
})

function extractFlags(num, ...flags) {
  let flag = 0

  for (let i = 0; i < flags.length; i++) {
    flag |= num & flags[i] ? 1 << i : 0
  }

  return flag
}

module.exports = new class Decoder {
  constructor() {
    this.nameToInst = nameToInst
    this.instToName = instToName
    this.instToOpcode = instToOpcode
    this.instToLen = instToLen
  }

  printInst() {
    nameToInst.forEach((inst, name) => {
      console.log('0x' + inst.toString(16).padEnd(3), '0b' + inst.toString(2).padStart(8, '0'), name);
    })
  }

  getEEPROM(num) {
    const data = []

    for (let i = 0; i < 8192; i++) {
      const inst = i & (num == 1 ? 0x3f : 0xff)
      let clk = extractFlags(i, CLK1, CLK2, CLK3)

      if (clk == 0) {
        data[i] = compressOPS([NEXT, PCC])[num]
        continue
      }

      clk--

      if (!instToOpcode[inst]) {
        data[i] = compressOPS([])[num] // TODO: HLT? NOP
        continue
      }

      const flags = extractFlags(i, ZFB, NFB, VFB, CFB) ^ ALF

      const cycle = instToOpcode[inst][flags][clk]

      data[i] = (cycle ? cycle : compressOPS([]))[num]
    }

    return {
      type: 'eeprom',
      data
    }
  }
}
