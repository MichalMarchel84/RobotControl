package pl.marchel;

import com.pi4j.io.gpio.RaspiPin;

import java.util.Arrays;

public class RobotMotion implements Runnable{

    private Motor leftMotor = new Motor(RaspiPin.GPIO_24, RaspiPin.GPIO_25);
    private Motor rightMotor = new Motor(RaspiPin.GPIO_27, RaspiPin.GPIO_28);
    private final int[] motorCommands = new int[2];

    public void forward(){
        motorCommands[0]++;
        motorCommands[1]++;
    }

    public void reverse(){
        motorCommands[0]--;
        motorCommands[1]--;
    }

    public void left(){
        motorCommands[0]--;
        motorCommands[1]++;
    }

    public void right(){
        motorCommands[0]++;
        motorCommands[1]--;
    }

    @Override
    public void run() {
        setMotorCommand(leftMotor, motorCommands[0]);
        setMotorCommand(rightMotor, motorCommands[1]);
        Arrays.fill(motorCommands, 0);
    }

    private void setMotorCommand(Motor motor, int command){
        if(command == 0) motor.stop();
        else motor.start(command);
    }
}
