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
const imagesDir = path.join(__dirname, 'images');
const uploadsDir = path.join(__dirname, 'uploads');

// التأكد من وجود المجلدات
const fs = require('fs');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // استخدام مسار مطلق للتأكد من العمل على السيرفر
        cb(null, imagesDir);
    },
    filename: function (req, file, cb) {
        // إنشاء اسم فريد للملف
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 10 * 1024 * 1024, // 10MB - زيادة الحجم للسماح بصور أكبر
        files: 1
    },
    fileFilter: function (req, file, cb) {
        // السماح بأنواع الصور الشائعة
        const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) || 
                        file.mimetype.startsWith('image/');
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة فقط (JPG, PNG, GIF, WEBP).'));
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
        // معالجة أخطاء multer
        if (req.fileValidationError) {
            return res.status(400).json({ error: req.fileValidationError });
        }
        
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
        // معالجة أخطاء multer
        if (req.fileValidationError) {
            return res.status(400).json({ error: req.fileValidationError });
        }
        
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
        res.status(500).json({ error: error.message });
    }
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

// رفع صورة فقط (للشعار وصورة الهيدر)
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: 'لم يتم رفع أي صورة. تأكد من اختيار ملف صورة صحيح.' 
            });
        }
        
        // إرجاع المسار النسبي للصورة
        const imagePath = `/images/${req.file.filename}`;
        res.json({ 
            image_path: imagePath,
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (error) {
        console.error('خطأ في رفع الصورة:', error);
        
        // معالجة أخطاء multer بشكل أفضل
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    error: 'حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت.' 
                });
            }
            return res.status(400).json({ 
                error: 'خطأ في رفع الملف: ' + error.message 
            });
        }
        
        res.status(500).json({ 
            error: error.message || 'حدث خطأ غير متوقع في رفع الصورة' 
        });
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

