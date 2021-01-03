require('dotenv').config();

const pro = require('./setup/Programmer.js');
const com = require('./setup/Compiler.js');
const dev = require('./setup/Decoder.js');

pro.writeAt(0b1100000000011000, 0b00110000)
// console.log(com.toHex(51));
