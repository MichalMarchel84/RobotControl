package pl.marchel;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class Communicator implements Runnable {

    private static final InputStream in = System.in;
    private static final OutputStream out = System.out;
    private boolean terminated = false;
    private final KeyBinder keyBinder;
    private final Runnable[] COMMAND_LISTENERS;
    private final ObjectMapper mapper = new ObjectMapper();

    public Communicator(KeyBinder keyBinder, Runnable... commandListeners) {
        this.keyBinder = keyBinder;
        COMMAND_LISTENERS = commandListeners;
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
                        for (String key : cm.getKeys()){
                            keyBinder.invoke(key);
                        }
                        for (Runnable commandListener : COMMAND_LISTENERS){
                            commandListener.run();
                        }
                    }catch (Exception e){
                        send("exc : " + e.getMessage());
                    }
                }
            } catch (IOException e) {
                send(e.getMessage());
            }
        }
    }

    public static void send(String msg) {
        msg = "{\"msg\":\"" + msg + "\"}";
        byte[] l = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(msg.length()).array();
        byte[] msgBytes = msg.getBytes(StandardCharsets.UTF_8);
        byte[] bytes = Arrays.copyOf(l, l.length + msgBytes.length);
        System.arraycopy(msgBytes, 0, bytes, l.length, msgBytes.length);
        try {
            out.write(bytes);
            out.flush();
        } catch (IOException e) {}

    }

    public void setTerminated(boolean terminated) {
        this.terminated = terminated;
    }

    @Override
    public void run() {
        receiver();
    }
}
