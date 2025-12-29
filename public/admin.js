// متغيرات عامة
let categories = [];
let products = [];
let allProducts = []; // نسخة كاملة من جميع المنتجات للبحث
let currentCategoryFilter = '';
let cropper = null;
let currentProductIdForOptions = null;

// تحميل البيانات عند فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
    initializeAdmin();
});

// تهيئة لوحة التحكم
async function initializeAdmin() {
    try {
        await Promise.all([
            loadCategories(),
            loadProducts(),
            loadSettings()
        ]);
        setupTabs();
        console.log('✓ تم تحميل لوحة التحكم بنجاح');
    } catch (error) {
        console.error('✗ خطأ في تحميل لوحة التحكم:', error);
        showNotification('حدث خطأ في تحميل البيانات', 'error');
    }
}

// إعداد التبويبات
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

// ==================== الأقسام ====================

// تحميل الأقسام
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('فشل تحميل الأقسام');
        
        categories = await response.json();
        displayCategories();
        populateCategorySelects();
    } catch (error) {
        console.error('خطأ في تحميل الأقسام:', error);
        showNotification('حدث خطأ في تحميل الأقسام', 'error');
    }
}

// عرض الأقسام
function displayCategories() {
    const container = document.getElementById('categories-list');
    if (!container) return;
    
    container.innerHTML = '';

    if (categories.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد أقسام. اضغط "إضافة قسم جديد" لبدء الإضافة.</div>';
        return;
    }

    categories.forEach(category => {
        const card = document.createElement('div');
        card.className = 'category-card';
        const columns = parseInt(category.columns_per_row) || 4;
        card.innerHTML = `
            <div class="category-header">
                <h3>${category.name}</h3>
                <span class="category-badge">ترتيب: ${category.display_order}</span>
            </div>
            <div class="form-group" style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #841535;">عدد الأعمدة في السطر:</label>
                <select id="columns_${category.id}" class="category-columns-select" onchange="updateCategoryColumns(${category.id})">
                    <option value="1" ${columns === 1 ? 'selected' : ''}>عمود واحد</option>
                    <option value="2" ${columns === 2 ? 'selected' : ''}>عمودان</option>
                    <option value="3" ${columns === 3 ? 'selected' : ''}>ثلاثة أعمدة</option>
                    <option value="4" ${columns === 4 ? 'selected' : ''}>أربعة أعمدة</option>
                </select>
            </div>
            <div class="category-card-actions">
                <button class="btn btn-edit" onclick="editCategory(${category.id})">
                    <span>✏️</span> تعديل
                </button>
                <button class="btn btn-danger" onclick="deleteCategory(${category.id})">
                    <span>🗑️</span> حذف
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// تحديث عدد الأعمدة مباشرة
async function updateCategoryColumns(categoryId) {
    const selectElement = document.getElementById(`columns_${categoryId}`);
    if (!selectElement) return;
    
    const columns = parseInt(selectElement.value) || 4;
    const originalValue = selectElement.value;
    
    try {
        const category = categories.find(c => c.id == categoryId);
        if (!category) {
            showNotification('القسم غير موجود', 'error');
            selectElement.value = originalValue;
            return;
        }
        
        const categoryData = {
            name: category.name,
            display_order: category.display_order || 1,
            columns_per_row: columns
        };
        
        const response = await fetch(`/api/categories/${categoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });
        
        if (response.ok) {
            const updatedCategory = await response.json();
            const index = categories.findIndex(c => c.id == categoryId);
            if (index !== -1) {
                categories[index] = updatedCategory;
            }
            
            await loadCategories();
            await loadProducts();
            showNotification('تم تحديث عدد الأعمدة بنجاح', 'success');
        } else {
            const error = await response.json();
            showNotification('حدث خطأ: ' + (error.error || 'خطأ غير معروف'), 'error');
            selectElement.value = category.columns_per_row || 4;
        }
    } catch (error) {
        console.error('خطأ في تحديث عدد الأعمدة:', error);
        showNotification('حدث خطأ في تحديث عدد الأعمدة', 'error');
        selectElement.value = category.columns_per_row || 4;
    }
}

// فتح نافذة إضافة/تعديل قسم
function openCategoryModal(categoryId = null) {
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    const title = document.getElementById('categoryModalTitle');
    
    form.reset();
    document.getElementById('categoryId').value = '';
    
    if (categoryId) {
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            title.textContent = 'تعديل قسم';
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name;
            document.getElementById('categoryOrder').value = category.display_order || 1;
            document.getElementById('categoryColumns').value = category.columns_per_row || 4;
        }
    } else {
        title.textContent = 'إضافة قسم جديد';
        document.getElementById('categoryColumns').value = 4;
    }
    
    modal.classList.add('active');
}

// إغلاق نافذة القسم
function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

// حفظ قسم
async function saveCategory(event) {
    event.preventDefault();
    
    const categoryId = document.getElementById('categoryId').value;
    const categoryData = {
        name: document.getElementById('categoryName').value.trim(),
        display_order: parseInt(document.getElementById('categoryOrder').value) || 1,
        columns_per_row: parseInt(document.getElementById('categoryColumns').value) || 4
    };
    
    if (!categoryData.name) {
        showNotification('يرجى إدخال اسم القسم', 'error');
        return;
    }
    
    try {
        const url = categoryId ? `/api/categories/${categoryId}` : '/api/categories';
        const method = categoryId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });
        
        if (response.ok) {
            closeCategoryModal();
            await loadCategories();
            await loadProducts();
            showNotification(categoryId ? 'تم تحديث القسم بنجاح' : 'تم إضافة القسم بنجاح', 'success');
        } else {
            const error = await response.json();
            showNotification('حدث خطأ: ' + (error.error || 'خطأ غير معروف'), 'error');
        }
    } catch (error) {
        console.error('خطأ في حفظ القسم:', error);
        showNotification('حدث خطأ في حفظ القسم', 'error');
    }
}

// تعديل قسم
function editCategory(id) {
    openCategoryModal(id);
}

// حذف قسم
async function deleteCategory(id) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا القسم؟\nسيتم حذف جميع المنتجات التابعة له.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/categories/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadCategories();
            await loadProducts();
            showNotification('تم حذف القسم بنجاح', 'success');
        } else {
            showNotification('حدث خطأ في حذف القسم', 'error');
        }
    } catch (error) {
        console.error('خطأ في حذف القسم:', error);
        showNotification('حدث خطأ في حذف القسم', 'error');
    }
}

// ==================== المنتجات ====================

// تحميل المنتجات
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('فشل تحميل المنتجات');
        
        products = await response.json();
        allProducts = [...products]; // نسخة للبحث
        displayProducts();
        populateCategorySelects();
    } catch (error) {
        console.error('خطأ في تحميل المنتجات:', error);
        showNotification('حدث خطأ في تحميل المنتجات', 'error');
    }
}

// عرض المنتجات
function displayProducts() {
    const container = document.getElementById('products-list');
    if (!container) return;
    
    container.innerHTML = '';

    let filteredProducts = products;
    
    // فلترة حسب القسم
    if (currentCategoryFilter) {
        filteredProducts = filteredProducts.filter(p => p.category_id == currentCategoryFilter);
    }

    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد منتجات. اضغط "إضافة منتج جديد" لبدء الإضافة.</div>';
        return;
    }

    // ترتيب المنتجات حسب display_order
    filteredProducts.sort((a, b) => (a.display_order || 1) - (b.display_order || 1));

    filteredProducts.forEach((product, index) => {
        const category = categories.find(c => c.id === product.category_id);
        const card = document.createElement('div');
        card.className = 'product-card sortable-item';
        card.dataset.productId = product.id;
        card.dataset.currentOrder = product.display_order || (index + 1);
        
        const optionsCount = product.options ? product.options.length : 0;
        const displayOrder = product.display_order || (index + 1);
        
        card.innerHTML = `
            <div class="drag-handle" style="position: absolute; top: 5px; left: 5px; cursor: move; color: #841535; font-size: 1.2em; z-index: 10; padding: 3px 6px; background: rgba(255,255,255,0.9); border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                ☰
            </div>
            <div class="order-badge" style="position: absolute; top: 5px; right: 5px; background: #841535; color: white; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 0.75em;">
                ترتيب: ${displayOrder}
            </div>
            <div class="product-card-image-container">
                <img src="${product.image_path || 'https://via.placeholder.com/300x300/841535/FFFFFF?text=' + encodeURIComponent(product.name)}" 
                     alt="${product.name}" 
                     class="product-card-image"
                     onerror="this.src='https://via.placeholder.com/300x300/841535/FFFFFF?text=${encodeURIComponent(product.name)}'">
                ${optionsCount > 0 ? `<span class="options-badge">${optionsCount} خيار</span>` : ''}
            </div>
            <div class="product-card-info">
                <h3>${product.name}</h3>
                <p class="product-description">${product.description || 'لا يوجد وصف'}</p>
                <div class="product-meta">
                    <span class="product-price">${product.price} ريال</span>
                    <span class="product-category">${category ? category.name : 'غير محدد'}</span>
                </div>
                <div class="product-card-actions">
                    <button class="btn btn-edit" onclick="editProduct(${product.id})">
                        <span>✏️</span> تعديل
                    </button>
                    <button class="btn ${product.is_visible ? 'btn-warning' : 'btn-success'}" onclick="toggleProductVisibility(${product.id})" title="${product.is_visible ? 'إخفاء من القائمة' : 'إظهار في القائمة'}">
                        <span>${product.is_visible ? '👁️' : '👁️‍🗨️'}</span> ${product.is_visible ? 'إخفاء' : 'إظهار'}
                    </button>
                    <button class="btn btn-danger" onclick="deleteProduct(${product.id})">
                        <span>🗑️</span> حذف
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // تهيئة Sortable
    if (typeof Sortable !== 'undefined') {
        // تدمير أي instance سابقة
        if (container.sortableInstance) {
            container.sortableInstance.destroy();
        }
        
        container.sortableInstance = new Sortable(container, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            forceFallback: true,
            onEnd: async function(evt) {
                const oldIndex = evt.oldIndex;
                const newIndex = evt.newIndex;
                
                if (oldIndex !== newIndex && oldIndex !== undefined && newIndex !== undefined) {
                    await updateProductOrder(evt);
                }
            }
        });
    }
}

// تحديث ترتيب المنتجات بعد السحب
async function updateProductOrder(evt) {
    const container = evt.to;
    const items = Array.from(container.querySelectorAll('.sortable-item'));
    
    try {
        // تحديث الترتيب لكل منتج
        const updatePromises = [];
        items.forEach((item, index) => {
            const productId = parseInt(item.dataset.productId);
            const newOrder = index + 1; // يبدأ من 1
            
            // البحث عن المنتج في القائمة
            const product = products.find(p => p.id == productId);
            if (product) {
                // تحديث المنتج
                const formData = new FormData();
                formData.append('category_id', product.category_id);
                formData.append('name', product.name);
                formData.append('description', product.description || '');
                formData.append('price', product.price);
                formData.append('display_order', newOrder);
                
                // إذا كان هناك صورة
                if (product.image_path) {
                    formData.append('image_path', product.image_path);
                }
                
                updatePromises.push(
                    fetch(`/api/products/${productId}`, {
                        method: 'PUT',
                        body: formData
                    }).then(async (response) => {
                        if (response.ok) {
                            // تحديث القيمة المحلية
                            product.display_order = newOrder;
                            // تحديث رقم الترتيب في البطاقة
                            const orderBadge = item.querySelector('.order-badge');
                            if (orderBadge) {
                                orderBadge.textContent = `ترتيب: ${newOrder}`;
                            }
                        }
                        return response;
                    })
                );
            }
        });
        
        await Promise.all(updatePromises);
        
        // إعادة ترتيب القائمة المحلية
        products.sort((a, b) => (a.display_order || 1) - (b.display_order || 1));
        
        // لا حاجة لإعادة تحميل كامل - فقط تحديث العرض
        // displayProducts(); // لا نحتاج لإعادة الرسم لأننا حدثنا البطاقات مباشرة
    } catch (error) {
        console.error('خطأ في تحديث الترتيب:', error);
        showNotification('حدث خطأ في تحديث الترتيب', 'error');
        await loadProducts(); // إعادة تحميل في حالة الخطأ
    }
}

// فلترة المنتجات
function filterProducts() {
    currentCategoryFilter = document.getElementById('categoryFilter').value;
    displayProducts();
}

// بحث في المنتجات
function searchProducts() {
    const searchTerm = document.getElementById('searchProducts').value.toLowerCase().trim();
    
    if (!searchTerm) {
        products = [...allProducts];
        displayProducts();
        return;
    }
    
    products = allProducts.filter(product => {
        const nameMatch = product.name.toLowerCase().includes(searchTerm);
        const descMatch = product.description && product.description.toLowerCase().includes(searchTerm);
        return nameMatch || descMatch;
    });
    
    displayProducts();
}

// ملء قوائم الأقسام في النماذج
function populateCategorySelects() {
    const productCategory = document.getElementById('productCategory');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (productCategory) {
        productCategory.innerHTML = '<option value="">اختر القسم</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            productCategory.appendChild(option);
        });
    }

    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="">جميع الأقسام</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            categoryFilter.appendChild(option);
        });
    }
}

// فتح نافذة إضافة/تعديل منتج
async function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('productModalTitle');
    
    form.reset();
    document.getElementById('productId').value = '';
    document.getElementById('productImagePreview').innerHTML = '';
    document.getElementById('productOptionsList').innerHTML = '';
    document.getElementById('imageCropContainer').style.display = 'none';
    document.getElementById('imageCropData').value = '';
    document.getElementById('productImage').value = '';
    currentProductIdForOptions = null;
    
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    
    if (productId) {
        try {
            const response = await fetch(`/api/products/${productId}`);
            if (!response.ok) throw new Error('فشل تحميل المنتج');
            
            const product = await response.json();
            
            if (product) {
                title.textContent = 'تعديل منتج';
                document.getElementById('productId').value = product.id;
                document.getElementById('productName').value = product.name || '';
                document.getElementById('productDescription').value = product.description || '';
                document.getElementById('productPrice').value = product.price || '';
                document.getElementById('productCategory').value = product.category_id || '';
                document.getElementById('productOrder').value = product.display_order || 1;
                
                if (product.image_path) {
                    document.getElementById('productImagePreview').innerHTML = 
                        `<img src="${product.image_path}" alt="Preview" style="width: 200px; height: 200px; border-radius: 5px; object-fit: cover; aspect-ratio: 1/1; display: block;">`;
                }
                
                currentProductIdForOptions = product.id;
                
                // تحميل الخيارات من API
                try {
                    const optionsResponse = await fetch(`/api/products/${product.id}/options`);
                    if (optionsResponse.ok) {
                        const options = await optionsResponse.json();
                        if (options && Array.isArray(options) && options.length > 0) {
                            options.forEach(option => {
                                addProductOption();
                                const items = document.querySelectorAll('.product-option-item');
                                const lastItem = items[items.length - 1];
                                if (lastItem) {
                                    lastItem.querySelector('.option-name').value = option.name || '';
                                    lastItem.querySelector('.option-price').value = option.price || '';
                                    lastItem.dataset.optionId = option.id;
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error('خطأ في تحميل الخيارات:', error);
                }
            }
        } catch (error) {
            console.error('خطأ في تحميل المنتج:', error);
            showNotification('حدث خطأ في تحميل المنتج', 'error');
        }
    } else {
        title.textContent = 'إضافة منتج جديد';
    }
    
    modal.classList.add('active');
}

// إغلاق نافذة المنتج
function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    currentProductIdForOptions = null;
}

// حفظ منتج
async function saveProduct(event) {
    event.preventDefault();
    
    const formData = new FormData();
    const productId = document.getElementById('productId').value;
    
    formData.append('category_id', document.getElementById('productCategory').value);
    formData.append('name', document.getElementById('productName').value.trim());
    formData.append('description', document.getElementById('productDescription').value.trim());
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('display_order', parseInt(document.getElementById('productOrder').value) || 1);
    formData.append('is_visible', document.getElementById('productVisible').checked ? 1 : 0);
    
    const cropData = document.getElementById('imageCropData').value;
    if (cropData) {
        formData.append('image_crop_data', cropData);
    }
    
    const options = getProductOptions();
    formData.append('options', JSON.stringify(options));
    
    const imageFile = document.getElementById('productImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    try {
        const url = productId ? `/api/products/${productId}` : '/api/products';
        const method = productId ? 'PUT' : 'POST';
        
        showNotification('جاري الحفظ...', 'info');
        
        const response = await fetch(url, {
            method: method,
            body: formData
        });
        
        if (response.ok) {
            const savedProduct = await response.json();
            currentProductIdForOptions = savedProduct.id;
            
            // حفظ الخيارات بعد حفظ المنتج
            if (options.length > 0) {
                await saveProductOptionsToDB(savedProduct.id, options);
            }
            
            closeProductModal();
            await loadProducts();
            showNotification(productId ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح', 'success');
        } else {
            const error = await response.json();
            showNotification('حدث خطأ: ' + (error.error || 'خطأ غير معروف'), 'error');
        }
    } catch (error) {
        console.error('خطأ في حفظ المنتج:', error);
        showNotification('حدث خطأ في حفظ المنتج', 'error');
    }
}

// حفظ الخيارات في قاعدة البيانات
async function saveProduct(event) {
    event.preventDefault();
    
    // جلب البيانات من النموذج
    const productId = document.getElementById('productId').value;
    const imgElement = document.getElementById('currentBase64Image');
    
    const productData = {
        category_id: document.getElementById('productCategory').value,
        name: document.getElementById('productName').value.trim(),
        description: document.getElementById('productDescription').value.trim(),
        price: document.getElementById('productPrice').value,
        display_order: parseInt(document.getElementById('productOrder').value) || 1,
        is_visible: document.getElementById('productVisible').checked ? 1 : 0,
        // نأخذ نص الصورة من المعاينة مباشرة
        image_path: imgElement ? imgElement.src : null 
    };

    try {
        const url = productId ? `/api/products/${productId}` : '/api/products';
        const method = productId ? 'PUT' : 'POST';
        
        showNotification('جاري الحفظ...', 'info');
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' }, // نرسل بيانات JSON عادية
            body: JSON.stringify(productData)
        });
        
        if (response.ok) {
            closeProductModal();
            await loadProducts();
            showNotification('تم حفظ المنتج بنجاح!', 'success');
        } else {
            const error = await response.json();
            showNotification('خطأ: ' + error.error, 'error');
        }
    } catch (error) {
        showNotification('حدث خطأ في الاتصال بالسيرفر', 'error');
    }
}

// تعديل منتج
function editProduct(id) {
    openProductModal(id);
}

// حذف منتج
async function deleteProduct(id) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا المنتج؟')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadProducts();
            showNotification('تم حذف المنتج بنجاح', 'success');
        } else {
            showNotification('حدث خطأ في حذف المنتج', 'error');
        }
    } catch (error) {
        console.error('خطأ في حذف المنتج:', error);
        showNotification('حدث خطأ في حذف المنتج', 'error');
    }
}

// ==================== إدارة الصور مع Crop ====================

// دالة لتحويل الصورة إلى نص (Base64) عشان تنحفظ في الداتابيز
// دالة معالجة الصورة وتحويلها لنص جاهز للحفظ
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // التأكد من حجم الصورة (يفضل أقل من 1 ميجا لسرعة الداتابيز)
    if (file.size > 1024 * 1024) {
        alert("الصورة كبيرة جداً، يرجى اختيار صورة أقل من 1 ميجابايت");
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onloadend = function() {
        const base64String = reader.result;
        // عرض المعاينة
        const preview = document.getElementById('productImagePreview');
        preview.innerHTML = `<img src="${base64String}" id="currentBase64Image" style="width: 200px; height: 200px; border-radius: 5px; object-fit: cover;">`;
        console.log("✅ الصورة تحولت لنص وجاهزة للحفظ");
    };
    reader.readAsDataURL(file);
}

function initCropper(img) {
    if (cropper) {
        cropper.destroy();
    }
    
    cropper = new Cropper(img, {
        aspectRatio: 1,
        viewMode: 1,
        guides: true,
        background: false,
        autoCropArea: 0.8,
        responsive: true
    });
}

function cancelCrop() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    document.getElementById('imageCropContainer').style.display = 'none';
    document.getElementById('productImage').value = '';
    document.getElementById('productImagePreview').innerHTML = '';
    document.getElementById('imageCropData').value = '';
}

function cropImage() {
    if (!cropper) {
        showNotification('يرجى رفع صورة أولاً', 'error');
        return;
    }
    
    try {
        const canvas = cropper.getCroppedCanvas({
            width: 400,
            height: 400,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });
        
        if (canvas) {
            const preview = document.getElementById('productImagePreview');
            const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            preview.innerHTML = '<img src="' + croppedDataUrl + '" style="width: 200px; height: 200px; border-radius: 5px; object-fit: cover; aspect-ratio: 1/1; display: block;">';
            
            const cropData = cropper.getData();
            document.getElementById('imageCropData').value = JSON.stringify(cropData);
            
            document.getElementById('imageCropContainer').style.display = 'none';
            
            canvas.toBlob(function(blob) {
                if (blob) {
                    const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    document.getElementById('productImage').files = dataTransfer.files;
                    showNotification('تم قص الصورة بنجاح!', 'success');
                } else {
                    showNotification('حدث خطأ في قص الصورة', 'error');
                }
            }, 'image/jpeg', 0.9);
        } else {
            showNotification('حدث خطأ في إنشاء الصورة المقطوعة', 'error');
        }
    } catch (error) {
        console.error('خطأ في crop:', error);
        showNotification('حدث خطأ في قص الصورة: ' + error.message, 'error');
    }
}

// ==================== إدارة خيارات المنتج ====================

function addProductOption() {
    const container = document.getElementById('productOptionsList');
    if (!container) {
        console.error('عنصر productOptionsList غير موجود');
        return;
    }
    
    const optionDiv = document.createElement('div');
    optionDiv.className = 'product-option-item';
    optionDiv.innerHTML = `
        <input type="text" placeholder="اسم الخيار (مثل: وجبة)" class="option-name" onblur="saveProductOptionsIfNeeded()">
        <input type="number" placeholder="السعر" step="0.01" min="0" class="option-price" onblur="saveProductOptionsIfNeeded()">
        <button type="button" class="btn btn-danger btn-small" onclick="removeProductOption(this)">
            <span>🗑️</span>
        </button>
    `;
    optionDiv.dataset.tempId = Date.now();
    container.appendChild(optionDiv);
}

async function removeProductOption(btn) {
    const optionItem = btn.closest('.product-option-item');
    if (!optionItem) return;
    
    const optionId = optionItem.dataset.optionId;
    
    // إذا كان هناك optionId حقيقي (من قاعدة البيانات)، احذفه
    if (optionId && !isNaN(optionId) && parseInt(optionId) > 1000000 && currentProductIdForOptions) {
        try {
            await fetch(`/api/options/${optionId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('خطأ في حذف الخيار:', error);
        }
    }
    
    optionItem.remove();
    
    // حفظ الخيارات المتبقية
    if (currentProductIdForOptions) {
        await saveProductOptionsIfNeeded();
    }
}

function getProductOptions() {
    const items = document.querySelectorAll('.product-option-item');
    const options = [];
    items.forEach((item, index) => {
        const nameInput = item.querySelector('.option-name');
        const priceInput = item.querySelector('.option-price');
        if (nameInput && priceInput) {
            const name = nameInput.value.trim();
            const price = priceInput.value.trim();
            if (name && price && !isNaN(parseFloat(price))) {
                options.push({
                    name: name,
                    price: parseFloat(price),
                    display_order: index
                });
            }
        }
    });
    return options;
}

// حفظ الخيارات إذا كان المنتج محفوظاً
async function saveProductOptionsIfNeeded() {
    if (!currentProductIdForOptions) {
        return; // سيتم حفظها عند حفظ المنتج
    }
    
    const options = getProductOptions();
    
    try {
        // حذف الخيارات القديمة
        const existingOptionsResponse = await fetch(`/api/products/${currentProductIdForOptions}/options`);
        if (existingOptionsResponse.ok) {
            const existingOptions = await existingOptionsResponse.json();
            for (const opt of existingOptions) {
                await fetch(`/api/options/${opt.id}`, {
                    method: 'DELETE'
                });
            }
        }
        
        // إضافة الخيارات الجديدة
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.name && option.price) {
                const response = await fetch(`/api/products/${currentProductIdForOptions}/options`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: option.name,
                        price: option.price,
                        display_order: i
                    })
                });
                
                if (response.ok) {
                    const savedOption = await response.json();
                    const optionItems = document.querySelectorAll('.product-option-item');
                    if (optionItems[i]) {
                        optionItems[i].dataset.optionId = savedOption.id;
                    }
                }
            }
        }
        
        await loadProducts();
    } catch (error) {
        console.error('خطأ في حفظ الخيارات:', error);
    }
}

// ==================== الإعدادات ====================

async function loadSettings() {
    try {
        // تحميل الشعار
        const logoResponse = await fetch('/api/settings/logo');
        if (logoResponse.ok) {
            const logoSetting = await logoResponse.json();
            if (logoSetting && logoSetting.value) {
                const preview = document.getElementById('logoPreview');
                preview.innerHTML = `<img src="${logoSetting.value}" alt="الشعار" style="width: 200px; height: 200px; object-fit: cover; aspect-ratio: 1/1; border-radius: 5px; border: 2px solid #ddd;">`;
            }
        }

        // تحميل صورة الهيدر
        const headerResponse = await fetch('/api/settings/header_image');
        if (headerResponse.ok) {
            const headerSetting = await headerResponse.json();
            if (headerSetting && headerSetting.value) {
                const preview = document.getElementById('headerPreview');
                preview.innerHTML = `<img src="${headerSetting.value}" alt="صورة الهيدر" style="width: 100%; max-width: 600px; height: 200px; object-fit: cover; border-radius: 5px; border: 2px solid #ddd;">`;
            }
        }
    } catch (error) {
        console.error('خطأ في تحميل الإعدادات:', error);
    }
}

async function uploadLogo() {
    const fileInput = document.getElementById('logoUpload');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const uploadResponse = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData
        });
        
        if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            
            const settingsResponse = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'logo',
                    value: result.image_path
                })
            });
            
            if (settingsResponse.ok) {
                await loadSettings();
                showNotification('تم رفع الشعار بنجاح!', 'success');
            }
        } else {
            const error = await uploadResponse.json();
            showNotification('حدث خطأ: ' + (error.error || 'خطأ غير معروف'), 'error');
        }
    } catch (error) {
        console.error('خطأ في رفع الشعار:', error);
        showNotification('حدث خطأ في رفع الشعار', 'error');
    }
}

async function uploadHeader() {
    const fileInput = document.getElementById('headerUpload');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        showNotification('جاري رفع صورة الهيدر...', 'info');
        
        const uploadResponse = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData
        });
        
        if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            
            const settingsResponse = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    key: 'header_image',
                    value: result.image_path
                })
            });
            
            if (settingsResponse.ok) {
                await loadSettings();
                showNotification('تم رفع صورة الهيدر بنجاح!', 'success');
            } else {
                showNotification('حدث خطأ في حفظ صورة الهيدر', 'error');
            }
        } else {
            const error = await uploadResponse.json();
            showNotification('حدث خطأ: ' + (error.error || 'خطأ غير معروف'), 'error');
        }
    } catch (error) {
        console.error('خطأ في رفع صورة الهيدر:', error);
        showNotification('حدث خطأ في رفع صورة الهيدر', 'error');
    }
}

// ==================== إشعارات ====================

function showNotification(message, type = 'info') {
    // إزالة الإشعارات القديمة
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== استيراد وتصدير القائمة ====================

// تصدير القائمة الكاملة بصيغة Excel
async function exportMenu() {
    try {
        showNotification('جاري تصدير القائمة...', 'info');
        
        // جمع جميع البيانات
        const [categoriesData, productsData, logoData] = await Promise.all([
            fetch('/api/categories').then(res => res.json()),
            fetch('/api/products').then(res => res.json()),
            fetch('/api/settings/logo').then(res => res.json())
        ]);

        // تحميل الخيارات لكل منتج
        const productsWithOptions = await Promise.all(
            productsData.map(async (product) => {
                try {
                    const optionsResponse = await fetch(`/api/products/${product.id}/options`);
                    if (optionsResponse.ok) {
                        const options = await optionsResponse.json();
                        product.options = Array.isArray(options) ? options : [];
                    } else {
                        product.options = [];
                    }
                } catch (error) {
                    console.error(`خطأ في تحميل خيارات المنتج ${product.id}:`, error);
                    product.options = [];
                }
                return product;
            })
        );

        // إنشاء مصنف Excel
        const wb = XLSX.utils.book_new();

        // ورقة واحدة رئيسية تحتوي على جميع المنتجات بتفاصيلها الكاملة
        const productsSheetData = [];
        
        productsWithOptions.forEach((product, index) => {
            const category = categoriesData.find(c => c.id === product.category_id);
            
            // سطر المنتج الأساسي
            const baseRow = {
                'رقم المنتج': index + 1,
                'ID المنتج': product.id,
                'اسم المنتج': product.name || '',
                'القسم': category ? category.name : '',
                'ID القسم': product.category_id || '',
                'وصف المنتج': product.description || '',
                'السعر الأساسي': product.price || 0,
                'مسار الصورة': product.image_path || '',
                'ترتيب العرض': product.display_order || 0,
                'عدد الخيارات': product.options ? product.options.length : 0
            };
            
            // إذا كان هناك خيارات، نضيفها في نفس السطر
            if (product.options && product.options.length > 0) {
                product.options.forEach((option, optIndex) => {
                    baseRow[`خيار ${optIndex + 1} - الاسم`] = option.name || '';
                    baseRow[`خيار ${optIndex + 1} - السعر`] = option.price || 0;
                });
            }
            
            productsSheetData.push(baseRow);
        });

        // إضافة سطر رأس يحتوي على جميع الأعمدة الممكنة (لضمان وجود جميع الأعمدة)
        const maxOptions = Math.max(...productsWithOptions.map(p => (p.options ? p.options.length : 0)), 0);
        const headerRow = {
            'رقم المنتج': 'رقم المنتج',
            'ID المنتج': 'ID المنتج',
            'اسم المنتج': 'اسم المنتج',
            'القسم': 'القسم',
            'ID القسم': 'ID القسم',
            'وصف المنتج': 'وصف المنتج',
            'السعر الأساسي': 'السعر الأساسي',
            'مسار الصورة': 'مسار الصورة',
            'ترتيب العرض': 'ترتيب العرض',
            'عدد الخيارات': 'عدد الخيارات'
        };
        
        for (let i = 1; i <= maxOptions; i++) {
            headerRow[`خيار ${i} - الاسم`] = `خيار ${i} - الاسم`;
            headerRow[`خيار ${i} - السعر`] = `خيار ${i} - السعر`;
        }
        
        // إنشاء الورقة
        const productsSheet = XLSX.utils.json_to_sheet(productsSheetData);
        
        // تعيين عرض الأعمدة
        const colWidths = [
            { wch: 12 }, // رقم المنتج
            { wch: 12 }, // ID المنتج
            { wch: 25 }, // اسم المنتج
            { wch: 20 }, // القسم
            { wch: 12 }, // ID القسم
            { wch: 40 }, // وصف المنتج
            { wch: 15 }, // السعر الأساسي
            { wch: 30 }, // مسار الصورة
            { wch: 12 }, // ترتيب العرض
            { wch: 12 }  // عدد الخيارات
        ];
        
        // إضافة أعمدة للخيارات
        for (let i = 0; i < maxOptions; i++) {
            colWidths.push({ wch: 20 }); // اسم الخيار
            colWidths.push({ wch: 15 }); // سعر الخيار
        }
        
        productsSheet['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, productsSheet, 'المنتجات');

        // ورقة الأقسام (مرجعية)
        const categoriesSheet = XLSX.utils.json_to_sheet(
            categoriesData.map(cat => ({
                'ID القسم': cat.id,
                'اسم القسم': cat.name,
                'ترتيب العرض': cat.display_order || 0,
                'عدد الأعمدة في السطر': cat.columns_per_row || 4
            }))
        );
        categoriesSheet['!cols'] = [
            { wch: 12 },
            { wch: 25 },
            { wch: 15 },
            { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(wb, categoriesSheet, 'الأقسام');

        // تصدير الملف
        const fileName = `menu_backup_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showNotification('تم تصدير القائمة بنجاح!', 'success');
    } catch (error) {
        console.error('خطأ في تصدير القائمة:', error);
        showNotification('حدث خطأ في تصدير القائمة', 'error');
    }
}

async function importMenu(event) {
    console.log('🔵 بدء استيراد القائمة...');
    const file = event.target.files[0];
    if (!file) {
        console.log('❌ لم يتم اختيار ملف');
        return;
    }

    console.log('📄 اسم الملف:', file.name);

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showNotification('يرجى اختيار ملف Excel صحيح (.xlsx أو .xls)', 'error');
        event.target.value = '';
        return;
    }

    if (!confirm('⚠️ تحذير: سيتم حذف جميع القائمة الحالية واستبدالها بالملف الجديد. هل أنت متأكد؟')) {
        event.target.value = '';
        return;
    }

    try {
        showNotification('جاري قراءة الملف...', 'info');
        console.log('📖 جاري قراءة الملف...');
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        
        console.log('📊 أوراق الملف:', workbook.SheetNames);

        // البحث عن ورقة المنتجات (قد تكون بأسماء مختلفة)
        let productsSheet = workbook.Sheets['المنتجات'];
        if (!productsSheet) {
            // البحث في جميع الأوراق
            for (const sheetName of workbook.SheetNames) {
                if (sheetName.includes('منتج') || sheetName.includes('Product')) {
                    productsSheet = workbook.Sheets[sheetName];
                    console.log('✅ تم العثور على ورقة:', sheetName);
                    break;
                }
            }
        }
        
        if (!productsSheet) {
            // إذا لم نجد، نستخدم الورقة الأولى
            if (workbook.SheetNames.length > 0) {
                productsSheet = workbook.Sheets[workbook.SheetNames[0]];
                console.log('⚠️ استخدام الورقة الأولى:', workbook.SheetNames[0]);
            }
        }
        
        if (!productsSheet) {
            throw new Error('لم يتم العثور على أي ورقة في الملف');
        }
        
        const productsData = XLSX.utils.sheet_to_json(productsSheet);
        console.log('📦 عدد المنتجات في الملف:', productsData.length);
        console.log('📋 عينة من البيانات:', productsData.slice(0, 2));
        
        if (!productsData || productsData.length === 0) {
            throw new Error('لا توجد منتجات في الملف');
        }

        // 1. تنظيف البيانات القديمة
        showNotification('جاري تنظيف القائمة الحالية...', 'info');
        const oldProducts = await fetch('/api/products').then(res => res.json());
        for (const p of oldProducts) {
            await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
        }
        
        const oldCats = await fetch('/api/categories').then(res => res.json());
        for (const c of oldCats) {
            await fetch(`/api/categories/${c.id}`, { method: 'DELETE' });
        }

        // 2. إنشاء الأقسام وربطها
        showNotification('جاري إنشاء الأقسام...', 'info');
        const categoryNameMap = {};
        
        // محاولة قراءة الأعمدة المختلفة للقسم
        const categoryColumnNames = ['القسم', 'اسم القسم', 'Category', 'category', 'قسم'];
        let categoryColumn = null;
        for (const colName of categoryColumnNames) {
            if (productsData[0] && productsData[0][colName]) {
                categoryColumn = colName;
                console.log('✅ تم العثور على عمود القسم:', colName);
                break;
            }
        }
        
        if (!categoryColumn) {
            console.warn('⚠️ لم يتم العثور على عمود القسم، سيتم استخدام "قسم افتراضي"');
            categoryColumn = 'القسم';
        }
        
        // جمع جميع الأقسام من المنتجات
        const allCategories = productsData.map(p => {
            const cat = p[categoryColumn];
            return cat ? String(cat).trim() : null;
        }).filter(Boolean);
        const uniqueCategories = [...new Set(allCategories)];
        console.log('📂 جميع الأقسام في الملف:', allCategories);
        console.log('📂 الأقسام الفريدة:', uniqueCategories);
        
        if (uniqueCategories.length === 0) {
            throw new Error('لم يتم العثور على أي أقسام في الملف. تأكد من وجود عمود "القسم" في ملف Excel.');
        }
        
        // إنشاء الأقسام واحداً تلو الآخر مع انتظار كل واحد
        for (const catName of uniqueCategories) {
            if (!catName) {
                console.warn('⚠️ تخطي قسم فارغ');
                continue;
            }
            
            const catNameStr = String(catName).trim();
            if (!catNameStr) continue;
            
            try {
                console.log(`📤 جاري إنشاء القسم: "${catNameStr}"`);
                const res = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        name: catNameStr, 
                        display_order: 1,
                        columns_per_row: 4
                    })
                });
                
                if (res.ok) {
                    let newCat = await res.json();
                    console.log(`📦 Response من API:`, newCat);
                    
                    // معالجة الـ response - قد يكون array أو object
                    if (Array.isArray(newCat)) {
                        newCat = newCat[0] || newCat;
                    }
                    
                    // التأكد من أن newCat يحتوي على id
                    let catId = null;
                    if (newCat && typeof newCat === 'object') {
                        catId = newCat.id || newCat.ID || newCat.Id;
                    }
                    
                    if (!catId) {
                        console.error(`❌ لم يتم العثور على ID في response:`, newCat);
                        console.error(`❌ نوع الـ response:`, typeof newCat);
                        console.error(`❌ هل هو array:`, Array.isArray(newCat));
                        continue;
                    }
                    
                    // حفظ القسم بجميع الأشكال الممكنة
                    categoryNameMap[catName] = catId;  // الاسم الأصلي من uniqueCategories
                    categoryNameMap[catNameStr] = catId;  // الاسم المطهر
                    // حفظ أيضاً بدون مسافات إضافية
                    categoryNameMap[catName.replace(/\s+/g, ' ').trim()] = catId;
                    console.log(`✅ تم إنشاء القسم: "${catNameStr}" (ID: ${catId})`);
                    console.log(`   📌 محفوظ كـ: "${catName}", "${catNameStr}"`);
                } else {
                    const errorText = await res.text();
                    let error;
                    try {
                        error = JSON.parse(errorText);
                    } catch {
                        error = { error: errorText };
                    }
                    console.error(`❌ خطأ في إنشاء القسم "${catNameStr}":`, error);
                    console.error(`❌ Status: ${res.status} ${res.statusText}`);
                    console.error(`❌ Response:`, errorText);
                }
            } catch (error) {
                console.error(`❌ خطأ في إنشاء القسم "${catNameStr}":`, error);
                console.error(`❌ Stack:`, error.stack);
            }
        }
        
        console.log('🗺️ خريطة الأقسام النهائية:', categoryNameMap);
        console.log('🗺️ مفاتيح الخريطة:', Object.keys(categoryNameMap));
        
        if (Object.keys(categoryNameMap).length === 0) {
            throw new Error('فشل في إنشاء أي قسم. تأكد من صحة البيانات في ملف Excel.');
        }

        // 3. استيراد المنتجات
        showNotification('جاري استيراد المنتجات...', 'info');
        let successCount = 0;
        let errorCount = 0;
        
        // محاولة قراءة أسماء الأعمدة المختلفة
        const nameColumns = ['اسم المنتج', 'الاسم', 'Name', 'name', 'اسم'];
        const descColumns = ['وصف المنتج', 'الوصف', 'Description', 'description', 'وصف'];
        const priceColumns = ['السعر الأساسي', 'السعر', 'Price', 'price', 'سعر'];
        const orderColumns = ['ترتيب العرض', 'الترتيب', 'Order', 'order', 'ترتيب'];
        
        let nameColumn = nameColumns.find(col => productsData[0] && productsData[0][col]) || 'اسم المنتج';
        let descColumn = descColumns.find(col => productsData[0] && productsData[0][col]) || 'وصف المنتج';
        let priceColumn = priceColumns.find(col => productsData[0] && productsData[0][col]) || 'السعر الأساسي';
        let orderColumn = orderColumns.find(col => productsData[0] && productsData[0][col]) || 'ترتيب العرض';
        
        console.log('📝 أعمدة البيانات:', { nameColumn, descColumn, priceColumn, orderColumn, categoryColumn });
        console.log('🗺️ خريطة الأقسام:', categoryNameMap);
        console.log('📋 أول منتج كمثال:', productsData[0]);
        
        for (let i = 0; i < productsData.length; i++) {
            const item = productsData[i];
            
            console.log(`\n🔄 معالجة المنتج ${i + 1}:`, item);
            
            // البحث عن ID القسم
            const originalCategoryName = item[categoryColumn];
            let categoryName = originalCategoryName ? String(originalCategoryName) : '';
            const trimmedCategoryName = categoryName.trim();
            
            // البحث في الخريطة بعدة طرق
            let catId = categoryNameMap[originalCategoryName] || 
                       categoryNameMap[categoryName] ||
                       categoryNameMap[trimmedCategoryName] ||
                       categoryNameMap[categoryName.replace(/\s+/g, ' ').trim()];
            
            console.log(`📂 القسم من الملف (الأصلي): "${originalCategoryName}"`);
            console.log(`📂 القسم بعد String: "${categoryName}"`);
            console.log(`📂 القسم بعد trim: "${trimmedCategoryName}"`);
            console.log(`📂 ID القسم: ${catId}`);
            
            if (!catId) {
                // محاولة البحث في جميع المفاتيح
                console.log(`📂 جميع مفاتيح الخريطة:`, Object.keys(categoryNameMap));
                
                // البحث بدون مسافات إضافية
                const normalizedOriginal = originalCategoryName ? String(originalCategoryName).replace(/\s+/g, ' ').trim() : '';
                const normalizedTrimmed = trimmedCategoryName.replace(/\s+/g, ' ').trim();
                
                for (const key in categoryNameMap) {
                    const normalizedKey = key.replace(/\s+/g, ' ').trim();
                    if (normalizedKey === normalizedOriginal || normalizedKey === normalizedTrimmed) {
                        catId = categoryNameMap[key];
                        console.log(`✅ تم العثور على القسم بعد تطبيع الأسماء: "${key}" → ${catId}`);
                        break;
                    }
                }
            }
            
            if (!catId) {
                const catName = item[categoryColumn] || 'غير محدد';
                console.warn(`⚠️ القسم "${catName}" غير موجود في categoryNameMap`);
                console.warn(`⚠️ الأقسام المتاحة:`, Object.keys(categoryNameMap));
                console.warn(`⚠️ تم تخطي المنتج: ${item[nameColumn] || 'بدون اسم'}`);
                errorCount++;
                continue;
            }

            // جمع الخيارات من الأعمدة
            const productOptions = [];
            let optionIndex = 1;
            while (item[`خيار ${optionIndex} - الاسم`] && item[`خيار ${optionIndex} - السعر`]) {
                productOptions.push({
                    name: item[`خيار ${optionIndex} - الاسم`],
                    price: parseFloat(item[`خيار ${optionIndex} - السعر`]) || 0,
                    display_order: optionIndex - 1
                });
                optionIndex++;
            }

            // استخدام FormData لإرسال البيانات
            const formData = new FormData();
            const productName = String(item[nameColumn] || 'بدون اسم');
            const productDesc = String(item[descColumn] || '');
            const productPrice = parseFloat(item[priceColumn]) || 0;
            const productOrder = parseInt(item[orderColumn]) || (i + 1);
            
            formData.append('category_id', String(catId));
            formData.append('name', productName);
            formData.append('description', productDesc);
            formData.append('price', productPrice);
            formData.append('display_order', productOrder);
            formData.append('is_visible', item['إظهار في القائمة'] !== undefined ? (item['إظهار في القائمة'] ? 1 : 0) : 1);
            
            // إضافة الخيارات
            if (productOptions.length > 0) {
                formData.append('options', JSON.stringify(productOptions));
                console.log(`  📦 الخيارات:`, productOptions);
            } else {
                formData.append('options', JSON.stringify([]));
            }
            
            // إذا كان هناك مسار صورة، نضيفه
            if (item['مسار الصورة']) {
                formData.append('image_path', item['مسار الصورة']);
                console.log(`  🖼️ مسار الصورة:`, item['مسار الصورة']);
            }
            
            // طباعة بيانات FormData للتحقق
            console.log(`  📤 البيانات المرسلة:`, {
                category_id: catId,
                name: productName,
                description: productDesc,
                price: productPrice,
                display_order: productOrder,
                options_count: productOptions.length
            });

            try {
                const productName = item[nameColumn] || 'بدون اسم';
                console.log(`📤 جاري إرسال المنتج ${i + 1}/${productsData.length}: ${productName}`);
                console.log('📋 بيانات المنتج:', {
                    category_id: catId,
                    name: item[nameColumn],
                    description: item[descColumn],
                    price: item[priceColumn],
                    display_order: item[orderColumn]
                });
                
                const response = await fetch('/api/products', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const savedProduct = await response.json();
                    successCount++;
                    console.log(`✅ تم حفظ المنتج: ${productName} (ID: ${savedProduct.id})`);
                } else {
                    let errorText = '';
                    try {
                        const error = await response.json();
                        errorText = error.error || JSON.stringify(error);
                        console.error(`❌ خطأ في استيراد المنتج ${productName}:`, error);
                        console.error(`❌ تفاصيل الخطأ:`, {
                            status: response.status,
                            statusText: response.statusText,
                            error: errorText
                        });
                    } catch (e) {
                        errorText = await response.text();
                        console.error(`❌ خطأ في استيراد المنتج ${productName}:`, {
                            status: response.status,
                            statusText: response.statusText,
                            error: errorText
                        });
                    }
                    errorCount++;
                }
            } catch (error) {
                console.error(`❌ خطأ في استيراد المنتج ${item[nameColumn] || 'بدون اسم'}:`, error);
                console.error('❌ تفاصيل الخطأ:', error.message, error.stack);
                errorCount++;
            }
        }
        
        console.log(`📊 النتيجة: ${successCount} نجح، ${errorCount} فشل`);

        // إعادة تحميل البيانات
        await loadCategories();
        await loadProducts();
        
        if (errorCount > 0) {
            showNotification(`تم استيراد ${successCount} منتج بنجاح، وحدث خطأ في ${errorCount} منتج`, 'info');
        } else {
            showNotification(`تم استيراد ${successCount} منتج بنجاح!`, 'success');
        }
    } catch (error) {
        console.error('خطأ في استيراد القائمة:', error);
        showNotification('حدث خطأ في استيراد القائمة: ' + error.message, 'error');
    } finally {
        event.target.value = '';
    }
}

// إغلاق النوافذ عند النقر خارجها
window.onclick = function(event) {
    const productModal = document.getElementById('productModal');
    const categoryModal = document.getElementById('categoryModal');
    
    if (event.target === productModal) {
        closeProductModal();
    }
    if (event.target === categoryModal) {
        closeCategoryModal();
    }
}
