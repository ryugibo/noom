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

const httpServer = http.createServer(app);
const ioServer = new Server(httpServer);

ioServer.on("connection", socket => {
  socket.on("join_room", (roomName, done) => {
    socket.join(roomName);
    done(roomName);
    socket.to(roomName).emit("welcome");
  });
})

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);
