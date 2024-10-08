/*
    TO-DOS:
    1)Broad cast to server when new user joins ✅
    2) feature to leave golbal chat room (redirect to home page) ✅
    3)feature to create own room garo xa yrrrrr
    4) load previous chats (store in database) garo xa yrrrrr
    5)feature to see joined users in room (just display usersname)
    6) add name of user sent a message and you when you sent ✅
*/
import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});
const PORT = process.env.PORT;
const users = new Map();
const rooms = new Map();
io.on('connection', (socket) => {
    socket.on('set username', (username) => {
        users.set(socket.id, username);
        console.log(`Username set for ${socket.id}: ${username}`);
    });
    socket.on('broadcast', () => {
        const joinedUser = users.get(socket.id) || 'Anonymous';
        console.log(joinedUser);
        io.emit('broadcast', { joinedUserData: joinedUser });
    });
    socket.on('chat message', (message) => {
        const userName = users.get(socket.id) || 'Anonymous';
        const jsonData = { userName, message };
        io.emit('chat message', jsonData);
    });
    socket.on('create room', ({ roomName, password }) => {
        if (rooms.has(roomName)) {
            socket.emit('room error', 'Room already exists');
        }
        else {
            rooms.set(roomName, { name: roomName, password, users: new Set() });
            socket.emit('room created', roomName);
        }
    });
    socket.on('join room', ({ roomName, password }) => {
        const room = rooms.get(roomName);
        if (!room) {
            socket.emit('room error', 'Room does not exist');
        }
        else if (room.password !== password) {
            socket.emit('room error', 'Incorrect password');
        }
        else {
            socket.join(roomName);
            room.users.add(socket.id);
            socket.emit('room joined', roomName);
            //broadcasting message to specific room
            io.to(roomName).emit('user joined room', users.get(socket.id) || "Anonymous");
        }
    });
    socket.on('leave room', (roomName) => {
        socket.leave(roomName);
        const room = rooms.get(roomName);
        if (room) {
            room.users.delete(socket.id);
            io.to(roomName).emit('user left room', users.get(socket.id) || 'Anonymous');
        }
    });
    socket.on('room message', ({ roomName, message }) => {
        const userName = users.get(socket.id) || 'Anonymous';
        io.to(roomName).emit('room message', { roomName, userName, message });
    });
    socket.on('disconnect', () => {
        const disconnectedUser = users.get(socket.id) || 'Anonymous';
        console.log('user disconnected:', socket.id, disconnectedUser);
        io.emit('user disconnected', disconnectedUser);
        // Remove user from all rooms
        rooms.forEach((room, roomName) => {
            if (room.users.has(socket.id)) {
                room.users.delete(socket.id);
                io.to(roomName).emit('user left room', disconnectedUser);
            }
        });
        users.delete(socket.id);
    });
});
server.listen(PORT, () => {
    console.log('server listening on port', PORT);
});
