package pl.marchel;

import java.util.HashMap;
import java.util.Map;

public class KeyBinder {

    private final Map<String, Runnable> KEY_MAP = new HashMap<>();

    public void bind(String key, Runnable function){
        KEY_MAP.put(key, function);
    }

    public void invoke(String key){
        if(KEY_MAP.containsKey(key)) KEY_MAP.get(key).run();
    }
}
