const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Get user profile
router.get('/:userId', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [user] = await connection.query(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            [req.params.userId]
        );
        connection.release();
        if (!user[0]) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
router.put('/:userId', async (req, res) => {
    const { username, email } = req.body;
    try {
        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE users SET username = ?, email = ? WHERE id = ?',
            [username, email, req.params.userId]
        );
        connection.release();
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user order history
router.get('/:userId/orders', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [orders] = await connection.query(
            'SELECT id, total, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC',
            [req.params.userId]
        );
        connection.release();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;