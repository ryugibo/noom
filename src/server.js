import express from "express";
import http from "http";
import { instrument } from "@socket.io/admin-ui";
import { Server } from "socket.io"

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);

const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});

instrument(ioServer, {
  auth: false,
});

function publicRoom() {
  const { sockets: { adapter: { sids, rooms }}} = ioServer
  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
}

function countRoom(roomName) {
  return ioServer.sockets.adapter.rooms.get(roomName)?.size;
}

ioServer.on("connection", socket => {
  socket["nickname"] = "Anonymous";
  socket.onAny((event) => {
    console.log(`Socket Event:${event}`);
  })
  socket.on("enter_room", (roomName, nickname, done) => {
    socket["nickname"] = (nickname === "") ? "Anonymous" : nickname;
    socket.join(roomName);
    done();
    socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
    ioServer.sockets.emit("room_change", publicRoom());
  });
  socket.on("disconnecting", (room) => {
    socket.rooms.forEach((room) => socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1));
  });
  socket.on("disconnect", () => {
    ioServer.sockets.emit("room_change", publicRoom());
  });
  socket.on("new_message", (msg, room, done) => {
    socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
    done();
  });
});

// const sockets = [];

// wss.on("connection", (socket) => {
//   sockets.push(socket);
//   socket["nickname"] = "Anonymous";
//   console.log("Connected to the Browser ✅");
//   socket.on("close", () => {
//     console.log("Disconnected from the Browser ❌");
//   });
//   socket.on("message", (msg) => {
//     const message = JSON.parse(msg.toString('utf8'));
//     switch (message.type) {
//       case "new_message":
//         sockets.forEach(aSocket => aSocket.send(`${socket.nickname}: ${message.payload}`));
//         break;
//       case "nickname":
//         socket["nickname"] = message.payload;
//         break;
//     }
//   });
// });

httpServer.listen(3000, handleListen);
