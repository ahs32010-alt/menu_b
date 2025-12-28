// استيراد مكتبة فيرسال الجديدة
const { sql } = require('@vercel/postgres');

// ملاحظة: فيرسال سيتعرف تلقائياً على DATABASE_URL من ملف .env.local الذي سحبناه

// مثال لكيفية تحويل دالة جلب البيانات:
async function getCategories() {
  try {
    // بدلاً من db.all("SELECT * FROM categories", ...)
    const { rows } = await sql`SELECT * FROM categories ORDER BY id ASC`;
    return rows;
  } catch (error) {
    console.error('خطأ في جلب البيانات:', error);
    return [];
  }
}

// تصدير الدوال لاستخدامها في باقي المشروع
module.exports = { getCategories };

const dbPath = path.join(__dirname, 'menu.db');

// إنشاء مجلدات إذا لم تكن موجودة
const uploadsDir = path.join(__dirname, 'uploads');
const imagesDir = path.join(__dirname, 'images');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

// إنشاء قاعدة البيانات والجداول
function initDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                reject(err);
                return;
            }
        });

        // إنشاء جدول الأقسام
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            display_order INTEGER DEFAULT 0,
            columns_per_row INTEGER DEFAULT 4
        )`, (err) => {
            if (err) {
                reject(err);
                return;
            }
            // إضافة عمود columns_per_row إذا لم يكن موجوداً
            db.run(`ALTER TABLE categories ADD COLUMN columns_per_row INTEGER DEFAULT 4`, (err) => {
                // تجاهل الخطأ إذا كان العمود موجوداً
            });
        });

        // إنشاء جدول المنتجات
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            image_path TEXT,
            image_crop_data TEXT,
            display_order INTEGER DEFAULT 0,
            is_visible INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )`, (err) => {
            if (err) {
                reject(err);
                return;
            }
            // إضافة عمود image_crop_data إذا لم يكن موجوداً
            db.run(`ALTER TABLE products ADD COLUMN image_crop_data TEXT`, (err) => {
                // تجاهل الخطأ إذا كان العمود موجوداً
            });
            // إضافة عمود is_visible إذا لم يكن موجوداً
            db.run(`ALTER TABLE products ADD COLUMN is_visible INTEGER DEFAULT 1`, (err) => {
                // تجاهل الخطأ إذا كان العمود موجوداً
            });
        });

        // إنشاء جدول خيارات المنتجات
        db.run(`CREATE TABLE IF NOT EXISTS product_options (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            display_order INTEGER DEFAULT 0,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) {
                reject(err);
                return;
            }
        });

        // إنشاء جدول الإعدادات (للشعار)
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL UNIQUE,
            value TEXT
        )`, (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            // إدراج البيانات الأولية للأقسام
            db.run(`INSERT OR IGNORE INTO categories (name, display_order) VALUES 
                ('الكريسبي والساندويتش', 1),
                ('البشاميل', 2),
                ('سكت جوعك', 3),
                ('الصوصات', 4),
                ('المشروبات', 5)
            `, (err) => {
                if (err) console.error('Error inserting categories:', err);
            });

            resolve(db);
        });
    });
}

// الحصول على جميع الأقسام
function getCategories() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.all('SELECT * FROM categories ORDER BY display_order', (err, rows) => {
            db.close();
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// الحصول على جميع المنتجات مع أقسامها
function getProducts() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.all(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            JOIN categories c ON p.category_id = c.id 
            ORDER BY c.display_order, p.display_order
        `, (err, rows) => {
            db.close();
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// الحصول على المنتجات حسب القسم
function getProductsByCategory(categoryId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.all('SELECT * FROM products WHERE category_id = ? ORDER BY display_order', [categoryId], (err, rows) => {
            db.close();
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// إضافة منتج جديد
function addProduct(product) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run(
            `INSERT INTO products (category_id, name, description, price, image_path, image_crop_data, display_order, is_visible) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [product.category_id, product.name, product.description, product.price, product.image_path, product.image_crop_data || null, product.display_order || 1, product.is_visible !== undefined ? product.is_visible : 1],
            function(err) {
                if (err) {
                    db.close();
                    reject(err);
                    return;
                }
                const productId = this.lastID;
                resolve({ id: productId, ...product });
            }
        );
    });
}

// تحديث منتج
function updateProduct(id, product) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run(
            `UPDATE products 
             SET category_id = ?, name = ?, description = ?, price = ?, image_path = ?, image_crop_data = ?, display_order = ?, is_visible = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [product.category_id, product.name, product.description, product.price, product.image_path, product.image_crop_data || null, product.display_order || 1, product.is_visible !== undefined ? product.is_visible : 1, id],
            function(err) {
                db.close();
                if (err) reject(err);
                else resolve({ id, ...product });
            }
        );
    });
}

// حذف منتج
function deleteProduct(id) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
            db.close();
            if (err) reject(err);
            else resolve({ deleted: this.changes > 0 });
        });
    });
}

// الحصول على منتج واحد
function getProduct(id) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.get('SELECT * FROM products WHERE id = ?', [id], async (err, row) => {
            if (err) {
                db.close();
                reject(err);
                return;
            }
            if (row) {
                // الحصول على خيارات المنتج
                const options = await getProductOptions(id);
                row.options = options;
            }
            db.close();
            resolve(row);
        });
    });
}

// إضافة قسم جديد
function addCategory(category) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run(
            'INSERT INTO categories (name, display_order, columns_per_row) VALUES (?, ?, ?)',
            [category.name, category.display_order || 1, category.columns_per_row || 4],
            function(err) {
                db.close();
                if (err) reject(err);
                else resolve({ id: this.lastID, ...category });
            }
        );
    });
}

// تحديث قسم
function updateCategory(id, category) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run(
            'UPDATE categories SET name = ?, display_order = ?, columns_per_row = ? WHERE id = ?',
            [category.name, category.display_order || 1, category.columns_per_row || 4, id],
            function(err) {
                db.close();
                if (err) reject(err);
                else resolve({ id, ...category });
            }
        );
    });
}

// حذف قسم
function deleteCategory(id) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
            db.close();
            if (err) reject(err);
            else resolve({ deleted: this.changes > 0 });
        });
    });
}

// الحصول على الإعدادات
function getSetting(key) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
            db.close();
            if (err) reject(err);
            else resolve(row ? row.value : null);
        });
    });
}

// حفظ الإعدادات
function setSetting(key, value) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
            [key, value],
            function(err) {
                db.close();
                if (err) reject(err);
                else resolve({ key, value });
            }
        );
    });
}

// الحصول على خيارات منتج
function getProductOptions(productId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.all('SELECT * FROM product_options WHERE product_id = ? ORDER BY display_order', [productId], (err, rows) => {
            db.close();
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// إضافة خيار منتج
function addProductOption(option) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run(
            'INSERT INTO product_options (product_id, name, price, display_order) VALUES (?, ?, ?, ?)',
            [option.product_id, option.name, option.price, option.display_order || 0],
            function(err) {
                db.close();
                if (err) reject(err);
                else resolve({ id: this.lastID, ...option });
            }
        );
    });
}

// تحديث خيار منتج
function updateProductOption(id, option) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run(
            'UPDATE product_options SET name = ?, price = ?, display_order = ? WHERE id = ?',
            [option.name, option.price, option.display_order || 0, id],
            function(err) {
                db.close();
                if (err) reject(err);
                else resolve({ id, ...option });
            }
        );
    });
}

// حذف خيار منتج
function deleteProductOption(id) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run('DELETE FROM product_options WHERE id = ?', [id], function(err) {
            db.close();
            if (err) reject(err);
            else resolve({ deleted: this.changes > 0 });
        });
    });
}

// حذف جميع خيارات منتج
function deleteProductOptions(productId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run('DELETE FROM product_options WHERE product_id = ?', [productId], function(err) {
            db.close();
            if (err) reject(err);
            else resolve({ deleted: this.changes });
        });
    });
}

module.exports = {
    initDatabase,
    getCategories,
    getProducts,
    getProductsByCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    getProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    getSetting,
    setSetting,
    getProductOptions,
    addProductOption,
    updateProductOption,
    deleteProductOption,
    deleteProductOptions
};

