const { createClient } = require('@vercel/postgres');

async function getCategories() {
  const client = createClient({
    connectionString: process.env.POSTGRES_URL,
  });
  
  try {
    await client.connect();
    const { rows } = await client.query('SELECT * FROM categories ORDER BY id ASC');
    return rows;
  } catch (error) {
    console.error('Database Error:', error);
    return [];
  } finally {
    await client.end();
  }
}

// أضف أي دالة أخرى تحتاجها هنا بنفس الطريقة
module.exports = { getCategories };