const { neon } = require('@neondatabase/serverless');

// جلب الرابط من الإعدادات (DATABASE_URL هو الاسم الرسمي في Neon)
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.error("❌ لا يوجد رابط قاعدة بيانات! تأكد من إضافة DATABASE_URL في Vercel");
}

const sql = neon(connectionString);

// دالة فارغة لضمان توافق الملف مع server.js
async function initDatabase() {
    return Promise.resolve();
}

// --- العمليات على الأقسام (Categories) ---

async function getCategories() {
    try {
        const rows = await sql`SELECT * FROM categories ORDER BY id ASC`;
        return rows;
    } catch (err) {
        console.error("خطأ في جلب الأقسام:", err.message);
        return [];
    }
}

async function addCategory({ name, image }) {
    const rows = await sql`INSERT INTO categories (name, image) VALUES (${name}, ${image}) RETURNING *`;
    return rows[0];
}

// --- العمليات على المنتجات (Products) ---

async function getProducts() {
    try {
        const rows = await sql`SELECT *, image as image_path FROM products ORDER BY id ASC`;
        return rows;
    } catch (err) {
        console.error("خطأ في جلب المنتجات:", err.message);
        return [];
    }
}

async function getProduct(id) {
    const rows = await sql`SELECT *, image as image_path FROM products WHERE id = ${id}`;
    return rows[0];
}

async function addProduct(p) {
    const rows = await sql`
        INSERT INTO products (name, price, image, category_id) 
        VALUES (${p.name}, ${p.price}, ${p.image}, ${p.category_id}) 
        RETURNING *`;
    return rows[0];
}

// --- الإعدادات (Settings) ---

async function getSetting(key) {
    try {
        const rows = await sql`SELECT value FROM settings WHERE key = ${key}`;
        return rows.length > 0 ? rows[0].value : null;
    } catch (err) { return null; }
}

async function setSetting(key, value) {
    const rows = await sql`
        INSERT INTO settings (key, value) VALUES (${key}, ${value}) 
        ON CONFLICT (key) DO UPDATE SET value = ${value} 
        RETURNING *`;
    return rows[0];
}

// --- تصدير الدوال (تأكد من وجود جميع الأسماء التي يطلبها server.js) ---
module.exports = {
    initDatabase,
    getCategories,
    addCategory,
    getProducts,
    getProduct,
    addProduct,
    getSetting,
    setSetting,
    // دوال احتياطية لعدم كسر السيرفر
    updateCategory: async (id, {name, image}) => { return await sql`UPDATE categories SET name=${name}, image=${image} WHERE id=${id} RETURNING *`; },
    deleteCategory: async (id) => { return await sql`DELETE FROM categories WHERE id=${id} RETURNING *`; },
    updateProduct: async (id, p) => { return await sql`UPDATE products SET name=${p.name}, price=${p.price} WHERE id=${id} RETURNING *`; },
    deleteProduct: async (id) => { return await sql`DELETE FROM products WHERE id=${id} RETURNING *`; },
    deleteProductOptions: async () => {},
    addProductOption: async () => {},
    getProductOptions: async () => []
};