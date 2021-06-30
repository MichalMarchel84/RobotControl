const LEFT_MOTOR_1 = 26;
const LEFT_MOTOR_2 = 19;
const RIGHT_MOTOR_1 = 20;
const RIGHT_MOTOR_2 = 16;
const SERVO_X = 13;
const SERVO_Y = 6;
const LIGHT = 12;

let config = [
    {
        "name": "Keyboard",
        "params": [
            {"name": "Forward", "value": "w"},
            {"name": "Reverse", "value": "s"},
            {"name": "Left", "value": "a"},
            {"name": "Right", "value": "d"},
            {"name": "Flashlight", "value": "t"}
        ]
    },
    {
        "name": "Mouse",
        "params": [
            {"name": "Sensitivity", "value": "2.0"},
            {"name": "Horizontal zero", "value": "0.5"},
            {"name": "Vertical zero", "value": "0.7"}
        ]
    }
]
let mouseActive = false;

const puppeteer = require('puppeteer-core');
let browser = null;
const resolve = require('path').resolve;
const url = "file://" + resolve('main.html');

launchNetwork();

async function launchNetwork() {
    console.log("Starting...");
    if (browser != null) {
        await browser.close();
        browser = null;
    }
    try {
        browser = await puppeteer.launch({
            executablePath: '/usr/bin/chromium-browser',
            headless: false,
            args:
                ['--use-fake-ui-for-media-stream',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--no-sandbox',
                    '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.exposeFunction('sendToCore', onMessage);
        await page.exposeFunction('logOnCore', onLog);
        await page.exposeFunction('setCoreConfig', (cfg) => {
            config = cfg;
            servoX.zeroPosition = parseFloat(config[1].params[1].value);
            servoY.zeroPosition = parseFloat(config[1].params[2].value);
        });
        await page.goto(url);
        await page.evaluate((cfg) => {
            coreConfig = cfg
        }, config);
    } catch (err) {
        console.log(err);
        setTimeout(launchNetwork, 5000);
    }
}

function onLog(value) {
    console.log(value);
}

function onMessage(msg) {
    switch (msg.type) {
        case "keys":
            handleKeys(msg.data);
            break;
        case "mouse":
            handleMouse(msg.data);
            break;
        case 'connected':
            mouseActive = false;
            servoX.moveToZero();
            servoY.moveToZero();
            break;
        case 'disconnected':
            servoX.moveToPosition(-1);
            servoY.moveToPosition(-1);
            light.turnOff();
    }
}

//---------Robot control code----------

const Gpio = require('pigpio').Gpio;

class Motor {

    constructor(pin1, pin2) {
        this.pin1 = new Gpio(pin1, {mode: Gpio.OUTPUT});
        this.pin2 = new Gpio(pin2, {mode: Gpio.OUTPUT});
        this.timer = null;
    }

    run(dir) {
        if (dir > 0) {
            clearTimeout(this.timer);
            this.pin1.digitalWrite(1);
            this.pin2.digitalWrite(0);
            this.timer = setTimeout(() => this.run(0), 1000);
        } else if (dir < 0) {
            clearTimeout(this.timer);
            this.pin1.digitalWrite(0);
            this.pin2.digitalWrite(1);
            this.timer = setTimeout(() => this.run(0), 1000);
        } else {
            clearTimeout(this.timer);
            this.pin1.digitalWrite(1);
            this.pin2.digitalWrite(1);
        }
    }
}

class Servo {

    constructor(pin, zeroPosition) {
        this.pin = new Gpio(pin, {mode: Gpio.OUTPUT});
        this.zeroPosition = zeroPosition;
        this.position = this.zeroPosition;
        this.signal = null;
        this.timer = null;
    }

    move(delta) {
        this.position += delta;
        if (this.position < 0) this.position = 0;
        else if (this.position > 1) this.position = 1;
        this.moveToPosition(this.position);
    }

    moveToPosition(position) {
        if (position > -1) {
            let val = Math.round(1000 + (1000 * position));
            if (this.signal == null) {
                this.pin.servoWrite(val);
                this.signal = val;
            } else {
                if (this.timer != null) clearInterval(this.timer);
                this.timer = setInterval(() => {
                    if (val > this.signal) {
                        this.signal += 1;
                        if (this.signal >= val) {
                            this.signal = val;
                            clearInterval(this.timer);
                        }
                    } else {
                        this.signal -= 1;
                        if (this.signal <= val) {
                            this.signal = val;
                            clearInterval(this.timer);
                        }
                    }
                    this.pin.servoWrite(this.signal);
                }, 2);
            }
        } else this.pin.servoWrite(0);
    }

    moveToZero() {
        this.position = this.zeroPosition;
        this.moveToPosition(this.position);
    }
}

class Light {

    constructor(pin) {
        this.pin = new Gpio(LIGHT, {mode: Gpio.OUTPUT});
        this.inhibit = false;
    }

    toggle() {
        if (!this.inhibit) {
            if (this.pin.digitalRead()) this.turnOff();
            else this.turnOn();
            this.inhibit = true;
            setTimeout(() => {
                this.inhibit = false;
            }, 500);
        }
    }

    turnOn() {
        this.pin.digitalWrite(1);
    }

    turnOff() {
        this.pin.digitalWrite(0);
    }
}

const leftMotor = new Motor(LEFT_MOTOR_1, LEFT_MOTOR_2);
const rightMotor = new Motor(RIGHT_MOTOR_1, RIGHT_MOTOR_2);
const servoX = new Servo(SERVO_X, parseFloat(config[1].params[1].value));
const servoY = new Servo(SERVO_Y, parseFloat(config[1].params[1].value));
const light = new Light(LIGHT);

function handleKeys(keys) {
    const command = [0, 0];
    let reverse = false;
    keys.forEach(key => {
        switch (key) {
            case config[0].params[0].value:
                command[0] += 1;
                command[1] += 1;
                break;
            case config[0].params[1].value:
                reverse = true;
                break;
            case config[0].params[2].value:
                command[0] -= 1;
                command[1] += 1;
                break;
            case config[0].params[3].value:
                command[0] += 1;
                command[1] -= 1;
                break;
            case config[0].params[4].value:
                light.toggle();
        }
    });
    if (reverse) {
        let temp = command[0];
        command[0] = command[1];
        command[1] = temp;
        command[0] -= 1;
        command[1] -= 1;
    }
    if (!mouseActive) {
        leftMotor.run(command[0]);
        rightMotor.run(command[1]);
    }
}

function handleMouse(mouse) {
    if (mouse[2]) {
        mouseActive = !mouseActive;
        if (!mouseActive) {
            servoX.moveToZero();
            servoY.moveToZero();
            setTimeout(() => {
                servoX.moveToPosition(-1);
                servoY.moveToPosition(-1);
            }, 500);
        } else {
            leftMotor.run(0);
            rightMotor.run(0);
        }
    } else if (mouseActive) {
        servoX.move(-mouse[0] * parseFloat(config[1].params[0].value));
        servoY.move(mouse[1] * parseFloat(config[1].params[0].value));
    }
}
