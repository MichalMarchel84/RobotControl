package pl.marchel;

import com.pi4j.io.gpio.*;

public class Motor implements TimerListener{

    private final GpioPinDigitalOutput CH1;
    private final GpioPinDigitalOutput CH2;
    private final Integer TIMEOUT = 10;
    private int timeoutCounter = 0;
    private static final Timer fallTimer = new Timer(100);
    private static final Thread fallTimerThread = new Thread(fallTimer);
    private final GpioController gpio = GpioFactory.getInstance();

    public Motor(Pin channel1, Pin channel2) {

        fallTimer.addListener(this);
        if(!fallTimerThread.isAlive()) fallTimerThread.start();
        CH1 = gpio.provisionDigitalOutputPin(channel1, "ch1", PinState.LOW);
        CH2 = gpio.provisionDigitalOutputPin(channel2, "ch2", PinState.LOW);
    }

    public synchronized void start(int dir){

        timeoutCounter = TIMEOUT;
        if(dir > 0) {
            CH1.high();
            CH2.low();
        }
        else if(dir < 0) {
            CH1.low();
            CH2.high();
        }
    }

    public synchronized void stop(){

        timeoutCounter = 0;
        CH1.high();
        CH2.high();
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
