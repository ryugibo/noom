const socket = io();

const myFace = document.getElementById("myFace");
const peerFace = document.getElementById("peerFace");
const selectedFace = document.getElementById("selectedFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");

const call = document.getElementById("call");

call.hidden = true;

let isSelectMy = true;
let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === "videoinput")
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      cameraSelect.appendChild(option);
      if (currentCamera.label === camera.label) {
        option.selected = true;
      }
    });
  } catch(e) {
    console.log(e);
  }
}

async function getMedia(deviceId) {
  const initialConstraints = {
    audio: true,
    video: { facingMode: "user" }
  };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstraints
    );
    myFace.srcObject = myStream;
    updateSelectedFace();
    myFace.addEventListener("click", () => {
      isSelectMy = true;
      updateSelectedFace();
    });
    if (!deviceId) {
      await getCameras();
    }
  } catch(e) {
    console.log(e);
  }
}

function updateSelectedFace() {
  if (isSelectMy) {
    console.log("SetMy");
    selectedFace.srcObject = myFace.srcObject;
    myFace.classList.add("selected");
    peerFace.classList.remove("selected");
  } else {
    console.log("SetPeer");
    selectedFace.srcObject = peerFace.srcObject;
    peerFace.classList.add("selected");
    myFace.classList.remove("selected");
  }
}
function handleMuteClick() {
  muted = !muted;
  myStream.getAudioTracks().forEach(track => track.enabled = !muted);
  if (muted) {
    muteBtn.innerText = "Unmute";
  } else {
    muteBtn.innerText = "Mute";
  }
}

function handleCameraClick() {
  cameraOff = !cameraOff;
  myStream.getVideoTracks().forEach(track => track.enabled = !cameraOff);
  if (cameraOff) {
    cameraBtn.innerText = "Turn Camera On";
  } else {
    cameraBtn.innerText = "Turn Camera Off";
  }
}

function handleCameraChange() {
  const camera = getMedia(cameraSelect.value);
  if  (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video")
    videoSender.replaceTrack(videoTrack);
  }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
cameraSelect.addEventListener("input", handleCameraChange);

// Welcome Form (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall(enteredRoomName) {
  welcome.hidden = true;
  call.hidden = false;
  roomName = enteredRoomName;
  await getMedia();
  makeConnection();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  const enterRoomName = input.value;
  input.value = "";
  await initCall(enterRoomName);
  socket.emit("join_room", enterRoomName);
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Chat

const chatForm = document.getElementById("chat");
const chatList = chatForm.querySelector("#list");
const chatInput = chatForm.querySelector("input");

function addChatText(isMy, text) {
  const aside = document.createElement("aside");
  aside.innerText = `${isMy ? "You" : "Other"}: ${text}`;
  aside.classList.add(isMy ? "my" : "other");
  chatList.appendChild(aside);
  aside.scrollIntoView({block: "nearest", inline: "nearest"});
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const chatValue = chatInput.value;
  myDataChannel.send(chatValue);
  addChatText(true, chatValue);
  chatInput.value = "";
});

// Socket Code

function handleMessageData(data) {
  addChatText(false, data.data);
  console.log("Data >> ", data.data);
}

socket.on("welcome", async () => {
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", handleMessageData);
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
  console.log("sent the offer");
});

socket.on("offer", async (offer) => {
  console.log("received the offer");
  myPeerConnection.addEventListener("datachannel", (data) => {
    myDataChannel = data.channel;
    myDataChannel.addEventListener("message", handleMessageData);
  });
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});

socket.on("answer", (answer) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});

// RTC Code

function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [{
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun.l1.google.com:19302",
        "stun:stun.l2.google.com:19302",
        "stun:stun.l3.google.com:19302",
        "stun:stun.l4.google.com:19302",
      ],
    }],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("track", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => {
      console.log(track);
      myPeerConnection.addTrack(track, myStream)
    });
}

function handleIce(data) {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
  console.log(data.streams);
  peerFace.addEventListener("click", () => {
    isSelectMy = false;
    updateSelectedFace();
  });
  peerFace.srcObject = data.streams[0];
}