let products = [];
let categories = [];

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
        
        displayCategories(); // تحديث عرض الأقسام إذا كنت في تبويب الأقسام
    } catch (err) {
        console.error("خطأ في تحميل الأقسام:", err);
    }
}

async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        products = await res.json();
        displayProducts(); // هذه هي الدالة التي تحول "جاري التحميل" إلى قائمة منتجات
    } catch (err) {
        document.getElementById('products-list').innerHTML = "خطأ في تحميل البيانات";
    }
}

// دالة العرض الأساسية
function displayProducts() {
    const container = document.getElementById('products-list');
    if (!container) return;
    
    container.innerHTML = ''; // مسح جملة "جاري التحميل"

    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد منتجات حالياً.</div>';
        return;
    }

    // ترتيب المنتجات
    products.sort((a, b) => (a.display_order || 1) - (b.display_order || 1));

    products.forEach((product) => {
        const category = categories.find(c => c.id === product.category_id);
        const card = document.createElement('div');
        card.className = 'product-card'; // الكلاس المسؤول عن التنسيق
        
        card.innerHTML = `
            <div class="product-card-image-container">
                <img src="${product.image_path || ''}" 
                     onerror="this.src='https://via.placeholder.com/150/841535/FFFFFF?text=بدون+صورة'" 
                     class="product-card-image">
            </div>
            <div class="product-card-info">
                <h3>${product.name}</h3>
                <div class="product-meta">
                    <span class="product-price">${product.price} ريال</span>
                    <span class="product-category">${category ? category.name : 'غير محدد'}</span>
                </div>
                <div class="product-card-actions">
                    <button class="btn btn-edit" onclick="editProduct(${product.id})">✏️ تعديل</button>
                    <button class="btn btn-danger" onclick="deleteProduct(${product.id})">🗑️ حذف</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// تشغيل التحميل فور فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadProducts();
});