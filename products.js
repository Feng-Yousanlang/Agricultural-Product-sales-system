const API_BASE = 'http://10.61.194.227:8080';
// 使用本地占位图，避免外网域名（via.placeholder.com）在实验环境中解析失败
const DEFAULT_PRODUCT_IMAGE = 'default-product.png';

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
    // 首先检查是否是完整的HTTP/HTTPS URL
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return DEFAULT_PRODUCT_IMAGE;
    }
    // 验证URL格式是否正确，并做一些站点特定的转换
    const parsed = new URL(trimmed);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return DEFAULT_PRODUCT_IMAGE;
    }
    // 特殊处理：如果是 Bing 图片搜索结果链接，优先使用其中的 mediaurl 参数作为真正图片地址
    try {
      const host = parsed.hostname || '';
      if (host.includes('bing.com')) {
        const mediaUrl = parsed.searchParams.get('mediaurl');
        if (mediaUrl) {
          const decoded = decodeURIComponent(mediaUrl);
          if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            return decoded;
          }
        }
      }
    } catch (e) {
      // 忽略 Bing 解析错误，继续使用原始链接
    }
    return parsed.href;
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
      // 根据文档，发布新类型商品接口为 /api/products/farmer/newProduct
      // 请求参数：productName, price, userId, productImg(可选), totalVolumn, producer(可选)
      const payloadForApi = {
        productName: name,
        price: price,
        userId: currentUserId,
        productImg: img,
        totalVolumn: surplus // 文档中使用totalVolumn表示商品数量
      };
      const res = await fetch(`${API_BASE}/api/products/farmer/newProduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadForApi)
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
    const productId = item.productId ?? item.id ?? '';
    return `<div class="product" data-product-id="${escapeAttr(productId)}">
      <div class="name">${escapeAttr(item.productName || item.name || '未命名商品')}</div>
      <div>商品ID：${escapeAttr(productId)}</div>
      <div>单价：${price !== '—' ? `¥${escapeAttr(price)}` : '—'}</div>
      <div>剩余量：${escapeAttr(surplus)}</div>
      <div>销量：${escapeAttr(sales)}</div>
      <div>发售商：${escapeAttr(item.producer || item.owner || '—')}</div>
      <div class="thumb"><img src="${safeImg}" alt="${escapeAttr(item.productName || '')}" onerror="this.onerror=null;this.src='${fallbackImg}'"></div>
      ${productId ? `<button class="btn btn-danger btn-delete-product" data-product-id="${escapeAttr(productId)}">下架商品</button>` : ''}
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
    // 根据文档，农户查看自己发布的所有商品接口为 /api/products/farmer/getMyProducts
    const res = await fetch(`${API_BASE}/api/products/farmer/getMyProducts?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    // 调试：查看后端返回的完整数据结构和图片字段
    console.log('[farmer-products] raw response:', json);
    const list = normalizeFarmerProducts(json);
    console.log('[farmer-products] normalized list:', list);
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
  // 处理下架商品
  farmerProductsGrid.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.btn-delete-product');
    if (btn) {
      const productId = btn.getAttribute('data-product-id');
      if (!productId) {
        alert('缺少商品ID');
        return;
      }
      if (!confirm('确认下架该商品？下架后如有订单将被取消。')) return;
      try {
        const res = await fetch(`${API_BASE}/api/products/farmer/deleteProduct`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: parseInt(productId, 10) })
        });
        const json = await res.json().catch(()=>({}));
        if (!res.ok) {
          throw new Error(json?.message || res.statusText);
        }
        alert(json?.message || '下架成功');
        loadFarmerProducts(); // 刷新商品列表
      } catch (err) {
        alert(`下架失败：${err.message || '网络错误'}`);
      }
    }
  });
}

// 待发货订单
const pendingOrdersList = document.getElementById('pending-orders-list');
const msgPendingOrders = document.getElementById('msg-pending-orders');
const btnRefreshPendingOrders = document.getElementById('btn-refresh-pending-orders');

async function loadPendingOrders(showLoading = true) {
  if (!pendingOrdersList) return;
  const userId = getCurrentUserId();
  if (!userId) {
    msgPendingOrders.textContent = '未获取到用户ID，请重新登录后再试';
    pendingOrdersList.innerHTML = '';
    return;
  }
  if (showLoading) {
    msgPendingOrders.textContent = '加载中...';
    pendingOrdersList.innerHTML = '';
  }
  try {
    // 根据文档，查看待发货订单接口为 /api/products/farmer/showAllPurchase
    const res = await fetch(`${API_BASE}/api/products/farmer/showAllPurchase?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = normalizeFarmerProducts(json);
    renderPendingOrders(list);
    msgPendingOrders.textContent = list.length ? '' : '暂无待发货订单';
  } catch (err) {
    pendingOrdersList.innerHTML = '';
    msgPendingOrders.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function renderPendingOrders(list) {
  if (!pendingOrdersList) return;
  if (!Array.isArray(list) || !list.length) {
    pendingOrdersList.innerHTML = '<div class="empty">暂无待发货订单</div>';
    return;
  }
  pendingOrdersList.innerHTML = list.map(item=>{
    const purchaseId = item.purchase_id ?? item.purchaseId ?? item.id ?? '';
    const productId = item.productId ?? '';
    const amount = item.amount ?? item.quantity ?? '—';
    const totalPrice = item.totalPrice ?? item.total_price ?? '—';
    const getAddress = item.getAddress ?? item.address ?? '—';
    const createTime = item.createTime ?? item.createdTime ?? '—';
    return `<div class="product" data-purchase-id="${escapeAttr(purchaseId)}">
      <div>订单ID：${escapeAttr(purchaseId)}</div>
      <div>商品ID：${escapeAttr(productId)}</div>
      <div>数量：${escapeAttr(amount)}</div>
      <div>总价：${totalPrice !== '—' ? `¥${escapeAttr(totalPrice)}` : '—'}</div>
      <div>收货地址：${escapeAttr(getAddress)}</div>
      <div>创建时间：${escapeAttr(createTime)}</div>
      ${purchaseId ? `<button class="btn btn-secondary btn-send-product" data-purchase-id="${escapeAttr(purchaseId)}">发货</button>` : ''}
      ${purchaseId ? `<button class="btn btn-danger btn-cancel-order" data-purchase-id="${escapeAttr(purchaseId)}">取消订单</button>` : ''}
    </div>`;
  }).join('');
}

if (btnRefreshPendingOrders) {
  btnRefreshPendingOrders.addEventListener('click', ()=>loadPendingOrders());
}

if (pendingOrdersList) {
  loadPendingOrders();
  // 处理发货和取消订单
  pendingOrdersList.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.btn-send-product');
    if (btn) {
      const purchaseId = btn.getAttribute('data-purchase-id');
      if (!purchaseId) {
        alert('缺少订单ID');
        return;
      }
      if (!confirm('确认发货？')) return;
      try {
        const res = await fetch(`${API_BASE}/api/products/farmer/sendProduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purchase_id: parseInt(purchaseId, 10) })
        });
        const json = await res.json().catch(()=>({}));
        if (!res.ok) {
          throw new Error(json?.message || res.statusText);
        }
        alert(json?.message || '发货成功');
        loadPendingOrders(); // 刷新待发货订单
      } catch (err) {
        alert(`发货失败：${err.message || '网络错误'}`);
      }
      return;
    }
    const btnCancel = e.target.closest('.btn-cancel-order');
    if (btnCancel) {
      const purchaseId = btnCancel.getAttribute('data-purchase-id');
      if (!purchaseId) {
        alert('缺少订单ID');
        return;
      }
      if (!confirm('确认取消订单？')) return;
      try {
        const res = await fetch(`${API_BASE}/api/products/farmer/cancelPurchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purchase_id: parseInt(purchaseId, 10) })
        });
        const json = await res.json().catch(()=>({}));
        if (!res.ok) {
          throw new Error(json?.message || res.statusText);
        }
        alert(json?.message || '取消订单成功');
        loadPendingOrders(); // 刷新待发货订单
      } catch (err) {
        alert(`取消订单失败：${err.message || '网络错误'}`);
      }
      return;
    }
  });
}

// 已售出商品
const soldProductsList = document.getElementById('sold-products-list');
const msgSoldProducts = document.getElementById('msg-sold-products');
const btnRefreshSoldProducts = document.getElementById('btn-refresh-sold-products');

async function loadSoldProducts(showLoading = true) {
  if (!soldProductsList) return;
  const userId = getCurrentUserId();
  if (!userId) {
    msgSoldProducts.textContent = '未获取到用户ID，请重新登录后再试';
    soldProductsList.innerHTML = '';
    return;
  }
  if (showLoading) {
    msgSoldProducts.textContent = '加载中...';
    soldProductsList.innerHTML = '';
  }
  try {
    // 根据文档，查看已售出商品接口为 /api/products/farmer/soldout
    const res = await fetch(`${API_BASE}/api/products/farmer/soldout?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = normalizeFarmerProducts(json);
    renderSoldProducts(list);
    msgSoldProducts.textContent = list.length ? '' : '暂无已售出商品';
  } catch (err) {
    soldProductsList.innerHTML = '';
    msgSoldProducts.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function renderSoldProducts(list) {
  if (!soldProductsList) return;
  if (!Array.isArray(list) || !list.length) {
    soldProductsList.innerHTML = '<div class="empty">暂无已售出商品</div>';
    return;
  }
  soldProductsList.innerHTML = list.map(item=>{
    const safeImg = resolveProductImage(item.productImg || item.imageUrl);
    const fallbackImg = escapeAttr(DEFAULT_PRODUCT_IMAGE);
    const productId = item.productId ?? '';
    const productName = item.productName ?? item.name ?? '未命名商品';
    const amount = item.amout ?? item.amount ?? item.quantity ?? '—';
    const money = item.money ?? item.price ?? '—';
    const totalPrice = item.totalPrice ?? item.total_price ?? '—';
    const sendAddress = item.sendAddress ?? item.getAddress ?? item.address ?? '—';
    const createTime = item.createTime ?? item.createdTime ?? '—';
    return `<div class="product">
      <div class="name">${escapeAttr(productName)}</div>
      <div>商品ID：${escapeAttr(productId)}</div>
      <div>数量：${escapeAttr(amount)}</div>
      <div>单价：${money !== '—' ? `¥${escapeAttr(money)}` : '—'}</div>
      <div>总价：${totalPrice !== '—' ? `¥${escapeAttr(totalPrice)}` : '—'}</div>
      <div>收货地址：${escapeAttr(sendAddress)}</div>
      <div>创建时间：${escapeAttr(createTime)}</div>
      <div class="thumb"><img src="${safeImg}" alt="${escapeAttr(productName)}" onerror="this.onerror=null;this.src='${fallbackImg}'"></div>
    </div>`;
  }).join('');
}

if (btnRefreshSoldProducts) {
  btnRefreshSoldProducts.addEventListener('click', ()=>loadSoldProducts());
}

if (soldProductsList) {
  loadSoldProducts();
}

// 按状态查看商品
const statusProductsList = document.getElementById('status-products-list');
const msgStatusProducts = document.getElementById('msg-status-products');
const btnLoadStatusProducts = document.getElementById('btn-load-status-products');
const statusSelect = document.getElementById('status-select');

async function loadStatusProducts() {
  if (!statusProductsList) return;
  const userId = getCurrentUserId();
  if (!userId) {
    msgStatusProducts.textContent = '未获取到用户ID，请重新登录后再试';
    statusProductsList.innerHTML = '';
    return;
  }
  const status = statusSelect ? parseInt(statusSelect.value, 10) : 5;
  msgStatusProducts.textContent = '加载中...';
  statusProductsList.innerHTML = '';
  try {
    // 根据文档，展示某个状态的所有商品接口为 /api/products/farmer/showOneStatusAllProduct
    const res = await fetch(`${API_BASE}/api/products/farmer/showOneStatusAllProduct?userId=${encodeURIComponent(userId)}&status=${encodeURIComponent(status)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = normalizeFarmerProducts(json);
    renderStatusProducts(list, status);
    msgStatusProducts.textContent = list.length ? '' : '暂无该状态商品';
  } catch (err) {
    statusProductsList.innerHTML = '';
    msgStatusProducts.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function renderStatusProducts(list, status) {
  if (!statusProductsList) return;
  if (!Array.isArray(list) || !list.length) {
    statusProductsList.innerHTML = '<div class="empty">暂无该状态商品</div>';
    return;
  }
  const statusName = status === 5 ? '已收货' : status === 6 ? '已取消' : status === 7 ? '已退货' : `状态${status}`;
  statusProductsList.innerHTML = list.map(item=>{
    const productId = item.product_id ?? item.productId ?? '';
    const amount = item.amount ?? item.quantity ?? '—';
    const totalPrice = item.totalPrice ?? item.total_price ?? '—';
    const getAddress = item.getAddress ?? item.address ?? '—';
    const createTime = item.createTime ?? item.createdTime ?? '—';
    return `<div class="product">
      <div>商品ID：${escapeAttr(productId)}</div>
      <div>数量：${escapeAttr(amount)}</div>
      <div>总价：${totalPrice !== '—' ? `¥${escapeAttr(totalPrice)}` : '—'}</div>
      <div>收货地址：${escapeAttr(getAddress)}</div>
      <div>创建时间：${escapeAttr(createTime)}</div>
      <div>状态：${escapeAttr(statusName)}</div>
    </div>`;
  }).join('');
}

if (btnLoadStatusProducts) {
  btnLoadStatusProducts.addEventListener('click', ()=>loadStatusProducts());
}

