const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");

const call = document.getElementById("call");

call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;

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
    if (!deviceId) {
      await getCameras();
    }
  } catch(e) {
    console.log(e);
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

// Socket Code

socket.on("welcome", async () => {
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => {
  myPeerConnection.setRemoteDescription(answer);
});

// RTC Code

function makeConnection() {
  myPeerConnection = new RTCPeerConnection();
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}
