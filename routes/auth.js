'use strict';

const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Mock user data storage (in place of a database)
let users = [];

// User registration route
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    res.status(201).send('User registered!');
});

// User login route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
        res.send('Login successful!');
    } else {
        res.status(400).send('Invalid credentials.');
    }
});

// User logout route
router.post('/logout', (req, res) => {
    // Handle logout logic (e.g., destroy session)
    res.send('Logout successful!');
});

module.exports = router;
