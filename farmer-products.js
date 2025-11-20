const API_BASE = 'http://10.61.194.227:8080';
const DEFAULT_PRODUCT_IMAGE = 'https://via.placeholder.com/320x180?text=Product';

function escapeAttr(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMultilineText(value) {
  if (value === null || value === undefined) return '';
  return escapeAttr(value).replace(/\n/g, '<br>');
}

function resolveProductImage(url) {
  if (!url) return DEFAULT_PRODUCT_IMAGE;
  try {
    const trimmed = String(url).trim();
    if (!trimmed) return DEFAULT_PRODUCT_IMAGE;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return DEFAULT_PRODUCT_IMAGE;
  } catch {
    return DEFAULT_PRODUCT_IMAGE;
  }
}

function getCurrentUserId() {
  try {
    const raw = localStorage.getItem('user_id');
    const id = parseInt(raw, 10);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

(function checkAuth() {
  try {
    if (!localStorage.getItem('auth_token')) {
      window.location.href = 'login.html';
      return;
    }
  } catch {
    window.location.href = 'login.html';
  }
})();

(function enforceFarmerOnly() {
  try {
    const identity = parseInt(localStorage.getItem('user_identity') || '0', 10);
    if (identity !== 1) {
      window.location.href = 'index.html';
    }
  } catch {
    window.location.href = 'index.html';
  }
})();

(function displayUserId() {
  try {
    const userId = localStorage.getItem('user_id');
    const userIdDisplay = document.getElementById('user-id-display');
    if (userIdDisplay && userId) {
      userIdDisplay.textContent = `用户ID: ${userId}`;
    }
  } catch (e) {
    console.error('显示用户ID失败:', e);
  }
})();

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
  btnLogout.onclick = function() {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_identity');
      localStorage.removeItem('user_id');
    } catch {}
    window.location.href = 'login.html';
  };
}

// 上传商品
const formAddProduct = document.getElementById('form-add-product');
const msgAddProduct = document.getElementById('msg-add-product');
if (formAddProduct) {
  formAddProduct.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      msgAddProduct.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }
    const name = document.getElementById('farmer-product-name').value.trim();
    const price = parseFloat(document.getElementById('farmer-product-price').value);
    const surplus = parseInt(document.getElementById('farmer-product-surplus').value, 10);
    const img = document.getElementById('farmer-product-img').value.trim();
    
    if (!name || Number.isNaN(price) || price < 0 || Number.isNaN(surplus) || surplus < 0 || !img) {
      msgAddProduct.textContent = '请填写完整且合法的商品信息';
      return;
    }
    
    const payload = {
      productName: name,
      price,
      userId: currentUserId,
      productImg: img,
      surplus
    };
    
    msgAddProduct.textContent = '提交中...';
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok || (json?.code && Number(json.code) !== 200)) {
        throw new Error(json?.message || res.statusText);
      }
      msgAddProduct.textContent = json?.message || '商品上传成功';
      formAddProduct.reset();
      loadFarmerProducts(false);
    } catch (err) {
      msgAddProduct.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

// 农户商品列表
const farmerProductsGrid = document.getElementById('farmer-products-grid');
const msgFarmerProducts = document.getElementById('msg-farmer-products');
const btnRefreshFarmerProducts = document.getElementById('btn-refresh-farmer-products');

function normalizeFarmerProducts(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.data?.records)) return json.data.records;
  if (Array.isArray(json.data?.list)) return json.data.list;
  if (Array.isArray(json.data?.items)) return json.data.items;
  if (Array.isArray(json.data?.rows)) return json.data.rows;
  if (json.data && !Array.isArray(json.data)) return [json.data];
  return [];
}

function renderFarmerProducts(list) {
  if (!farmerProductsGrid) return;
  if (!Array.isArray(list) || !list.length) {
    farmerProductsGrid.innerHTML = '<div class="empty">暂无商品</div>';
    return;
  }
  farmerProductsGrid.innerHTML = list.map(item=>{
    const safeImg = resolveProductImage(item.productImg || item.imageUrl);
    const fallbackImg = escapeAttr(DEFAULT_PRODUCT_IMAGE);
    const price = item.price ?? item.productPrice ?? '—';
    const surplus = item.surplus ?? item.stock ?? '—';
    const sales = item.salesVolume ?? item.sales ?? '—';
    return `<div class="product">
      <div class="name">${escapeAttr(item.productName || item.name || '未命名商品')}</div>
      <div>商品ID：${escapeAttr(item.productId ?? item.id ?? '—')}</div>
      <div>单价：${price !== '—' ? `¥${escapeAttr(price)}` : '—'}</div>
      <div>剩余量：${escapeAttr(surplus)}</div>
      <div>销量：${escapeAttr(sales)}</div>
      <div>发售商：${escapeAttr(item.producer || item.owner || '—')}</div>
      <div class="thumb"><img src="${safeImg}" alt="${escapeAttr(item.productName || '')}" onerror="this.onerror=null;this.src='${fallbackImg}'"></div>
    </div>`;
  }).join('');
}

async function loadFarmerProducts(showLoading = true) {
  if (!farmerProductsGrid) return;
  const userId = getCurrentUserId();
  if (!userId) {
    msgFarmerProducts.textContent = '未获取到用户ID，请重新登录后再试';
    farmerProductsGrid.innerHTML = '';
    return;
  }
  if (showLoading) {
    msgFarmerProducts.textContent = '加载中...';
    farmerProductsGrid.innerHTML = '';
  }
  try {
    const res = await fetch(`${API_BASE}/api/products/farmer?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = normalizeFarmerProducts(json);
    renderFarmerProducts(list);
    msgFarmerProducts.textContent = list.length ? '' : '暂无商品';
  } catch (err) {
    farmerProductsGrid.innerHTML = '';
    msgFarmerProducts.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

if (btnRefreshFarmerProducts) {
  btnRefreshFarmerProducts.addEventListener('click', ()=>loadFarmerProducts());
}

if (farmerProductsGrid) {
  loadFarmerProducts();
}

