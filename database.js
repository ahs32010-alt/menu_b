const { neon } = require('@neondatabase/serverless');

// "الصياد": يبحث عن الرابط الصحيح في إعدادات فيرسال
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
    console.error("❌ لا يوجد رابط قاعدة بيانات! تأكد من ربط Neon بالمشروع في Vercel");
}

const sql = neon(connectionString);

// دالة فارغة لضمان عدم تعطل server.js
async function initDatabase() {
    return Promise.resolve();
}

// --- الدوال الأساسية المطلوبة ---

async function getCategories() {
    try {
        const rows = await sql`SELECT * FROM categories ORDER BY id ASC`;
        return rows;
    } catch (err) { 
        console.error("Database Error (Categories):", err.message); 
        return []; 
    }
}

async function getProducts() {
    try {
        const rows = await sql`SELECT *, image as image_path FROM products ORDER BY id ASC`;
        return rows;
    } catch (err) { 
        console.error("Database Error (Products):", err.message); 
        return []; 
    }
}

async function getSetting(key) {
    try {
        const rows = await sql`SELECT value FROM settings WHERE key = ${key}`;
        return rows.length > 0 ? rows[0].value : null;
    } catch (err) { return null; }
}

async function addCategory({ name, image }) {
    const rows = await sql`INSERT INTO categories (name, image) VALUES (${name}, ${image}) RETURNING *`;
    return rows[0];
}

// --- باقي الدوال (فارغة مؤقتاً لتجنب الأخطاء) ---
module.exports = {
    initDatabase,
    getCategories,
    addCategory,
    getProducts,
    getSetting,
    getProduct: async (id) => {
        const rows = await sql`SELECT *, image as image_path FROM products WHERE id = ${id}`;
        return rows[0];
    },
    setSetting: async (key, value) => {
        return await sql`INSERT INTO settings (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO UPDATE SET value = ${value} RETURNING *`;
    },
    addProduct: async (p) => {
        const rows = await sql`INSERT INTO products (category_id, name, description, price, image, display_order, is_visible) VALUES (${p.category_id}, ${p.name}, ${p.description}, ${p.price}, ${p.image_path}, ${p.display_order || 1}, ${p.is_visible || 1}) RETURNING *`;
        return rows[0];
    },
    updateCategory: async () => {},
    deleteCategory: async () => {},
    updateProduct: async () => {},
    deleteProduct: async () => {},
    deleteProductOptions: async () => {},
    addProductOption: async () => {},
    getProductOptions: async () => []
};