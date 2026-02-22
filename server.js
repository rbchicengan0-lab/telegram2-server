const express = require('express');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // 1. Подключаем модуль cors

const app = express();
app.use(cors()); // 2. РАЗРЕШАЕМ серверу принимать запросы с любых адресов

const server = http.createServer(app);
const io = new Server(server, { 
    cors: { 
        origin: "*", // 3. Разрешаем Socket.io работать с любым клиентом
        methods: ["GET", "POST"]
    } 
});

const DB_FILE = './database.json';

// --- Дальше идет твой остальной код базы данных ---

let db = { users: [], messages: [] };
if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE));
}

const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

io.on('connection', (socket) => {
    console.log('Юзер в сети:', socket.id);

    // Логика регистрации, входа и сообщений (оставляем как была)
    socket.on('register', (data) => {
        const exists = db.users.find(u => u.nick === data.nick || u.email === data.email);
        if (exists) {
            socket.emit('auth_error', 'Ник или почта уже заняты!');
        } else {
            db.users.push(data);
            saveDB();
            socket.emit('auth_success', data);
        }
    });

    socket.on('login', (data) => {
        const user = db.users.find(u => u.email === data.email && u.pass === data.pass);
        if (!user) socket.emit('auth_error', 'Ошибка входа!');
        else socket.emit('login_ok', user);
    });

    socket.on('send_msg', (msg) => {
        db.messages.push(msg);
        saveDB();
        io.emit('new_msg', msg);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Сервер пашет на порту ${PORT}`));