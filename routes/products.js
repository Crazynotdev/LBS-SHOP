const express = require('express');
const pool = require('../config/db');
const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [products] = await connection.query('SELECT * FROM products');
        connection.release();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [product] = await connection.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        connection.release();
        res.json(product[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create product (admin only)
router.post('/', async (req, res) => {
    const { name, description, price, stock_quantity, category_id } = req.body;
    try {
        const connection = await pool.getConnection();
        await connection.query(
            'INSERT INTO products (name, description, price, stock_quantity, category_id) VALUES (?, ?, ?, ?, ?)',
            [name, description, price, stock_quantity, category_id]
        );
        connection.release();
        res.status(201).json({ message: 'Product created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update product (admin only)
router.put('/:id', async (req, res) => {
    const { name, description, price, stock_quantity, category_id } = req.body;
    try {
        const connection = await pool.getConnection();
        await connection.query(
            'UPDATE products SET name = ?, description = ?, price = ?, stock_quantity = ?, category_id = ? WHERE id = ?',
            [name, description, price, stock_quantity, category_id, req.params.id]
        );
        connection.release();
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete product (admin only)
router.delete('/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        connection.release();
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;