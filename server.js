const { sql } = require('@vercel/postgres');

// 1. جلب الأقسام
async function getCategories() {
    const { rows } = await sql`SELECT * FROM categories ORDER BY id ASC`;
    return rows;
}

// 2. إضافة قسم
async function addCategory({ name, image }) {
    const { rows } = await sql`INSERT INTO categories (name, image) VALUES (${name}, ${image}) RETURNING *`;
    return rows[0];
}

// 3. جلب المنتجات
async function getProducts() {
    const { rows } = await sql`SELECT * FROM products ORDER BY id ASC`;
    return rows;
}

// 4. جلب منتج واحد
async function getProduct(id) {
    const { rows } = await sql`SELECT * FROM products WHERE id = ${id}`;
    return rows[0];
}

// 5. إضافة منتج
async function addProduct(p) {
    const { rows } = await sql`
        INSERT INTO products (category_id, name, description, price, image, display_order, is_visible) 
        VALUES (${p.category_id}, ${p.name}, ${p.description}, ${p.price}, ${p.image_path}, ${p.display_order}, ${p.is_visible}) 
        RETURNING *`;
    return rows[0];
}

// 6. الإعدادات (مهمة جداً لظهور الموقع)
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

// 7. خيارات المنتجات (إذا كنت تستخدمها)
async function getProductOptions(productId) {
    const { rows } = await sql`SELECT * FROM products WHERE category_id = ${productId}`; // عدلها حسب جدول الخيارات لو عندك
    return rows;
}

// دالة فارغة لتجنب خطأ التشغيل
async function initDatabase() { return Promise.resolve(); }

module.exports = {
    initDatabase,
    getCategories,
    addCategory,
    getProducts,
    getProduct,
    addProduct,
    getSetting,
    setSetting,
    getProductOptions,
    // أضف أي دوال تحديث أو حذف إذا احتجتها لاحقاً
    updateCategory: async () => {}, 
    deleteCategory: async () => {},
    updateProduct: async () => {},
    deleteProduct: async () => {},
    deleteProductOptions: async () => {},
    addProductOption: async () => {}
};