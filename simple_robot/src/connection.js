// const host = 'http://192.168.1.12:8080/endpoint'
const host = 'https://remote-control-project.herokuapp.com/endpoint';
const signallingHost = "/app/signalling";
const reportingHost = "/app/reports";
const configHost = "/app/config";
const configuration = {
    iceServers: [
        {url: "stun:stun.l.google.com:19302"},
        {url: 'stun:stun1.l.google.com:19302'},
        {url: 'stun:stun2.l.google.com:19302'},
        {url: 'stun:stun3.l.google.com:19302'}
    ]
};
let nativeConfig = [
    {
        "name": "Video configuration",
        "params": [
            {"name": "width", "value": "1200"},
            {"name": "height", "value": "720"},
            {"name": "frame rate", "value": "10"}
        ]
    }
];
let coreConfig = null;
let stompClient = null;
let peerConnection = null;
let dataChannel = null;
let stream = null;
let timeout = null;
let testRunTimeout = null;

connect();

//-------------Signalling----------------

function sendConfig(cfgs) {
    stompClient.send(configHost, {}, JSON.stringify(cfgs));
}

function connect() {

    logCore("Connecting to signalling server...");
    const socket = new SockJS(host);
    stompClient = Stomp.over(socket);
    stompClient.connect({},
        function (frame) {
            logCore("Connected to signalling server");
            stompClient.subscribe('/app/authenticate',
                function (msg) {
                    onMessage(JSON.parse(msg.body));
                },
                {"robotId": robotId, "robotPass": password});
            setTimeout(() => {
                sendConfig(nativeConfig.concat(coreConfig));
            }, 1000);
        }, function () {
        logCore("Failed to connect to signalling server");
            finalizePeerConnection();
            window.setTimeout(connect, 3000);
        });
}

function send(type, data) {

    stompClient.send(signallingHost, {"caller": "robot"}, JSON.stringify({"type": type, "data": data}));
}

function report(type, data) {

    stompClient.send(reportingHost, {}, JSON.stringify({"type": type, "data": data}));
}

//-------------WebRTC code----------------

function onMessage(msg) {

    switch (msg.type) {
        case "candidate":
            peerConnection.addIceCandidate(new RTCIceCandidate(msg.data));
            break;
        case "offer":
            peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data));
            peerConnection.createAnswer(function (answer) {
                peerConnection.setLocalDescription(answer);
                send("answer", answer);
            }, function (error) {
                console.log(error);
            });
            break;
        case "answer":
            peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data));
            break;
        case "start":
            startTransmission();
            timeout = setTimeout(() => disconnect("Failed to establish connection"), 10000);
            break
        case "config":
            const cfgs = JSON.parse(msg.data);
            nativeConfig = cfgs.slice(0, nativeConfig.length);
            window.setCoreConfig(cfgs.slice(nativeConfig.length));
            break;
    }
}

function initializePeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);
    peerConnection.onicecandidate = function (event) {
        if (event.candidate) {
            send("candidate", event.candidate);
        }
    };

    peerConnection.onconnectionstatechange = function (event) {
        switch (peerConnection.connectionState) {
            case "connected":
                onConnect();
                break;
            case "disconnected":
                disconnect();
                break;
            case "failed":
                report("disconnect", "Connection failed - you are disconnected");
                logCore("Client connection failed");
                finalizePeerConnection();
                break;
        }
    };
}

function finalizePeerConnection() {
    if (stream != null) {
        stream.getTracks().forEach(function (track) {
            track.stop();
        });
    }
    stream = null;
    if (dataChannel != null) dataChannel.close();
    if (peerConnection != null) peerConnection.close();
    dataChannel = null;
    peerConnection = null;
}

function onConnect() {
    clearTimeout(timeout);
    report("connected", "Connected");
    logCore("Client connected");
    setTimeout(() => {
        logCore("test run timeout");
        disconnect("Test run timed out")
    }, 300000);
}

function disconnect(msg) {
    if(testRunTimeout != null){
        clearTimeout(testRunTimeout);
        testRunTimeout = null;
    }
    if(msg) report("disconnect", msg);
    else report("disconnect", "You are disconnected");
    finalizePeerConnection();
    logCore("Client disconnected");
}

async function startVideo() {
    const constraints = {
        audio: false,
        video: {
            width: parseInt(nativeConfig[0].params[0].value, 10),
            height: parseInt(nativeConfig[0].params[1].value, 10),
            frameRate: parseInt(nativeConfig[0].params[2].value, 10)
        }
    };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    peerConnection.addTrack(stream.getTracks()[0]);
}

async function startTransmission() {
    initializePeerConnection();
    dataChannel = peerConnection.createDataChannel("dc");
    dataChannel.onerror = function (error) {
        console.log("Error:", error);
    };
    dataChannel.onclose = function () {
        disconnect();
        console.log("Data channel closed");
    };
    dataChannel.onmessage = function (msg) {
        const message = JSON.parse(msg.data);
        notifyCore(message);
    };
    await startVideo();
    peerConnection.createOffer(function (offer) {
        send("offer", offer);
        peerConnection.setLocalDescription(offer);
    }, function (error) {
        console.log(error)
    });
}

async function notifyCore(msg) {
    window.sendToCore(msg);
}

async function logCore(value) {
    window.logOnCore(value);
}