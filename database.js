const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = neon(connectionString);

async function initDatabase() { return Promise.resolve(); }

// --- الأقسام ---
async function getCategories() {
    try {
        return await sql`SELECT * FROM categories ORDER BY display_order ASC, id ASC`;
    } catch (err) { return []; }
}

// --- المنتجات (تم توحيد image_path هنا) ---
async function getProducts() {
    try {
        // نختار image_path مباشرة
        return await sql`SELECT * FROM products ORDER BY display_order ASC, id ASC`;
    } catch (err) { return []; }
}

async function getProduct(id) {
    const rows = await sql`SELECT * FROM products WHERE id = ${id}`;
    return rows[0];
}

async function addProduct(p) {
    // التأكد من استخدام image_path في الاستعلام
    const rows = await sql`
        INSERT INTO products (category_id, name, description, price, image_path, display_order, is_visible) 
        VALUES (${p.category_id}, ${p.name}, ${p.description}, ${p.price}, ${p.image_path}, ${p.display_order || 1}, ${p.is_visible || 1}) 
        RETURNING *`;
    return rows[0];
}

async function updateProduct(id, p) {
    const rows = await sql`
        UPDATE products 
        SET category_id=${p.category_id}, name=${p.name}, description=${p.description}, 
            price=${p.price}, image_path=${p.image_path}, display_order=${p.display_order}, is_visible=${p.is_visible}
        WHERE id=${id} RETURNING *`;
    return rows[0];
}

// --- الإعدادات ---
async function getSetting(key) {
    try {
        const rows = await sql`SELECT value FROM settings WHERE key = ${key}`;
        return rows.length > 0 ? rows[0].value : null;
    } catch (err) { return null; } 
}

async function setSetting(key, value) {
    return await sql`INSERT INTO settings (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO UPDATE SET value = ${value} RETURNING *`;
}

module.exports = {
    initDatabase, getCategories, getProducts, getProduct, addProduct, updateProduct, getSetting, setSetting,
    addCategory: async ({ name, display_order = 1, columns_per_row = 4 }) => { 
        try {
            // محاولة إضافة مع جميع الأعمدة
            const rows = await sql`INSERT INTO categories (name, display_order, columns_per_row) VALUES (${name}, ${display_order}, ${columns_per_row}) RETURNING *`;
            const result = Array.isArray(rows) ? rows[0] : rows;
            return result || rows;
        } catch (error) {
            // إذا فشل بسبب columns_per_row، نحاول بدونها
            if (error.message && error.message.includes('columns_per_row')) {
                try {
                    const rows = await sql`INSERT INTO categories (name, display_order) VALUES (${name}, ${display_order}) RETURNING *`;
                    const result = Array.isArray(rows) ? rows[0] : rows;
                    return result || rows;
                } catch (error2) {
                    // إذا فشل بسبب display_order أيضاً، نحاول بدونها
                    if (error2.message && error2.message.includes('display_order')) {
                        const rows = await sql`INSERT INTO categories (name) VALUES (${name}) RETURNING *`;
                        const result = Array.isArray(rows) ? rows[0] : rows;
                        return result || rows;
                    }
                    throw error2;
                }
            }
            // إذا فشل بسبب display_order، نحاول بدونها
            if (error.message && error.message.includes('display_order')) {
                const rows = await sql`INSERT INTO categories (name) VALUES (${name}) RETURNING *`;
                const result = Array.isArray(rows) ? rows[0] : rows;
                return result || rows;
            }
            throw error;
        }
    },
    updateCategory: async (id, {name}) => { return await sql`UPDATE categories SET name=${name} WHERE id=${id} RETURNING *`; },
    deleteCategory: async (id) => { return await sql`DELETE FROM categories WHERE id=${id} RETURNING *`; },
    deleteProduct: async (id) => { return await sql`DELETE FROM products WHERE id=${id} RETURNING *`; },
    deleteProductOptions: async () => {}, addProductOption: async () => {}, getProductOptions: async () => []
};