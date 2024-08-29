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

const roomsCap = {}

io.on('connection', (socket) => {
    console.log('A user connected' + socket.id);

    socket.on('join room', (room) => {
        console.log('User joined room: ' + room);
        socket.join(room);
        socket.to(room).emit('new peer', socket.id);
    })

    socket.on('signal', (data, room) => {
        console.log('signal received: ' + data + room);
        socket.broadcast.to(room).emit('signal', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
