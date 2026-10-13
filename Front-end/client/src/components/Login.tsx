// client/src/components/Login.tsx
import React, { useState } from 'react';
import axios from 'axios';

// 💡 Props ที่ Component นี้ต้องมี: ฟังก์ชันสำหรับแจ้ง App.tsx เมื่อ Login สำเร็จ
interface LoginProps {
    onAuthSuccess: (token: string, username: string) => void;
    // onAuthSuccess: จัดการ Token และ Username เมื่อ Login/Register สำเร็จ
}

const Login: React.FC<LoginProps> = ({ onAuthSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true); // true = Login, false = Register
    const [error, setError] = useState('');

    const apiUrl = isLogin ? 'http://localhost:3001/login' : 'http://localhost:3001/register';

    const handleSubmit = async () => {
        setError('');
        try {
            const response = await axios.post(apiUrl, { username, password });

            if (isLogin) {
                // 🟢 Login สำเร็จ: บันทึก Token และแจ้ง App.tsx
                onAuthSuccess(response.data.token, response.data.username);
            } else {
                // 🟢 Register สำเร็จ: แสดงข้อความและสลับไปหน้า Login
                alert(response.data.message + " Please log in.");
                setIsLogin(true);
            }
        } catch (err) {
            const message = axios.isAxiosError(err) && err.response 
                ? err.response.data.message : 'An unexpected error occurred.';
            setError(message);
        }
    };

    return (
        <div className="join-container"> {/* ใช้สไตล์ร่วมกับ JoinRoom */}
            <h3>{isLogin ? 'Login to Chat' : 'Register Account'}</h3>
            <input 
                type="text" 
                placeholder="Username..." 
                value={username}
                onChange={(e) => setUsername(e.target.value)} 
            />
            <input 
                type="password" 
                placeholder="Password..." 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                onKeyPress={(e) => { e.key === "Enter" && handleSubmit(); }}
            />

            {error && <p style={{color: 'red', textAlign: 'center'}}>{error}</p>}
            
            <button onClick={handleSubmit}>
                {isLogin ? 'Log In' : 'Register'}
            </button>

            <button 
                onClick={() => setIsLogin(!isLogin)}
                style={{ backgroundColor: 'transparent', color: '#007bff' }}
            >
                {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
            </button>
        </div>
    );
};

export default Login;