package pl.marchel;

import java.util.HashMap;
import java.util.Map;

public class KeyHandler implements Configurable, Executable{

    private final String tag = "keys";
    private final Map<String, Runnable> KEY_MAP = new HashMap<>();
    private Configuration configuration;

    @Override
    public void setConfiguration(Configuration configuration) {
        this.configuration = configuration;
        KEY_MAP.clear();
        for (ConfigParam param : configuration.getParams()){
            KEY_MAP.put(param.getValue(), param.getFunction());
        }
    }

    @Override
    public Configuration getConfiguration() {
        return configuration;
    }

    @Override
    public void execute(String[] command) {
        for (String key : command){
            if(KEY_MAP.containsKey(key)) KEY_MAP.get(key).run();
        }
        if(configuration.getTarget() != null) configuration.getTarget().run();
    }

    @Override
    public String getTag() {
        return tag;
    }
}
