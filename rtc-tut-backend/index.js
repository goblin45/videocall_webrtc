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

    // socket.on('join room', (room) => {
    //     if (roomsCap[room]) {
    //         if (roomsCap[room] == 2) {
    //             socket.emit('room full');
    //             return;
    //         } else {
    //             roomsCap[room] += 1;
    //             socket.join(room)
    //             console.log('User joined room: ' + room);
    //             socket.to(room).emit('new peer', {peer: 2});
    //         }
    //     } else {
    //         roomsCap[room] = 1;
    //         socket.join(room);
    //         console.log('User joined room: ' + room);
    //         socket.to(room).emit('new peer', {peer: 1});
    //     }
    // });

    socket.on('join room', (room) => {
        console.log('User joined room: ' + room);
        socket.join(room);
        socket.to(room).emit('new peer');
    })

    socket.on('signal', (data, room) => {
        console.log('signal received: ' + data + room);
        socket.to(room).emit('signal', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
