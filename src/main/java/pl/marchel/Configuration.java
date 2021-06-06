package pl.marchel;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import java.util.List;

@Data
public class Configuration {

    private String name;
    private List<ConfigParam> params;
    @JsonIgnore
    private Runnable target;

    public Configuration() {
    }

    public Configuration(String name, List<ConfigParam> params, Runnable target) {
        this.name = name;
        this.params = params;
        this.target = target;
    }
}
