// الحصول على جميع عناصر القائمة
const menuItems = document.querySelectorAll('.menu-item');
const fullscreenModal = document.getElementById('fullscreenModal');
const closeBtn = document.querySelector('.close-btn');
const fullscreenImage = document.getElementById('fullscreenImage');
const fullscreenTitle = document.getElementById('fullscreenTitle');
const fullscreenDescription = document.getElementById('fullscreenDescription');
const fullscreenPrice = document.getElementById('fullscreenPrice');

// إضافة حدث النقر على كل صنف
menuItems.forEach(item => {
    item.addEventListener('click', function() {
        // الحصول على معلومات الصنف
        const itemImage = this.querySelector('.item-image img');
        const itemTitle = this.querySelector('.item-info h3').textContent;
        const itemDescription = this.querySelector('.item-info p').textContent;
        const itemPrice = this.querySelector('.price').textContent;
        
        // تعيين المعلومات في نافذة العرض
        fullscreenImage.src = itemImage.src;
        fullscreenImage.alt = itemImage.alt;
        fullscreenTitle.textContent = itemTitle;
        fullscreenDescription.textContent = itemDescription;
        fullscreenPrice.textContent = itemPrice;
        
        // عرض النافذة
        fullscreenModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
});

// إغلاق النافذة عند النقر على زر الإغلاق
closeBtn.addEventListener('click', function() {
    closeFullscreen();
});

// إغلاق النافذة عند النقر خارج المحتوى
fullscreenModal.addEventListener('click', function(e) {
    if (e.target === fullscreenModal) {
        closeFullscreen();
    }
});

// إغلاق النافذة عند الضغط على مفتاح ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && fullscreenModal.classList.contains('active')) {
        closeFullscreen();
    }
});

// دالة إغلاق النافذة
function closeFullscreen() {
    fullscreenModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

