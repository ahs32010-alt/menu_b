const { neon } = require('@neondatabase/serverless');

// الاتصال باستخدام الرابط (سيعمل مع المباشر أو الـ Pooler بدون فرق)
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

// دالة فارغة لضمان عدم تعطل server.js
async function initDatabase() {
    return Promise.resolve();
}

// 1. الأقسام
async function getCategories() {
    try {
        const rows = await sql('SELECT * FROM categories ORDER BY id ASC');
        return rows;
    } catch (err) { console.error(err); return []; }
}

async function addCategory({ name, image }) {
    const rows = await sql('INSERT INTO categories (name, image) VALUES ($1, $2) RETURNING *', [name, image]);
    return rows[0];
}

// 2. المنتجات
async function getProducts() {
    try {
        const rows = await sql('SELECT *, image as image_path FROM products ORDER BY id ASC');
        return rows;
    } catch (err) { console.error(err); return []; }
}

async function getProduct(id) {
    const rows = await sql('SELECT *, image as image_path FROM products WHERE id = $1', [id]);
    return rows[0];
}

async function addProduct(p) {
    const rows = await sql(
        'INSERT INTO products (category_id, name, description, price, image, display_order, is_visible) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [p.category_id, p.name, p.description, p.price, p.image_path, p.display_order || 1, p.is_visible || 1]
    );
    return rows[0];
}

// 3. الإعدادات
async function getSetting(key) {
    const rows = await sql('SELECT value FROM settings WHERE key = $1', [key]);
    return rows.length > 0 ? rows[0].value : null;
}

async function setSetting(key, value) {
    const rows = await sql(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2 RETURNING *',
        [key, value]
    );
    return rows[0];
}

// تصدير كل الدوال التي يحتاجها server.js
module.exports = {
    initDatabase,
    getCategories,
    addCategory,
    getProducts,
    getProduct,
    addProduct,
    getSetting,
    setSetting,
    // دوال إضافية فارغة لتجنب أخطاء "is not a function"
    updateCategory: async () => {},
    deleteCategory: async () => {},
    updateProduct: async () => {},
    deleteProduct: async () => {},
    deleteProductOptions: async () => {},
    addProductOption: async () => {},
    getProductOptions: async () => []
};