// client/src/components/Message.tsx
import React from 'react';
import type { IMessageData } from '../interface'; // 💡 สมมติว่าสร้างไฟล์ interface.ts

interface MessageProps {
    messageContent: IMessageData;
    currentSocketId: string;
}

const Message: React.FC<MessageProps> = ({ messageContent, currentSocketId }) => {
    const isMyMessage = currentSocketId === messageContent.socketId;

    return (
        <div 
            className="message"
            id={isMyMessage ? "you" : "other"} 
        >
            <div>
                <div className="message-content">
                    <p>{messageContent.message}</p>
                </div>
                <div className="message-meta">
                    <p id="time">{messageContent.time}</p>
                    <p id="author">{isMyMessage ? "You" : messageContent.author}</p>
                </div>
            </div>
        </div>
    );
}

export default Message;