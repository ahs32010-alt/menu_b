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
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state">لا توجد منتجات حالياً.</div>';
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image_path || ''}" onerror="this.src='https://via.placeholder.com/150'" style="width:50px; height:50px; object-fit:cover;">
            <div class="product-info">
                <h4>${product.name}</h4>
                <span>${product.price} ريال</span>
            </div>
            <div class="actions">
                <button onclick="editProduct(${product.id})">✏️</button>
                <button onclick="deleteProduct(${product.id})" style="color:red">🗑️</button>
            </div>
        </div>
    `).join('');
}

// تشغيل التحميل فور فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadProducts();
});