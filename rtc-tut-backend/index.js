const cors = require('cors');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*', // Allow all origins
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    }
});

app.use(cors());

// const roomsCap = {}

// io.on('connection', (socket) => {
//     console.log('A user connected' + socket.id);

//     socket.on('join room', (room) => {
//         console.log('User joined room: ' + room);
//         socket.join(room);
//         io.to(room).emit('new peer', socket.id);
//     })

//     socket.on('signal', (data, room) => {
//         console.log('signal received: ' + data + room);
//         io.to(room).emit('signal', data);
//     });

//     socket.on('disconnect', () => {
//         console.log('User disconnected');
//     });
// });

io.on("connection", (socket) => {
    socket.on("room:join", (data) => {
      const { room } = data;
      // emailToSocketIdMap.set(email, socket.id);
      // socketidToEmailMap.set(socket.id, email);
      socket.to(room).emit("user:joined", { id: socket.id, message: `User ${socket.id} joined room ${room}` });
      socket.join(room);
      console.log(`User ${socket.id} joined room ${room}`);
      socket.to(socket.id).emit("room:join", data);
    });
  
    socket.on("user:call", ({ to, offer }) => {
      console.log("user:call", to);
      socket.to(to).emit("incoming:call", { from: socket.id, offer });
    });
  
    socket.on("call:accepted", ({ to, ans }) => {
      console.log("call:accepted", ans);
      socket.to(to).emit("call:accepted", { from: socket.id, ans });
    });
  
    socket.on("peer:nego:needed", ({ room, offer }) => {
      console.log("peer:nego:needed", room);
      socket.broadcast.to(room).emit("peer:nego:needed", { from: socket.id, offer });
    });
  
    socket.on("peer:nego:done", ({ to, ans }) => {
      console.log("peer:nego:done", ans);
      socket.to(to).emit("peer:nego:final", { from: socket.id, ans });
    });
  });

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
