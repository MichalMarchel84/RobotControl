package pl.marchel;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class App {

    public static void main(String[] args) {
        KeyHandler keyHandler = new KeyHandler();
        RobotMotion robotMotion = new RobotMotion();

        List<ConfigParam> keys = new ArrayList<>();
        keys.add(new ConfigParam("Forward", "w", robotMotion::forward));
        keys.add(new ConfigParam("Reverse", "s", robotMotion::reverse));
        keys.add(new ConfigParam("Left", "a", robotMotion::left));
        keys.add(new ConfigParam("Right", "d", robotMotion::right));
        Configuration keyboard = new Configuration("Movement controls", keys, robotMotion);
        keyHandler.setConfiguration(keyboard);

        List<Configurable> configurables = Arrays.asList(keyHandler);
        List<Executable> executables = Arrays.asList(keyHandler);

        new Thread(new Communicator(executables, configurables)).start();
    }
}
