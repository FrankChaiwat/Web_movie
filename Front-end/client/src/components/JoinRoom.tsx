// client/src/components/JoinRoom.tsx
import React, { useState } from 'react';

interface JoinRoomProps {
    onJoin: (username: string, roomID: string) => void;
}

const JoinRoom: React.FC<JoinRoomProps> = ({ onJoin }) => {
    const [username, setUsername] = useState<string>("");
    const [room, setRoom] = useState<string>("");

    const handleJoin = () => {
        if (username.trim() !== "" && room.trim() !== "") {
            onJoin(username, room); 
        } else {
            alert("Please enter a username and room ID.");
        }
    };

    return (
        <div className="join-container">
            <h3>Join Chat Room</h3>
            <input 
                type="text" 
                placeholder="Your Username..." 
                onChange={(e) => setUsername(e.target.value)} 
            />
            <input 
                type="text" 
                placeholder="Room ID (e.g., 123)..." 
                onChange={(e) => setRoom(e.target.value)} 
                onKeyPress={(e) => { e.key === "Enter" && handleJoin(); }}
            />
            <button onClick={handleJoin}>Join a Room</button>
        </div>
    );
}

export default JoinRoom;