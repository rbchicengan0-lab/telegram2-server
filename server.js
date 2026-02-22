const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const DB_FILE = './database.json';

// Загрузка базы данных
let db = { users: [], messages: [] };
if (fs.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DB_FILE));
    } catch (e) {
        console.log("Ошибка чтения базы, создаем новую.");
    }
}

const saveDB = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};

io.on('connection', (socket) => {
    console.log('Пользователь подключился:', socket.id);

    // РЕГИСТРАЦИЯ
    socket.on('register', (userData) => {
        const exists = db.users.find(u => u.email === userData.email || u.nick === userData.nick);
        if (exists) {
            socket.emit('auth_error', 'Email или Ник уже заняты!');
        } else {
            db.users.push(userData);
            saveDB();
            socket.emit('login_ok', userData);
        }
    });

    // ВХОД
    socket.on('login', (data) => {
        const user = db.users.find(u => u.email === data.email && u.pass === data.pass);
        if (user) {
            socket.emit('login_ok', user);
        } else {
            socket.emit('auth_error', 'Неверный email или пароль!');
        }
    });

    // СТРОГИЙ ПОИСК ЮЗЕРА (только существующие)
    socket.on('find_user', (nick) => {
        const found = db.users.find(u => u.nick.toLowerCase() === nick.toLowerCase());
        if (found) {
            socket.emit('user_found', { 
                nick: found.nick, 
                avatar: found.avatar, 
                fio: found.fio 
            });
        }
    });

    // ОБНОВЛЕНИЕ ПРОФИЛЯ
    socket.on('update_profile', (updatedUser) => {
        const index = db.users.findIndex(u => u.email === updatedUser.email);
        if (index !== -1) {
            db.users[index] = { ...db.users[index], ...updatedUser };
            saveDB();
        }
    });

    // ОТПРАВКА СООБЩЕНИЯ
    socket.on('send_msg', (msg) => {
        // Добавляем время и сохраняем в историю
        const fullMsg = { 
            ...msg, 
            id: Date.now(),
            time: new Date().toLocaleTimeString() 
        };
        db.messages.push(fullMsg);
        saveDB();

        // Рассылаем всем (клиент сам отфильтрует, кому это нужно)
        io.emit('new_msg', fullMsg);
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился');
    });
});

const PORT = process.env.PORT || 10000; // Render использует 10000 по умолчанию
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер пашет на порту ${PORT}`);
});