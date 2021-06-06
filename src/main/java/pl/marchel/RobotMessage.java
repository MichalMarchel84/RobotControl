package pl.marchel;

import lombok.Data;

@Data
public class RobotMessage {

    private String tag;
    private String value;

    public RobotMessage(String tag, String value) {
        this.tag = tag;
        this.value = value;
    }
}
