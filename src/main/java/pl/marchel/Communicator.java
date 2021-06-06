package pl.marchel;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class Communicator implements Runnable {

    private static final InputStream in = System.in;
    private static final OutputStream out = System.out;
    private boolean terminated = false;
    private final Map<String, Executable> COMMAND_LISTENERS;
    private final Map<String, Configurable> CONFIGURATIONS;
    private static final ObjectMapper mapper = new ObjectMapper();

    public Communicator(List<Executable> commandListeners, List<Configurable> configurations) {
        mapper.enable(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY);
        COMMAND_LISTENERS = new HashMap<>();
        for (Executable executable : commandListeners) {
            COMMAND_LISTENERS.put(executable.getTag(), executable);
        }
        CONFIGURATIONS = new HashMap();
        for (Configurable configurable : configurations){
            CONFIGURATIONS.put(configurable.getConfiguration().getName(), configurable);
        }
        sendConfig();
    }

    private void receiver() {
        while (!terminated) {
            try {
                if (in.available() >= 4) {
                    byte[] length = new byte[4];
                    in.read(length);
                    int l = ByteBuffer.wrap(length).order(ByteOrder.LITTLE_ENDIAN).getInt();
                    byte[] msgBytes = new byte[l];
                    in.read(msgBytes);
                    String msg = new String(msgBytes, "utf-8");
                    try {
                        ControlMessage cm = mapper.readValue(msg, ControlMessage.class);
                        if (cm.getType().equals("config")) {
                            List<Configuration> configurations = mapper.readValue(cm.getData()[0], new TypeReference<>(){});
                            configurations.forEach(n -> {
                                if(CONFIGURATIONS.containsKey(n.getName())){
                                    CONFIGURATIONS.get(n.getName()).setConfiguration(n);
                                }
                            });
                        } else {
                            Executable executable = COMMAND_LISTENERS.get(cm.getType());
                            if (executable != null) {
                                executable.execute(cm.getData());
                            }
                        }
                    } catch (Exception e) {
                        convertAndSend(new RobotMessage("forward", e.getMessage()));
                    }
                }
            } catch (IOException e) {
                send(e.getMessage());
            }
        }
    }

    public static void send(String json) {
        byte[] l = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(json.length()).array();
        byte[] msgBytes = json.getBytes(StandardCharsets.UTF_8);
        byte[] bytes = Arrays.copyOf(l, l.length + msgBytes.length);
        System.arraycopy(msgBytes, 0, bytes, l.length, msgBytes.length);
        try {
            out.write(bytes);
            out.flush();
        } catch (IOException e) {
        }

    }

    public static void convertAndSend(Object object) {
        try {
            send(mapper.writeValueAsString(object));
        } catch (JsonProcessingException e) {
        }
    }

    public void setTerminated(boolean terminated) {
        this.terminated = terminated;
    }

    private void sendConfig() {
        List<Configuration> configurations = new ArrayList<>();
        CONFIGURATIONS.entrySet().forEach(n -> configurations.add(n.getValue().getConfiguration()));
        try {
            convertAndSend(new RobotMessage("config", mapper.writeValueAsString(configurations)));
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void run() {
        receiver();
    }
}
