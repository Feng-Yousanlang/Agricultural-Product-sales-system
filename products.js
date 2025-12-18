const API_BASE = 'http://10.61.12.174:8080';
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
    const totalVolumn = parseInt(document.getElementById('farmer-product-surplus').value, 10);
    const imgInput = document.getElementById('farmer-product-img');
    const imgFile = imgInput?.files?.[0] || null;
    const producer = document.getElementById('farmer-product-producer')?.value.trim() || '';
    
    if (!name || Number.isNaN(price) || price < 0 || Number.isNaN(totalVolumn) || totalVolumn < 0) {
      msgAddProduct.textContent = '请填写合法的商品名称、单价与数量';
      return;
    }
    
    msgAddProduct.textContent = '提交中...';
    try {
      // 根据文档，发布新类型商品接口为 /api/products/farmer/newProduct
      // 请求参数：productName, price, userId, productImg(文件，可选), totalVolumn, producer(可选)
      const formData = new FormData();
      formData.append('productName', name);
      formData.append('price', String(price));
      formData.append('userId', String(currentUserId));
      formData.append('totalVolumn', String(totalVolumn));
      if (producer) {
        formData.append('producer', producer);
      }
      if (imgFile) {
        formData.append('file', imgFile, imgFile.name || 'product.jpg');
      }
      console.log('[农户上传商品] FormData payload：', {
        productName: name,
        price,
        userId: currentUserId,
        totalVolumn,
        producer,
        hasImage: Boolean(imgFile)
      });
      const res = await fetch(`${API_BASE}/api/products/farmer/newProduct`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok || (json?.code && Number(json.code) !== 200)) {
        throw new Error(json?.message || res.statusText);
      }
      msgAddProduct.textContent = json?.message || '商品上传成功';
      formAddProduct.reset();
      try {
        const previewImg = document.getElementById('product-img-preview-img');
        if (previewImg) {
          previewImg.src = DEFAULT_PRODUCT_IMAGE;
        }
      } catch {}
      loadFarmerProducts(false);
    } catch (err) {
      msgAddProduct.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

// 商品图片预览
try {
  const imgInput = document.getElementById('farmer-product-img');
  const previewImg = document.getElementById('product-img-preview-img');
  if (imgInput && previewImg) {
    imgInput.addEventListener('change', ()=>{
      const file = imgInput.files && imgInput.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        previewImg.src = url;
        previewImg.onload = function(){
          try { URL.revokeObjectURL(url); } catch {}
        };
      } else {
        previewImg.src = DEFAULT_PRODUCT_IMAGE;
      }
    });
  }
} catch {}

// 农户商品列表
const farmerProductsGrid = document.getElementById('farmer-products-grid');
const msgFarmerProducts = document.getElementById('msg-farmer-products');
const btnRefreshFarmerProducts = document.getElementById('btn-refresh-farmer-products');
const btnShowAllFarmerProducts = document.getElementById('btn-show-all-farmer-products');
let farmerProductsData = [];
const farmerProductsModal = document.getElementById('farmer-products-modal');
const farmerProductsModalContent = document.getElementById('farmer-products-modal-content');
const farmerProductsModalClose = document.getElementById('farmer-products-modal-close');

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
  const sorted = sortProducts(list);
  const sliced = sorted.slice(0, 3);
  farmerProductsGrid.innerHTML = sliced.map(item=>{
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
      <div class="thumb"><img src="${safeImg}" alt="${escapeAttr(item.productName || '')}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImg}'"></div>
      ${productId ? `<button class="btn btn-danger btn-delete-product" data-product-id="${escapeAttr(productId)}">下架商品</button>` : ''}
    </div>`;
  }).join('');
}

function getItemTimestamp(item) {
  const t = item.createTime ?? item.createdTime ?? item.updateTime ?? item.updatedTime ?? null;
  if (t) {
    const ms = Date.parse(String(t));
    if (!Number.isNaN(ms)) return ms;
  }
  const idNum = parseInt(item.productId ?? item.id ?? '0', 10);
  return Number.isFinite(idNum) ? idNum : 0;
}

function sortProducts(list) {
  try {
    return [...list].sort((a,b)=> getItemTimestamp(b) - getItemTimestamp(a));
  } catch {
    return list;
  }
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
    const list = normalizeFarmerProducts(json);
    farmerProductsData = list;
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

if (btnShowAllFarmerProducts) {
  btnShowAllFarmerProducts.addEventListener('click', ()=>openFarmerProductsModal());
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
        const payload = { productId: parseInt(productId, 10) };
        console.log('[农户下架商品] 提交 payload：', payload);
        const res = await fetch(`${API_BASE}/api/products/farmer/deleteProduct`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
    const card = e.target.closest('.product');
    if (card && !e.target.closest('.btn')) {
      openFarmerProductsModal();
    }
  });
}

function openFarmerProductsModal() {
  if (!farmerProductsModal || !farmerProductsModalContent) return;
  renderFarmerProductsModalGrid();
  farmerProductsModal.classList.remove('hidden');
}

function closeFarmerProductsModal() {
  if (!farmerProductsModal) return;
  farmerProductsModal.classList.add('hidden');
}

function renderFarmerProductsModalGrid() {
  if (!farmerProductsModalContent) return;
  const sorted = sortProducts(farmerProductsData);
  const html = sorted.map(item => {
    const safeImg = resolveProductImage(item.productImg || item.imageUrl);
    const fallbackImg = escapeAttr(DEFAULT_PRODUCT_IMAGE);
    const price = item.price ?? item.productPrice ?? '—';
    const surplus = item.surplus ?? item.stock ?? '—';
    const sales = item.salesVolume ?? item.sales ?? '—';
    const productId = item.productId ?? item.id ?? '';
    const producer = item.producer || item.owner || '—';
    return `
      <div class="product-card">
        <div class="product-card-thumb"><img src="${safeImg}" alt="${escapeAttr(item.productName || item.name || '')}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImg}'"></div>
        <div class="product-card-info">
          <div class="product-card-name">${escapeAttr(item.productName || item.name || '未命名商品')}</div>
          <div class="product-card-price">${price !== '—' ? `¥${escapeAttr(price)}` : '—'}</div>
          <div class="product-card-meta"><span>库存 ${escapeAttr(surplus)}</span><span>销量 ${escapeAttr(sales)}</span></div>
          <div class="product-desc">ID：${escapeAttr(productId)}｜发售商：${escapeAttr(producer)}</div>
          ${productId ? `<div class="product-modal-actions"><button class="btn btn-danger btn-delete-product" data-product-id="${escapeAttr(productId)}">下架商品</button></div>` : ''}
        </div>
      </div>
    `;
  }).join('');
  farmerProductsModalContent.innerHTML = `<div class="product-grid">${html}</div>`;
}

if (farmerProductsModalClose) {
  farmerProductsModalClose.addEventListener('click', closeFarmerProductsModal);
}

if (farmerProductsModalContent) {
  farmerProductsModalContent.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.btn-delete-product');
    if (btn) {
      const productId = btn.getAttribute('data-product-id');
      if (!productId) {
        alert('缺少商品ID');
        return;
      }
      if (!confirm('确认下架该商品？下架后如有订单将被取消。')) return;
      try {
        const payload = { productId: parseInt(productId, 10) };
        const res = await fetch(`${API_BASE}/api/products/farmer/deleteProduct`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json().catch(()=>({}));
        if (!res.ok) {
          throw new Error(json?.message || res.statusText);
        }
        alert(json?.message || '下架成功');
        await loadFarmerProducts(false);
        renderFarmerProductsModalGrid();
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
    // 尝试多种方式获取 purchase_id
    // 注意：根据接口文档，返回数据可能包含 purchase_id 或 purchaseId
    const purchaseId = item.purchase_id ?? item.purchaseId ?? item.id ?? '';
    const productId = item.productId ?? item.product_id ?? '';
    const amount = item.amount ?? item.quantity ?? '—';
    const totalPrice = item.totalPrice ?? item.total_price ?? '—';
    const getAddress = item.getAddress ?? item.address ?? item.sendAddress ?? '—';
    const createTime = item.createTime ?? item.createdTime ?? '—';
    
    // 如果 purchaseId 为空，显示警告但不阻止按钮显示
    // 实际使用时，后端应该返回 purchase_id
    return `<div class="product" data-purchase-id="${escapeAttr(purchaseId)}">
      <div>订单ID：${purchaseId || '未提供'}</div>
      <div>商品ID：${escapeAttr(productId)}</div>
      <div>数量：${escapeAttr(amount)}</div>
      <div>总价：${totalPrice !== '—' ? `¥${escapeAttr(totalPrice)}` : '—'}</div>
      <div>收货地址：${escapeAttr(getAddress)}</div>
      <div>创建时间：${escapeAttr(createTime)}</div>
      ${purchaseId ? `<button class="btn btn-secondary btn-send-product" data-purchase-id="${escapeAttr(purchaseId)}">发货</button>` : '<span class="text-warning">缺少订单ID，无法操作</span>'}
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
        // 验证 purchaseId 是否有效
        const purchaseIdNum = parseInt(purchaseId, 10);
        if (Number.isNaN(purchaseIdNum) || purchaseIdNum <= 0) {
          alert(`订单ID无效：${purchaseId}`);
          console.error('[发货] 订单ID无效:', purchaseId, '转换后:', purchaseIdNum);
          return;
        }
        
        const payload = { purchase_id: purchaseIdNum };
        const res = await fetch(`${API_BASE}/api/products/farmer/sendProduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
        // 验证 purchaseId 是否有效
        const purchaseIdNum = parseInt(purchaseId, 10);
        if (Number.isNaN(purchaseIdNum) || purchaseIdNum <= 0) {
          alert(`订单ID无效：${purchaseId}`);
          console.error('[取消订单] 订单ID无效:', purchaseId, '转换后:', purchaseIdNum);
          return;
        }
        
        const payload = { purchase_id: purchaseIdNum };
        const res = await fetch(`${API_BASE}/api/products/farmer/cancelPurchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
    const requestUrl = `${API_BASE}/api/products/farmer/showOneStatusAllProduct?userId=${encodeURIComponent(userId)}&status=${encodeURIComponent(status)}`;
    const res = await fetch(requestUrl);
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
