const port = chrome.runtime.connectNative("pl.marchel.robotcontrol");
const host = 'https://remote-control-project.herokuapp.com/endpoint'
const signallingHost = "/app/signalling";
const reportingHost = "/app/reports";
const configuration = {
    iceServers: [
        {url: "stun:stun.l.google.com:19302"},
        {url: 'stun:stun1.l.google.com:19302'},
        {url: 'stun:stun2.l.google.com:19302'},
        {url: 'stun:stun3.l.google.com:19302'}
        ]
};
let stompClient = null;
let peerConnection = null;
let dataChannel = null;
let stream = null;

port.onMessage.addListener(onNativeMessage);

connect();

//-------------Signalling----------------

function onNativeMessage(message) {
    //handling output from robot
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
    if (msg.type === "candidate") {
        peerConnection.addIceCandidate(new RTCIceCandidate(msg.data));
    } else if (msg.type === "offer") {
        peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data));
        peerConnection.createAnswer(function (answer) {
            peerConnection.setLocalDescription(answer);
            send("answer", answer);
        }, function (error){
            console.log(error);
        });
    } else if (msg.type === "answer") {
        peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data));
    } else if (msg.type === "start") {
        startTransmission();
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
                report("disconnect", "");
                finalizePeerConnection();
                break;
            case "failed":
                report("failed", "");
                finalizePeerConnection();
                break;
        }
    };

    // peerConnection.onnegotiationneeded = async () => {
    //     await peerConnection.setLocalDescription(await peerConnection.createOffer());
    //     send("offer", peerConnection.localDescription);
    // };
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
    report("connect", "");
}

async function startVideo() {
    const constraints = {
        audio: false,
        video: {width: 1280, height: 720, frameRate: 10}
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
        console.log("Data channel closed");
    };
    dataChannel.onmessage = function (msg) {
        port.postMessage(JSON.parse(msg.data));
    };
    await startVideo();
    peerConnection.createOffer(function (offer) {
        send("offer", offer);
        peerConnection.setLocalDescription(offer);
    }, function (error) {
        console.log(error)
    });
}