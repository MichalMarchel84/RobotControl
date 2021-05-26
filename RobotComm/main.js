const h3 = document.querySelector("#h3");

const keysDown = [];

document.addEventListener("keydown", function (e){
    const i = keysDown.indexOf(e.key);
    if(i === -1) keysDown.push(e.key);
});

document.addEventListener("keyup", function (e){
    const i = keysDown.indexOf(e.key);
    if(i > -1) keysDown.splice(i, 1);
});

window.setInterval(function () {
    sendNativeMessage(keysDown);
}, 100);

const port = chrome.runtime.connectNative("pl.marchel.robotcontrol");
port.onMessage.addListener(onNativeMessage);

function onNativeMessage(message) {
    h3.innerHTML = "Msg: <b>" + message.msg + "</b>";
}

function sendNativeMessage(msg) {
    let message = {"keys": msg};
    port.postMessage(message);
}