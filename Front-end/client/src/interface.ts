// client/src/interface.ts

import { Socket } from 'socket.io-client';

export interface IMessageData {
    room: string;
    author: string;
    message: string;
    time: string;
    socketId?: string; 
    _id?: string; 
    createdAt?: string; 
}

export interface ChatProps {
    socket: Socket;
    username: string;
    room: string;
}