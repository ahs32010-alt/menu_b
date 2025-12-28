const { sql } = require('@vercel/postgres');

// دالة فارغة لكي لا يتوقف server.js عن العمل إذا استدعاها
async function initDatabase() {
  console.log("Postgres is ready (Tables created via Neon Console)");
  return Promise.resolve();
}

async function getCategories() {
  try {
    const { rows } = await sql`SELECT * FROM categories ORDER BY id ASC`;
    return rows;
  } catch (error) {
    console.error('Database Error:', error);
    return [];
  }
}

// أضف أي دوال أخرى كان يستدعيها ملف server.js من هنا
module.exports = { 
  initDatabase, 
  getCategories,
  sql 
};