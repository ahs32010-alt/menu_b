// تحميل البيانات من API
async function loadMenu() {
    try {
        const [categories, products] = await Promise.all([
            fetch('/api/categories').then(res => res.json()),
            fetch('/api/products').then(res => res.json())
        ]);

        // تحميل الشعار
        const logoSetting = await fetch('/api/settings/logo').then(res => res.json());
        if (logoSetting && logoSetting.value) {
            const logoImg = document.getElementById('logo');
            logoImg.src = logoSetting.value;
            logoImg.style.display = 'block';
        }

        // تحميل صورة الهيدر
        const headerSetting = await fetch('/api/settings/header_image').then(res => res.json());
        if (headerSetting && headerSetting.value) {
            const headerBackground = document.getElementById('headerBackground');
            const headerBgImg = document.getElementById('headerBackgroundImage');
            const mainHeader = document.getElementById('mainHeader');
            
            headerBgImg.src = headerSetting.value;
            headerBackground.style.display = 'block';
            
            // إزالة الخلفية الافتراضية عند وجود صورة
            if (mainHeader) {
                mainHeader.style.background = 'transparent';
                mainHeader.style.backdropFilter = 'none';
            }
        }

        // تحميل الخيارات لكل منتج
        for (const product of products) {
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
        }

        // تجميع المنتجات حسب الأقسام (فقط المنتجات المرئية)
        const productsByCategory = {};
        products.forEach(product => {
            // إظهار المنتجات المرئية فقط (is_visible = 1 أو undefined/null)
            if (product.is_visible !== 0) {
                if (!productsByCategory[product.category_id]) {
                    productsByCategory[product.category_id] = [];
                }
                productsByCategory[product.category_id].push(product);
            }
        });

        // عرض القائمة
        const container = document.getElementById('menu-container');
        container.innerHTML = '';

        categories.forEach(category => {
            const categoryProducts = productsByCategory[category.id] || [];
            
            if (categoryProducts.length === 0) return;

            const section = document.createElement('section');
            section.className = 'menu-section';
            
            // الحصول على عدد الأعمدة مع التحقق
            let columns = 4;
            if (category.columns_per_row) {
                columns = parseInt(category.columns_per_row);
                if (isNaN(columns) || columns < 1 || columns > 4) {
                    columns = 4;
                }
            }
            
            section.innerHTML = `
                <h2 class="section-title">${category.name}</h2>
                <div class="menu-grid" style="grid-template-columns: repeat(${columns}, 1fr);">
                    ${categoryProducts.map(product => {
                        // عرض الخيارات للمنتج
                        let optionsHtml = '';
                        if (product.options && Array.isArray(product.options) && product.options.length > 0) {
                            optionsHtml = '<div class="product-options" style="margin-top: 10px; font-size: 0.9em; border-top: 1px solid #eee; padding-top: 10px;">';
                            product.options.forEach(option => {
                                if (option.name && option.price) {
                                    optionsHtml += `<div style="margin: 5px 0; color: #841535; font-weight: 600; display: flex; justify-content: space-between;">
                                        <span>${option.name}:</span>
                                        <span>${option.price} ريال</span>
                                    </div>`;
                                }
                            });
                            optionsHtml += '</div>';
                        }
                        
                        return `
                        <div class="menu-item">
                            <div class="item-image">
                                <img src="${product.image_path || 'https://via.placeholder.com/300x200/841535/FFFFFF?text=' + encodeURIComponent(product.name)}" 
                                     alt="${product.name}"
                                     onerror="this.src='https://via.placeholder.com/300x200/841535/FFFFFF?text=${encodeURIComponent(product.name)}'">
                            </div>
                            <div class="item-info">
                                <h3>${product.name}</h3>
                                <p>${product.description || ''}</p>
                                ${optionsHtml}
                                <span class="price">${product.price} ريال</span>
                            </div>
                        </div>
                    `;
                    }).join('')}
                </div>
            `;
            
            container.appendChild(section);
        });

        // إضافة أحداث النقر على المنتجات
        setupProductClickEvents();
    } catch (error) {
        console.error('خطأ في تحميل القائمة:', error);
        document.getElementById('menu-container').innerHTML = 
            '<div class="error">حدث خطأ في تحميل القائمة. يرجى المحاولة لاحقاً.</div>';
    }
}

// إعداد أحداث النقر على المنتجات
function setupProductClickEvents() {
    const menuItems = document.querySelectorAll('.menu-item');
    const fullscreenModal = document.getElementById('fullscreenModal');
    const closeBtn = document.querySelector('.close-btn');
    const fullscreenImage = document.getElementById('fullscreenImage');
    const fullscreenTitle = document.getElementById('fullscreenTitle');
    const fullscreenDescription = document.getElementById('fullscreenDescription');
    const fullscreenPrice = document.getElementById('fullscreenPrice');

    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const itemImage = this.querySelector('.item-image img');
            const itemTitle = this.querySelector('.item-info h3').textContent;
            const itemDescription = this.querySelector('.item-info p').textContent;
            const itemPrice = this.querySelector('.price').textContent;
            
            fullscreenImage.src = itemImage.src;
            fullscreenImage.alt = itemImage.alt;
            fullscreenTitle.textContent = itemTitle;
            fullscreenDescription.textContent = itemDescription;
            fullscreenPrice.textContent = itemPrice;
            
            fullscreenModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    closeBtn.addEventListener('click', closeFullscreen);
    
    fullscreenModal.addEventListener('click', function(e) {
        if (e.target === fullscreenModal) {
            closeFullscreen();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && fullscreenModal.classList.contains('active')) {
            closeFullscreen();
        }
    });
}

function closeFullscreen() {
    const fullscreenModal = document.getElementById('fullscreenModal');
    fullscreenModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// تحميل القائمة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', loadMenu);

