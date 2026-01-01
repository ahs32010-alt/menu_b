const express = require('express');
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/images', express.static('images'));
app.use('/uploads', express.static('uploads'));

// إعداد Multer لرفع الملفات
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'images/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة فقط.'));
        }
    }
});

// API Routes - الأقسام
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await db.getCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const category = await db.addCategory(req.body);
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/categories/:id', async (req, res) => {
    try {
        const category = await db.updateCategory(req.params.id, req.body);
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        const result = await db.deleteCategory(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API Routes - المنتجات
app.get('/api/products', async (req, res) => {
    try {
        const products = await db.getProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await db.getProduct(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'المنتج غير موجود' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const productData = {
            category_id: req.body.category_id,
            name: req.body.name,
            description: req.body.description,
            price: parseFloat(req.body.price),
            image_path: req.file ? `/images/${req.file.filename}` : null,
            image_crop_data: req.body.image_crop_data || null,
            display_order: parseInt(req.body.display_order) || 1,
            is_visible: req.body.is_visible !== undefined ? parseInt(req.body.is_visible) : 1
        };
        
        const product = await db.addProduct(productData);
        
        // إضافة الخيارات إذا كانت موجودة
        if (req.body.options) {
            try {
                let options = [];
                if (typeof req.body.options === 'string') {
                    options = JSON.parse(req.body.options);
                } else if (Array.isArray(req.body.options)) {
                    options = req.body.options;
                }
                
                if (Array.isArray(options) && options.length > 0) {
                    for (const option of options) {
                        if (option.name && option.price) {
                            await db.addProductOption({
                                product_id: product.id,
                                name: option.name,
                                price: parseFloat(option.price),
                                display_order: option.display_order || 0
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('خطأ في إضافة الخيارات:', error);
            }
        }
        
        const fullProduct = await db.getProduct(product.id);
        res.json(fullProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const existingProduct = await db.getProduct(req.params.id);
        if (!existingProduct) {
            return res.status(404).json({ error: 'المنتج غير موجود' });
        }

        const productData = {
            category_id: req.body.category_id,
            name: req.body.name,
            description: req.body.description,
            price: parseFloat(req.body.price),
            image_path: req.file ? `/images/${req.file.filename}` : (req.body.image_path || existingProduct.image_path),
            image_crop_data: req.body.image_crop_data !== undefined ? req.body.image_crop_data : existingProduct.image_crop_data,
            display_order: parseInt(req.body.display_order) || 1,
            is_visible: req.body.is_visible !== undefined ? parseInt(req.body.is_visible) : (existingProduct.is_visible !== undefined ? existingProduct.is_visible : 1)
        };
        
        await db.updateProduct(req.params.id, productData);
        
        // تحديث الخيارات
        if (req.body.options !== undefined) {
            // حذف الخيارات القديمة
            await db.deleteProductOptions(req.params.id);
            
            // إضافة الخيارات الجديدة
            try {
                let options = [];
                if (typeof req.body.options === 'string') {
                    options = JSON.parse(req.body.options);
                } else if (Array.isArray(req.body.options)) {
                    options = req.body.options;
                }
                
                if (Array.isArray(options) && options.length > 0) {
                    for (const option of options) {
                        if (option.name && option.price) {
                            await db.addProductOption({
                                product_id: parseInt(req.params.id),
                                name: option.name,
                                price: parseFloat(option.price),
                                display_order: option.display_order || 0
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('خطأ في تحديث الخيارات:', error);
            }
        }
        
        const product = await db.getProduct(req.params.id);
        res.json(product);
    } catch (error) {
        console.error('خطأ في تحديث المنتج:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ في تحديث المنتج' });
    }
});

// معالجة أخطاء multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'حجم الملف كبير جداً. الحد الأقصى 5MB' });
        }
        return res.status(400).json({ error: 'خطأ في رفع الملف: ' + error.message });
    }
    if (error) {
        return res.status(400).json({ error: error.message || 'حدث خطأ في رفع الملف' });
    }
    next();
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const result = await db.deleteProduct(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API Routes - الإعدادات
app.get('/api/settings/:key', async (req, res) => {
    try {
        const value = await db.getSetting(req.params.key);
        res.json({ key: req.params.key, value });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        const result = await db.setSetting(req.body.key, req.body.value);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// رفع صورة فقط (للشعار)
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لم يتم رفع أي صورة' });
        }
        res.json({ image_path: `/images/${req.file.filename}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API Routes - خيارات المنتجات
app.get('/api/products/:id/options', async (req, res) => {
    try {
        const options = await db.getProductOptions(req.params.id);
        res.json(options);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products/:id/options', async (req, res) => {
    try {
        const option = await db.addProductOption({
            product_id: parseInt(req.params.id),
            ...req.body
        });
        res.json(option);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/options/:id', async (req, res) => {
    try {
        const option = await db.updateProductOption(req.params.id, req.body);
        res.json(option);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/options/:id', async (req, res) => {
    try {
        const result = await db.deleteProductOption(req.params.id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// صفحة الأدمن
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// بدء الخادم
async function startServer() {
    try {
        //await db.initDatabase();
        console.log('✓ تم الاتصال بقاعدة البيانات بنجاح');
        
        app.listen(PORT, () => {
            console.log(`✓ الخادم يعمل على http://localhost:${PORT}`);
            console.log(`✓ صفحة الأدمن: http://localhost:${PORT}/admin`);
        });
    } catch (error) {
        console.error('✗ خطأ في بدء الخادم:', error);
        process.exit(1);
    }
}

startServer();

