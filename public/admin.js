// المتغيرات العامة
let products = [];
let categories = [];
let filteredProducts = [];
let currentProductIdForOptions = null;
let imageCropper = null;
let sortableInstance = null;

// ==================== التبويبات ====================
document.addEventListener('DOMContentLoaded', () => {
    // إعداد التبويبات
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // تحميل البيانات
    loadCategories();
    loadProducts();
    loadSettings();
});

function switchTab(tabName) {
    // إخفاء جميع التبويبات
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // إزالة active من جميع الأزرار
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // إظهار التبويب المحدد
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

// ==================== تحميل البيانات ====================
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        categories = await res.json();
        
        // تعبئة قائمة الأقسام في نافذة الإضافة
        const select = document.getElementById('productCategory');
        if (select) {
            select.innerHTML = '<option value="">اختر القسم</option>' + 
                categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
        
        // تعبئة فلتر الأقسام
        const filter = document.getElementById('categoryFilter');
        if (filter) {
            filter.innerHTML = '<option value="">جميع الأقسام</option>' + 
                categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
        
        displayCategories();
    } catch (err) {
        console.error("خطأ في تحميل الأقسام:", err);
    }
}

async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        products = await res.json();
        filteredProducts = [...products];
        displayProducts();
        initSortable();
    } catch (err) {
        document.getElementById('products-list').innerHTML = "خطأ في تحميل البيانات";
        console.error("خطأ في تحميل المنتجات:", err);
    }
}

async function loadSettings() {
    try {
        // تحميل الشعار
        const logoRes = await fetch('/api/settings/logo');
        const logoData = await logoRes.json();
        if (logoData && logoData.value) {
            const logoPreview = document.getElementById('logoPreview');
            if (logoPreview) {
                logoPreview.innerHTML = `<img src="${logoData.value}" alt="الشعار" style="max-width: 200px; max-height: 150px; border-radius: 5px; border: 2px solid #ddd;">`;
            }
        }

        // تحميل صورة الهيدر
        const headerRes = await fetch('/api/settings/header_image');
        const headerData = await headerRes.json();
        if (headerData && headerData.value) {
            const headerPreview = document.getElementById('headerPreview');
            if (headerPreview) {
                headerPreview.innerHTML = `<img src="${headerData.value}" alt="صورة الهيدر" style="max-width: 200px; max-height: 150px; border-radius: 5px; border: 2px solid #ddd;">`;
            }
        }
    } catch (err) {
        console.error("خطأ في تحميل الإعدادات:", err);
    }
}

// ==================== عرض المنتجات ====================
function displayProducts() {
    const container = document.getElementById('products-list');
    if (!container) return;
    
    container.innerHTML = '';

    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد منتجات حالياً.</div>';
        return;
    }

    // ترتيب المنتجات
    filteredProducts.sort((a, b) => (a.display_order || 1) - (b.display_order || 1));

    filteredProducts.forEach((product) => {
        const category = categories.find(c => c.id === product.category_id);
        const card = document.createElement('div');
        card.className = 'product-card sortable-item';
        card.dataset.productId = product.id;
        card.dataset.order = product.display_order || 1;
        
        // تحميل الخيارات
        let optionsCount = 0;
        fetch(`/api/products/${product.id}/options`)
            .then(res => res.json())
            .then(options => {
                if (options && Array.isArray(options)) {
                    optionsCount = options.length;
                    const badge = card.querySelector('.options-badge');
                    if (badge) {
                        badge.textContent = `${optionsCount} خيار`;
                    }
                }
            })
            .catch(() => {});
        
        card.innerHTML = `
            <div class="product-card-image-container">
                <img src="${product.image_path || 'https://via.placeholder.com/150/841535/FFFFFF?text=بدون+صورة'}" 
                     onerror="this.src='https://via.placeholder.com/150/841535/FFFFFF?text=بدون+صورة'" 
                     class="product-card-image">
                ${product.image_path ? '<div class="options-badge">' + (optionsCount > 0 ? optionsCount + ' خيار' : '') + '</div>' : ''}
            </div>
            <div class="product-card-info">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3>${product.name}</h3>
                    <span class="drag-handle" style="cursor: move; font-size: 1.5em; color: #841535;">☰</span>
                </div>
                <p style="color: #666; margin: 0 0 10px 0; font-size: 0.9em;">${product.description || ''}</p>
                <div class="product-meta">
                    <span class="product-price" style="color: #841535; font-weight: bold; font-size: 1.2em;">${product.price} ريال</span>
                    <span class="product-category">${category ? category.name : 'غير محدد'}</span>
                </div>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #666; font-size: 0.85em;">الترتيب: ${product.display_order || 1}</span>
                    <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                        <input type="checkbox" ${product.is_visible !== 0 ? 'checked' : ''} 
                               onchange="toggleProductVisibility(${product.id}, this.checked)" 
                               style="width: auto;">
                        <span style="font-size: 0.9em; color: #666;">إظهار</span>
                    </label>
                </div>
                <div class="product-card-actions" style="margin-top: 15px;">
                    <button class="btn btn-edit" onclick="editProduct(${product.id})">✏️ تعديل</button>
                    <button class="btn btn-danger" onclick="deleteProduct(${product.id})">🗑️ حذف</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // إعادة تهيئة Sortable بعد تحديث DOM
    setTimeout(() => {
        initSortable();
    }, 100);
}

// ==================== السحب والإفلات ====================
function initSortable() {
    const container = document.getElementById('products-list');
    if (!container || sortableInstance) {
        if (sortableInstance) {
            sortableInstance.destroy();
        }
    }

    sortableInstance = new Sortable(container, {
        animation: 150,
        handle: '.drag-handle, .product-card',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: function(evt) {
            updateProductOrder(evt);
        }
    });
}

async function updateProductOrder(evt) {
    const items = evt.to.children;
    const updates = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const productId = item.dataset.productId;
        if (productId) {
            updates.push({
                id: parseInt(productId),
                display_order: i + 1
            });
        }
    }

    // تحديث الترتيب في قاعدة البيانات
    for (const update of updates) {
        try {
            const product = products.find(p => p.id === update.id);
            if (product) {
                await fetch(`/api/products/${update.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...product,
                        display_order: update.display_order
                    })
                });
            }
        } catch (error) {
            console.error(`خطأ في تحديث ترتيب المنتج ${update.id}:`, error);
        }
    }

    // تحديث العرض
    await loadProducts();
    showNotification('تم تحديث ترتيب المنتجات بنجاح', 'success');
}

// ==================== إظهار/إخفاء المنتج ====================
async function toggleProductVisibility(productId, isVisible) {
    try {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const formData = new FormData();
        formData.append('category_id', product.category_id);
        formData.append('name', product.name);
        formData.append('description', product.description || '');
        formData.append('price', product.price);
        formData.append('display_order', product.display_order || 1);
        formData.append('is_visible', isVisible ? 1 : 0);
        if (product.image_path) {
            formData.append('image_path', product.image_path);
        }

        const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            body: formData
        });

        if (response.ok) {
            await loadProducts();
            showNotification(isVisible ? 'تم إظهار المنتج' : 'تم إخفاء المنتج', 'success');
        } else {
            showNotification('حدث خطأ في تحديث حالة المنتج', 'error');
        }
    } catch (error) {
        console.error('خطأ في تحديث حالة المنتج:', error);
        showNotification('حدث خطأ في تحديث حالة المنتج', 'error');
    }
}

// ==================== البحث والفلترة ====================
function filterProducts() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const searchTerm = document.getElementById('searchProducts').value.toLowerCase();

    filteredProducts = products.filter(product => {
        const matchesCategory = !categoryFilter || product.category_id == categoryFilter;
        const matchesSearch = !searchTerm || 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm));
        return matchesCategory && matchesSearch;
    });

    displayProducts();
}

function searchProducts() {
    filterProducts();
}

// ==================== عرض الأقسام ====================
function displayCategories() {
    const container = document.getElementById('categories-list');
    if (!container) return;
    
    container.innerHTML = '';

    if (categories.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد أقسام حالياً.</div>';
        return;
    }

    categories.sort((a, b) => (a.display_order || 1) - (b.display_order || 1));

    categories.forEach((category) => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="category-header">
                <h3>${category.name}</h3>
                <span class="category-badge">الترتيب: ${category.display_order || 1}</span>
            </div>
            <div class="category-card-actions">
                <button class="btn btn-edit" onclick="editCategory(${category.id})">✏️ تعديل</button>
                <button class="btn btn-danger" onclick="deleteCategory(${category.id})">🗑️ حذف</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ==================== نافذة المنتج ====================
async function openProductModal(id = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    // مسح النموذج
    form.reset();
    document.getElementById('productId').value = '';
    document.getElementById('productImagePreview').innerHTML = '';
    document.getElementById('productOptionsList').innerHTML = '';
    document.getElementById('productVisible').checked = true;
    currentProductIdForOptions = null;
    
    if (id) {
        title.textContent = 'تعديل منتج';
        try {
            const response = await fetch(`/api/products/${id}`);
            const product = await response.json();
            
            if (product) {
                document.getElementById('productId').value = product.id;
                document.getElementById('productName').value = product.name || '';
                document.getElementById('productDescription').value = product.description || '';
                document.getElementById('productPrice').value = product.price || '';
                document.getElementById('productCategory').value = product.category_id || '';
                document.getElementById('productOrder').value = product.display_order || 1;
                
                // معالجة is_visible
                const productVisible = document.getElementById('productVisible');
                if (productVisible) {
                    productVisible.checked = product.is_visible !== undefined ? (product.is_visible === 1 || product.is_visible === true) : true;
                }
                
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

function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal.classList.remove('active');
    
    // تنظيف Cropper إذا كان موجوداً
    if (imageCropper) {
        imageCropper.destroy();
        imageCropper = null;
    }
}

// ==================== حفظ المنتج ====================
async function saveProduct(event) {
    event.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const formData = new FormData();
    
    formData.append('category_id', document.getElementById('productCategory').value);
    formData.append('name', document.getElementById('productName').value);
    formData.append('description', document.getElementById('productDescription').value);
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('display_order', document.getElementById('productOrder').value || 1);
    formData.append('is_visible', document.getElementById('productVisible').checked ? 1 : 0);
    
    // إضافة الصورة إذا كانت موجودة
    const imageInput = document.getElementById('productImageInput');
    if (imageInput.files.length > 0) {
        formData.append('image', imageInput.files[0]);
    }
    
    // جمع الخيارات
    const options = [];
    document.querySelectorAll('.product-option-item').forEach(item => {
        const name = item.querySelector('.option-name').value.trim();
        const price = item.querySelector('.option-price').value;
        if (name && price) {
            options.push({
                name: name,
                price: parseFloat(price) || 0,
                display_order: options.length
            });
        }
    });
    formData.append('options', JSON.stringify(options));
    
    try {
        const url = productId ? `/api/products/${productId}` : '/api/products';
        const method = productId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            body: formData
        });
        
        if (response.ok) {
            await loadProducts();
            closeProductModal();
            showNotification(productId ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'حدث خطأ في حفظ المنتج', 'error');
        }
    } catch (error) {
        console.error('خطأ في حفظ المنتج:', error);
        showNotification('حدث خطأ في حفظ المنتج', 'error');
    }
}

// ==================== تعديل/حذف المنتج ====================
async function editProduct(id) {
    await openProductModal(id);
}

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

// ==================== خيارات المنتج ====================
function addProductOption() {
    const container = document.getElementById('productOptionsList');
    const optionItem = document.createElement('div');
    optionItem.className = 'product-option-item';
    optionItem.innerHTML = `
        <input type="text" class="option-name" placeholder="اسم الخيار (مثل: صغير)">
        <input type="number" class="option-price" step="0.01" placeholder="السعر" min="0">
        <button type="button" class="btn btn-danger btn-small" onclick="removeProductOption(this)">🗑️</button>
    `;
    container.appendChild(optionItem);
}

function removeProductOption(btn) {
    btn.closest('.product-option-item').remove();
}

// ==================== رفع الصور ====================
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
        showNotification('الرجاء اختيار ملف صورة', 'error');
        return;
    }
    
    // التحقق من حجم الملف (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('حجم الصورة كبير جداً. الحد الأقصى 5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('productImagePreview');
        preview.innerHTML = `
            <img id="imageToCrop" src="${e.target.result}" style="max-width: 100%; max-height: 400px; display: block; margin-bottom: 10px;">
            <button type="button" class="btn btn-secondary" onclick="startImageCrop()">✂️ قص الصورة</button>
        `;
    };
    reader.readAsDataURL(file);
}

function startImageCrop() {
    const image = document.getElementById('imageToCrop');
    if (!image) return;
    
    // تدمير Cropper السابق إن وجد
    if (imageCropper) {
        imageCropper.destroy();
    }
    
    imageCropper = new Cropper(image, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 0.8,
        responsive: true,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleable: false,
        ready: function() {
            console.log('Cropper جاهز');
        }
    });
    
    // إضافة زر الحفظ
    const preview = document.getElementById('productImagePreview');
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = '💾 حفظ القص';
    saveBtn.style.marginTop = '10px';
    saveBtn.onclick = saveCroppedImage;
    
    // إزالة الزر السابق إن وجد
    const oldBtn = preview.querySelector('.btn-primary');
    if (oldBtn && oldBtn.textContent.includes('حفظ القص')) {
        oldBtn.remove();
    }
    
    preview.appendChild(saveBtn);
}

function saveCroppedImage() {
    if (!imageCropper) return;
    
    const canvas = imageCropper.getCroppedCanvas({
        width: 800,
        height: 800,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });
    
    if (!canvas) {
        showNotification('حدث خطأ في قص الصورة', 'error');
        return;
    }
    
    canvas.toBlob((blob) => {
        const file = new File([blob], 'cropped-image.png', { type: 'image/png' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        document.getElementById('productImageInput').files = dataTransfer.files;
        
        // عرض الصورة المقطوعة
        const preview = document.getElementById('productImagePreview');
        preview.innerHTML = `
            <img src="${canvas.toDataURL()}" style="max-width: 100%; max-height: 400px; display: block; border-radius: 5px; border: 2px solid #ddd;">
        `;
        
        // تدمير Cropper
        if (imageCropper) {
            imageCropper.destroy();
            imageCropper = null;
        }
        
        showNotification('تم قص الصورة بنجاح', 'success');
    }, 'image/png', 0.9);
}

// ==================== نافذة القسم ====================
function openCategoryModal(id = null) {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');
    const form = document.getElementById('categoryForm');
    
    form.reset();
    document.getElementById('categoryId').value = '';
    
    if (id) {
        title.textContent = 'تعديل قسم';
        const category = categories.find(c => c.id === id);
        if (category) {
            document.getElementById('categoryId').value = category.id;
            document.getElementById('categoryName').value = category.name || '';
            document.getElementById('categoryOrder').value = category.display_order || 1;
            document.getElementById('categoryColumns').value = category.columns_per_row || 4;
        }
    } else {
        title.textContent = 'إضافة قسم جديد';
    }
    
    modal.classList.add('active');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

async function saveCategory(event) {
    event.preventDefault();
    
    const categoryId = document.getElementById('categoryId').value;
    const categoryData = {
        name: document.getElementById('categoryName').value,
        display_order: parseInt(document.getElementById('categoryOrder').value) || 1,
        columns_per_row: parseInt(document.getElementById('categoryColumns').value) || 4
    };
    
    try {
        const url = categoryId ? `/api/categories/${categoryId}` : '/api/categories';
        const method = categoryId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(categoryData)
        });
        
        if (response.ok) {
            await loadCategories();
            closeCategoryModal();
            showNotification(categoryId ? 'تم تحديث القسم بنجاح' : 'تم إضافة القسم بنجاح', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'حدث خطأ في حفظ القسم', 'error');
        }
    } catch (error) {
        console.error('خطأ في حفظ القسم:', error);
        showNotification('حدث خطأ في حفظ القسم', 'error');
    }
}

async function editCategory(id) {
    openCategoryModal(id);
}

async function deleteCategory(id) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع المنتجات المرتبطة به.')) {
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

// ==================== رفع الشعار والهيدر ====================
async function uploadLogo() {
    const fileInput = document.getElementById('logoUpload');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
        showNotification('الرجاء اختيار ملف صورة', 'error');
        return;
    }
    
    // التحقق من حجم الملف (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('حجم الصورة كبير جداً. الحد الأقصى 5MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'logo', value: data.image_path })
            });
            
            const logoPreview = document.getElementById('logoPreview');
            if (logoPreview) {
                logoPreview.innerHTML = `<img src="${data.image_path}" alt="الشعار" style="max-width: 200px; max-height: 150px; border-radius: 5px; border: 2px solid #ddd;">`;
            }
            
            showNotification('تم رفع الشعار بنجاح', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'حدث خطأ في رفع الشعار', 'error');
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
    
    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
        showNotification('الرجاء اختيار ملف صورة', 'error');
        return;
    }
    
    // التحقق من حجم الملف (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification('حجم الصورة كبير جداً. الحد الأقصى 5MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'header_image', value: data.image_path })
            });
            
            const headerPreview = document.getElementById('headerPreview');
            if (headerPreview) {
                headerPreview.innerHTML = `<img src="${data.image_path}" alt="صورة الهيدر" style="max-width: 200px; max-height: 150px; border-radius: 5px; border: 2px solid #ddd;">`;
            }
            
            showNotification('تم رفع صورة الهيدر بنجاح', 'success');
        } else {
            const error = await response.json();
            showNotification(error.error || 'حدث خطأ في رفع صورة الهيدر', 'error');
        }
    } catch (error) {
        console.error('خطأ في رفع صورة الهيدر:', error);
        showNotification('حدث خطأ في رفع صورة الهيدر', 'error');
    }
}

// ==================== تصدير القائمة ====================
async function exportMenu() {
    try {
        showNotification('جاري تصدير القائمة...', 'info');
        
        // تحميل جميع البيانات
        const [categoriesData, productsData, logoData, headerData] = await Promise.all([
            fetch('/api/categories').then(r => r.json()),
            fetch('/api/products').then(r => r.json()),
            fetch('/api/settings/logo').then(r => r.json()),
            fetch('/api/settings/header_image').then(r => r.json())
        ]);
        
        // تحميل الخيارات لكل منتج
        const productsWithOptions = await Promise.all(
            productsData.map(async (product) => {
                try {
                    const optionsRes = await fetch(`/api/products/${product.id}/options`);
                    const options = await optionsRes.json();
                    return { ...product, options: options || [] };
                } catch {
                    return { ...product, options: [] };
                }
            })
        );
        
        // إنشاء ملف Excel
        const wb = XLSX.utils.book_new();
        
        // ورقة الأقسام
        const categoriesSheet = XLSX.utils.json_to_sheet(
            categoriesData.map(cat => ({
                'ID': cat.id,
                'اسم القسم': cat.name,
                'ترتيب العرض': cat.display_order || 1,
                'عدد الأعمدة': cat.columns_per_row || 4
            }))
        );
        XLSX.utils.book_append_sheet(wb, categoriesSheet, 'الأقسام');
        
        // ورقة المنتجات (مع الخيارات في نفس الصف)
        const productsRows = productsWithOptions.map(product => {
            const row = {
                'ID': product.id,
                'القسم': categoriesData.find(c => c.id === product.category_id)?.name || '',
                'اسم المنتج': product.name,
                'الوصف': product.description || '',
                'السعر الأساسي': product.price,
                'ترتيب العرض': product.display_order || 1,
                'إظهار في القائمة': product.is_visible !== 0 ? 'نعم' : 'لا',
                'مسار الصورة': product.image_path || ''
            };
            
            // إضافة الخيارات
            if (product.options && product.options.length > 0) {
                product.options.forEach((option, index) => {
                    row[`خيار ${index + 1} - الاسم`] = option.name;
                    row[`خيار ${index + 1} - السعر`] = option.price;
                });
            }
            
            return row;
        });
        
        const productsSheet = XLSX.utils.json_to_sheet(productsRows);
        XLSX.utils.book_append_sheet(wb, productsSheet, 'المنتجات');
        
        // ورقة الإعدادات
        const settingsSheet = XLSX.utils.json_to_sheet([
            { 'المفتاح': 'logo', 'القيمة': logoData.value || '' },
            { 'المفتاح': 'header_image', 'القيمة': headerData.value || '' }
        ]);
        XLSX.utils.book_append_sheet(wb, settingsSheet, 'الإعدادات');
        
        // معلومات التصدير
        const infoSheet = XLSX.utils.json_to_sheet([
            { 'المعلومة': 'تاريخ التصدير', 'القيمة': new Date().toLocaleString('ar-SA') },
            { 'المعلومة': 'عدد الأقسام', 'القيمة': categoriesData.length },
            { 'المعلومة': 'عدد المنتجات', 'القيمة': productsData.length }
        ]);
        XLSX.utils.book_append_sheet(wb, infoSheet, 'معلومات التصدير');
        
        // حفظ الملف
        XLSX.writeFile(wb, `قائمة_المطعم_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        showNotification('تم تصدير القائمة بنجاح', 'success');
    } catch (error) {
        console.error('خطأ في تصدير القائمة:', error);
        showNotification('حدث خطأ في تصدير القائمة', 'error');
    }
}

// ==================== استيراد القائمة ====================
async function importMenu(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('⚠️ تحذير: سيتم استبدال جميع البيانات الحالية! هل أنت متأكد؟')) {
        return;
    }
    
    try {
        showNotification('جاري استيراد القائمة...', 'info');
        
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        
        // قراءة الأقسام
        let categoriesSheet = workbook.Sheets['الأقسام'];
        if (!categoriesSheet) {
            // محاولة البحث بأسماء أخرى
            const sheetNames = Object.keys(workbook.Sheets);
            categoriesSheet = workbook.Sheets[sheetNames.find(name => name.includes('قسم') || name.includes('category'))] || workbook.Sheets[sheetNames[0]];
        }
        
        const categoriesData = XLSX.utils.sheet_to_json(categoriesSheet);
        
        // قراءة المنتجات
        let productsSheet = workbook.Sheets['المنتجات'];
        if (!productsSheet) {
            const sheetNames = Object.keys(workbook.Sheets);
            productsSheet = workbook.Sheets[sheetNames.find(name => name.includes('منتج') || name.includes('product'))] || workbook.Sheets[sheetNames[1]];
        }
        
        const productsData = XLSX.utils.sheet_to_json(productsSheet);
        
        // قراءة الإعدادات
        let settingsSheet = workbook.Sheets['الإعدادات'];
        if (settingsSheet) {
            const settingsData = XLSX.utils.sheet_to_json(settingsSheet);
            for (const setting of settingsData) {
                if (setting['المفتاح'] && setting['القيمة']) {
                    await fetch('/api/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            key: setting['المفتاح'],
                            value: setting['القيمة']
                        })
                    });
                }
            }
        }
        
        // 1. حذف جميع البيانات الحالية
        showNotification('جاري حذف البيانات الحالية...', 'info');
        
        // حذف جميع المنتجات
        const allProducts = await fetch('/api/products').then(r => r.json());
        for (const product of allProducts) {
            await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
        }
        
        // حذف جميع الأقسام
        const allCategories = await fetch('/api/categories').then(r => r.json());
        for (const category of allCategories) {
            await fetch(`/api/categories/${category.id}`, { method: 'DELETE' });
        }
        
        // 2. إنشاء الأقسام
        showNotification('جاري إنشاء الأقسام...', 'info');
        const categoryNameMap = {};
        
        // جمع جميع الأقسام من المنتجات
        const allCategoriesFromProducts = productsData.map(p => {
            const cat = p['القسم'] || p['category'] || p['Category'];
            return cat ? String(cat).trim() : null;
        }).filter(Boolean);
        const uniqueCategories = [...new Set(allCategoriesFromProducts)];
        
        if (uniqueCategories.length === 0) {
            throw new Error('لم يتم العثور على أي أقسام في الملف.');
        }
        
        // إنشاء الأقسام
        for (const catName of uniqueCategories) {
            if (!catName) continue;
            
            const catNameStr = String(catName).trim();
            if (!catNameStr) continue;
            
            try {
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
                    if (Array.isArray(newCat)) {
                        newCat = newCat[0] || newCat;
                    }
                    
                    let catId = null;
                    if (newCat && typeof newCat === 'object') {
                        catId = newCat.id || newCat.ID || newCat.Id;
                    }
                    
                    if (catId) {
                        categoryNameMap[catName] = catId;
                        categoryNameMap[catNameStr] = catId;
                        categoryNameMap[catName.replace(/\s+/g, ' ').trim()] = catId;
                    }
                }
            } catch (error) {
                console.error(`خطأ في إنشاء القسم "${catNameStr}":`, error);
            }
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
        const categoryColumns = ['القسم', 'category', 'Category', 'قسم'];
        
        let nameColumn = nameColumns.find(col => productsData[0] && productsData[0][col]) || 'اسم المنتج';
        let descColumn = descColumns.find(col => productsData[0] && productsData[0][col]) || 'وصف المنتج';
        let priceColumn = priceColumns.find(col => productsData[0] && productsData[0][col]) || 'السعر الأساسي';
        let orderColumn = orderColumns.find(col => productsData[0] && productsData[0][col]) || 'ترتيب العرض';
        let categoryColumn = categoryColumns.find(col => productsData[0] && productsData[0][col]) || 'القسم';
        
        for (let i = 0; i < productsData.length; i++) {
            const item = productsData[i];
            
            // البحث عن ID القسم
            const originalCategoryName = item[categoryColumn];
            let categoryName = originalCategoryName ? String(originalCategoryName) : '';
            const trimmedCategoryName = categoryName.trim();
            
            let catId = categoryNameMap[originalCategoryName] || 
                       categoryNameMap[categoryName] ||
                       categoryNameMap[trimmedCategoryName] ||
                       categoryNameMap[categoryName.replace(/\s+/g, ' ').trim()];
            
            if (!catId) {
                const normalizedOriginal = originalCategoryName ? String(originalCategoryName).replace(/\s+/g, ' ').trim() : '';
                const normalizedTrimmed = trimmedCategoryName.replace(/\s+/g, ' ').trim();
                
                for (const key in categoryNameMap) {
                    const normalizedKey = key.replace(/\s+/g, ' ').trim();
                    if (normalizedKey === normalizedOriginal || normalizedKey === normalizedTrimmed) {
                        catId = categoryNameMap[key];
                        break;
                    }
                }
            }
            
            if (!catId) {
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
            formData.append('category_id', String(catId));
            formData.append('name', String(item[nameColumn] || 'بدون اسم'));
            formData.append('description', String(item[descColumn] || ''));
            formData.append('price', parseFloat(item[priceColumn]) || 0);
            formData.append('display_order', parseInt(item[orderColumn]) || (i + 1));
            formData.append('is_visible', item['إظهار في القائمة'] !== undefined ? (item['إظهار في القائمة'] === 'نعم' || item['إظهار في القائمة'] === true ? 1 : 0) : 1);
            
            // إضافة الخيارات
            if (productOptions.length > 0) {
                formData.append('options', JSON.stringify(productOptions));
            } else {
                formData.append('options', JSON.stringify([]));
            }
            
            // إذا كان هناك مسار صورة، نضيفه
            if (item['مسار الصورة']) {
                formData.append('image_path', item['مسار الصورة']);
            }

            try {
                const response = await fetch('/api/products', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
            }
        }
        
        // تحديث البيانات
        await loadCategories();
        await loadProducts();
        await loadSettings();
        
        showNotification(`تم استيراد ${successCount} منتج بنجاح${errorCount > 0 ? `، وحدث خطأ في ${errorCount} منتج` : ''}`, 
                        errorCount > 0 ? 'error' : 'success');
    } catch (error) {
        console.error('خطأ في استيراد القائمة:', error);
        showNotification('حدث خطأ في استيراد القائمة: ' + error.message, 'error');
    }
    
    // إعادة تعيين input الملف
    event.target.value = '';
}

// ==================== الإشعارات ====================
function showNotification(message, type = 'info') {
    // إزالة الإشعار السابق إن وجد
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // إظهار الإشعار
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // إخفاء الإشعار بعد 3 ثوان
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

