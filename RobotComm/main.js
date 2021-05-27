const h3 = document.querySelector("#h3");

const port = chrome.runtime.connectNative("pl.marchel.robotcontrol");
port.onMessage.addListener(onNativeMessage);

function onNativeMessage(message) {
    h3.innerHTML = "Msg: <b>" + message.msg + "</b>";
}

//-----signalling------

let stompClient = null;
let robotName = "Robot1"
let outputChannel = null;
connect();

function connect() {

    const socket = new SockJS('http://192.168.1.12:8080/room');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function(frame) {

        stompClient.subscribe('/topic/Robot1', function(msg) {
            onMessage(JSON.parse(msg.body));
        });
        stompClient.send("/app/connect", {}, JSON.stringify({"requestedId": robotName}))
    });
}

function bind(msg){
    outputChannel = "/topic/" + msg.data;
    startTransmission();
}

function send(type, data) {

    stompClient.send(outputChannel, {}, JSON.stringify({"type":type, "data":data}));
}

//-------------WebRTC code----------------

function onMessage(msg){
    if(msg.type === "candidate"){
        peerConnection.addIceCandidate(new RTCIceCandidate(msg.data));
    }else if(msg.type === "offer"){
        peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data));
        peerConnection.createAnswer(function (answer){
            peerConnection.setLocalDescription(answer);
            send("answer", answer);
        }, function (error){console.log(error)});
    }else if(msg.type === "answer"){
        peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data));
    }else if(msg.type ==="binding"){
        bind(msg);
    }
}

const configuration = null;
const peerConnection = new RTCPeerConnection(configuration);
let dataChannel;


peerConnection.onicecandidate = function (event){
    if(event.candidate){
        send("candidate", event.candidate);
    }
};

function startTransmission(){
    dataChannel = peerConnection.createDataChannel("dc");
    dataChannel.onerror = function(error) {
        console.log("Error:", error);
    };
    dataChannel.onclose = function() {
        console.log("Data channel is closed");
    };
    dataChannel.onmessage = function (msg){
        port.postMessage(JSON.parse(msg.data));
    };
    peerConnection.createOffer(function (offer){
        send("offer", offer);
        peerConnection.setLocalDescription(offer);
    }, function (error) {console.log(error)});
}