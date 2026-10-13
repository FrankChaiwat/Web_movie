// client/src/components/Chat.tsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; 
import Message from './Message';
import type { IMessageData, ChatProps } from '../interface'; // 💡 สมมติว่าสร้างไฟล์ interface.ts

const Chat: React.FC<ChatProps> = ({ socket, username, room }) => {
    const [currentMessage, setCurrentMessage] = useState<string>('');
    const [messageList, setMessageList] = useState<IMessageData[]>([]); 
    const messagesEndRef = useRef<HTMLDivElement>(null); 

    // 📌 1. Auto-Scroll เมื่อมีข้อความใหม่
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    }, [messageList]);

    // 📌 2. ดึงประวัติข้อความและตั้งค่า Socket Listener
    useEffect(() => {
        if (room === "") return; // ไม่รันถ้าไม่มี Room ID

        // 💡 เข้าร่วมห้อง
        socket.emit("join_room", room);
        
        // 💡 ดึงประวัติข้อความ
        const fetchMessageHistory = async () => {
            try {
                // 🟢 ใช้ API Endpoint ที่สร้างไว้บน Server
                const response = await axios.get<IMessageData[]>(`http://localhost:3001/messages/${room}`);
                setMessageList(response.data); 
            } catch (error) {
                console.error("Error fetching message history:", error);
            }
        };
        fetchMessageHistory();

        // 💡 ตั้งค่า Listener สำหรับข้อความใหม่
        const receiveMessageHandler = (data: IMessageData) => {
            setMessageList((list) => [...list, data]);
        };

        socket.on('receive_message', receiveMessageHandler);
        return () => {
            socket.off('receive_message', receiveMessageHandler);
        };
    }, [room, socket]); 

    // 📌 3. ฟังก์ชันส่งข้อความ
    const sendMessage = async () => {
        if (currentMessage.trim() !== "") {
            const messageData: IMessageData = {
                room: room, 
                author: username, 
                message: currentMessage,
                time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
            };
            
            // ส่งไป Server (Server จะบันทึก DB และ broadcast กลับมา)
            await socket.emit('send_message', messageData);
            setCurrentMessage(''); 
        }
    };

    return (
        <div className="chat-window">
            <div className="chat-header">
                <p>Live Chat ({room}) - User: {username}</p>
            </div>
            
            {/* 🟢 ใช้ ref ใน div นี้สำหรับการ Auto-Scroll */}
            <div className="chat-body" ref={messagesEndRef}> 
                {messageList.map((messageContent, index) => {
                    return (
                        <Message
                            key={index}
                            messageContent={messageContent}
                            currentSocketId={socket.id ?? ''}
                        />
                    );
                })}
            </div>

            <div className="chat-footer">
                <input
                    type="text"
                    placeholder="Hey..."
                    value={currentMessage}
                    onChange={(event) => setCurrentMessage(event.target.value)}
                    onKeyPress={(event) => { event.key === "Enter" && sendMessage(); }}
                />
                <button onClick={sendMessage}>&#9658;</button>
            </div>
        </div>
    );
}

export default Chat;