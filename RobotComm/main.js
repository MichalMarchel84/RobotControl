const port = chrome.runtime.connectNative("pl.marchel.robotcontrol");
// const host = 'http://192.168.1.12:8080/endpoint'
const host = 'https://remote-control-project.herokuapp.com/endpoint'
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
const videoConfig = {
    "name": "Video configuration",
    "params": [
        {"name": "width", "value": 1200},
        {"name": "height", "value": 720},
        {"name": "frame rate", "value": 10}
    ]
}
let nativeConfig = [videoConfig];
let stompClient = null;
let peerConnection = null;
let dataChannel = null;
let stream = null;
let timeout = null;

port.onMessage.addListener(onNativeMessage);

connect();

//-------------Signalling----------------

function onNativeMessage(message) {
    switch (message.tag) {
        case "config":
            nativeConfig = nativeConfig.concat(JSON.parse(message.value));
            sendConfig();
            break;
        case "forward":
            console.log("<<<<<<<<<fwd>>>>>>>>>>");
            console.log(message.value);
            break;
    }
}

function sendConfig() {
    stompClient.send(configHost, {}, JSON.stringify(nativeConfig));
}

function connect() {

    const socket = new SockJS(host);
    stompClient = Stomp.over(socket);
    stompClient.connect({},
        function (frame) {
            stompClient.subscribe('/app/authenticate',
                function (msg) {
                    onMessage(JSON.parse(msg.body));
                },
                {robotId: 1, robotPass: 123456});
        }, function () {
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
            timeout = setTimeout(disconnect, 10000);
            break
        case "config":
            port.postMessage(msg);
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
        console.log(event)
        switch (peerConnection.connectionState) {
            case "connected":
                onConnect();
                break;
            case "disconnected":
                disconnect();
                break;
            case "failed":
                report("failed", "");
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
    report("connect", "");
}

function disconnect() {
    report("disconnect", "");
    finalizePeerConnection();
}

async function startVideo() {
    const constraints = {
        audio: false,
        video: {
            width: videoConfig.params[0].value,
            height: videoConfig.params[0].value,
            frameRate: videoConfig.params[0].value
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
        port.postMessage(message);
    };
    await startVideo();
    peerConnection.createOffer(function (offer) {
        send("offer", offer);
        peerConnection.setLocalDescription(offer);
    }, function (error) {
        console.log(error)
    });
}