// 后端API基础地址
const API_BASE = 'http://10.61.194.227:8080';

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
(function setupRoleBasedUI() {
  try {
    const identity = localStorage.getItem('user_identity') || '1'; // 默认为农户
    const identityNum = parseInt(identity, 10);
    
    const identityElements = document.querySelectorAll('[data-identity]');
    const defaultSections = document.querySelectorAll('section:not([data-identity])');
    
    function shouldShow(elementIdentity) {
      if (identityNum === 1) {
        return !(elementIdentity === 2 || elementIdentity === 3 || elementIdentity === 4);
      }
      if (identityNum === 2) {
        return elementIdentity === 2;
      }
      if (identityNum === 3) {
        return elementIdentity === 3;
      }
      if (identityNum === 4) {
        return elementIdentity === 4;
      }
      return !(elementIdentity === 2 || elementIdentity === 3 || elementIdentity === 4);
    }
    
    defaultSections.forEach(section => {
      if (identityNum === 1 || isNaN(identityNum)) {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    });
    
    identityElements.forEach(el => {
      const elementIdentity = parseInt(el.getAttribute('data-identity'), 10);
      if (shouldShow(elementIdentity)) {
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });
    
    console.log('用户身份:', identityNum, '界面已根据身份调整');
  } catch (e) {
    console.error('设置角色界面失败:', e);
  }
})();

// ---------------- 新闻轮播 ----------------
const slidesEl = document.getElementById('news-slides');
const dotsEl = document.getElementById('news-dots');
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
    console.log('新闻接口响应:', JSON.stringify(json, null, 2)); // 调试信息：完整JSON
    
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
      news = newsList;
      renderNews();
      startAuto();
      msgNews.textContent = '';
    } else if (newsList && newsList.length === 0) {
      news = [];
      renderNews();
      msgNews.textContent = json?.message || '暂无新闻数据';
    } else {
      console.error('新闻数据格式:', json);
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
  slidesEl.innerHTML = news.map(n=>
    `<a class="slide" href="${n.newsUrl}" target="_blank" rel="noopener">
       <img src="${n.imgUrl}" alt="${n.title}">
       <div class="title">${n.title}</div>
     </a>`).join('');
  dotsEl.innerHTML = news.map((_,i)=>`<span class="dot ${i===idx?'active':''}" data-i="${i}"></span>`).join('');
  updateSlide();
}

function updateSlide(){
  slidesEl.style.transform = `translateX(-${idx*100}%)`;
  [...dotsEl.children].forEach((d,i)=>d.classList.toggle('active', i===idx));
}
function startAuto(){ stopAuto(); timer = setInterval(()=>{ idx = (idx+1) % news.length; updateSlide(); }, 3500); }
function stopAuto(){ if(timer){ clearInterval(timer); timer=null; } }

dotsEl.addEventListener('click', e=>{
  const t = e.target; if(!t.classList.contains('dot')) return; idx = parseInt(t.getAttribute('data-i'),10)||0; updateSlide();
});
document.getElementById('news-refresh').onclick = ()=>{ idx=0; fetchNews(); };

// ---------------- 金融产品 ----------------
const productsGrid = document.getElementById('products-grid');
const msgProducts = document.getElementById('msg-products');

async function fetchProducts(){
  msgProducts.textContent = '加载中...';
  try {
    const res = await fetch(`${API_BASE}/api/financing/products/`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    console.log('金融产品接口响应:', JSON.stringify(json, null, 2)); // 调试信息：完整JSON
    
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
      renderProducts(products);
      msgProducts.textContent = products.length ? '' : '暂无金融产品';
      return;
    }
    console.error('金融产品数据格式错误:', json);
    throw new Error('响应格式错误：未找到产品列表');
  } catch (err) {
    console.error('金融产品加载错误:', err);
    renderProducts([]);
    msgProducts.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function renderProducts(list){
  productsGrid.innerHTML = list.map(p=>
    `<div class="product">
       <div class="name">${p.fpName}</div>
       <div class="desc">${p.fpDescription||''}</div>
       <div class="rate">${p.annualRate? ('年化 ' + p.annualRate + '%') : '—'}</div>
       <div class="tags">${(p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
     </div>`
  ).join('');
}

document.getElementById('products-refresh').onclick = fetchProducts;

// ---------------- 专家列表 ----------------
const expertsList = document.getElementById('experts-list');
const msgExperts = document.getElementById('msg-experts');
const expertDetailBox = document.getElementById('expert-detail-box');
const msgExpertDetail = document.getElementById('msg-expert-detail');

async function fetchExperts(){
  msgExperts.textContent = '加载中...';
  try {
    const res = await fetch(`${API_BASE}/api/experts/`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    console.log('专家接口响应:', JSON.stringify(json, null, 2)); // 调试信息：完整JSON
    
    // 兼容多种返回格式：experts 或 data.experts 或 data 本身
    let experts = null;
    if (json.experts) {
      experts = json.experts;
    } else if (json.data) {
      if (Array.isArray(json.data)) {
        experts = json.data;
      } else if (json.data.experts) {
        experts = json.data.experts;
      }
    } else if (Array.isArray(json)) {
      experts = json;
    }
    
    if (Array.isArray(experts)) {
      renderExperts(experts);
      msgExperts.textContent = experts.length ? '' : '暂无专家数据';
      return;
    }
    console.error('专家数据格式错误:', json);
    throw new Error('响应格式错误：未找到专家列表');
  } catch (err) {
    console.error('专家加载错误:', err);
    renderExperts([]);
    msgExperts.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function renderExperts(list){
  expertsList.innerHTML = list.map(e=>{
    const fieldsText = formatField(e.field);
    return `<div class="expert">
      <div class="name">${e.expertName || e.name || '未命名'}</div>
      <div class="fields">研究方向：${fieldsText}</div>
      <div class="desc">${e.expertDescription || e.description || ''}</div>
    </div>`;
  }).join('');
}

const btnSearchExperts = document.getElementById('btn-search-experts');
const expertsSearchList = document.getElementById('experts-search-list');
const msgExpertsSearch = document.getElementById('msg-experts-search');
if (btnSearchExperts) {
  btnSearchExperts.onclick = async ()=>{
    const keyword = document.getElementById('expert-search-keyword').value.trim();
    expertsSearchList.innerHTML = '';
    if (!keyword) {
      msgExpertsSearch.textContent = '请输入专家姓名';
      return;
    }
    console.log('[专家搜索] 即将请求, 关键词:', keyword);
    msgExpertsSearch.textContent = '搜索中...';
    try {
      const res = await fetch(`${API_BASE}/api/experts/search?q=${encodeURIComponent(keyword)}`);
      console.log('[专家搜索] 请求完成, 状态:', res.status, res.statusText);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      console.log('[专家搜索] 原始响应:', json);
      let list = extractExpertsFromResponse(json, 'search');
      console.log('[专家搜索] 解析后的列表:', list);
      if (!list.length) {
        console.log('[专家搜索] 搜索接口为空，尝试从 /api/experts/ 过滤');
        const all = await fetchAllExperts();
        list = filterExpertsByName(all, keyword);
      }
      expertsSearchList.innerHTML = list.map(e=>{
        const fieldsText = formatField(e.field);
        return `<div class="expert">
          <div class="name">${e.expertName || e.name || '未命名'}</div>
          <div class="fields">研究方向：${fieldsText}</div>
          <div class="desc">${e.expertDescription || e.description || ''}</div>
        </div>`;
      }).join('');
      msgExpertsSearch.textContent = list.length ? '' : (json?.message || '未搜索到专家');
    } catch (err) {
      expertsSearchList.innerHTML = '';
      msgExpertsSearch.textContent = `搜索失败：${err.message || '网络错误'}`;
    }
  };
}

const formExpertDetail = document.getElementById('form-expert-detail');
if (formExpertDetail) {
  formExpertDetail.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const expertName = document.getElementById('expert-detail-name').value.trim();
    expertDetailBox.innerHTML = '';
    if (!expertName) {
      msgExpertDetail.textContent = '请输入专家姓名';
      return;
    }
    console.log('[专家详情] 搜索关键词:', expertName);
    msgExpertDetail.textContent = '搜索专家...';
    try {
      const searchRes = await fetch(`${API_BASE}/api/experts/search?q=${encodeURIComponent(expertName)}`);
      console.log('[专家详情] 搜索请求完成, 状态:', searchRes.status);
      if (!searchRes.ok) {
        throw new Error(`HTTP ${searchRes.status}`);
      }
      const searchJson = await searchRes.json();
      console.log('[专家详情] 搜索原始响应:', searchJson);
      let list = extractExpertsFromResponse(searchJson, 'detail');
      console.log('[专家详情] 解析后的列表:', list);
      if (!list.length) {
        console.log('[专家详情] 搜索接口为空，尝试从 /api/experts/ 过滤');
        const all = await fetchAllExperts();
        list = filterExpertsByName(all, expertName);
      }
      if (!list.length) {
        msgExpertDetail.textContent = '未找到匹配的专家';
        return;
      }
      let detailData = list[0];
      const expertId = detailData.expertId || detailData.id;
      if (expertId) {
        try {
          msgExpertDetail.textContent = '加载详情...';
          const detailRes = await fetch(`${API_BASE}/api/experts/${expertId}`);
          if (detailRes.ok) {
            const detailJson = await detailRes.json();
            const detailCandidates = extractExpertsFromResponse(detailJson, 'detail-fetch');
            if (detailCandidates.length) {
              detailData = detailCandidates[0];
            } else {
              const data = detailJson?.data && !Array.isArray(detailJson.data) ? detailJson.data : detailJson;
              if (data && !Array.isArray(data)) {
                detailData = data;
              }
            }
          }
        } catch (detailErr) {
          console.warn('获取专家详情失败，使用搜索结果展示', detailErr);
        }
      }
      console.log('[专家详情] 最终渲染数据:', detailData);
      const detailFields = formatField(detailData.field) || '—';
      expertDetailBox.innerHTML = `
        <div>姓名：${detailData.expertName || detailData.name || '—'}</div>
        <div>研究方向：${detailFields}</div>
        <div>简介：${detailData.expertDescription || detailData.description || '—'}</div>
        <div>案例：${detailData.example || '—'}</div>
        <div>联系方式：${detailData.contact || ''}</div>
        <div>电话：${detailData.expertPhone || '—'}</div>
        <div>邮箱：${detailData.expertEmail || '—'}</div>
      `;
      msgExpertDetail.textContent = '';
    } catch (err) {
      expertDetailBox.innerHTML = '';
      msgExpertDetail.textContent = `加载失败：${err.message || '网络错误'}`;
    }
  });
}

async function fetchAllExperts(){
  const res = await fetch(`${API_BASE}/api/experts/`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  const experts = extractExpertsFromResponse(json, 'all');
  return experts;
}

function filterExpertsByName(list, keyword){
  const kw = keyword.trim();
  return list.filter(item=>{
    const name = (item.expertName || item.name || '').trim();
    return name && name.includes(kw);
  });
}

function formatField(fieldValue){
  if (!fieldValue) return '';
  if (Array.isArray(fieldValue)) {
    return fieldValue.filter(Boolean).join('、');
  }
  if (typeof fieldValue === 'string') {
    return fieldValue.split(/[,，]/).map(s=>s.trim()).filter(Boolean).join('、');
  }
  return String(fieldValue);
}

function extractExpertsFromResponse(json, scene){
  if (!json) return [];
  const data = json.data;
  if (data && Array.isArray(data.experts)) {
    return data.experts;
  }
  if (Array.isArray(json.experts)) {
    return json.experts;
  }
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(json)) {
    return json;
  }
  if (data && typeof data === 'object') {
    return [data];
  }
  console.warn(`[extractExpertsFromResponse] 无法解析（场景:${scene}）`, json);
  return [];
}

// 初始化
fetchNews();
fetchProducts();
fetchExperts();

// ---------------- 农业知识 ----------------
const btnLoadKnowledge = document.getElementById('btn-load-knowledge');
const knowledgeList = document.getElementById('knowledge-list');
const msgKnowledge = document.getElementById('msg-knowledge');
const btnSearchKnowledge = document.getElementById('btn-search-knowledge');
const knowledgeSearchList = document.getElementById('knowledge-search-list');
const msgKnowledgeSearch = document.getElementById('msg-knowledge-search');

async function loadKnowledgeList(){
  const page = parseInt(document.getElementById('knowledge-page').value, 10) || 1;
  const size = parseInt(document.getElementById('knowledge-size').value, 10) || 10;
  knowledgeList.innerHTML = '';
  msgKnowledge.textContent = '加载中...';
  try {
    const res = await fetch(`${API_BASE}/api/knowledge/list?page=${page}&page_size=${size}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    knowledgeList.innerHTML = list.map(item=>
      `<div class="expert">
         <div class="name">${item.title || '未命名'}</div>
         <div>来源：${item.source || '—'}</div>
         <div>发布日期：${item.publish || '—'}</div>
         <a href="${item.url}" target="_blank" rel="noopener">查看原文</a>
       </div>`
    ).join('');
    msgKnowledge.textContent = list.length ? '' : (json?.message || '暂无数据');
  } catch (err) {
    knowledgeList.innerHTML = '';
    msgKnowledge.textContent = `加载失败：${err.message || '网络错误'}`;
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
        `<div class="expert">
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


// ---------------- 贷款产品 ----------------
const loanProductsGrid = document.getElementById('loan-products-grid');
const msgLoanProducts = document.getElementById('msg-loan-products');
document.getElementById('loan-products-refresh').onclick = loadLoanProducts;

async function loadLoanProducts(){
  msgLoanProducts.textContent = '加载中...';
  try {
    const res = await fetch(`${API_BASE}/api/loan/products`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = Array.isArray(json?.data)
      ? json.data
      : (Array.isArray(json?.products) ? json.products : (Array.isArray(json) ? json : []));
    renderLoanProducts(list);
    msgLoanProducts.textContent = list.length ? '' : (json?.message || '暂无贷款产品');
  } catch (err) {
    renderLoanProducts([]);
    msgLoanProducts.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function renderLoanProducts(list){
  if (!Array.isArray(list) || !list.length) {
    loanProductsGrid.innerHTML = '<div class="msg">暂无贷款产品</div>';
    return;
  }
  loanProductsGrid.innerHTML = list.map(p=>{
    const id = p.productId ?? p.fpId ?? p.id ?? '';
    const name = p.name || p.fpName || `产品#${id}`;
    const desc = p.description || p.fpDescription || '';
    const category = p.category || '—';
    const maxAmountRaw = p.maxAmount ?? p.max_amount ?? p.max ?? null;
    const minAmountRaw = p.minAmount ?? p.min_amount ?? p.min ?? null;
    const hasAmountRange = minAmountRaw !== null || maxAmountRaw !== null;
    const amountRange = hasAmountRange
      ? `${(minAmountRaw ?? maxAmountRaw ?? 0)} - ${(maxAmountRaw ?? minAmountRaw ?? 0)}`
      : '—';
    const rate = p.interestRate ?? p.annualRate;
    const term = p.term ?? p.loanTerm ?? '—';
    return `<div class="product">
      <div class="name">${name}</div>
      <div class="desc">${desc}</div>
      <div>类型：${category}</div>
      <div>额度范围：${amountRange}</div>
      <div class="rate">${rate || rate === 0 ? ('年化 ' + rate + '%') : '—'}</div>
      <div>期限(月)：${term}</div>
      <div class="tags">${renderTags(p.tags)}</div>
    </div>`;
  }).join('');
}

function renderTags(tags){
  if (!tags) return '';
  const arr = Array.isArray(tags) ? tags : String(tags).split(/[,，]/).map(t=>t.trim()).filter(Boolean);
  return arr.map(t=>`<span class="tag">${t}</span>`).join('');
}

loadLoanProducts();

// 贷款产品管理（新增 / 删除 / 详情）
const formCreateProduct = document.getElementById('form-create-loan-product');
const msgCreateProduct = document.getElementById('msg-create-product');
if (formCreateProduct) {
  formCreateProduct.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = {
      name: document.getElementById('product-name').value.trim(),
      category: document.getElementById('product-category').value.trim(),
      maxAmount: parseFloat(document.getElementById('product-max').value),
      minAmount: parseFloat(document.getElementById('product-min').value),
      interestRate: parseFloat(document.getElementById('product-rate').value),
      term: parseInt(document.getElementById('product-term').value, 10),
      description: document.getElementById('product-desc').value.trim()
    };
    if (!payload.name || !payload.category) {
      msgCreateProduct.textContent = '请填写完整的产品信息';
      return;
    }
    msgCreateProduct.textContent = '提交中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgCreateProduct.textContent = json?.message || '创建成功';
      formCreateProduct.reset();
      loadLoanProducts();
    } catch (err) {
      msgCreateProduct.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

const formDeleteProduct = document.getElementById('form-delete-product');
const msgDeleteProduct = document.getElementById('msg-delete-product');
if (formDeleteProduct) {
  formDeleteProduct.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const id = parseInt(document.getElementById('delete-product-id').value, 10);
    if (!id) {
      msgDeleteProduct.textContent = '请输入产品ID';
      return;
    }
    msgDeleteProduct.textContent = '删除中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/products/${id}`, {
        method: 'DELETE'
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgDeleteProduct.textContent = json?.message || '删除成功';
      formDeleteProduct.reset();
      loadLoanProducts();
    } catch (err) {
      msgDeleteProduct.textContent = `删除失败：${err.message || '网络错误'}`;
    }
  });
}

const formProductDetail = document.getElementById('form-product-detail');
const msgProductDetail = document.getElementById('msg-product-detail');
const detailBox = document.getElementById('loan-product-detail');
if (formProductDetail) {
  formProductDetail.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const id = parseInt(document.getElementById('detail-product-id').value, 10);
    if (!id) {
      msgProductDetail.textContent = '请输入产品ID';
      return;
    }
    msgProductDetail.textContent = '查询中...';
    detailBox.textContent = '';
    try {
      const res = await fetch(`${API_BASE}/api/loan/products/${id}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const data = json?.data && !Array.isArray(json.data) ? json.data : (!json.data ? json : null);
      if (!data || Array.isArray(data)) {
        throw new Error('未找到匹配产品');
      }
      detailBox.innerHTML = `
        <div>名称：${data.name || data.fpName || '—'}</div>
        <div>类型：${data.category || '—'}</div>
        <div>额度：${(data.minAmount ?? '—')} - ${(data.maxAmount ?? '—')}</div>
        <div>利率：${(data.interestRate ?? data.annualRate ?? '—')}%</div>
        <div>期限(月)：${data.term ?? '—'}</div>
        <div>负责人：${data.fpManagerName || '—'}</div>
        <div>电话：${data.fpManagerPhone || '—'}</div>
        <div>邮箱：${data.fpManagerEmail || '—'}</div>
        <div>描述：${data.description || data.fpDescription || '—'}</div>`;
      msgProductDetail.textContent = json?.message || '';
    } catch (err) {
      detailBox.textContent = '';
      msgProductDetail.textContent = `查询失败：${err.message || '网络错误'}`;
    }
  });
}

// ---------------- 贷款申请 ----------------

// ---------------- 我的申请列表 ----------------
// ---------------- 我的申请列表 ----------------

// ---------------- 审批中心 ----------------
const btnLoadPending = document.getElementById('btn-load-pending');
const pendingList = document.getElementById('pending-list');
const formApprove = document.getElementById('form-approve');
const msgApprove = document.getElementById('msg-approve');

btnLoadPending.onclick = async function(){
  pendingList.innerHTML = '';
  msgApprove.textContent = '加载待审批...';
  try {
    const res = await fetch(`${API_BASE}/api/loan/pending`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = (json && Array.isArray(json.data)) ? json.data : [];
    renderPending(list);
    msgApprove.textContent = list.length ? '' : '暂无待审批申请';
  } catch (err) {
    renderPending([]);
    msgApprove.textContent = `加载失败：${err.message || '网络错误'}`;
  }
};

function renderPending(list){
  pendingList.innerHTML = list.map(p=>
    `<div class="expert">
       <div class="name">申请#${p.applicationId}</div>
       <div>用户：${p.userId||''}</div>
       <div>产品：${p.productName||''}</div>
       <div>金额：${p.amount||''}，期限(月)：${p.term||''}</div>
       <div>申请时间：${p.applyTime||''}</div>
     </div>`
  ).join('');
}

formApprove.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const applicationId = parseInt(document.getElementById('approve-applicationId').value,10);
  const approverId = parseInt(document.getElementById('approve-approverId').value,10);
  const decision = parseInt(document.getElementById('approve-decision').value,10);
  const remark = document.getElementById('approve-remark').value.trim();
  
  const requestData = {
    applicationId: applicationId,
    approverId: approverId,
    decision: decision,
    remark: remark
  };
  
  console.log('审批请求数据:', requestData); // 调试信息
  
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  msgApprove.textContent = '提交审批中...';
  try {
    const res = await fetch(`${API_BASE}/api/loan/approve`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData)
    });
    const json = await res.json();
    msgApprove.textContent = json?.message || (json?.code === 200 ? '审批提交成功' : '审批提交失败');
  } catch (err) {
    msgApprove.textContent = `提交失败：${err.message || '网络错误'}`;
  }
});

const btnLoadApprovalHistory = document.getElementById('btn-load-approval-history');
const approvalHistoryList = document.getElementById('approval-history-list');
const msgApprovalHistory = document.getElementById('msg-approval-history');
if (btnLoadApprovalHistory) {
  btnLoadApprovalHistory.onclick = async function(){
    const applicationId = parseInt(document.getElementById('history-applicationId').value, 10);
    approvalHistoryList.innerHTML = '';
    if (!applicationId) {
      msgApprovalHistory.textContent = '请输入申请ID';
      return;
    }
    msgApprovalHistory.textContent = '加载中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/approvals?applicationId=${encodeURIComponent(applicationId)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      approvalHistoryList.innerHTML = list.map(item =>
        `<div class="expert">
           <div>审批人：${item.approverId || item.approverName || '—'}</div>
           <div>结果：${item.decision || '—'}</div>
           <div>备注：${item.remark || '—'}</div>
           <div>时间：${item.date || item.createTime || '—'}</div>
         </div>`
      ).join('');
      msgApprovalHistory.textContent = list.length ? '' : '暂无审批记录';
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
      `<div class="expert">
         <div>状态代码：${item.status_code ?? item.statusCode ?? '—'}</div>
         <div>名称：${item.status_name ?? item.statusName ?? '—'}</div>
         <div>说明：${item.description || '—'}</div>
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
const DEFAULT_PRODUCT_IMAGE = 'https://via.placeholder.com/320x180?text=Product';

function resolveProductImage(url) {
  if (!url) return DEFAULT_PRODUCT_IMAGE;
  try {
    const parsed = new URL(url, window.location.origin);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return DEFAULT_PRODUCT_IMAGE;
    }
    return parsed.href;
  } catch {
    return DEFAULT_PRODUCT_IMAGE;
  }
}

const productCatalogList = document.getElementById('product-catalog-list');
const msgProductCatalog = document.getElementById('msg-product-catalog');
const btnRefreshProducts = document.getElementById('btn-refresh-products');

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
  const endpoints = [
    `${API_BASE}/api/products`
  ];
  let lastError = new Error('未获取到商品数据');
  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      const json = await res.json();
      const list = pickProductsFromResponse(json);
      if (Array.isArray(list)) {
        return list;
      }
      console.warn('[农产品商城] 未能解析响应:', json);
      lastError = new Error('响应格式不正确');
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function renderProductCatalog(list) {
  if (!productCatalogList) return;
  if (!Array.isArray(list) || !list.length) {
    productCatalogList.innerHTML = '<div class="empty">暂无商品</div>';
    return;
  }
  productCatalogList.innerHTML = list.map(item=>{
    const productId = item.productId || item.id || item.sourceId || '';
    const price = item.price ?? item.productPrice ?? '';
    const stock = item.surplus ?? item.stock ?? item.inventory ?? '—';
    const sales = item.salesVolume ?? item.sales ?? '—';
    const producer = item.producer || item.origin || item.owner || '—';
    const img = item.productImg || item.imageUrl || item.imgUrl || '';
    const safeImg = resolveProductImage(img);
    const fallbackImg = escapeAttr(DEFAULT_PRODUCT_IMAGE);
    return `<div class="product">
      <div class="name">${item.productName || item.name || '未命名商品'}</div>
      <div>商品ID：${productId || '—'}</div>
      <div>价格：${price !== '' ? `¥${price}` : '—'}</div>
      <div>库存：${stock}</div>
      <div>销量：${sales}</div>
      <div>产地/商家：${producer}</div>
      <div class="thumb"><img src="${safeImg}" alt="${escapeAttr(item.productName || '')}" onerror="this.onerror=null;this.src='${fallbackImg}'"></div>
      ${productId ? `<button class="btn btn-secondary btn-fill-product" data-product-id="${productId}" data-product-price="${price ?? ''}">将ID填入表单</button>` : ''}
    </div>`;
  }).join('');
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
    const btn = e.target.closest('.btn-fill-product');
    if (!btn) return;
    const { productId, productPrice } = btn.dataset;
    const idsToFill = [
      'cart-productId',
      'purchase-productId',
      'comment-productId',
      'reply-productId'
    ];
    idsToFill.forEach(id=>{
      const input = document.getElementById(id);
      if (input && productId) {
        input.value = productId;
      }
    });
    if (productPrice !== undefined && productPrice !== '' && !Number.isNaN(Number(productPrice))) {
      const purchaseMoney = document.getElementById('purchase-money');
      const cartMoney = document.getElementById('cart-money');
      if (purchaseMoney && !purchaseMoney.value) purchaseMoney.value = productPrice;
      if (cartMoney && !cartMoney.value) cartMoney.value = productPrice;
    }
  });
  loadAgriculturalProducts();
}

// ---------------- 买家购物车展示 ----------------
const cartDisplayList = document.getElementById('cart-display-list');
const msgCartDisplay = document.getElementById('msg-cart-display');
const btnRefreshCart = document.getElementById('btn-refresh-cart');

function normalizeCartList(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
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
    const res = await fetch(`${API_BASE}/api/shopshow?userId=${encodeURIComponent(userId)}`);
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
    const singlePrice = item.price ?? item.productPrice ?? '—';
    const totalPrice = item.total_price ?? item.totalPrice ?? (singlePrice !== '—' && item.amount ? singlePrice * item.amount : '—');
    return `<div class="product">
      <div class="name">${item.productName || '未命名商品'}</div>
      <div>发售商：${item.producer || '—'}</div>
      <div>数量：${item.amount ?? '—'}</div>
      <div>单价：${singlePrice !== '—' ? `¥${singlePrice}` : '—'}</div>
      <div>总价：${totalPrice !== '—' ? `¥${totalPrice}` : '—'}</div>
      <div class="thumb"><img src="${safeImg}" alt="${escapeAttr(item.productName || '')}" onerror="this.onerror=null;this.src='${fallbackImg}'"></div>
    </div>`;
  }).join('');
}

if (btnRefreshCart) {
  btnRefreshCart.addEventListener('click', ()=>loadCartDisplay());
}

// 购买记录展示
const ordersDisplayList = document.getElementById('orders-display-list');
const msgOrdersDisplay = document.getElementById('msg-orders-display');
const btnRefreshOrders = document.getElementById('btn-refresh-orders');

function renderOrdersDisplay(list) {
  if (!ordersDisplayList) return;
  if (!Array.isArray(list) || !list.length) {
    ordersDisplayList.innerHTML = '<div class="empty">暂无购买记录</div>';
    return;
  }
  ordersDisplayList.innerHTML = list.map(item=>{
    const safeImg = resolveProductImage(item.productImg || item.imageUrl);
    const fallbackImg = escapeAttr(DEFAULT_PRODUCT_IMAGE);
    const singlePrice = item.price ?? item.productPrice ?? '—';
    const totalPrice = item.total_price ?? item.totalPrice ?? (singlePrice !== '—' && item.amount ? singlePrice * item.amount : '—');
    return `<div class="product">
      <div class="name">${item.productName || '未命名商品'}</div>
      <div>发售商：${item.producer || '—'}</div>
      <div>数量：${item.amount ?? '—'}</div>
      <div>单价：${singlePrice !== '—' ? `¥${singlePrice}` : '—'}</div>
      <div>总价：${totalPrice !== '—' ? `¥${totalPrice}` : '—'}</div>
      <div class="thumb"><img src="${safeImg}" alt="${escapeAttr(item.productName || '')}" onerror="this.onerror=null;this.src='${fallbackImg}'"></div>
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
    const res = await fetch(`${API_BASE}/api/purchaseshow?userId=${encodeURIComponent(userId)}`);
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
}

// ---------------- 购物车 ----------------
const formAddToCart = document.getElementById('form-add-to-cart');
const msgCart = document.getElementById('msg-cart');
if (formAddToCart) {
  formAddToCart.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      msgCart.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }
    const payload = {
      productId: parseInt(document.getElementById('cart-productId').value, 10),
      userId: currentUserId,
      amount: parseInt(document.getElementById('cart-amount').value, 10),
      money: parseFloat(document.getElementById('cart-money').value),
      getAddress: document.getElementById('cart-address').value.trim()
    };
    if (!payload.productId || !payload.amount || !payload.money || !payload.getAddress) {
      msgCart.textContent = '请完善购物车信息';
      return;
    }
    msgCart.textContent = '提交中...';
    try {
      const res = await fetch(`${API_BASE}/api/shop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgCart.textContent = json?.message || json?.data?.message || '商品已成功加入购物车';
      formAddToCart.reset();
    } catch (err) {
      msgCart.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

// ---------------- 购买商品 ----------------
const formPurchase = document.getElementById('form-purchase');
const msgPurchase = document.getElementById('msg-purchase');
const paymentMethodsBox = document.getElementById('payment-methods-box');
if (formPurchase) {
  formPurchase.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      msgPurchase.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }
    const payload = {
      productId: parseInt(document.getElementById('purchase-productId').value, 10),
      userId: currentUserId,
      amount: parseInt(document.getElementById('purchase-amount').value, 10),
      money: parseFloat(document.getElementById('purchase-money').value),
      getAddress: document.getElementById('purchase-address').value.trim()
    };
    if (!payload.productId || !payload.amount || !payload.money || !payload.getAddress) {
      msgPurchase.textContent = '请完善购买信息';
      return;
    }
    msgPurchase.textContent = '提交中...';
    paymentMethodsBox.style.display = 'none';
    try {
      const res = await fetch(`${API_BASE}/api/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgPurchase.textContent = json?.message || '订单创建成功，请选择支付方式';
      const methods = json?.data?.paymentMethods || [];
      if (methods.length) {
        paymentMethodsBox.innerHTML = `<div><strong>支付方式：</strong>${methods.join('、')}</div>`;
        paymentMethodsBox.style.display = 'block';
      }
      formPurchase.reset();
    } catch (err) {
      msgPurchase.textContent = `提交失败：${err.message || '网络错误'}`;
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
    const payload = {
      content: document.getElementById('reply-content').value.trim(),
      sendTime: new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\//g, '-'),
      userId: currentUserId,
      productId: parseInt(document.getElementById('reply-productId').value, 10),
      rootCommentId: parseInt(document.getElementById('reply-rootId').value, 10),
      toCommentId: parseInt(document.getElementById('reply-toId').value, 10)
    };
    if (!payload.content || !payload.productId || !payload.rootCommentId || !payload.toCommentId) {
      msgReply.textContent = '请完善回复信息';
      return;
    }
    msgReply.textContent = '提交中...';
    try {
      const res = await fetch(`${API_BASE}/api/comment/reply`, {
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
    } catch (err) {
      msgReply.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

