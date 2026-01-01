const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const PORT = 3000;

// إنشاء مجلد الصور إذا لم يكن موجوداً
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log('✓ تم إنشاء مجلد images/');
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/images', express.static('images'));

// دالة لتنظيف اسم الملف (إزالة المسافات والأحرف الخاصة)
function sanitizeFileName(name) {
    return name
        .replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '') // إزالة الأحرف الخاصة
        .replace(/\s+/g, '_') // استبدال المسافات بشرطة سفلية
        .trim();
}

// دالة للحصول على اسم ملف فريد
function getUniqueFileName(productName, ext, imagesDir) {
    const baseName = sanitizeFileName(productName);
    let fileName = baseName + ext;
    let counter = 1;
    
    // التأكد من عدم التكرار
    while (fs.existsSync(path.join(imagesDir, fileName))) {
        fileName = `${baseName}_${counter}${ext}`;
        counter++;
    }
    
    return fileName;
}

// إعداد Multer لرفع الملفات - حفظ باسم المنتج
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // التأكد من وجود المجلد
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }
        cb(null, imagesDir);
    },
    filename: function (req, file, cb) {
        // الحصول على اسم المنتج من body
        const productName = req.body.name || 'product';
        const ext = path.extname(file.originalname).toLowerCase();
        
        // إنشاء اسم ملف فريد بناءً على اسم المنتج
        const fileName = getUniqueFileName(productName, ext, imagesDir);
        cb(null, fileName);
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

        let imagePath = existingProduct.image_path;
        
        // إذا تم رفع صورة جديدة، حذف الصورة القديمة إن وجدت
        if (req.file) {
            // حذف الصورة القديمة إذا كانت موجودة
            if (existingProduct.image_path) {
                const oldImagePath = path.join(__dirname, existingProduct.image_path.replace('/images/', ''));
                if (fs.existsSync(oldImagePath)) {
                    try {
                        fs.unlinkSync(oldImagePath);
                    } catch (err) {
                        console.error('خطأ في حذف الصورة القديمة:', err);
                    }
                }
            }
            imagePath = `/images/${req.file.filename}`;
        } else if (req.body.image_path) {
            imagePath = req.body.image_path;
        }

        const productData = {
            category_id: req.body.category_id,
            name: req.body.name,
            description: req.body.description,
            price: parseFloat(req.body.price),
            image_path: imagePath,
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
        // الحصول على المنتج قبل الحذف لحذف صورته
        const product = await db.getProduct(req.params.id);
        
        // حذف الصورة إذا كانت موجودة
        if (product && product.image_path) {
            const imagePath = path.join(__dirname, product.image_path.replace('/images/', ''));
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                    console.log(`✓ تم حذف الصورة: ${product.image_path}`);
                } catch (err) {
                    console.error('خطأ في حذف الصورة:', err);
                }
            }
        }
        
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

// رفع صورة فقط (للشعار والهيدر) - استخدام اسم عشوائي
const logoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }
        cb(null, imagesDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const logoUpload = multer({ 
    storage: logoStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
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

app.post('/api/upload-image', logoUpload.single('image'), async (req, res) => {
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

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// صفحة الأدمن
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// بدء الخادم
app.listen(PORT, () => {
    console.log(`✓ الخادم يعمل على http://localhost:${PORT}`);
    console.log(`✓ صفحة الأدمن: http://localhost:${PORT}/admin`);
});

