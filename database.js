const { sql } = require('@vercel/postgres');

// 1. جلب وإضافة الأقسام
async function getCategories() {
    const { rows } = await sql`SELECT * FROM categories ORDER BY id ASC`;
    return rows;
}

async function addCategory({ name, image }) {
    const { rows } = await sql`INSERT INTO categories (name, image) VALUES (${name}, ${image}) RETURNING *`;
    return rows[0];
}

async function updateCategory(id, { name, image }) {
    const { rows } = await sql`UPDATE categories SET name=${name}, image=${image} WHERE id=${id} RETURNING *`;
    return rows[0];
}

async function deleteCategory(id) {
    await sql`DELETE FROM products WHERE category_id=${id}`; // حذف المنتجات التابعة للقسم أولاً
    const { rows } = await sql`DELETE FROM categories WHERE id=${id} RETURNING *`;
    return rows[0];
}

// 2. جلب وإضافة المنتجات
async function getProducts() {
    const { rows } = await sql`SELECT * FROM products ORDER BY id ASC`;
    return rows;
}

async function getProduct(id) {
    const { rows } = await sql`SELECT * FROM products WHERE id = ${id}`;
    return rows[0];
}

async function addProduct(p) {
    const { rows } = await sql`
        INSERT INTO products (category_id, name, description, price, image, display_order, is_visible) 
        VALUES (${p.category_id}, ${p.name}, ${p.description}, ${p.price}, ${p.image_path}, ${p.display_order}, ${p.is_visible}) 
        RETURNING *`;
    return rows[0];
}

async function updateProduct(id, p) {
    const { rows } = await sql`
        UPDATE products SET 
        category_id=${p.category_id}, name=${p.name}, description=${p.description}, 
        price=${p.price}, image=${p.image_path}, display_order=${p.display_order}, is_visible=${p.is_visible} 
        WHERE id=${id} RETURNING *`;
    return rows[0];
}

async function deleteProduct(id) {
    const { rows } = await sql`DELETE FROM products WHERE id=${id} RETURNING *`;
    return rows[0];
}

// 3. الإعدادات
async function getSetting(key) {
    const { rows } = await sql`SELECT value FROM settings WHERE key = ${key}`;
    return rows.length > 0 ? rows[0].value : null;
}

async function setSetting(key, value) {
    const { rows } = await sql`
        INSERT INTO settings (key, value) VALUES (${key}, ${value}) 
        ON CONFLICT (key) DO UPDATE SET value = ${value} 
        RETURNING *`;
    return rows[0];
}

// 4. خيارات المنتجات والتعريفات الإضافية
async function initDatabase() { return Promise.resolve(); }
async function deleteProductOptions(id) { await sql`DELETE FROM products WHERE category_id=${id} AND 1=0`; } // مثال
async function addProductOption() { return Promise.resolve(); }
async function getProductOptions() { return []; }

module.exports = {
    initDatabase,
    getCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getProducts,
    getProduct,
    addProduct,
    updateProduct,
    deleteProduct,
    getSetting,
    setSetting,
    deleteProductOptions,
    addProductOption,
    getProductOptions,
    sql
};