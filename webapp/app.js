require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const http = require('http');
const socketIo = require('socket.io');

const authRoutes = require('./routes/auth');
const screeningRoutes = require('./routes/screening');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// View Engine
app.set('view engine', 'ejs');

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connection established successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

// Global Application Routes
app.get('/', (req, res) => res.redirect('/home'));

app.get('/home', (req, res) => {
    res.render('home', { user: req.session.user || null });
});

app.get('/community', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.render('community', { user: req.session.user });
});

// Mount modular routes
app.use(authRoutes);
app.use(screeningRoutes);

// Socket.io Real-time Community Chat
io.on('connection', (socket) => {
    socket.on('join', (username) => {
        socket.username = username || 'Caregiver';
        io.emit('chat message', {
            sender: 'System',
            text: `${socket.username} joined the community.`
        });
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', {
            sender: socket.username || 'Anonymous',
            text: msg
        });
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            io.emit('chat message', {
                sender: 'System',
                text: `${socket.username} left the community.`
            });
        }
    });
});

server.listen(PORT, () => {
    console.log(`Web application online: http://localhost:${PORT}`);
});