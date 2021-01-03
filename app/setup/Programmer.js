module.exports = new class EEPROM {
  constructor() {
    this.isLinux = process.platform == 'linux'

    if (this.isLinux) {
      console.log('On linux, loading GPIO');
      const Gpio = require('pigpio').Gpio

      this.dataPin = new Gpio(15, {mode: Gpio.OUTPUT})
      this.clockPin = new Gpio(14, {mode: Gpio.OUTPUT})
      this.writePin = new Gpio(18, {mode: Gpio.OUTPUT})

      this.dataPin.digitalWrite(0)
      this.clockPin.digitalWrite(0)
      this.writePin.digitalWrite(1) // active low
    } else {
      console.log(`On ${process.platform}, GPIO not available :-(`);
    }
  }

  async write(data) {
    for (let i = 0; i < data.length; i++) {
      await this.writeAt(i, data[i])
    }
  }

  async clock() {

  }

  async writeAt(index, data) {
    if (!this.isLinux) return console.log('Not on Rapsy...');
    const low =  (index & 0x00ff) >> 0
    const high = (index & 0xff00) >> 8
    console.log(low, high, data);
    await this.shift(low)
    await this.shift(high)
    await this.shift(data)
    await this.set(this.writePin, 0)
    await this.set(this.writePin, 1)
  }

  async shift(data) {
    for (let i = 8; i > 0; i--) {
      const level = data & (1 << i)
      await this.set(this.dataPin, level ? 1 : 0)
      await this.set(this.clockPin, 1)
      await this.set(this.clockPin, 0)
    }
  }

  async set(pin, to) {
    pin.digitalWrite(to)
    return new Promise(solve => setTimeout(solve, 20))
  }
}
