const { neon } = require('@neondatabase/serverless');

// الاتصال باستخدام الرابط الموجود في DATABASE_URL أو POSTGRES_URL
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

async function getCategories() {
  // المكتبة الجديدة تُستخدم كدالة مباشرة
  const rows = await sql('SELECT * FROM categories ORDER BY id ASC');
  return rows;
}

// وهكذا لباقي الدوال...
module.exports = { getCategories, sql };