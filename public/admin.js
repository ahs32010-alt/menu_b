// دوال النوافذ (Modals)
function openProductModal() {
    const modal = document.getElementById('productModal');
    if (!modal) return;
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('imageCropData').value = '';
    document.getElementById('productImagePreview').innerHTML = '';
    document.getElementById('modalTitle').innerText = 'إضافة منتج جديد';
    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

// دالة تحويل الصورة المختارة من الجهاز إلى نص (Base64)
function handleImageUpload(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('productImagePreview');
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result;
            preview.innerHTML = `<img src="${base64}" style="width:100px; height:100px; object-fit:cover; border-radius:8px;">`;
            document.getElementById('imageCropData').value = base64;
        };
        reader.readAsDataURL(file);
    }
}

// دالة التعديل
async function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category_id;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productOrder').value = product.display_order || 1;
    
    const preview = document.getElementById('productImagePreview');
    preview.innerHTML = product.image_path ? `<img src="${product.image_path}" style="width:100px; height:100px; object-fit:cover;">` : '';
    
    document.getElementById('modalTitle').innerText = 'تعديل المنتج';
    document.getElementById('productModal').classList.add('active');
}

// دالة الحفظ (JSON)
async function saveProduct(event) {
    event.preventDefault();
    const id = document.getElementById('productId').value;
    const productData = {
        name: document.getElementById('productName').value,
        category_id: document.getElementById('productCategory').value,
        price: document.getElementById('productPrice').value,
        description: document.getElementById('productDescription').value,
        display_order: document.getElementById('productOrder').value,
        image_path: document.getElementById('imageCropData').value || (document.querySelector('#productImagePreview img') ? document.querySelector('#productImagePreview img').src : '')
    };

    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        if (res.ok) {
            closeProductModal();
            location.reload(); // تحديث الصفحة لرؤية النتائج
        }
    } catch (err) {
        alert("خطأ في الاتصال بالسيرفر");
    }
}

// تشغيل عند تحميل الصفحة
window.onload = function() {
    console.log("✓ تم إعادة تشغيل النظام بنجاح");
    // هنا استدعاء دوال تحميل البيانات الأصلية لديك
    if (typeof loadProducts === 'function') loadProducts();
    if (typeof loadCategories === 'function') loadCategories();
};