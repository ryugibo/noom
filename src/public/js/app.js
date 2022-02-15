const socket = new WebSocket(`ws://${window.location.host}`);

socket.addEventListener("open", () => {
  console.log("Connected to the Server ✅");
});

socket.addEventListener("message", (message) => {
  console.log(`Received message: `, message.data);
});

socket.addEventListener("close", () => {
  console.log("Disconnected from the Server ❌");
});

setTimeout(() => {
  socket.send("Hello from the browser!");
}, 10_000);
