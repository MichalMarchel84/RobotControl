package pl.marchel;

import com.pi4j.io.gpio.*;

public class Motor implements TimerListener{

    private final GpioPinDigitalOutput DIR_PIN;
    private final GpioPinDigitalOutput DRIVE_PIN;
    private final Integer TIMEOUT = 10;
    private int timeoutCounter = 0;
    private static final Timer fallTimer = new Timer(100);
    private static final Thread fallTimerThread = new Thread(fallTimer);
    private final GpioController gpio = GpioFactory.getInstance();

    public Motor(Pin dirPin, Pin drivePin) {

        fallTimer.addListener(this);
        if(!fallTimerThread.isAlive()) fallTimerThread.start();
        DIR_PIN = gpio.provisionDigitalOutputPin(dirPin, "dir", PinState.LOW);
        DRIVE_PIN = gpio.provisionDigitalOutputPin(drivePin, "drive", PinState.LOW);
    }

    public synchronized void start(int dir){

        timeoutCounter = TIMEOUT;
        if(dir > 0) DIR_PIN.high();
        else if(dir < 0) DIR_PIN.low();
        DRIVE_PIN.high();
    }

    public synchronized void stop(){

        timeoutCounter = 0;
        DRIVE_PIN.low();
    }

    @Override
    public void onTimer() {
        if(timeoutCounter > 0) {
            synchronized (TIMEOUT) {
                timeoutCounter--;
            }
            if(timeoutCounter == 0) {
                stop();
            }
        }
    }
}
