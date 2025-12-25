// 后端API基础地址
const API_BASE = 'http://10.61.57.87:8080';
// 挂载到 window 对象，供其他脚本文件使用
if (typeof window !== 'undefined') {
  window.API_BASE = API_BASE;
}

// 获取认证token
function getAuthToken() {
  try {
    return localStorage.getItem('auth_token') || '';
  } catch {
    return '';
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

// 登录校验：无token则跳回登录页
(function checkAuth() {
  try {
    if (!localStorage.getItem('auth_token')) {
      window.location.href = 'login.html';
      return;
    }
  } catch (e) {
    window.location.href = 'login.html';
    return;
  }
})();

// 显示用户ID
// 调用auth.js中的统一显示用户名函数
if (typeof window.Auth !== 'undefined' && window.Auth.displayUserId) {
  window.Auth.displayUserId();
} else {
  // 降级方案：如果auth.js未加载，则尝试显示用户ID
  (function displayUserIdFallback() {
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
}

// 退出登录
document.getElementById('btn-logout').onclick = function() {
  try { 
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_identity');
    localStorage.removeItem('user_id');
  } catch {}
  window.location.href = 'login.html';
};

// 根据用户身份显示/隐藏功能模块
//基于角色的前端显示控制。读取 localStorage 中的 user_identity ，遍历页面元素的 data-identity 属性，决定显示/隐藏模块。
(function setupRoleBasedUI() {
  try {
    const identity = localStorage.getItem('user_identity') || '1'; // 默认为农户
    const identityNum = parseInt(identity, 10);
    
    const identityElements = document.querySelectorAll('[data-identity]');
    
    function shouldShow(identityAttr) {
      if (!identityAttr) {
        return true;
      }
      const identityList = identityAttr.split(',')
        .map(item=>parseInt(item.trim(), 10))
        .filter(Number.isFinite);
      if (!identityList.length) {
        return true;
      }
      return identityList.includes(identityNum);
    }
    
    identityElements.forEach(el => {
      const identityAttr = el.getAttribute('data-identity');
      if (shouldShow(identityAttr)) {
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });
    
  } catch (e) {
    console.error('设置角色界面失败:', e);
  }
})();

// ---------------- 新闻轮播 ----------------
const slidesEl = document.getElementById('news-slides');
const dotsEl = document.getElementById('news-dots');
const newsPrevBtn = document.getElementById('news-prev');
const newsNextBtn = document.getElementById('news-next');
const newsTitleLink = document.getElementById('news-title-link');
const msgNews = document.getElementById('msg-news');
let news = [];
let idx = 0, timer = null;

async function fetchNews() {
  msgNews.textContent = '加载中...';
  try {
    const res = await fetch(`${API_BASE}/api/news`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    
    // 兼容多种返回格式：newsList 或 data.newsList 或 data 本身
    let newsList = null;
    if (json.newsList) {
      newsList = json.newsList;
    } else if (json.data) {
      if (Array.isArray(json.data)) {
        newsList = json.data;
      } else if (json.data.newsList) {
        newsList = json.data.newsList;
      } else if (Array.isArray(json.data)) {
        newsList = json.data;
      }
    } else if (Array.isArray(json)) {
      newsList = json;
    }
    
    if (Array.isArray(newsList) && newsList.length > 0) {
      news = sanitizeNewsList(newsList);
      renderNews();
      startAuto();
      msgNews.textContent = '';
    } else if (newsList && newsList.length === 0) {
      news = [];
      renderNews();
      msgNews.textContent = json?.message || '暂无新闻数据';
    } else {
      news = [];
      renderNews();
      msgNews.textContent = json?.message || '数据格式错误，请查看控制台';
    }
  } catch (err) {
    console.error('新闻加载错误:', err);
    news = [];
    renderNews();
    msgNews.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function renderNews(){
  const html = news.map(n=>{
    const href = n.newsUrl || n.url || '#';
    const title = n.title || n.name || '资讯';
    const imgSrc = resolveProductImage(n.imgUrl || n.imageUrl || '');
    const fallback = escapeAttr(DEFAULT_PRODUCT_IMAGE);
    return `<a class="slide" href="${escapeAttr(href)}" target="_blank" rel="noopener">
      <img src="${imgSrc}" alt="${escapeAttr(title)}" onerror="this.onerror=null;this.src='${fallback}'">
    </a>`;
  }).join('');
  slidesEl.innerHTML = html;
  dotsEl.innerHTML = news.map((_,i)=>`<span class="dot ${i===idx?'active':''}" data-i="${i}"></span>`).join('');
  updateSlide();
}

function sanitizeNewsList(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Map();
  for (const item of list) {
    const titleRaw = String(item.title || item.name || '').trim();
    if (!titleRaw) { out.push(item); continue; }
    const key = titleRaw.replace(/\s+/g, ' ').toLowerCase();
    const imgSrc = resolveProductImage(item.imgUrl || item.imageUrl || '');
    const isValidImg = imgSrc && imgSrc !== DEFAULT_PRODUCT_IMAGE;
    if (!seen.has(key)) {
      seen.set(key, { idx: out.length, valid: isValidImg });
      out.push(item);
    } else {
      const state = seen.get(key);
      if (!state.valid && isValidImg) {
        out[state.idx] = item;
        state.valid = true;
      }
    }
  }
  return out;
}

function updateSlide(){
  slidesEl.style.transform = `translateX(-${idx*100}%)`;
  [...dotsEl.children].forEach((d,i)=>d.classList.toggle('active', i===idx));
  if (newsTitleLink) {
    const item = news[idx] || {};
    const title = item.title || item.name || '';
    const href = item.newsUrl || item.url || '#';
    newsTitleLink.textContent = title || '';
    newsTitleLink.href = href;
  }
}
function startAuto(){ stopAuto(); timer = setInterval(()=>{ idx = (idx+1) % news.length; updateSlide(); }, 3500); }
function stopAuto(){ if(timer){ clearInterval(timer); timer=null; } }

if (dotsEl) {
  dotsEl.addEventListener('click', e=>{
    const t = e.target; if(!t.classList.contains('dot')) return; idx = parseInt(t.getAttribute('data-i'),10)||0; updateSlide();
  });
}
const newsRefreshBtn = document.getElementById('news-refresh');
if (newsRefreshBtn) {
  newsRefreshBtn.onclick = ()=>{ idx=0; fetchNews(); };
}

if (newsPrevBtn) {
  newsPrevBtn.addEventListener('click', ()=>{ stopAuto(); idx = (idx - 1 + news.length) % news.length; updateSlide(); startAuto(); });
}
if (newsNextBtn) {
  newsNextBtn.addEventListener('click', ()=>{ stopAuto(); idx = (idx + 1) % news.length; updateSlide(); startAuto(); });
}

// ---------------- 金融产品 ----------------
const productsGrid = document.getElementById('products-grid');
const msgProducts = document.getElementById('msg-products');
const productsPrevBtn = document.getElementById('products-prev');
const productsNextBtn = document.getElementById('products-next');
const productsPageInfo = document.getElementById('products-page-info');
let productsData = [];
let productsPage = 1;
const PRODUCTS_PAGE_SIZE = 6;

async function fetchProducts(){
  msgProducts.textContent = '加载中...';
  try {
    const res = await fetch(`${API_BASE}/api/financing/products/`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    
    // 兼容多种返回格式：products 或 data.products 或 data 本身
    let products = null;
    if (json.products) {
      products = json.products;
    } else if (json.data) {
      if (Array.isArray(json.data)) {
        products = json.data;
      } else if (json.data.products) {
        products = json.data.products;
      }
    } else if (Array.isArray(json)) {
      products = json;
    }
    
    if (Array.isArray(products)) {
      productsData = products;
      renderProductsPage(1);
      msgProducts.textContent = products.length ? '' : '暂无金融产品';
      return;
    }
    console.error('金融产品数据格式错误:', json);
    throw new Error('响应格式错误：未找到产品列表');
  } catch (err) {
    console.error('金融产品加载错误:', err);
    productsData = [];
    renderProductsPage(1);
    msgProducts.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function renderProductsPage(page = 1){
  if (!productsGrid) return;
  const total = productsData.length;
  const totalPages = total ? Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE)) : 1;
  productsPage = Math.min(Math.max(page, 1), totalPages);
  const start = (productsPage - 1) * PRODUCTS_PAGE_SIZE;
  const pageList = productsData.slice(start, start + PRODUCTS_PAGE_SIZE);
  productsGrid.innerHTML = pageList.map(p=>
    `<div class="product">
      <div class="name">${p.fpName}</div>
      <div class="desc">${p.fpDescription||''}</div>
      <div class="rate">${p.annualRate? ('年化 ' + p.annualRate + '%') : '—'}</div>
      <div class="tags">${(p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    </div>`
  ).join('');
  if (productsPageInfo) {
    productsPageInfo.textContent = total ? `${productsPage}/${totalPages}` : '0/0';
  }
  if (productsPrevBtn) {
    productsPrevBtn.disabled = productsPage <= 1;
  }
  if (productsNextBtn) {
    productsNextBtn.disabled = productsPage >= totalPages;
  }
}

const productsRefreshBtn = document.getElementById('products-refresh');
if (productsRefreshBtn) {
  productsRefreshBtn.onclick = fetchProducts;
}
if (productsPrevBtn) {
  productsPrevBtn.addEventListener('click', () => renderProductsPage(productsPage - 1));
}
if (productsNextBtn) {
  productsNextBtn.addEventListener('click', () => renderProductsPage(productsPage + 1));
}

// 初始化
if (slidesEl && msgNews) {
  fetchNews();
}
if (productsGrid && msgProducts) {
  fetchProducts();
}

// ---------------- 农业知识 ----------------
const btnLoadKnowledge = document.getElementById('btn-load-knowledge');
const knowledgeList = document.getElementById('knowledge-list');
const msgKnowledge = document.getElementById('msg-knowledge');
const btnSearchKnowledge = document.getElementById('btn-search-knowledge');
const knowledgeSearchList = document.getElementById('knowledge-search-list');
const msgKnowledgeSearch = document.getElementById('msg-knowledge-search');

async function loadKnowledgeList(){
  const page = 1;
  const size = 6;
  if (!knowledgeList) return;
  knowledgeList.innerHTML = '';
  if (msgKnowledge) msgKnowledge.textContent = '加载中...';
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/list?page=${page}&page_size=${size}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    knowledgeList.innerHTML = list.map(item=>
      `<a href="${item.url || '#'}" class="knowledge-item" target="_blank" rel="noopener">
        <span class="knowledge-title" title="${item.title || ''}">${item.title || '未命名'}</span>
        <span class="knowledge-date">${item.publish || ''}</span>
      </a>`
    ).join('');
    if (msgKnowledge) msgKnowledge.textContent = list.length ? '' : (json?.message || '暂无数据');
  } catch (err) {
    knowledgeList.innerHTML = '';
    if (msgKnowledge) msgKnowledge.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}
if (btnLoadKnowledge) {
  btnLoadKnowledge.onclick = loadKnowledgeList;
  loadKnowledgeList();
}

if (btnSearchKnowledge) {
  btnSearchKnowledge.onclick = async ()=>{
    const keyword = document.getElementById('knowledge-keyword').value.trim();
    const page = parseInt(document.getElementById('knowledge-search-page').value, 10) || 1;
    const size = parseInt(document.getElementById('knowledge-search-size').value, 10) || 10;
    knowledgeSearchList.innerHTML = '';
    if (!keyword) {
      msgKnowledgeSearch.textContent = '请输入关键词';
      return;
    }
    msgKnowledgeSearch.textContent = '搜索中...';
    try {
      const res = await fetch(`${API_BASE}/api/knowledge/search?q=${encodeURIComponent(keyword)}&page=${page}&page_size=${size}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      knowledgeSearchList.innerHTML = list.map(item=>
        `<div class="list-card">
          <div class="name">${item.title || '未命名'}</div>
          <div>来源：${item.source || '—'}</div>
          <div>发布日期：${item.publish || '—'}</div>
          <a href="${item.url}" target="_blank" rel="noopener">查看原文</a>
        </div>`
      ).join('');
      msgKnowledgeSearch.textContent = list.length ? '' : (json?.message || '暂无匹配结果');
    } catch (err) {
      knowledgeSearchList.innerHTML = '';
      msgKnowledgeSearch.textContent = `搜索失败：${err.message || '网络错误'}`;
    }
  };
}



// 银行端贷款产品管理
const bankLoanProductsGrid = document.getElementById('loan-products-grid');
const bankMsgLoanProducts = document.getElementById('msg-loan-products');
const bankBtnLoanProductsRefresh = document.getElementById('loan-products-refresh');
const bankInputLoanProductSearch = document.getElementById('loan-product-search-q');
const bankBtnLoanProductSearch = document.getElementById('loan-product-search-btn');
const bankFormLoanProductCreate = document.getElementById('form-loan-product-create');
const bankMsgLoanProductCreate = document.getElementById('msg-loan-product-create');
const bankLoanProductModal = document.getElementById('loan-product-modal');
const bankLoanProductModalBody = document.getElementById('loan-product-modal-body');
const bankLoanProductModalClose = document.getElementById('loan-product-modal-close');
const bankLoanProductModalCancel = document.getElementById('loan-product-modal-cancel');
const bankBtnDeleteLoanProduct = document.getElementById('btn-delete-loan-product');
const bankMsgLoanProductModal = document.getElementById('msg-loan-product-modal');
let bankLoanProductsCache = [];
let bankCurrentLoanProductIndex = -1;

async function bankLoadLoanProducts() {
  if (!bankLoanProductsGrid) return;
  if (bankMsgLoanProducts) bankMsgLoanProducts.textContent = '加载中...';
  try {
    const res = await fetch(`${API_BASE}/api/loan/products`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list = bankNormalizeLoanProducts(json);
    bankLoanProductsCache = list;
    bankRenderLoanProducts(list);
    if (bankMsgLoanProducts) {
      bankMsgLoanProducts.textContent = list.length ? '' : (json?.message || '暂无贷款产品');
    }
  } catch (err) {
    bankLoanProductsCache = [];
    bankRenderLoanProducts([]);
    if (bankMsgLoanProducts) bankMsgLoanProducts.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

async function bankSearchLoanProducts(keyword) {
  if (!bankLoanProductsGrid) return;
  const q = (keyword || '').trim();
  if (!q) {
    if (bankMsgLoanProducts) bankMsgLoanProducts.textContent = '请输入产品名称进行搜索';
    return;
  }
  if (bankMsgLoanProducts) bankMsgLoanProducts.textContent = '搜索中...';
  bankLoanProductsGrid.innerHTML = '';
  try {
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const payload = { q };
    console.log('[贷款产品搜索] 即将提交的 payload：', payload);
    const res = await fetch(`${API_BASE}/api/loan/searchproduct`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list = bankNormalizeLoanProducts(json);
    bankLoanProductsCache = list;
    bankRenderLoanProducts(list);
    if (bankMsgLoanProducts) {
      bankMsgLoanProducts.textContent = list.length
        ? `已为关键字「${q}」找到 ${list.length} 个产品`
        : (json?.message || `未找到与「${q}」匹配的产品`);
    }
  } catch (err) {
    bankLoanProductsCache = [];
    bankRenderLoanProducts([]);
    if (bankMsgLoanProducts) bankMsgLoanProducts.textContent = `搜索失败：${err.message || '网络错误'}`;
  }
}

function bankNormalizeLoanProducts(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload)) return payload;
  return [];
}

function bankRenderLoanProducts(list) {
  if (!bankLoanProductsGrid) return;
  if (!Array.isArray(list) || !list.length) {
    bankLoanProductsGrid.innerHTML = '<div class="msg">暂无贷款产品</div>';
    return;
  }
  bankLoanProductsGrid.innerHTML = list.map((product, index) => {
    const id = bankResolveLoanProductId(product);
    const name = product.name || product.productName || product.fpName || `产品#${id || index + 1}`;
    const desc = product.description || product.fpDescription || '暂无描述';
    const category = product.category || product.type || '';
    const amountRange = bankFormatAmountRange(product);
    const rateText = bankFormatRate(product);
    const termText = bankFormatTerm(product);
    const tagsHtml = bankRenderLoanProductTags(
      product.tags || product.tagList || product.labels || (category ? [category] : [])
    );
    return `<div class="loan-product-card" data-bank-product-index="${index}" data-bank-product-id="${escapeHtml(String(id ?? ''))}">
      ${category ? `<div class="loan-product-category">${escapeHtml(category)}</div>` : ''}
      <div class="loan-product-name">${escapeHtml(name)}</div>
      <p class="loan-product-desc">${escapeHtml(desc)}</p>
      <div class="loan-product-meta">
        <div><small>额度范围</small><strong>${amountRange}</strong></div>
        <div><small>年化利率</small><strong>${rateText}</strong></div>
        <div><small>期限(月)</small><strong>${termText}</strong></div>
        <div><small>产品ID</small><strong>${id || '—'}</strong></div>
      </div>
      ${tagsHtml ? `<div class="loan-product-tags">${tagsHtml}</div>` : ''}
    </div>`;
  }).join('');
}

function bankResolveLoanProductId(product = {}) {
  return product.productId ?? product.id ?? product.fpId ?? product.loanProductId ?? null;
}

function bankFormatAmountRange(product = {}) {
  const min = product.minAmount ?? product.min_amount ?? product.min ?? null;
  const max = product.maxAmount ?? product.max_amount ?? product.max ?? null;
  if (min === null && max === null) return '—';
  if (min !== null && max !== null) return `${bankFormatCurrency(min)} ~ ${bankFormatCurrency(max)}`;
  const value = bankFormatCurrency(min ?? max ?? 0);
  return value || '—';
}

function bankFormatCurrency(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function bankFormatRate(product = {}) {
  const rate = product.interestRate ?? product.annualRate ?? product.rate ?? null;
  if (rate === null || rate === undefined) return '—';
  return `${rate}%`;
}

function bankFormatTerm(product = {}) {
  const term = product.term ?? product.loanTerm ?? product.maxTerm ?? null;
  if (term === null || term === undefined) return '—';
  return term;
}



// ---------------- 银行贷款产品标签渲染 ----------------
function bankRenderLoanProductTags(tags) {
  if (!tags) return '';
  const arr = Array.isArray(tags)
    ? tags
    : String(tags).split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  if (!arr.length) return '';
  // 过滤掉"未分类"标签
  const filteredTags = arr.filter(tag => tag !== '未分类');
  if (!filteredTags.length) return '';
  return filteredTags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
}

function bankOpenLoanProductModal(product, index) {
  if (!bankLoanProductModal || !product) return;
  bankCurrentLoanProductIndex = index;
  // 清空模态框内容，不显示详细信息
  if (bankLoanProductModalBody) bankLoanProductModalBody.innerHTML = '';
  // 清空消息提示
  if (bankMsgLoanProductModal) bankMsgLoanProductModal.textContent = '';
  // 显示模态框
  bankLoanProductModal.classList.remove('hidden');
}

function bankCloseLoanProductModal() {
  if (!bankLoanProductModal) return;
  bankLoanProductModal.classList.add('hidden');
  if (bankLoanProductModalBody) bankLoanProductModalBody.innerHTML = '';
  if (bankMsgLoanProductModal) bankMsgLoanProductModal.textContent = '';
  bankCurrentLoanProductIndex = -1;
}

function bankGetCurrentLoanProduct() {
  if (bankCurrentLoanProductIndex < 0) return null;
  return bankLoanProductsCache[bankCurrentLoanProductIndex] || null;
}

if (bankLoanProductsGrid) {
  bankLoanProductsGrid.addEventListener('click', (event) => {
    const card = event.target.closest('.loan-product-card');
    if (!card) return;
    const index = Number(card.getAttribute('data-bank-product-index'));
    if (!Number.isFinite(index)) return;
    const product = bankLoanProductsCache[index];
    bankOpenLoanProductModal(product, index);
  });
}

if (bankBtnLoanProductsRefresh) {
  bankBtnLoanProductsRefresh.addEventListener('click', () => {
    bankLoadLoanProducts();
  });
}

if (bankBtnLoanProductSearch && bankInputLoanProductSearch) {
  bankBtnLoanProductSearch.addEventListener('click', () => {
    bankSearchLoanProducts(bankInputLoanProductSearch.value);
  });
  bankInputLoanProductSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      bankSearchLoanProducts(bankInputLoanProductSearch.value);
    }
  });
}

if (bankLoanProductModalClose) {
  bankLoanProductModalClose.addEventListener('click', bankCloseLoanProductModal);
}
if (bankLoanProductModalCancel) {
  bankLoanProductModalCancel.addEventListener('click', bankCloseLoanProductModal);
}
if (bankLoanProductModal) {
  bankLoanProductModal.addEventListener('click', (event) => {
    if (event.target === bankLoanProductModal) {
      bankCloseLoanProductModal();
    }
  });
}

if (bankBtnDeleteLoanProduct) {
  bankBtnDeleteLoanProduct.addEventListener('click', async () => {
    const product = bankGetCurrentLoanProduct();
    if (!product) {
      if (bankMsgLoanProductModal) bankMsgLoanProductModal.textContent = '未找到当前产品';
      return;
    }
    const productId = bankResolveLoanProductId(product);
    if (!productId) {
      if (bankMsgLoanProductModal) bankMsgLoanProductModal.textContent = '产品ID缺失，无法删除';
      return;
    }
    if (!confirm(`确定删除产品「${product.name || product.productName || productId}」吗？该操作不可恢复`)) {
      return;
    }
    const token = getAuthToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    if (bankMsgLoanProductModal) bankMsgLoanProductModal.textContent = '删除中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/products/${productId}`, {
        method: 'DELETE',
        headers
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || res.statusText);
      if (bankMsgLoanProductModal) bankMsgLoanProductModal.textContent = json?.message || '删除成功';
      bankCloseLoanProductModal();
      bankLoadLoanProducts();
    } catch (err) {
      if (bankMsgLoanProductModal) bankMsgLoanProductModal.textContent = `删除失败：${err.message || '网络错误'}`;
    }
  });
}

if (bankFormLoanProductCreate) {
  bankFormLoanProductCreate.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('loan-product-name').value.trim();
    const categoryInput = document.getElementById('loan-product-category');
    const minAmountRaw = document.getElementById('loan-product-min').value;
    const maxAmountRaw = document.getElementById('loan-product-max').value;
    const rateRaw = document.getElementById('loan-product-rate').value;
    const termRaw = document.getElementById('loan-product-term').value;
    const description = document.getElementById('loan-product-desc').value.trim();

    if (!name) {
      if (bankMsgLoanProductCreate) bankMsgLoanProductCreate.textContent = '产品名称为必填项';
      return;
    }

    const categoryRaw = categoryInput ? categoryInput.value.trim() : '';
    const tagsFromInput = categoryRaw
      ? categoryRaw.split(/[，,\s]+/).map((item) => item.trim()).filter(Boolean)
      : [];
    const resolvedCategory = tagsFromInput[0] || categoryRaw || '综合金融';

    const payload = {
      name,
      productName: name,
      category: resolvedCategory,
      type: resolvedCategory,
      description,
      minAmount: minAmountRaw ? Number(minAmountRaw) : undefined,
      maxAmount: maxAmountRaw ? Number(maxAmountRaw) : undefined,
      interestRate: rateRaw ? Number(rateRaw) : undefined,
      term: termRaw ? Number(termRaw) : undefined,
      tags: tagsFromInput.length ? tagsFromInput : undefined
    };
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (bankMsgLoanProductCreate) bankMsgLoanProductCreate.textContent = '提交中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || res.statusText);
      if (bankMsgLoanProductCreate) bankMsgLoanProductCreate.textContent = json?.message || '创建成功';
      bankFormLoanProductCreate.reset();
      bankLoadLoanProducts();
    } catch (err) {
      if (bankMsgLoanProductCreate) bankMsgLoanProductCreate.textContent = `创建失败：${err.message || '网络错误'}`;
    }
  });
}

if (bankLoanProductsGrid) {
  bankLoadLoanProducts();
}

function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------- 贷款申请 ----------------

// ---------------- 我的申请列表 ----------------
// ---------------- 我的申请列表 ----------------

// ---------------- 审批中心 ----------------
const btnLoadPending = document.getElementById('btn-load-pending');
const pendingList = document.getElementById('pending-list');
const msgApprove = document.getElementById('msg-approve');

function normalizePendingApprovals(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.list)) return payload.list;
  return [];
}

async function loadPendingApprovals(showLoading = true) {
  if (!pendingList || !msgApprove) return;
  if (showLoading) {
    pendingList.innerHTML = '';
    msgApprove.textContent = '加载待审批...';
  }
  try {
    const res = await fetch(`${API_BASE}/api/loan/pending`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = normalizePendingApprovals(json);
    renderPendingApprovals(list);
    msgApprove.textContent = list.length ? '' : '暂无待审批申请';
  } catch (err) {
    renderPendingApprovals([]);
    msgApprove.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function resolveApplicationId(item = {}) {
  return item.applicationId
    ?? item.loanApplicationId
    ?? item.id
    ?? item.application_id
    ?? item.loanId
    ?? null;
}

function renderPendingApprovals(list) {
  if (!pendingList) return;
  if (!Array.isArray(list) || !list.length) {
    pendingList.innerHTML = '<div class="msg">暂无待审批申请</div>';
    return;
  }
  pendingList.innerHTML = list.map((item) => {
    const applicationId = resolveApplicationId(item);
    const applicantName = item.userName || item.user?.name || `用户 #${item.userId || '—'}`;
    const avatar = item.user?.avatar
      ? `<img src="${escapeHtml(item.user.avatar)}" alt="${escapeHtml(applicantName)}" class="avatar-small">`
      : '';
    const amountText = item.amount ?? item.loanAmount ?? '—';
    const termText = item.term ?? item.loanTerm ?? '—';
    const applyTime = item.applyTime || item.createdAt || item.createTime || '';
    const productName = item.productName || item.product?.name || '—';
    const idText = applicationId !== null && applicationId !== undefined
      ? String(applicationId)
      : `N${Date.now()}${Math.random().toString(36).slice(2,6)}`;
    const safeId = escapeHtml(idText);
    return `<div class="expert loan-approval-card" data-application-id="${safeId}">
      <div class="name">申请 #${escapeHtml(String(applicationId ?? '—'))}</div>
      <div class="applicant">
        ${avatar}
        <div>
          <div>申请人：${escapeHtml(applicantName)}</div>
          <div>用户ID：${escapeHtml(item.userId || item.user?.id || '—')}</div>
        </div>
      </div>
      <div>产品：${escapeHtml(productName)}</div>
      <div>金额：${escapeHtml(amountText)}，期限(月)：${escapeHtml(termText)}</div>
      <div>申请时间：${escapeHtml(applyTime || '—')}</div>
      ${item.remark ? `<div>备注：${escapeHtml(item.remark)}</div>` : ''}
      <div class="pending-actions">
        <button class="btn btn-secondary btn-approval-action" data-application-id="${safeId}" data-decision="1">同意</button>
        <button class="btn btn-danger btn-approval-action" data-application-id="${safeId}" data-decision="0">拒绝</button>
      </div>
    </div>`;
  }).join('');
}

async function submitLoanApproval(applicationId, decision, triggerBtn) {
  if (!msgApprove) return;
  const approverId = getCurrentUserId();
  if (!approverId) {
    msgApprove.textContent = '未获取到审批人信息，请重新登录';
    return;
  }
  const numericApplicationId = Number.parseInt(applicationId, 10);
  console.log('[审批中心] 尝试提交审批', {
    rawAttribute: applicationId,
    parsedApplicationId: numericApplicationId,
    decision,
    approverId
  });
  if (!Number.isFinite(numericApplicationId) || numericApplicationId <= 0) {
    msgApprove.textContent = '当前申请缺少有效的 applicationId，无法提交审批';
    console.warn('[审批中心] applicationId 无效，终止提交');
    return;
  }
  const payload = {
    applicationId: numericApplicationId,
    userId: approverId,
    decision: Number(decision),
    remark: Number(decision) === 1 ? '审批通过' : '审批拒绝'
  };
  console.log('[审批中心] 提交 payload：', payload);
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const originalText = triggerBtn?.textContent;
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = '提交中...';
  }
  msgApprove.textContent = '提交审批中...';
  try {
    const res = await fetch(`${API_BASE}/api/loan/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.message || res.statusText);
    }
    msgApprove.textContent = json?.message || '审批提交成功';
    loadPendingApprovals(false);
  } catch (err) {
    msgApprove.textContent = `提交失败：${err.message || '网络错误'}`;
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = originalText || '提交';
    }
  }
}

if (btnLoadPending && pendingList && msgApprove) {
  btnLoadPending.addEventListener('click', () => loadPendingApprovals(true));
  pendingList.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('.btn-approval-action');
    if (!actionBtn) return;
    const applicationId = actionBtn.getAttribute('data-application-id');
    const decision = actionBtn.getAttribute('data-decision');
    if (!applicationId || decision === null) return;
    submitLoanApproval(applicationId, decision, actionBtn);
  });
  loadPendingApprovals(true);
}

const btnLoadApprovalHistory = document.getElementById('btn-load-approval-history');
const approvalHistoryList = document.getElementById('approval-history-list');
const msgApprovalHistory = document.getElementById('msg-approval-history');
if (btnLoadApprovalHistory) {
  btnLoadApprovalHistory.onclick = async function(){
    approvalHistoryList.innerHTML = '';
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      msgApprovalHistory.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }
    msgApprovalHistory.textContent = '加载审批历史中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/approvals?userId=${encodeURIComponent(currentUserId)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      approvalHistoryList.innerHTML = list.map(item =>
        `<div class="list-card">
           ${item.applicationId ? `<div>申请ID：${item.applicationId}</div>` : ''}
           <div>审批人ID：${item.approverId || '—'}</div>
           <div>结果：${item.decision || '—'}</div>
           <div>备注：${item.remark || '—'}</div>
           <div>时间：${item.date || item.createTime || '—'}</div>
         </div>`
      ).join('');
      msgApprovalHistory.textContent = list.length ? '' : (json?.message || '暂无审批记录');
    } catch (err) {
      approvalHistoryList.innerHTML = '';
      msgApprovalHistory.textContent = `加载失败：${err.message || '网络错误'}`;
    }
  };
}

// ---------------- 还款管理 ----------------
// ---------------- 还款管理 ----------------

const btnLoadStatus = document.getElementById('btn-load-status');
const loanStatusList = document.getElementById('loan-status-list');
const msgLoanStatus = document.getElementById('msg-loan-status');
async function loadLoanStatus(){
  msgLoanStatus.textContent = '加载中...';
  loanStatusList.innerHTML = '';
  try {
    const res = await fetch(`${API_BASE}/api/loan/status`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    loanStatusList.innerHTML = list.map(item=>
      `<div class="list-card loan-status-card">
         <div class="name">${item.status_name ?? item.statusName ?? '—'} <span style="font-weight:normal; color:#999; font-size:12px; margin-left:4px;">#${item.status_code ?? item.statusCode ?? '—'}</span></div>
         <div class="desc">${item.description || '暂无说明'}</div>
       </div>`
    ).join('');
    msgLoanStatus.textContent = list.length ? '' : (json?.message || '暂无状态数据');
  } catch (err) {
    loanStatusList.innerHTML = '';
    msgLoanStatus.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}
if (btnLoadStatus) {
  btnLoadStatus.onclick = loadLoanStatus;
  loadLoanStatus();
}

// ---------------- 贷款状态管理（新增、修改、删除） ----------------
const formCreateLoanStatus = document.getElementById('form-create-loan-status');
const msgCreateLoanStatus = document.getElementById('msg-create-loan-status');
if (formCreateLoanStatus) {
  formCreateLoanStatus.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = {
      status_code: parseInt(document.getElementById('status-code').value, 10),
      status_name: document.getElementById('status-name').value.trim(),
      description: document.getElementById('status-desc').value.trim()
    };
    if (!payload.status_code || !payload.status_name) {
      msgCreateLoanStatus.textContent = '请填写状态代码和状态名称';
      return;
    }
    msgCreateLoanStatus.textContent = '提交中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgCreateLoanStatus.textContent = json?.message || '新增状态成功';
      formCreateLoanStatus.reset();
      loadLoanStatus();
    } catch (err) {
      msgCreateLoanStatus.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

const formUpdateLoanStatus = document.getElementById('form-update-loan-status');
const msgUpdateLoanStatus = document.getElementById('msg-update-loan-status');
if (formUpdateLoanStatus) {
  formUpdateLoanStatus.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const statusId = parseInt(document.getElementById('update-status-id').value, 10);
    const payload = {
      status_name: document.getElementById('update-status-name').value.trim(),
      description: document.getElementById('update-status-desc').value.trim()
    };
    if (!statusId || !payload.status_name) {
      msgUpdateLoanStatus.textContent = '请填写状态ID和状态名称';
      return;
    }
    msgUpdateLoanStatus.textContent = '提交中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/status/${statusId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgUpdateLoanStatus.textContent = json?.message || '更新成功';
      formUpdateLoanStatus.reset();
      loadLoanStatus();
    } catch (err) {
      msgUpdateLoanStatus.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

const formDeleteLoanStatus = document.getElementById('form-delete-loan-status');
const msgDeleteLoanStatus = document.getElementById('msg-delete-loan-status');
if (formDeleteLoanStatus) {
  formDeleteLoanStatus.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const statusId = parseInt(document.getElementById('delete-status-id').value, 10);
    if (!statusId) {
      msgDeleteLoanStatus.textContent = '请输入状态ID';
      return;
    }
    msgDeleteLoanStatus.textContent = '删除中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/status/${statusId}`, {
        method: 'DELETE'
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgDeleteLoanStatus.textContent = json?.message || '删除成功';
      formDeleteLoanStatus.reset();
      loadLoanStatus();
    } catch (err) {
      msgDeleteLoanStatus.textContent = `删除失败：${err.message || '网络错误'}`;
    }
  });
}

// ---------------- 农产品商城 ----------------
// 使用本地占位图，避免外网域名（via.placeholder.com）在实验环境中解析失败
const DEFAULT_PRODUCT_IMAGE = 'default-product.png';

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

const productCatalogList = document.getElementById('product-catalog-list');
const msgProductCatalog = document.getElementById('msg-product-catalog');
const btnRefreshProducts = document.getElementById('btn-refresh-products');
const productModal = document.getElementById('product-modal');
const modalProductInfo = document.getElementById('modal-product-info');
const modalProductMsg = document.getElementById('modal-product-msg');
const modalCommentList = document.getElementById('modal-comment-list');
const modalCommentMsg = document.getElementById('modal-comment-msg');
const productCommentBlock = document.getElementById('product-comment-block');
const btnToggleComments = document.getElementById('btn-toggle-comments');
const commentInputField = document.getElementById('comment-content-input');
const commentStatusMsg = document.getElementById('msg-comment');
const btnSubmitComment = document.getElementById('btn-submit-comment');
const COMMENT_REPLY_PREFIX = '回复评论：';
const replyIndicator = document.getElementById('replying-to');
const replyTargetNameEl = document.getElementById('reply-target-name');
const btnCancelReply = document.getElementById('btn-cancel-reply');
const modalSelectedName = document.getElementById('modal-selected-name');
const btnCloseProductModal = document.getElementById('btn-close-product-modal');
const btnModalAddCart = document.getElementById('btn-modal-add-cart');
const btnModalPurchase = document.getElementById('btn-modal-purchase');
const purchaseModal = document.getElementById('purchase-modal');
const purchaseModalTitle = document.getElementById('purchase-modal-title');
const purchaseModalProductName = document.getElementById('purchase-modal-product-name');
const formPurchaseModal = document.getElementById('form-purchase-modal');
const purchaseAmountInput = document.getElementById('purchase-modal-amount');
const purchaseAmountRow = document.getElementById('purchase-modal-amount-row');
const purchaseAddressGroup = document.getElementById('purchase-modal-address-group');
const purchaseAddressInput = document.getElementById('purchase-modal-address');
const purchaseAddressSelect = document.getElementById('purchase-modal-address-select');
const btnRefreshAddress = document.getElementById('btn-refresh-address');
const purchaseModalMsg = document.getElementById('msg-purchase-modal');
const btnPurchaseCancel = document.getElementById('btn-purchase-cancel');
const productModalCartAmount = document.getElementById('product-modal-cart-amount');
const btnCartAmountDec = document.getElementById('btn-cart-amount-dec');
const btnCartAmountInc = document.getElementById('btn-cart-amount-inc');
const modalUnitPriceEl = document.getElementById('modal-unit-price');
const modalTotalPriceEl = document.getElementById('modal-total-price');

const PRODUCT_ID_INPUTS = [
  'comment-productId',
  'reply-productId'
];

let latestProductCatalog = [];
let selectedProductCard = null;
const childCommentCache = new Map();
let activeProductId = null;
let activeProductName = '';
let activeProductPrice = null;
let activeCartId = null;
let pendingPurchaseAction = 'purchase';
let savedAddresses = [];
let commentReplyTarget = null;
const commentMetaStore = new Map();

function registerCommentMeta(commentId, name, userId) {
  if (!commentId) return;
  const key = String(commentId);
  commentMetaStore.set(key, {
    name,
    userId
  });
}

function getCommentMeta(commentId) {
  if (!commentId) return null;
  return commentMetaStore.get(String(commentId)) || null;
}

function resolveCommentAuthorName(name, userId) {
  if (name && String(name).trim()) return String(name).trim();
  if (userId && userId !== '—') {
    return `用户${userId}`;
  }
  return '匿名用户';
}

function renderLikeButton(commentId, likeCount) {
  if (!commentId) return '';
  const safeId = escapeAttr(commentId);
  const count = Number.isFinite(Number(likeCount)) ? Number(likeCount) : 0;
  return `<button type="button" class="btn btn-like-comment" data-comment-id="${safeId}" data-liked="false" aria-pressed="false">
    <span class="like-icon" aria-hidden="true">👍</span>
    <span class="like-text">点赞</span>
    <span class="like-count">${escapeAttr(count)}</span>
  </button>`;
}
function updateLikeButtonState(btn, liked, count) {
  if (!btn) return;
  btn.dataset.liked = liked ? 'true' : 'false';
  btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
  btn.classList.toggle('liked', liked);
  const icon = btn.querySelector('.like-icon');
  if (icon) {
    icon.textContent = liked ? '❤️' : '👍';
  }
  const textEl = btn.querySelector('.like-text');
  if (textEl) {
    textEl.textContent = liked ? '已点赞' : '点赞';
  }
  if (count !== undefined && count !== null) {
    const countEl = btn.querySelector('.like-count');
    if (countEl) {
      countEl.textContent = count;
    }
  }
}


function extractReplyTargetFromElement(el) {
  if (!el) return null;
  const id = el.getAttribute('data-comment-id');
  if (!id) return null;
  const rootIdAttr = el.getAttribute('data-root-id');
  const rootId = rootIdAttr && rootIdAttr.trim() ? rootIdAttr : id;
  const name = el.getAttribute('data-user-name') || '';
  return {
    id,
    rootId,
    name
  };
}

function updateReplyIndicator() {
  if (!replyIndicator) return;
  if (commentReplyTarget) {
    replyIndicator.classList.remove('hidden');
    if (replyTargetNameEl) {
      replyTargetNameEl.textContent = commentReplyTarget.name || `#${commentReplyTarget.id}`;
    }
  } else {
    replyIndicator.classList.add('hidden');
  }
}

function clearReplyTarget() {
  commentReplyTarget = null;
  updateReplyIndicator();
  if (commentInputField && commentInputField.value.startsWith(COMMENT_REPLY_PREFIX)) {
    commentInputField.value = '';
  }
  if (commentStatusMsg && commentStatusMsg.textContent.startsWith('正在回复')) {
    commentStatusMsg.textContent = '';
  }
}

function setReplyTarget(target) {
  commentReplyTarget = target;
  updateReplyIndicator();
  if (commentInputField) {
    if (!commentInputField.value.startsWith(COMMENT_REPLY_PREFIX)) {
      commentInputField.value = COMMENT_REPLY_PREFIX;
    }
    commentInputField.focus();
    commentInputField.setSelectionRange(commentInputField.value.length, commentInputField.value.length);
  }
  if (commentStatusMsg && target?.id) {
    const targetLabel = target.name || `评论 #${target.id}`;
    commentStatusMsg.textContent = `正在回复 ${targetLabel}`;
  }
}

function setCommentComposerEnabled(enabled) {
  if (commentInputField) {
    commentInputField.disabled = !enabled;
  }
  if (btnSubmitComment) {
    btnSubmitComment.disabled = !enabled;
  }
  if (!enabled && commentStatusMsg) {
    commentStatusMsg.textContent = '请选择商品后再评论';
  }
  if (enabled && commentStatusMsg && commentStatusMsg.textContent === '请选择商品后再评论') {
    commentStatusMsg.textContent = '';
  }
}

function resetCommentComposer(disable = false) {
  if (commentInputField) {
    commentInputField.value = '';
  }
  clearReplyTarget();
  if (disable) {
    setCommentComposerEnabled(false);
  }
}

setCommentComposerEnabled(false);

if (btnCancelReply) {
  btnCancelReply.addEventListener('click', ()=>clearReplyTarget());
}

if (btnSubmitComment) {
  btnSubmitComment.addEventListener('click', ()=>submitInlineProductComment());
}

if (btnToggleComments && productCommentBlock) {
  btnToggleComments.addEventListener('click', ()=>{
    const collapsed = productCommentBlock.classList.toggle('collapsed');
    btnToggleComments.textContent = collapsed ? '展开评论' : '收起评论';
  });
}

function populateProductIdInputs(productId) {
  if (!productId) return;
  PRODUCT_ID_INPUTS.forEach(id=>{
    const input = document.getElementById(id);
    if (input) {
      input.value = productId;
    }
  });
}

function clearProductSelection() {
  if (selectedProductCard) {
    selectedProductCard.classList.remove('selected');
    selectedProductCard = null;
  }
  activeProductId = null;
  activeProductName = '';
  activeProductPrice = null;
  activeCartId = null;
}

function updateModalPriceSummary() {
  if (!modalUnitPriceEl || !modalTotalPriceEl) return;
  const unit = Number.isFinite(Number(activeProductPrice)) ? Number(activeProductPrice) : null;
  const amount = parseInt(productModalCartAmount?.value, 10);
  const qty = Number.isFinite(amount) && amount > 0 ? amount : 1;
  modalUnitPriceEl.textContent = unit !== null ? `¥${unit}` : '—';
  modalTotalPriceEl.textContent = unit !== null ? `¥${(unit * qty).toFixed(2)}` : '—';
}

function normalizeSavedAddressData(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.list)) return data.list;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function resolveAddressText(item) {
  return item?.addressName
    || item?.address_name
    || item?.address
    || item?.newAddress
    || item?.detail
    || item?.fullAddress
    || '';
}

function renderSavedAddressOptions(list = savedAddresses) {
  if (!purchaseAddressSelect) return;
  purchaseAddressSelect.innerHTML = '<option value="">选择保存的地址</option>';
  list.forEach((item, index) => {
    const text = resolveAddressText(item);
    if (!text) return;
    const option = document.createElement('option');
    option.value = text;
    option.textContent = text;
    if (item.isDefault || item.defaultFlag || index === 0) {
      option.dataset.default = 'true';
    }
    purchaseAddressSelect.appendChild(option);
  });
  // 如果当前输入为空且存在地址，默认填入第一个
  if (!purchaseAddressInput) return;
  if (purchaseAddressInput.value && purchaseAddressInput.value.trim()) return;
  const firstOption = purchaseAddressSelect.options[1];
  if (firstOption) {
    purchaseAddressSelect.value = firstOption.value;
    purchaseAddressInput.value = firstOption.value;
  }
}

async function loadSavedAddresses(force = false) {
  if (!purchaseAddressSelect) return [];
  const userId = getCurrentUserId();
  if (!userId) return [];
  if (!force && savedAddresses.length) {
    renderSavedAddressOptions(savedAddresses);
    return savedAddresses;
  }
  try {
    const res = await fetch(`${API_BASE}/api/products/buyer/getSavedAddress?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = normalizeSavedAddressData(json?.data);
    savedAddresses = list;
    renderSavedAddressOptions(list);
    if (!list.length && purchaseModalMsg) {
      purchaseModalMsg.textContent = '暂无保存的地址，请手动输入';
    }
    return list;
  } catch (err) {
    if (purchaseModalMsg) {
      purchaseModalMsg.textContent = `地址加载失败：${err.message || '网络错误'}`;
    }
    savedAddresses = [];
    renderSavedAddressOptions([]);
    return [];
  }
}

function pickProductsFromResponse(json) {
  if (!json) return null;
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data?.products)) return json.data.products;
  if (Array.isArray(json.data?.records)) return json.data.records;
  if (Array.isArray(json.data?.list)) return json.data.list;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.products)) return json.products;
  if (Array.isArray(json.list)) return json.list;
  if (Array.isArray(json.rows)) return json.rows;
  if (json.data && typeof json.data === 'object' && json.data.productId) {
    return [json.data];
  }
  if (json.productId) {
    return [json];
  }
  return null;
}

async function requestProductCatalog() {
  // 根据文档，获取商品列表接口为 /api/products/buyer，需要nums参数
  const nums = 50; // 默认请求50个商品
  const url = `${API_BASE}/api/products/buyer?nums=${nums}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const list = pickProductsFromResponse(json);
      if (Array.isArray(list)) {
        return list;
      }
    throw new Error('响应格式不正确');
    } catch (err) {
    throw err;
    }
}

function renderProductCatalog(list) {
  if (!productCatalogList) return;
  latestProductCatalog = Array.isArray(list) ? list : [];
  if (!Array.isArray(list) || !list.length) {
    productCatalogList.innerHTML = '<div class="empty">暂无商品</div>';
    return;
  }
  productCatalogList.innerHTML = list.map(item=>{
    const productId = item.productId || item.id || item.sourceId || '';
    const img = item.productImg || item.imageUrl || item.imgUrl || '';
    const safeImg = resolveProductImage(img);
    const fallbackImg = escapeAttr(DEFAULT_PRODUCT_IMAGE);
    const name = item.productName || item.name || '未命名商品';
    const price = item.price ?? item.productPrice ?? '';
    const safeProductId = productId !== undefined && productId !== null ? String(productId) : '';
    const productIdAttr = safeProductId ? ` data-product-id="${escapeAttr(safeProductId)}"` : '';
    const priceAttr = price !== '' && price !== null && price !== undefined
      ? ` data-product-price="${escapeAttr(price)}"` : '';
    const nameAttr = ` data-product-name="${escapeAttr(name)}"`;
    return `<button type="button" class="product-card" data-product-card="true"${productIdAttr}${priceAttr}${nameAttr}>
      <div class="product-card-thumb">
        <img src="${safeImg}" alt="${escapeAttr(name)}" onerror="this.onerror=null;this.src='${fallbackImg}'">
      </div>
      <div class="product-card-name">${escapeAttr(name)}</div>
    </button>`;
  }).join('');
}

function highlightProductCard(card) {
  if (!card) return;
  if (selectedProductCard && selectedProductCard !== card) {
    selectedProductCard.classList.remove('selected');
  }
  selectedProductCard = card;
  card.classList.add('selected');
}

function openProductModal(productId) {
  if (!productModal) return;
  productModal.classList.remove('hidden');
  if (modalProductMsg) {
    modalProductMsg.textContent = '加载商品详情中...';
  }
  if (modalCommentMsg) {
    modalCommentMsg.textContent = '';
  }
  if (modalSelectedName) {
    const displayName = activeProductName || '';
    modalSelectedName.textContent = displayName
      ? `${displayName}（ID：${productId}）`
      : `商品ID：${productId}`;
  }
  resetCommentComposer(false);
  setCommentComposerEnabled(false);
  if (productModalCartAmount) {
    productModalCartAmount.value = '1';
  }
  if (productCommentBlock) {
    productCommentBlock.classList.remove('collapsed');
  }
  if (btnToggleComments) {
    btnToggleComments.textContent = '收起评论';
  }
  updateModalPriceSummary();
  loadProductDetailAndComments(productId);
}

function closeProductModal() {
  if (!productModal) return;
  productModal.classList.add('hidden');
  resetCommentComposer(true);
}

function openPurchaseModal(action, options = {}) {
  if (!purchaseModal) return;
  pendingPurchaseAction = action;
  const isCartCheckout = action === 'cart-checkout';
  const requiresProduct = action !== 'cart-checkout';
  if (requiresProduct && !activeProductId) {
    alert('请先选择商品');
    return;
  }
  if (isCartCheckout) {
    activeCartId = options.cartId || null;
    if (!activeCartId) {
      alert('缺少购物车ID');
      return;
    }
    activeProductName = options.productName || activeProductName;
    activeProductId = options.productId || activeProductId;
  } else {
    activeCartId = null;
  }

  const amountRowVisible = action !== 'cart-checkout';
  if (purchaseAmountRow) {
    purchaseAmountRow.classList.toggle('hidden', !amountRowVisible);
  }
  if (purchaseAmountInput && amountRowVisible) {
    purchaseAmountInput.value = options.amount ? String(options.amount) : '1';
  }

  const needsAddress = action === 'purchase' || action === 'cart-checkout';
  if (purchaseAddressGroup) {
    purchaseAddressGroup.classList.toggle('hidden', !needsAddress);
  }
  if (!needsAddress && purchaseAddressInput) {
    purchaseAddressInput.value = '';
    if (purchaseAddressSelect) {
      purchaseAddressSelect.value = '';
    }
  }
  if (needsAddress) {
    loadSavedAddresses();
  }

  if (purchaseModalTitle) {
    if (action === 'cart') {
      purchaseModalTitle.textContent = '加入购物车';
    } else if (action === 'purchase') {
      purchaseModalTitle.textContent = '直接购买';
    } else {
      purchaseModalTitle.textContent = '填写收货地址';
    }
  }
  if (purchaseModalProductName) {
    const nameText = activeProductName ? `商品：${activeProductName}` : (activeProductId ? `商品ID：${activeProductId}` : '');
    purchaseModalProductName.textContent = nameText;
  }
  if (purchaseAddressInput && needsAddress && options.prefillAddress) {
    purchaseAddressInput.value = options.prefillAddress;
  }
  if (purchaseModalMsg) {
    purchaseModalMsg.textContent = '';
  }
  purchaseModal.classList.remove('hidden');
}

function closePurchaseModal() {
  if (!purchaseModal) return;
  purchaseModal.classList.add('hidden');
  pendingPurchaseAction = 'purchase';
  activeCartId = null;
}

async function requestCommentAreaDetail(productId) {
  const url = `${API_BASE}/api/commentarea?productId=${encodeURIComponent(productId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`commentarea HTTP ${res.status}`);
  }
  const json = await res.json();
  console.log('[评论] commentarea 原始响应:', json);
  return json?.data || null;
}

async function requestFallbackProductDetail(productId) {
  const url = `${API_BASE}/api/products/buyer/${encodeURIComponent(productId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`商品详情 HTTP ${res.status}`);
  }
  const json = await res.json();
  console.log('[评论] fallback 商品详情响应:', json);
  return json?.data || null;
}

async function loadProductDetailAndComments(productId) {
  if (!modalProductInfo || !modalProductMsg || !modalCommentList || !modalCommentMsg) return;
  if (!productId) {
    modalProductMsg.textContent = '该商品缺少ID，无法加载详情';
    modalCommentMsg.textContent = '';
    modalProductInfo.innerHTML = '';
    modalCommentList.innerHTML = '';
    setCommentComposerEnabled(false);
    return;
  }
  modalProductInfo.innerHTML = '';
  modalCommentList.innerHTML = '';
  modalProductMsg.textContent = '加载商品详情中...';
  modalCommentMsg.textContent = '加载评论中...';
  let detailData = null;
  let lastError = null;
  try {
    detailData = await requestCommentAreaDetail(productId);
  } catch (err) {
    lastError = err;
    console.warn('[评论] commentarea 请求失败:', err);
  }
  if (!detailData) {
    try {
      detailData = await requestFallbackProductDetail(productId);
    } catch (err) {
      lastError = err;
      console.warn('[评论] fallback 商品详情请求失败:', err);
    }
  }
  if (!detailData) {
    modalProductInfo.innerHTML = '';
    modalCommentList.innerHTML = '';
    modalProductMsg.textContent = `加载失败：${lastError?.message || '网络错误'}`;
    modalCommentMsg.textContent = '';
    setCommentComposerEnabled(false);
    return;
  }
  childCommentCache.clear();
  commentMetaStore.clear();
  renderSelectedProductDetail(detailData, productId);
  const comments = Array.isArray(detailData.productComment)
    ? detailData.productComment
    : (Array.isArray(detailData.comments) ? detailData.comments : []);
  console.log('[评论] 后端返回的评论列表:', comments);
  renderProductComments(comments);
  modalProductMsg.textContent = '';
  modalCommentMsg.textContent = comments.length ? '' : '暂无评论';
}

async function submitInlineProductComment() {
  if (!commentInputField) return;
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    if (commentStatusMsg) commentStatusMsg.textContent = '未获取到用户ID，请重新登录后再试';
    return;
  }
  if (!activeProductId) {
    if (commentStatusMsg) commentStatusMsg.textContent = '请选择商品后再评论';
    return;
  }
  const content = commentInputField.value.trim();
  if (!content) {
    if (commentStatusMsg) commentStatusMsg.textContent = '请输入评论内容';
    return;
  }
  const payload = {
    content,
    sendTime: new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '-'),
    userId: currentUserId,
    productId: parseInt(activeProductId, 10)
  };
  if (commentReplyTarget) {
    const rootId = commentReplyTarget.rootId || commentReplyTarget.id;
    payload.rootCommentId = parseInt(rootId, 10);
    payload.toCommentId = parseInt(commentReplyTarget.id, 10);
  }
  if (commentStatusMsg) commentStatusMsg.textContent = '提交中...';
  try {
    console.log('[弹窗评论] 提交参数:', payload);
    const res = await fetch(`${API_BASE}/api/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(()=>({}));
    if (!res.ok) {
      throw new Error(json?.message || res.statusText);
    }
    if (commentStatusMsg) {
      commentStatusMsg.textContent = json?.message || '评论发布成功';
    }
    commentInputField.value = '';
    clearReplyTarget();
    if (activeProductId) {
      loadProductDetailAndComments(activeProductId);
    }
  } catch (err) {
    if (commentStatusMsg) {
      commentStatusMsg.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  }
}

function renderSelectedProductDetail(data, fallbackProductId) {
  if (!modalProductInfo) return;
  const name = data.productName || data.name || '未命名商品';
  const rawProductId = data.productId ?? data.id ?? fallbackProductId ?? '';
  const productId = rawProductId || '—';
  const producer = data.producer || data.origin || data.owner || '—';
  const userId = data.userId ?? data.ownerId ?? data.farmerId ?? '—';
  const price = data.price ?? data.productPrice ?? '—';
  const surplus = data.surplus ?? data.stock ?? '—';
  const sales = data.salesVolumn ?? data.salesVolume ?? data.sales ?? '—';
  const img = data.productImg || data.imageUrl || data.imgUrl || '';
  const desc = data.description || data.productDesc || '';
  const safeImg = resolveProductImage(img);
  const fallbackImg = escapeAttr(DEFAULT_PRODUCT_IMAGE);
  activeProductId = rawProductId ? String(rawProductId) : null;
  activeProductName = name;
  if (modalSelectedName) {
    modalSelectedName.textContent = `${escapeAttr(name)}（ID：${escapeAttr(productId)}）`;
  }
  modalProductInfo.innerHTML = `
    <div class="product-detail-banner">
      <img src="${safeImg}" alt="${escapeAttr(name)}" onerror="this.onerror=null;this.src='${fallbackImg}'">
      <div>
        <h3>${escapeAttr(name)}</h3>
        <div class="product-detail-info">
          <div><strong>商品ID：</strong>${escapeAttr(productId)}</div>
          <div><strong>所属农户ID：</strong>${escapeAttr(userId)}</div>
          <div><strong>商家/产地：</strong>${escapeAttr(producer)}</div>
          <div><strong>单价：</strong>${price !== '—' ? `¥${escapeAttr(price)}` : '—'}</div>
          <div><strong>剩余量：</strong>${escapeAttr(surplus)}</div>
          <div><strong>销量：</strong>${escapeAttr(sales)}</div>
        </div>
        ${desc ? `<p>${formatMultilineText(desc)}</p>` : ''}
      </div>
    </div>
  `;
  populateProductIdInputs(activeProductId);
  setCommentComposerEnabled(Boolean(activeProductId));
  if (commentStatusMsg && activeProductId) {
    commentStatusMsg.textContent = '';
  }
}

function renderProductComments(list) {
  if (!modalCommentList) return;
  if (!Array.isArray(list) || !list.length) {
    modalCommentList.innerHTML = '<div class="empty">暂无评论</div>';
    if (modalCommentMsg) {
      modalCommentMsg.textContent = '暂无评论';
    }
    return;
  }
  modalCommentList.innerHTML = list.map(renderSingleComment).join('');
  if (modalCommentMsg) {
    modalCommentMsg.textContent = '';
  }
}

function renderSingleComment(item) {
  const commentId = item.productCommentId ?? item.commentId ?? item.id ?? '';
  const userId = item.userId ?? '—';
  const sendTime = item.sendTime || item.createdTime || item.createTime || '—';
  const likeCount = item.commentLikeCount ?? item.likeCount ?? 0;
  const commenterNameRaw = item.userName || item.nickname || item.userNickname || '';
  const commenterName = resolveCommentAuthorName(commenterNameRaw, userId);
  const content = item.content ? formatMultilineText(item.content) : '（无内容）';
  const rootId = item.rootCommentId ?? item.root_comment_id ?? commentId;
  registerCommentMeta(commentId, commenterName, userId);
  const btnLoadChild = commentId
    ? `<button class="btn btn-secondary btn-load-child" data-comment-id="${escapeAttr(commentId)}">查看子评论</button>`
    : '';
  const likeButton = renderLikeButton(commentId, likeCount);
  return `<div class="comment-item" ${commentId ? `data-comment-id="${escapeAttr(commentId)}"` : ''} ${rootId ? `data-root-id="${escapeAttr(rootId)}"` : ''} ${commenterName ? `data-user-name="${escapeAttr(commenterName)}"` : ''} title="点击评论即可回复该评论">
    <div class="comment-header">
      <span class="comment-author">${escapeAttr(commenterName)}</span>
    </div>
    <div class="comment-content">${content}</div>
    <div class="comment-meta">
      <span>评论ID：${commentId || '—'}</span>
      <span>用户ID：${escapeAttr(userId)}</span>
      <span>时间：${escapeAttr(sendTime)}</span>
      <span>点赞数：${escapeAttr(likeCount)}</span>
    </div>
    <div class="comment-actions">
      ${likeButton}
      ${btnLoadChild}
    </div>
    <div class="child-comments" ${commentId ? `data-child-container="${escapeAttr(commentId)}"` : ''}></div>
  </div>`;
}

function renderChildCommentList(list, rootIdFromParent) {
  if (!Array.isArray(list) || !list.length) {
    return '<div class="empty">暂无子评论</div>';
  }
  list.forEach(item=>{
    const commentId = item.productCommentId ?? item.commentId ?? item.id ?? '';
    if (!commentId) return;
    const userId = item.userId ?? '—';
    const commenterNameRaw = item.userName || item.nickname || item.userNickname || '';
    const commenterName = resolveCommentAuthorName(commenterNameRaw, userId);
    registerCommentMeta(commentId, commenterName, userId);
  });
  return list.map(item=>{
    const childContent = item.content ? formatMultilineText(item.content) : '（无内容）';
    const sendTime = item.sendTime || item.createdTime || item.createTime || '—';
    const userId = item.userId ?? '—';
    const likeCount = item.commentLikeCount ?? item.likeCount ?? 0;
    const commentId = item.productCommentId ?? item.commentId ?? item.id ?? '—';
    const rootId = item.rootCommentId ?? item.root_comment_id ?? rootIdFromParent ?? commentId;
    const commenterMeta = getCommentMeta(commentId);
    const commenterName = commenterMeta?.name || resolveCommentAuthorName(item.userName || item.nickname || item.userNickname || '', userId);
    const replyTargetId = item.toCommentId ?? item.to_comment_id;
    const replyTargetMeta = replyTargetId ? getCommentMeta(replyTargetId) : null;
    const replyTargetName = replyTargetMeta?.name || (replyTargetId ? `#${replyTargetId}` : '');
    const likeButton = renderLikeButton(commentId, likeCount);
    const replyMarkup = replyTargetId
      ? `<span class="reply-arrow">↦</span><span class="comment-reply-target">${escapeAttr(replyTargetName)}</span>`
      : '';
    return `<div class="child-comment" data-comment-id="${escapeAttr(commentId)}" data-root-id="${escapeAttr(rootId)}" ${commenterName ? `data-user-name="${escapeAttr(commenterName)}"` : ''} title="点击评论即可回复该评论">
      <div class="comment-header">
        <span class="comment-author">${escapeAttr(commenterName)}</span>
        ${replyMarkup}
      </div>
      <div class="comment-content">${childContent}</div>
      <div class="comment-meta">
        <span>评论ID：${escapeAttr(commentId)}</span>
        <span>用户ID：${escapeAttr(userId)}</span>
        <span>时间：${escapeAttr(sendTime)}</span>
        <span>点赞数：${escapeAttr(likeCount)}</span>
      </div>
      <div class="comment-actions">
        ${likeButton}
      </div>
    </div>`;
  }).join('');
}

function normalizeChildComments(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.data?.data)) return json.data.data;
  if (Array.isArray(json.data?.records)) return json.data.records;
  if (Array.isArray(json.data?.list)) return json.data.list;
  if (Array.isArray(json.data?.items)) return json.data.items;
  if (json.data && json.data.productCommentId) return [json.data];
  if (json.productCommentId) return [json];
  return [];
}

async function loadChildComments(commentId, container, triggerBtn) {
  if (!commentId || !container) return;
  container.innerHTML = '<div class="msg">子评论加载中...</div>';
  try {
    let list = childCommentCache.get(commentId);
    if (!list) {
      // 根据文档，获取子评论接口为 /api/comment/childcomment，参数为 product_comment_id
      const res = await fetch(`${API_BASE}/api/comment/childcomment?product_comment_id=${encodeURIComponent(commentId)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      console.log('[评论] 子评论接口原始响应:', { commentId, response: json });
      list = normalizeChildComments(json);
      console.log('[评论] 子评论解析结果:', { commentId, parsedList: list });
      childCommentCache.set(commentId, list);
    }
    container.innerHTML = renderChildCommentList(list, commentId);
    if (triggerBtn) {
      triggerBtn.textContent = '子评论已加载';
      triggerBtn.disabled = true;
    }
  } catch (err) {
    container.innerHTML = `<div class="msg">加载失败：${escapeAttr(err.message || '网络错误')}</div>`;
  }
}

async function likeProductComment(commentId, triggerBtn) {
  if (!commentId) return;
  if (triggerBtn?.dataset.loading === 'true') return;
  const numericId = parseInt(commentId, 10);
  if (!Number.isFinite(numericId)) return;
  const isLiked = triggerBtn?.dataset.liked === 'true';
  const action = isLiked ? 'cancel' : 'like';
  if (triggerBtn) {
    triggerBtn.dataset.loading = 'true';
    triggerBtn.classList.add('loading');
  }
  if (commentStatusMsg) commentStatusMsg.textContent = '';
  try {
    const payload = { productCommentId: numericId, action };
    console.log('[评论点赞] 提交 payload：', payload);
    const endpoint = action === 'cancel'
      ? `${API_BASE}/api/comment/dislike`
      : `${API_BASE}/api/comment/like`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(()=>({}));
    console.log('[评论] 点赞接口响应:', { commentId: numericId, action, response: json });
    if (!res.ok) {
      throw new Error(json?.message || res.statusText);
    }
    const apiCount = json?.data?.commentLikeCount;
    let newCount = Number.isFinite(Number(apiCount))
      ? Number(apiCount)
      : (() => {
          const btnCount = triggerBtn?.querySelector('.like-count')?.textContent;
          const current = Number.parseInt(btnCount || '0', 10);
          if (!Number.isFinite(current)) return 0;
          return isLiked ? Math.max(0, current - 1) : current + 1;
        })();
    updateLikeButtonState(triggerBtn, !isLiked, newCount);
    if (commentStatusMsg) {
      commentStatusMsg.textContent = json?.message || (isLiked ? '已取消点赞' : '点赞成功');
    }
  } catch (err) {
    if (commentStatusMsg) {
      commentStatusMsg.textContent = `点赞失败：${err.message || '网络错误'}`;
    }
  } finally {
    if (triggerBtn) {
      triggerBtn.dataset.loading = 'false';
      triggerBtn.classList.remove('loading');
    }
  }
}

async function loadAgriculturalProducts(showLoading = true) {
  if (!productCatalogList) return;
  if (showLoading) {
    msgProductCatalog.textContent = '加载商品中...';
    productCatalogList.innerHTML = '';
  }
  try {
    const list = await requestProductCatalog();
    renderProductCatalog(list);
    clearProductSelection();
    msgProductCatalog.textContent = '';
  } catch (err) {
    productCatalogList.innerHTML = '';
    msgProductCatalog.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

if (btnRefreshProducts) {
  btnRefreshProducts.addEventListener('click', ()=>loadAgriculturalProducts());
}

if (productCatalogList) {
  productCatalogList.addEventListener('click', (e)=>{
    const card = e.target.closest('.product-card[data-product-card="true"]');
    if (!card) return;
    const productId = card.getAttribute('data-product-id');
    if (!productId) {
      alert('该商品缺少ID，无法加载详情');
      return;
    }
    highlightProductCard(card);
    activeProductId = productId;
    activeProductName = card.getAttribute('data-product-name') || '';
    {
      const priceAttr = card.getAttribute('data-product-price');
      const parsedPrice = Number(priceAttr);
      activeProductPrice = Number.isFinite(parsedPrice) ? parsedPrice : null;
    }
    populateProductIdInputs(productId);
    openProductModal(productId);
  });
  loadAgriculturalProducts();
}

if (btnCloseProductModal) {
  btnCloseProductModal.addEventListener('click', closeProductModal);
}

if (productModal) {
  productModal.addEventListener('click', (e)=>{
    if (e.target === productModal) {
      closeProductModal();
    }
  });
}

if (btnModalAddCart) {
  btnModalAddCart.addEventListener('click', ()=>{
    const amount = parseInt(productModalCartAmount?.value, 10);
    const validAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
    openPurchaseModal('cart', { amount: validAmount });
  });
}

if (btnModalPurchase) {
  btnModalPurchase.addEventListener('click', ()=>{
    const amount = parseInt(productModalCartAmount?.value, 10);
    const validAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
    openPurchaseModal('purchase', { amount: validAmount });
  });
}

if (purchaseAddressSelect) {
  purchaseAddressSelect.addEventListener('change', ()=>{
    const value = purchaseAddressSelect.value;
    if (value && purchaseAddressInput) {
      purchaseAddressInput.value = value;
    }
  });
}

if (btnRefreshAddress) {
  btnRefreshAddress.addEventListener('click', ()=>loadSavedAddresses(true));
}

if (btnPurchaseCancel) {
  btnPurchaseCancel.addEventListener('click', closePurchaseModal);
}

if (btnCartAmountDec) {
  btnCartAmountDec.addEventListener('click', ()=>{
    const current = parseInt(productModalCartAmount?.value || '1', 10);
    const next = Math.max(1, (Number.isFinite(current) ? current : 1) - 1);
    if (productModalCartAmount) productModalCartAmount.value = String(next);
    updateModalPriceSummary();
  });
}
if (btnCartAmountInc) {
  btnCartAmountInc.addEventListener('click', ()=>{
    const current = parseInt(productModalCartAmount?.value || '1', 10);
    const next = Math.max(1, (Number.isFinite(current) ? current : 1) + 1);
    if (productModalCartAmount) productModalCartAmount.value = String(next);
    updateModalPriceSummary();
  });
}

if (productModalCartAmount) {
  productModalCartAmount.addEventListener('input', ()=>{
    const value = parseInt(productModalCartAmount.value, 10);
    const valid = Number.isFinite(value) && value > 0 ? value : 1;
    productModalCartAmount.value = String(valid);
    updateModalPriceSummary();
  });
}

if (purchaseModal) {
  purchaseModal.addEventListener('click', (e)=>{
    if (e.target === purchaseModal) {
      closePurchaseModal();
    }
  });
}

if (formPurchaseModal) {
  formPurchaseModal.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const action = pendingPurchaseAction;
    if (!action) {
      purchaseModalMsg.textContent = '请选择操作后再提交';
      return;
    }
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      purchaseModalMsg.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }
    const amount = parseInt(purchaseAmountInput?.value, 10);
    if (action !== 'cart-checkout' && (!Number.isFinite(amount) || amount <= 0)) {
      purchaseModalMsg.textContent = '请输入有效的购买数量';
      return;
    }
    const address = purchaseAddressInput?.value.trim() || '';
    const needsAddress = action === 'purchase' || action === 'cart-checkout';
    if (needsAddress && !address) {
      purchaseModalMsg.textContent = '请选择或输入收货地址';
      return;
    }
    if (action !== 'cart-checkout' && !activeProductId) {
      purchaseModalMsg.textContent = '未获取到商品，请重新选择';
      return;
    }
    if (action === 'cart-checkout' && !activeCartId) {
      purchaseModalMsg.textContent = '未获取到购物车信息，请重试';
      return;
    }
    purchaseModalMsg.textContent = '提交中...';
    try {
      let endpoint = '';
      let payload = {};
      if (action === 'cart') {
        endpoint = `${API_BASE}/api/products/buyer/shop`;
        payload = {
          productId: parseInt(activeProductId, 10),
          userId: currentUserId,
          amount
        };
      } else if (action === 'purchase') {
        endpoint = `${API_BASE}/api/products/buyer/purchase`;
        payload = {
          productId: parseInt(activeProductId, 10),
          userId: currentUserId,
          amount,
          getAddress: address
        };
      } else if (action === 'cart-checkout') {
        endpoint = `${API_BASE}/api/products/buyer/buyshop`;
        payload = {
          cartId: parseInt(activeCartId, 10),
          userId: currentUserId,
          getAddress: address
        };
      } else {
        throw new Error('未知的操作类型');
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      const message = json?.message
        || (action === 'cart'
          ? '已加入购物车'
          : action === 'cart-checkout'
            ? '购买成功'
            : '订单创建成功');

      // 如果是直接购买并且后端返回了 alipay 字符串（支付宝支付页面HTML），在新窗口打开支付页
      if (action === 'purchase' && json && json.data && json.data.alipay) {
        const payHtml = json.data.alipay;
        const payWindow = window.open('', '_blank');
        if (payWindow) {
          // 在新窗口写入支付宝返回的表单或页面（通常包含自动提交表单）
          payWindow.document.open();
          payWindow.document.write(payHtml);
          payWindow.document.close();
        } else {
          // 若弹窗被拦截，则把返回的表单插入当前页面并提交（隐藏）作为回退方案
          const tempDiv = document.createElement('div');
          tempDiv.style.display = 'none';
          tempDiv.innerHTML = payHtml;
          document.body.appendChild(tempDiv);
          const form = tempDiv.querySelector('form');
          if (form) {
            try { form.submit(); } catch (e) { console.warn('提交支付表单失败', e); }
          }
        }
        purchaseModalMsg.textContent = '';
        closePurchaseModal();
        // 加载订单列表（通常会显示待付款订单）
        loadOrdersDisplay(false);
        return;
      }

      alert(message);
      purchaseModalMsg.textContent = '';
      closePurchaseModal();
      if (action === 'cart') {
        loadCartDisplay(false);
      } else if (action === 'purchase') {
        loadOrdersDisplay(false);
      } else if (action === 'cart-checkout') {
        loadCartDisplay();
        loadOrdersDisplay(false);
      }
    } catch (err) {
      purchaseModalMsg.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

if (modalCommentList) {
  modalCommentList.addEventListener('click', (e)=>{
    const likeBtn = e.target.closest('.btn-like-comment');
    if (likeBtn) {
      const commentId = likeBtn.getAttribute('data-comment-id');
      likeProductComment(commentId, likeBtn);
      return;
    }
    const loadBtn = e.target.closest('.btn-load-child');
    if (loadBtn) {
      const commentId = loadBtn.getAttribute('data-comment-id');
      const container = loadBtn.closest('.comment-item')?.querySelector('.child-comments');
      loadChildComments(commentId, container, loadBtn);
      return;
    }
    if (e.target.closest('.comment-actions')) {
      return;
    }
    const childCommentEl = e.target.closest('.child-comment');
    if (childCommentEl) {
      const target = extractReplyTargetFromElement(childCommentEl);
      if (target) {
        setReplyTarget(target);
      }
      return;
    }
    const commentCard = e.target.closest('.comment-item');
    if (commentCard) {
      const target = extractReplyTargetFromElement(commentCard);
      if (target) {
        setReplyTarget(target);
      }
    }
  });
}

// ---------------- 买家购物车展示 ----------------
const cartDisplayList = document.getElementById('cart-display-list');
const msgCartDisplay = document.getElementById('msg-cart-display');
const btnRefreshCart = document.getElementById('btn-refresh-cart');

function normalizeCartList(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.data?.data)) return json.data.data;
  if (Array.isArray(json.data?.records)) return json.data.records;
  if (Array.isArray(json.data?.list)) return json.data.list;
  if (json.data && Array.isArray(json.data.products)) return json.data.products;
  if (json.data && Array.isArray(json.data.items)) return json.data.items;
  return [];
}

async function loadCartDisplay(showLoading = true) {
  if (!cartDisplayList) return;
  const userId = getCurrentUserId();
  if (!userId) {
    msgCartDisplay.textContent = '未获取到用户ID，请重新登录后再试';
    cartDisplayList.innerHTML = '';
    return;
  }
  if (showLoading) {
    msgCartDisplay.textContent = '加载购物车中...';
    cartDisplayList.innerHTML = '';
  }
  try {
    // 根据文档，展示购物车接口为 /api/products/buyer/showshop
    const requestUrl = `${API_BASE}/api/products/buyer/showshop?userId=${encodeURIComponent(userId)}`;
    const res = await fetch(requestUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = normalizeCartList(json);
    renderCartDisplay(list);
    msgCartDisplay.textContent = list.length ? '' : '购物车为空';
  } catch (err) {
    cartDisplayList.innerHTML = '';
    msgCartDisplay.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function renderCartDisplay(list) {
  if (!cartDisplayList) return;
  if (!Array.isArray(list) || !list.length) {
    cartDisplayList.innerHTML = '<div class="empty">购物车暂无商品</div>';
    return;
  }
  cartDisplayList.innerHTML = list.map(item=>{
    const safeImg = resolveProductImage(item.productImg || item.imageUrl);
    const fallbackImg = escapeAttr(DEFAULT_PRODUCT_IMAGE);
    const singlePrice = item.price ?? item.productPrice ?? item.unitPrice ?? '—';
    const quantity = item.amount ?? item.quantity ?? item.count ?? '—';
    const totalPrice = item.totalPrice ?? item.total_price ?? ((singlePrice !== '—' && quantity !== '—') ? Number(singlePrice) * Number(quantity) : '—');
    const productId = item.productId ?? item.sourceProductId ?? '';
    const cartId = item.cartId ?? item.cart_id ?? item.id ?? '';
    const showAction = Boolean(cartId);
    const productAttr = productId ? ` data-product-id="${escapeAttr(productId)}"` : '';
    return `<div class="product" data-cart-id="${escapeAttr(cartId)}"${productAttr}>
      <div class="name">${item.productName || '未命名商品'}</div>
      ${productId ? `<div>商品ID：${escapeAttr(productId)}</div>` : ''}
      <div>发售商：${item.producer || '—'}</div>
      <div>数量：${quantity}</div>
      <div>单价：${singlePrice !== '—' ? `¥${singlePrice}` : '—'}</div>
      <div>总价：${totalPrice !== '—' ? `¥${totalPrice}` : '—'}</div>
      <div class="thumb"><img src="${safeImg}" alt="${escapeAttr(item.productName || '')}" onerror="this.onerror=null;this.src='${fallbackImg}'"></div>
      ${showAction ? `<button class="btn btn-secondary btn-buy-from-cart" data-cart-id="${escapeAttr(cartId)}">从购物车购买</button>` : ''}
      ${showAction ? `<button class="btn btn-danger btn-delete-from-cart" data-cart-id="${escapeAttr(cartId)}">删除</button>` : ''}
    </div>`;
  }).join('');
}

if (btnRefreshCart) {
  btnRefreshCart.addEventListener('click', ()=>loadCartDisplay());
}
if (cartDisplayList) {
  loadCartDisplay();
}

// 从购物车购买商品
if (cartDisplayList) {
  cartDisplayList.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.btn-buy-from-cart');
    if (btn) {
      const cartId = btn.getAttribute('data-cart-id');
      const card = btn.closest('.product');
      const productName = card?.querySelector('.name')?.textContent?.trim() || '';
      const productId = card?.getAttribute('data-product-id') || '';
      activeProductName = productName || activeProductName;
      if (productId) {
        activeProductId = productId;
      }
      if (!cartId) {
        alert('缺少购物车ID');
        return;
      }
      openPurchaseModal('cart-checkout', {
        cartId,
        productId,
        productName
      });
      return;
    }
    const btnDelete = e.target.closest('.btn-delete-from-cart');
    if (btnDelete) {
      const cartId = btnDelete.getAttribute('data-cart-id');
      const userId = getCurrentUserId();
      if (!cartId || !userId) {
        alert('缺少必要信息');
        return;
      }
      if (!confirm('确认删除该商品？')) return;
      try {
        const res = await fetch(`${API_BASE}/api/products/buyer/shop/delete`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cartId: parseInt(cartId, 10), userId })
        });
        const json = await res.json().catch(()=>({}));
        if (!res.ok) {
          throw new Error(json?.message || res.statusText);
        }
        alert(json?.message || '删除成功');
        loadCartDisplay(); // 刷新购物车
      } catch (err) {
        alert(`删除失败：${err.message || '网络错误'}`);
      }
      return;
    }
  });
}

// 购买记录展示
const ordersDisplayList = document.getElementById('orders-display-list');
const msgOrdersDisplay = document.getElementById('msg-orders-display');
const btnRefreshOrders = document.getElementById('btn-refresh-orders');

const ORDER_STATUS_LABELS = {
  1: '刚上架',
  2: '待支付',
  3: '已付款待发货',
  4: '已发货待收货',
  5: '已收货',
  6: '已取消',
  7: '已退货'
};

function resolveOrderStatus(rawStatus) {
  if (rawStatus === undefined || rawStatus === null || rawStatus === '') {
    return { code: NaN, label: '—' };
  }
  const numeric = Number(rawStatus);
  if (!Number.isNaN(numeric) && ORDER_STATUS_LABELS[numeric]) {
    return { code: numeric, label: ORDER_STATUS_LABELS[numeric] };
  }
  const rawText = String(rawStatus).trim();
  const matchEntry = Object.entries(ORDER_STATUS_LABELS).find(([, label])=>label === rawText);
  if (matchEntry) {
    const [code, label] = matchEntry;
    return { code: Number(code), label };
  }
  return { code: Number.isNaN(numeric) ? NaN : numeric, label: rawText || '—' };
}

function renderOrdersDisplay(list) {
  if (!ordersDisplayList) return;
  if (!Array.isArray(list) || !list.length) {
    ordersDisplayList.innerHTML = '<div class="empty">暂无购买记录</div>';
    return;
  }
  ordersDisplayList.innerHTML = list.map(item=>{
    const safeImg = resolveProductImage(item.productImg || item.imageUrl);
    const fallbackImg = escapeAttr(DEFAULT_PRODUCT_IMAGE);
    const singlePrice = item.price ?? item.productPrice ?? item.unitPrice ?? '—';
    const quantity = item.amount ?? item.quantity ?? item.count ?? '—';
    const totalPrice = item.totalPrice ?? item.total_price ?? ((singlePrice !== '—' && quantity !== '—') ? Number(singlePrice) * Number(quantity) : '—');
    const sendAddress = item.sendAddress || item.getAddress || item.address || '';
    const createTime = item.createTime || item.createdTime || item.orderTime || '';
    const purchaseId = item.purchase_id ?? item.purchaseId ?? item.id ?? '';
    const rawStatus = item.status ?? item.orderStatus ?? '';
    const { code: statusCode, label: statusLabel } = resolveOrderStatus(rawStatus);
    // 根据文档，状态3为已付款待发货，状态4为已发货待收货，状态5为已收货
    const canReceive = statusCode === 3 || statusCode === 4; // 待发货或已发货状态可以收货
    const canCancel = statusCode === 3; // 只有已付款待发货状态可以取消
    const canReturn = statusCode === 5; // 只有确认收货后才允许退货
    return `<div class="product" data-purchase-id="${escapeAttr(purchaseId)}" data-status="${escapeAttr(rawStatus)}">
      <div class="name">${item.productName || '未命名商品'}</div>
      <div>发售商：${item.producer || '—'}</div>
      <div>数量：${quantity}</div>
      <div>单价：${singlePrice !== '—' ? `¥${singlePrice}` : '—'}</div>
      <div>总价：${totalPrice !== '—' ? `¥${totalPrice}` : '—'}</div>
      <div>状态：${statusLabel}</div>
      ${sendAddress ? `<div>收货地址：${escapeAttr(sendAddress)}</div>` : ''}
      ${createTime ? `<div>创建时间：${escapeAttr(createTime)}</div>` : ''}
      <div class="thumb"><img src="${safeImg}" alt="${escapeAttr(item.productName || '')}" onerror="this.onerror=null;this.src='${fallbackImg}'"></div>
      ${purchaseId && canReceive ? `<button class="btn btn-secondary btn-receive-product" data-purchase-id="${escapeAttr(purchaseId)}">确认收货</button>` : ''}
      ${purchaseId && canCancel ? `<button class="btn btn-danger btn-cancel-purchase" data-purchase-id="${escapeAttr(purchaseId)}">取消订单</button>` : ''}
      ${purchaseId && canReturn ? `<button class="btn btn-danger btn-return-product" data-purchase-id="${escapeAttr(purchaseId)}">退货</button>` : ''}
    </div>`;
  }).join('');
}

async function loadOrdersDisplay(showLoading = true) {
  if (!ordersDisplayList) return;
  const userId = getCurrentUserId();
  if (!userId) {
    msgOrdersDisplay.textContent = '未获取到用户ID，请重新登录后再试';
    ordersDisplayList.innerHTML = '';
    return;
  }
  if (showLoading) {
    msgOrdersDisplay.textContent = '加载购买记录中...';
    ordersDisplayList.innerHTML = '';
  }
  try {
    // 根据文档，展示购买记录接口为 /api/products/buyer/showPurchase
    const requestUrl = `${API_BASE}/api/products/buyer/showPurchase?userId=${encodeURIComponent(userId)}`;
    const res = await fetch(requestUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = normalizeCartList(json);
    renderOrdersDisplay(list);
    msgOrdersDisplay.textContent = list.length ? '' : '暂无购买记录';
  } catch (err) {
    ordersDisplayList.innerHTML = '';
    msgOrdersDisplay.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

if (btnRefreshOrders) {
  btnRefreshOrders.addEventListener('click', ()=>loadOrdersDisplay());
}

if (ordersDisplayList) {
  loadOrdersDisplay();
  // 处理订单操作：收货、取消订单、退货
  ordersDisplayList.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.btn-receive-product');
    if (btn) {
      const purchaseId = btn.getAttribute('data-purchase-id');
      if (!purchaseId) {
        alert('缺少订单ID');
        return;
      }
      if (!confirm('确认收货？')) return;
      try {
        const payload = { purchase_id: parseInt(purchaseId, 10) };
        const res = await fetch(`${API_BASE}/api/products/buyer/receiveProduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json().catch(()=>({}));
        if (!res.ok) {
          throw new Error(json?.message || res.statusText);
        }
        alert(json?.message || '收货成功');
        loadOrdersDisplay(); // 刷新购买记录
      } catch (err) {
        alert(`收货失败：${err.message || '网络错误'}`);
      }
      return;
    }
    const btnCancel = e.target.closest('.btn-cancel-purchase');
    if (btnCancel) {
      const purchaseId = btnCancel.getAttribute('data-purchase-id');
      if (!purchaseId) {
        alert('缺少订单ID');
        return;
      }
      if (!confirm('确认取消订单？')) return;
      try {
        const payload = { purchase_id: parseInt(purchaseId, 10) };
        const res = await fetch(`${API_BASE}/api/products/buyer/cancelPurchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json().catch(()=>({}));
        if (!res.ok) {
          throw new Error(json?.message || res.statusText);
        }
        alert(json?.message || '取消订单成功');
        loadOrdersDisplay(); // 刷新购买记录
      } catch (err) {
        alert(`取消订单失败：${err.message || '网络错误'}`);
      }
      return;
    }
    const btnReturn = e.target.closest('.btn-return-product');
    if (btnReturn) {
      const purchaseId = btnReturn.getAttribute('data-purchase-id');
      if (!purchaseId) {
        alert('缺少订单ID');
        return;
      }
      if (!confirm('确认退货？')) return;
      try {
        const payload = { purchase_id: parseInt(purchaseId, 10) };
        const res = await fetch(`${API_BASE}/api/products/buyer/returnProduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json().catch(()=>({}));
        if (!res.ok) {
          throw new Error(json?.message || res.statusText);
        }
        alert(json?.message || '退货成功');
        loadOrdersDisplay(); // 刷新购买记录
      } catch (err) {
        alert(`退货失败：${err.message || '网络错误'}`);
      }
      return;
    }
  });
}

// ---------------- 评论点赞 ----------------
const btnLikeComment = document.getElementById('btn-like-comment');
const likeCountDisplay = document.getElementById('like-count-display');
const msgLike = document.getElementById('msg-like');
if (btnLikeComment) {
  btnLikeComment.onclick = async ()=>{
    const commentId = parseInt(document.getElementById('like-comment-id').value, 10);
    if (!commentId) {
      msgLike.textContent = '请输入评论ID';
      return;
    }
    msgLike.textContent = '点赞中...';
    likeCountDisplay.textContent = '';
    try {
      const res = await fetch(`${API_BASE}/api/comment/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productCommentId: commentId })
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      const count = json?.data?.commentLikeCount;
      if (count !== undefined) {
        likeCountDisplay.textContent = `当前点赞数：${count}`;
      }
      msgLike.textContent = json?.message || '点赞成功';
    } catch (err) {
      msgLike.textContent = `点赞失败：${err.message || '网络错误'}`;
    }
  };
}

// ---------------- 删除评论 ----------------
const formDeleteComment = document.getElementById('form-delete-comment');
const msgDeleteComment = document.getElementById('msg-delete-comment');
if (formDeleteComment) {
  formDeleteComment.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      msgDeleteComment.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }
    const payload = {
      productCommentId: parseInt(document.getElementById('delete-comment-id').value, 10),
      userId: currentUserId
    };
    if (!payload.productCommentId) {
      msgDeleteComment.textContent = '请输入评论ID';
      return;
    }
    msgDeleteComment.textContent = '删除中...';
    try {
      const res = await fetch(`${API_BASE}/api/comment/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgDeleteComment.textContent = json?.message || '评论已成功删除';
      formDeleteComment.reset();
    } catch (err) {
      msgDeleteComment.textContent = `删除失败：${err.message || '网络错误'}`;
    }
  });
}

// ---------------- 发布评论 ----------------
const formAddComment = document.getElementById('form-add-comment');
const msgComment = document.getElementById('msg-comment');
if (formAddComment) {
  formAddComment.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      msgComment.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }
    const rootCommentId = document.getElementById('comment-rootId').value.trim();
    const payload = {
      content: document.getElementById('comment-content').value.trim(),
      sendTime: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-'),
      userId: currentUserId,
      productId: parseInt(document.getElementById('comment-productId').value, 10),
      rootCommentId: rootCommentId ? parseInt(rootCommentId, 10) : null
    };
    if (!payload.content || !payload.productId) {
      msgComment.textContent = '请完善评论信息';
      return;
    }
    msgComment.textContent = '提交中...';
    try {
      console.log('[评论] 提交参数:', payload);
      const res = await fetch(`${API_BASE}/api/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgComment.textContent = json?.message || '评论发布成功';
      formAddComment.reset();
    } catch (err) {
      msgComment.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

// ---------------- 回复评论 ----------------
const formReplyComment = document.getElementById('form-reply-comment');
const msgReply = document.getElementById('msg-reply');
if (formReplyComment) {
  formReplyComment.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      msgReply.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }
    // 根据文档，回复评论也使用 /api/comment 接口，需要 rootCommentId 和 toCommentId
    // 但文档中只提到了 rootCommentId，toCommentId 可能是可选的
    const payload = {
      content: document.getElementById('reply-content').value.trim(),
      userId: currentUserId,
      productId: parseInt(document.getElementById('reply-productId').value, 10),
      rootCommentId: parseInt(document.getElementById('reply-rootId').value, 10)
    };
    const toCommentId = document.getElementById('reply-toId').value.trim();
    if (toCommentId) {
      payload.toCommentId = parseInt(toCommentId, 10);
    }
    if (!payload.content || !payload.productId || !payload.rootCommentId) {
      msgReply.textContent = '请完善回复信息';
      return;
    }
    msgReply.textContent = '提交中...';
    try {
      console.log('[评论回复] 提交参数:', payload);
      // 根据文档，回复评论也使用 /api/comment 接口
      const res = await fetch(`${API_BASE}/api/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgReply.textContent = json?.message || '回复发布成功';
      formReplyComment.reset();
      // 如果当前有选中的商品，刷新评论列表
      const currentProductId = document.getElementById('reply-productId').value;
      if (currentProductId) {
        loadProductDetailAndComments(parseInt(currentProductId, 10));
      }
    } catch (err) {
      msgReply.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}
