package pl.marchel;

import java.util.ArrayList;
import java.util.List;

public class Timer implements Runnable{

    private final List<TimerListener> LISTENERS = new ArrayList<>();
    private boolean terminated = false;
    private long interval;

    public Timer(long interval) {
        this.interval = interval;
    }

    public void setTerminated(boolean terminated) {
        this.terminated = terminated;
    }

    public void addListener(TimerListener listener){
        LISTENERS.add(listener);
    }

    @Override
    public void run() {
        while (!terminated){
            try {
                Thread.sleep(interval);
            }catch (InterruptedException e){
                terminated = true;
                break;
            }
            LISTENERS.stream().forEach(TimerListener::onTimer);
        }
    }
}
