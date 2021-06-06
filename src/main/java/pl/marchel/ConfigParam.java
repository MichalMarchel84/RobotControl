package pl.marchel;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

@Data
public class ConfigParam {

    private String name;
    private String value;
    @JsonIgnore
    private Runnable function;

    public ConfigParam() {
    }

    public ConfigParam(String name, String value, Runnable function) {
        this.name = name;
        this.value = value;
        this.function = function;
    }
}
