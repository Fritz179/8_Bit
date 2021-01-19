module.exports = new class EEPROM {
  constructor() {
    this.isLinux = process.platform == 'linux'

    if (this.isLinux) {
      console.log('On linux, loading GPIO\n');
      const Gpio = require('pigpio').Gpio

      this.dataPin = new Gpio(15, {mode: Gpio.OUTPUT})
      this.clockPin = new Gpio(14, {mode: Gpio.OUTPUT})
      this.writePin = new Gpio(18, {mode: Gpio.OUTPUT})

      this.dataPin.digitalWrite(0)
      this.clockPin.digitalWrite(0)
      this.writePin.digitalWrite(1) // active low
    } else {
      console.log(`On ${process.platform}, GPIO not available :-(\n`);
    }
  }

  async write(data) {
    if (!this.isLinux) return console.log('Not on Rapsy...');

    let prev = 0
    for (let i = 0; i < data.length; i++) {
      const curr = Math.floor(i / data.length * 100)

      if (curr > prev) {
        prev = curr
        console.log(`Loading: ${curr}%`);
      }
      await this.writeAt(i, data[i])
    }

    console.log('loaded 100%!\n');
  }

  async writeAt(index, data) {
    // console.log(index, data);
    // if (!data) return

    if (!this.isLinux) return console.log('Not on Rapsy...');
    const low =  (index & 0x00ff) >> 0
    const high = (index & 0xff00) >> 8

    await this.shift(data)
    await this.shift(low)
    await this.shift(high)
    await this.clock(100)
    await this.set(this.writePin, 0)
    await this.set(this.writePin, 1)
    await this.set(this.dataPin, 0)
  }

  async shift(data) {
    for (let i = 0; i < 8; i++) {
      const level = data & (1 << i)
      await this.set(this.dataPin, level ? 1 : 0, 1)
      await this.clock()
    }
  }

  async clock(time = 10) {
    await this.set(this.clockPin, 1, time)
    await this.set(this.clockPin, 0, time)
  }

  async set(pin, to, time = 100) {
    pin.digitalWrite(to)
    this.wait(time)
  }

  wait(time) { // microseconds
    const end = process.hrtime.bigint() + BigInt(time) * 1000n

    while (process.hrtime.bigint() < end) {
    }

    return
  }
}
