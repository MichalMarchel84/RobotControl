package pl.marchel;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class KeyHandler implements Configurable, Executable{

    private final String tag = "keys";
    private final Map<String, Runnable> KEY_MAP = new HashMap<>();
    private Configuration configuration;

    public void addConfiguration(Configuration configuration){
        this.configuration = configuration;
        KEY_MAP.clear();
        for (ConfigParam param : configuration.getParams()){
            KEY_MAP.put(param.getValue(), param.getFunction());
        }
    }

    @Override
    public void setConfiguration(Configuration configuration) {
        List<ConfigParam> params = this.configuration.getParams();
        for (int i = 0; i < configuration.getParams().size(); i++) {
            ConfigParam previous = null;
            try {
                previous = params.get(i);
            }catch (Exception e){}
            ConfigParam current = configuration.getParams().get(i);
            if((previous != null) && (previous.getName().equals(current.getName()))){
                previous.setValue(current.getValue());
            }
        }
        KEY_MAP.clear();
        for (ConfigParam param : params){
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
