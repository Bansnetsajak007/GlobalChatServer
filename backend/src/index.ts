/*
    TO-DOS:
    1)Broad cast to server when new user joins
    2) feature to leave golbal chat room
    3)feature to create own room
    4) load previous chats (store in database)
    5)feature to see joined users in room (just display usersname)
*/


import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server,{
    cors: {
        origin: "*",
    },
});

const PORT = 6969;

const users = new Map<string, string>();

io.on('connection', (socket: Socket) => {
    socket.on('set username', (username: string) => {
        users.set(socket.id, username);
        console.log(`Username set for ${socket.id}: ${username}`);
    });

    socket.on('broadcast', () => {
        const joinedUser = users.get(socket.id) || 'Anonymous';
        console.log(joinedUser);
        io.emit('broadcast', { joinedUserData: joinedUser });
    })

    socket.on('chat message', (message: string) => {
        const userName = users.get(socket.id) || 'Anonymous';
        const jsonData = {userName, message};
        io.emit('chat message', jsonData);
    });

    socket.on('disconnect' , () => {
        console.log('user disconnected:', socket.id);
        users.delete(socket.id);
    });
});

server.listen(PORT, () => {
    console.log('server listening on port', PORT);
})