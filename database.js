const { neon } = require('@neondatabase/serverless');

// تأكد أنك تستخدم المتغيرات الصحيحة
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

async function initDatabase() { return Promise.resolve(); }

async function getCategories() {
    try {
        const rows = await sql`SELECT * FROM categories ORDER BY id ASC`;
        return rows;
    } catch (err) {
        console.error("DB Error:", err);
        return [];
    }
}

async function getProducts() {
    try {
        const rows = await sql`SELECT *, image as image_path FROM products ORDER BY id ASC`;
        return rows;
    } catch (err) { return []; }
}

async function getSetting(key) {
    try {
        const rows = await sql`SELECT value FROM settings WHERE key = ${key}`;
        return rows.length > 0 ? rows[0].value : null;
    } catch (err) { return null; }
}

module.exports = {
    initDatabase,
    getCategories,
    getProducts,
    getSetting,
    addCategory: async (c) => { 
        return await sql`INSERT INTO categories (name, image) VALUES (${c.name}, ${c.image}) RETURNING *`;
    },
    addProduct: async (p) => {
        return await sql`INSERT INTO products (category_id, name, description, price, image, display_order, is_visible) VALUES (${p.category_id}, ${p.name}, ${p.description}, ${p.price}, ${p.image_path}, ${p.display_order || 1}, ${p.is_visible || 1}) RETURNING *`;
    },
    getProduct: async (id) => {
        const rows = await sql`SELECT *, image as image_path FROM products WHERE id = ${id}`;
        return rows[0];
    },
    setSetting: async (k, v) => {
        return await sql`INSERT INTO settings (key, v) VALUES (${k}, ${v}) ON CONFLICT (key) DO UPDATE SET value = ${v} RETURNING *`;
    },
    updateCategory: async () => {},
    deleteCategory: async () => {},
    updateProduct: async () => {},
    deleteProduct: async () => {},
    deleteProductOptions: async () => {},
    addProductOption: async () => {},
    getProductOptions: async () => []
};