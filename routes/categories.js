const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [categories] = await connection.query('SELECT * FROM categories');
        connection.release();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get category by ID
router.get('/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [category] = await connection.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
        connection.release();
        res.json(category[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create category (admin only)
router.post('/', async (req, res) => {
    const { name } = req.body;
    try {
        const connection = await pool.getConnection();
        await connection.query('INSERT INTO categories (name) VALUES (?)', [name]);
        connection.release();
        res.status(201).json({ message: 'Category created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update category (admin only)
router.put('/:id', async (req, res) => {
    const { name } = req.body;
    try {
        const connection = await pool.getConnection();
        await connection.query('UPDATE categories SET name = ? WHERE id = ?', [name, req.params.id]);
        connection.release();
        res.json({ message: 'Category updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete category (admin only)
router.delete('/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
        connection.release();
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;