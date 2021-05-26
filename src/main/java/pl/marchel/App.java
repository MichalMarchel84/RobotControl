package pl.marchel;

public class App {

    public static void main(String[] args) {
        KeyBinder keyBinder = new KeyBinder();
        RobotMotion robotMotion = new RobotMotion();
        keyBinder.bind("w", robotMotion::forward);
        keyBinder.bind("s", robotMotion::reverse);
        keyBinder.bind("a", robotMotion::left);
        keyBinder.bind("d", robotMotion::right);

        new Thread(new Communicator(keyBinder, robotMotion)).start();
    }
}
