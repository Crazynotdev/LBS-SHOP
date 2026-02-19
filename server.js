const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

// ⚙️ CONFIGURATION
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'lbs_shop_secret_2026';
const DB_PATH = path.join(__dirname, 'db');

// 📁 Créer les dossiers s'ils n'existent pas
if (!fs.existsSync(DB_PATH)) fs.mkdirSync(DB_PATH, { recursive: true });
if (!fs.existsSync(path.join(__dirname, 'uploads'))) fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

// 🔧 MIDDLEWARE
app.use(express.json());
app.use(cors());
app.use(express.static('frontend/public'));
app.use('/uploads', express.static('uploads'));

// 📸 MULTER CONFIG
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// 🗄️ DATABASE HELPERS
const getDB = (filename) => {
  const filePath = path.join(DB_PATH, filename);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const saveDB = (filename, data) => {
  fs.writeFileSync(path.join(DB_PATH, filename), JSON.stringify(data, null, 2));
};

// 🔐 MIDDLEWARE AUTHENTIFICATION
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès administrateur requis' });
  }
  next();
};

// ════════════════════════════════════════════════════════════════
// 🔐 AUTHENTIFICATION ROUTES
// ════════════════════════════════════════════════════════════════

// 📝 INSCRIPTION
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const users = getDB('users.json');

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      password: hashedPassword,
      role: 'client',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveDB('users.json', users);

    const token = jwt.sign({ id: newUser.id, email, role: 'client' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Inscription réussie', token, user: { id: newUser.id, email, name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔓 CONNEXION
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = getDB('users.json');
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Connexion réussie', token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 👨 ADMIN LOGIN
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = getDB('users.json');
    const admin = users.find(u => u.email === email && u.role === 'admin');

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ error: 'Identifiants admin invalides' });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Connexion admin réussie', token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 🛍️ PRODUITS ROUTES
// ════════════════════════════════════════════════════════════════

// 📦 GET TOUS LES PRODUITS
app.get('/api/products', (req, res) => {
  try {
    const products = getDB('products.json');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📦 GET UN PRODUIT
app.get('/api/products/:id', (req, res) => {
  try {
    const products = getDB('products.json');
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Produit non trouvé' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➕ AJOUTER UN PRODUIT (ADMIN)
app.post('/api/products', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
  try {
    const { name, price, category, description, stock } = req.body;
    const products = getDB('products.json');
    const newProduct = {
      id: Date.now().toString(),
      name,
      price: parseFloat(price),
      category,
      description,
      stock: parseInt(stock),
      image: req.file ? `/uploads/${req.file.filename}` : '/images/default.jpg',
      active: true,
      createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    saveDB('products.json', products);
    res.json({ message: 'Produit créé', product: newProduct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ MODIFIER UN PRODUIT (ADMIN)
app.put('/api/products/:id', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
  try {
    const products = getDB('products.json');
    const index = products.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Produit non trouvé' });

    const updated = {
      ...products[index],
      name: req.body.name || products[index].name,
      price: req.body.price ? parseFloat(req.body.price) : products[index].price,
      category: req.body.category || products[index].category,
      description: req.body.description || products[index].description,
      stock: req.body.stock ? parseInt(req.body.stock) : products[index].stock,
      image: req.file ? `/uploads/${req.file.filename}` : products[index].image,
      updatedAt: new Date().toISOString()
    };

    products[index] = updated;
    saveDB('products.json', products);
    res.json({ message: 'Produit modifié', product: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🗑️ SUPPRIMER UN PRODUIT (ADMIN)
app.delete('/api/products/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    let products = getDB('products.json');
    products = products.filter(p => p.id !== req.params.id);
    saveDB('products.json', products);
    res.json({ message: 'Produit supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 🛒 PANIER & COMMANDES
// ════════════════════════════════════════════════════════════════

// 📦 GET PANIER
app.get('/api/cart/:userId', authMiddleware, (req, res) => {
  try {
    const carts = getDB('carts.json');
    const cart = carts.find(c => c.userId === req.params.userId) || { userId: req.params.userId, items: [] };
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➕ AJOUTER AU PANIER
app.post('/api/cart/:userId', authMiddleware, (req, res) => {
  try {
    const { productId, quantity } = req.body;
    let carts = getDB('carts.json');
    let cart = carts.find(c => c.userId === req.params.userId);

    if (!cart) {
      cart = { userId: req.params.userId, items: [] };
      carts.push(cart);
    }

    const existingItem = cart.items.find(i => i.productId === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }

    saveDB('carts.json', carts);
    res.json({ message: 'Produit ajouté', cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🗑️ RETIRER DU PANIER
app.delete('/api/cart/:userId/:productId', authMiddleware, (req, res) => {
  try {
    let carts = getDB('carts.json');
    const cartIndex = carts.findIndex(c => c.userId === req.params.userId);
    if (cartIndex !== -1) {
      carts[cartIndex].items = carts[cartIndex].items.filter(i => i.productId !== req.params.productId);
      saveDB('carts.json', carts);
    }
    res.json({ message: 'Produit retiré' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📋 CRÉER UNE COMMANDE
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { items, total } = req.body;
    const orders = getDB('orders.json');
    const newOrder = {
      id: Date.now().toString(),
      userId: req.user.id,
      items,
      total,
      status: 'en attente',
      createdAt: new Date().toISOString(),
      qrCode: null
    };

    orders.push(newOrder);
    saveDB('orders.json', orders);

    // Vider le panier
    let carts = getDB('carts.json');
    carts = carts.filter(c => c.userId !== req.user.id);
    saveDB('carts.json', carts);

    res.json({ message: 'Commande créée', order: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📦 GET COMMANDES DE L'UTILISATEUR
app.get('/api/orders/user/:userId', authMiddleware, (req, res) => {
  try {
    const orders = getDB('orders.json');
    const userOrders = orders.filter(o => o.userId === req.params.userId);
    res.json(userOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📦 GET TOUTES LES COMMANDES (ADMIN)
app.get('/api/orders', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const orders = getDB('orders.json');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ METTRE À JOUR STATUT COMMANDE (ADMIN)
app.put('/api/orders/:id/status', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { status } = req.body;
    const orders = getDB('orders.json');
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });

    order.status = status;
    saveDB('orders.json', orders);
    res.json({ message: 'Statut mis à jour', order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🎫 GÉNÉRER QR CODE
app.post('/api/qrcode/:orderId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = getDB('orders.json');
    const order = orders.find(o => o.id === req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Commande non trouvée' });

    const qrData = {
      orderId: order.id,
      userId: order.userId,
      total: order.total,
      status: 'payé',
      timestamp: new Date().toISOString()
    };

    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
    order.qrCode = qrCode;
    order.status = 'validée';
    saveDB('orders.json', orders);

    res.json({ message: 'QR Code généré', qrCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// 👥 UTILISATEURS (ADMIN)
// ════════════════════════════════════════════════════════════════

// 👥 GET TOUS LES UTILISATEURS
app.get('/api/users', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const users = getDB('users.json');
    res.json(users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📊 STATISTIQUES
app.get('/api/stats', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const users = getDB('users.json');
    const products = getDB('products.json');
    const orders = getDB('orders.json');

    const totalUsers = users.filter(u => u.role === 'client').length;
    const totalProducts = products.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;

    res.json({
      totalUsers,
      totalProducts,
      totalRevenue,
      totalOrders,
      stats: {
        users: users.length,
        products: products.length,
        orders: orders.length
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🚀 DÉMARRAGE
app.listen(PORT, () => {
  console.log(`✅ Serveur LBS SHOP lancé sur http://localhost:${PORT}`);
});
