const { sql } = require('@vercel/postgres');

// دالة لجلب الأقسام (مثال)
async function getCategories() {
  try {
    // استخدم sql مباشرة فهي تتعامل مع الروابط بشكل أوتوماتيكي
    const { rows } = await sql`SELECT * FROM categories ORDER BY id ASC`;
    return rows;
  } catch (error) {
    console.error('Database Error:', error);
    return [];
  }
}

// إذا كنت تحتاج لاستخدام الـ pool في أماكن أخرى، استخدم هذا المصدر:
module.exports = { sql, getCategories };