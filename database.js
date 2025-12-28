const { createPool } = require('@vercel/postgres');

// إنشاء اتصال مع القاعدة باستخدام الرابط الموجود في Environment Variables
const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
});

// دالة لجلب البيانات كمثال (تأكد من مطابقة أسماء الجداول)
async function getCategories() {
  try {
    const { rows } = await pool.query('SELECT * FROM categories');
    return rows;
  } catch (error) {
    console.error('Database Error:', error);
    return [];
  }
}

module.exports = { pool, getCategories };