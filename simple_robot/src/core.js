const LEFT_MOTOR_1 = 26;
const LEFT_MOTOR_2 = 19;
const RIGHT_MOTOR_1 = 20;
const RIGHT_MOTOR_2 = 16;

const puppeteer = require('puppeteer-core');
const resolve = require('path').resolve;
const url = "file://" + resolve('main.html');
let config = [
    {
        "name": "Keyboard",
        "params": [
            {"name": "Forward", "value": "w"},
            {"name": "Reverse", "value": "s"},
            {"name": "Left", "value": "a"},
            {"name": "Right", "value": "d"}
        ]
    }
]
launchNetwork();

async function launchNetwork() {
    console.log("Starting...");
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium-browser',
        headless: false,
        args:
            ['--use-fake-ui-for-media-stream',
            '--disable-extensions',
            '--disable-plugins']
    });
    const page = await browser.newPage();
    await page.exposeFunction('sendToCore', onMessage);
    await page.exposeFunction('logOnCore', onLog);
    await page.exposeFunction('setCoreConfig', (cfg) => {
        config = cfg
    });
    await page.goto(url);
    await page.evaluate((cfg) => {coreConfig = cfg}, config);
}

function onLog(value) {
    console.log(value);
}

function onMessage(msg) {
    switch (msg.type) {
        case "keys":
            handleKeys(msg.data);
            break;
    }
}

//---------Robot control code----------

const Gpio = require('onoff').Gpio;

class Motor {

    constructor(pin1, pin2) {
        this.pin1 = new Gpio(pin1, 'out');
        this.pin2 = new Gpio(pin2, 'out');
        this.timer = null;
    }

    run(dir) {
        if (dir > 0) {
            clearTimeout(this.timer);
            this.pin1.writeSync(1);
            this.pin2.writeSync(0);
            this.timer = setTimeout(() => this.run(0), 1000);
        } else if (dir < 0) {
            clearTimeout(this.timer);
            this.pin1.writeSync(0);
            this.pin2.writeSync(1);
            this.timer = setTimeout(() => this.run(0), 1000);
        } else {
            clearTimeout(this.timer);
            this.pin1.writeSync(1);
            this.pin2.writeSync(1);
        }
    }
}

const leftMotor = new Motor(LEFT_MOTOR_1, LEFT_MOTOR_2);
const rightMotor = new Motor(RIGHT_MOTOR_1, RIGHT_MOTOR_2);

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
        }
    });
    if (reverse) {
        let temp = command[0];
        command[0] = command[1];
        command[1] = temp;
        command[0] -= 1;
        command[1] -= 1;
    }
    leftMotor.run(command[0]);
    rightMotor.run(command[1]);
}
