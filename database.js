const { sql } = require('@vercel/postgres');

// 1. دالة التمهيد (لكي لا ينهار السيرفر عند استدعائها)
async function initDatabase() {
  console.log("Postgres connected via Neon");
  return Promise.resolve();
}

// 2. جلب الأقسام
async function getCategories() {
  try {
    const { rows } = await sql`SELECT * FROM categories ORDER BY id ASC`;
    return rows;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

// 3. جلب المنتجات (أساسية جداً للمنيو)
async function getProducts(categoryId = null) {
  try {
    if (categoryId) {
      const { rows } = await sql`SELECT * FROM products WHERE category_id = ${categoryId} ORDER BY id ASC`;
      return rows;
    }
    const { rows } = await sql`SELECT * FROM products ORDER BY id ASC`;
    return rows;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// 4. جلب الإعدادات (مثل اسم المطعم والعملة)
async function getSettings() {
  try {
    const { rows } = await sql`SELECT * FROM settings`;
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return settings;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return {};
  }
}

// 5. تصدير كل الدوال التي قد يطلبها server.js
module.exports = { 
  initDatabase, 
  getCategories,
  getProducts,
  getSettings,
  sql 
};