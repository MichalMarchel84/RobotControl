package pl.marchel;

import lombok.Data;

@Data
public class ControlMessage {

    private String type;
    private String[] data;
}
