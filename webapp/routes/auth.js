const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Signup Page
router.get('/signup', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/home');
    }
    res.render('signup', { error: null });
});

// Handle Signup
router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existing = await User.findOne({ 
            $or: [{ email: email.toLowerCase() }, { username }] 
        });
        if (existing) {
            return res.render('signup', { error: 'Username or email already registered.' });
        }
        const user = new User({ username, email, password });
        await user.save();
        res.redirect('/login');
    } catch (err) {
        console.error('Signup error:', err);
        res.render('signup', { error: 'Error processing account creation.' });
    }
});

// Login Page
router.get('/login', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/home');
    }
    res.render('login', { error: null });
});

// Handle Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({
            $or: [{ username }, { email: username.toLowerCase() }]
        });
        if (!user || !(await user.comparePassword(password))) {
            return res.render('login', { error: 'Invalid username or password.' });
        }

        req.session.user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        };
        res.redirect('/home');
    } catch (err) {
        console.error('Login error:', err);
        res.render('login', { error: 'Authentication service failure.' });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// About Page
router.get('/about', (req, res) => {
    res.render('about', { user: req.session.user || null });
});

module.exports = router;