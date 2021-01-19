require('dotenv').config();

const pro = require('./setup/Programmer.js');
const com = require('./setup/Compiler.js');
const dec = require('./setup/Decoder.js');

const args = require('./args.js');
if (args == -1) return

if (args.eeprom != -1) {
  pro.write(dec.getEEPROM(args.eeprom))
}

if (args.clear != -1) {
  const data = []
  for (let i = 0; i < 8192; i++) {
    data[i] = args.clear
  }
  pro.write(data)
}



if (args.compile) {
  const prog = com.compile(args.compile)
  if (prog == -1) return console.log('\nCOMPILATION FAILED!! :-(\n(amo na volta)\n');

  console.log(`Program length: ${prog.length} bytes`);
  console.log(`Par na volta tas fait an programma ca cumpila senza erur ;-)\n`);
  console.log(prog);
  pro.write(prog)
}
dec.getEEPROM(1);
console.log('Main exiting with no error\n');

/*
  -O --opcode 0..2
  -P --program
  -C --clear
*/

/*

*/

/*
call:

  push data
  push data
  test data
  mov data
  mov aluo

  1 + 4
  dec splo marl
  aluo spli
  decc spho marh
  aluo sphi
  data ram pcc
  dec splo marl
  aluo spli
  decc spho marh
  aluo sphi
  data ram pcc
  data test pcc
  data pch
  aluo pcl

  OR
  3 + 4
  PUSH PCL
  PUSH PCH
  CALL ADDR (JMP JMPL)

PUSH x:
  dec splo marl
  aluo spli
  decc spho marh
  aluo sphi
  xout ram pcc

POP x:
  inc splo
  aluo spli marl
  incc spho
  aluo sphi marh
  xin ramo

POP x 161:
  inc sp
  xin ramo


JMP:
  data pch

JMPL:
  data test pcc
  data pch
  aluo pcl

ret:

  dec splo
  aluo spli marl
  decc spho
  aluo sphi marh
  pcl ramo
  dec splo
  aluo spli marl
  decc spho
  aluo sphi marh
  pch ramo

ret cun 161:
  inc sp
  ramo pcl
  inc sp
  ramo pch

*/


/*
  sp = 0
  simple call =>
    [sp++] = retAddr
    pc = callAddr

    push / pop for locals

    pc = [sp--]
*/
