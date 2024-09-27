import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

const PORT = process.env.PORT || 6969;

interface User {
    username: string;
    room: string | null;
}

interface Room {
    name: string;
    password: string;
    users: Set<string>;
}

const users = new Map<string, User>();
const globalUsers = new Map<string, string>();
const rooms: Map<string, Room> = new Map();

io.on('connection', (socket: Socket) => {
    socket.on('set username', (username: string) => {
        users.set(socket.id, { username, room: null });
        console.log(`Username set for ${socket.id}: ${username}`);
    });

    socket.on('create room', ({ roomName, password }: { roomName: string, password: string }) => {
        if (rooms.has(roomName)) {
            socket.emit('room error', 'Room already exists');
        } else {
            rooms.set(roomName, { name: roomName, password, users: new Set([socket.id]) });
            const user = users.get(socket.id);
            if (user) {
                user.room = roomName;
                socket.join(roomName);
                const jsonData = { roomName, creatorName: user.username };
                socket.emit('room created', jsonData);
                io.to(roomName).emit('user joined room', user.username);
            }
        }
    });

    socket.on('join room', ({ roomName, username }: { roomName: string, username: string }) => {
        const room = rooms.get(roomName);
        if (!room) {
            socket.emit('room error', 'Room does not exist');
        } else {
            const user = users.get(socket.id);
            if (user) {
                user.room = roomName;
                socket.join(roomName);
                room.users.add(socket.id);
                socket.emit('room joined', roomName);
                io.to(roomName).emit('user joined room', user.username);
                console.log(`${username} joined room ${roomName} successfully`);
            }
        }
    });

    socket.on('room message', ({ roomName, message }: { roomName: string, message: string }) => {
        const user = users.get(socket.id);
        if (user && user.room === roomName) {
            io.to(roomName).emit('room message', { roomName, userName: user.username, message });
            console.log(`Message sent in room ${roomName} by ${user.username}: ${message}`);
        }
    });

    socket.on('leave room', () => {
        const user = users.get(socket.id);
        if (user && user.room) {
            const room = rooms.get(user.room);
            if (room) {
                room.users.delete(socket.id);
                io.to(user.room).emit('user left room', user.username);
                socket.leave(user.room);
                user.room = null;
                console.log(`${user.username} left room ${room.name}`);
            }
        }
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            if (user.room) {
                const room = rooms.get(user.room);
                if (room) {
                    room.users.delete(socket.id);
                    io.to(user.room).emit('user left room', user.username);
                }
            }
            users.delete(socket.id);
            console.log(`User ${user.username} disconnected`);
        }
    });
});

server.listen(PORT, () => {
    console.log('Server listening on port', PORT);
});