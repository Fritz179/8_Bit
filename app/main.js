require('dotenv').config();

const version = '1.1.0'
const {parse, num, path, assert, read, write} = require('./args.js')

const pro = require('./setup/Programmer.js');
const trn = require('./setup/Transpiler.js');
const com = require('./setup/Compiler.js');
const dec = require('./setup/Decoder.js');

const dataErr = 'Cannot use -CEL together.'
const noDataErr = 'No program loaded, use one of -CEL.'
const binError = 'Cannot use binary (.bin) data.'
let data, outPath, verbose = false

parse([
	['T', 'tokens',  verb,    null,       'Log compilation tokens, use before -C or -F'],
	['F', 'fritz',   fritz,   path(),     'Transpile f sourcode to fsm, path is required'],
	['C', 'compile', compile, path(),     'Compile fsm sourcecode into executable, path is required unless -F is used'],
	['E', 'eeprom',  eeprom,  num(0, 2),  'Get opcode decoders data, select beetwen EEPROM 0-2'],
	['L', 'load',    load,    path(),     'Load and write a program already compiled (.fritz / .bin), path is required'],
	['P', 'program', program, null,       'Use the EEPROM programmer, available only on Raspy'],
	['Z', 'zero',    zero,    num(null),  'Erase the eeprom, available only on Raspy, can choose beetwen 1s and 0s'],
  ['B', 'bin',     bin,     path(null), 'Write the binary (.bin) to disk, use with -O'],
	['O', 'output',  output,  path(null), 'Write the program (.fritz / .bin) to disk, path is optional'],
	['I', 'inst',    inst,    null,       'Log all the available fsm instructions']
], version)

/*
	F => .f to .fsm
*/

function verb() {
	verbose = true
}

function fritz(path) {
	assert(!data, dataErr)

	const src = read(path)

	data = trn.transpile(src)

	// console.log(data);
}

function compile(path) {
	assert(!data, dataErr) // TODO: check if is't fsm

	const src = read(path, __dirname + '/programs/')

	data = com.compile(src, verbose)

	console.log(data.data, '\n');
  console.log(`Program length: ${data.data.length} bytes`);
  console.log(`Par na volta tas fait an programma ca cumpila senza erur ;-)\n`);

	outPath = path
}

function eeprom(num) {
	assert(!data, dataErr)
	data = dec.getEEPROM(num)
}

function load(path) {
	assert(!data, dataErr)
  data = com.validate(read(path))
  outPath = path

  const out = com.convert(data, 'eeprom')
	pro.write(out.data)
}

function program() {
	assert(data, noDataErr)
  const out = com.convert(data, 'eeprom')
  pro.write(out.data)
}

function zero(num = 0) {
  const data = []
  for (let i = 0; i < 8192; i++) {
    data[i] = num ? 1 : 0
  }

  pro.write(data)
}

function output(path) {
	if (!path) path = outPath
	assert(data, noDataErr)
	write(path, data.data, '.asm')
}

function bin(path) {
	if (!path) path = outPath
	assert(data, noDataErr)
	const out = com.convert(data, 'bin')
  write(path, out, '.bin')
}

function inst() {
	dec.printInst()
}
