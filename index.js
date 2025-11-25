// 后端API基础地址
const API_BASE = 'http://10.61.194.227:8080';
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
      news = newsList;
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
    msgExpertsSearch.textContent = '搜索中...';
    try {
      const res = await fetch(`${API_BASE}/api/experts/search?q=${encodeURIComponent(keyword)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      let list = extractExpertsFromResponse(json, 'search');
      if (!list.length) {
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
    msgExpertDetail.textContent = '搜索专家...';
    try {
      const searchRes = await fetch(`${API_BASE}/api/experts/search?q=${encodeURIComponent(expertName)}`);
      if (!searchRes.ok) {
        throw new Error(`HTTP ${searchRes.status}`);
      }
      const searchJson = await searchRes.json();
      let list = extractExpertsFromResponse(searchJson, 'detail');
      if (!list.length) {
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
        }
      }
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
      // 贷款产品列表已移至loans.html，此处不再刷新
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
      // 贷款产品列表已移至loans.html，此处不再刷新
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

const PRODUCT_ID_INPUTS = [
  'comment-productId',
  'reply-productId'
];

let latestProductCatalog = [];
let selectedProductCard = null;
const childCommentCache = new Map();
let activeProductId = null;
let activeProductName = '';
let activeCartId = null;
let pendingPurchaseAction = 'purchase';
let savedAddresses = [];

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
  activeCartId = null;
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
  loadProductDetailAndComments(productId);
}

function closeProductModal() {
  if (!productModal) return;
  productModal.classList.add('hidden');
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

async function loadProductDetailAndComments(productId) {
  if (!modalProductInfo || !modalProductMsg || !modalCommentList || !modalCommentMsg) return;
  if (!productId) {
    modalProductMsg.textContent = '该商品缺少ID，无法加载详情';
    modalCommentMsg.textContent = '';
    modalProductInfo.innerHTML = '';
    modalCommentList.innerHTML = '';
    return;
  }
  modalProductInfo.innerHTML = '';
  modalCommentList.innerHTML = '';
  modalProductMsg.textContent = '加载商品详情中...';
  modalCommentMsg.textContent = '加载评论中...';
  try {
    const res = await fetch(`${API_BASE}/api/products/buyer/${encodeURIComponent(productId)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const data = json?.data || null;
    if (!data || typeof data !== 'object') {
      throw new Error('未获取到商品数据');
    }
    renderSelectedProductDetail(data);
    const comments = Array.isArray(data.comments)
      ? data.comments
      : (Array.isArray(data.productComment) ? data.productComment : []);
    renderProductComments(comments);
    modalProductMsg.textContent = '';
    modalCommentMsg.textContent = comments.length ? '' : '暂无评论';
  } catch (err) {
    modalProductInfo.innerHTML = '';
    modalCommentList.innerHTML = '';
    modalProductMsg.textContent = `加载失败：${err.message || '网络错误'}`;
    modalCommentMsg.textContent = '';
  }
}

function renderSelectedProductDetail(data) {
  if (!modalProductInfo) return;
  const name = data.productName || data.name || '未命名商品';
  const productId = data.productId ?? data.id ?? '—';
  const producer = data.producer || data.origin || data.owner || '—';
  const userId = data.userId ?? data.ownerId ?? data.farmerId ?? '—';
  const price = data.price ?? data.productPrice ?? '—';
  const surplus = data.surplus ?? data.stock ?? '—';
  const sales = data.salesVolumn ?? data.salesVolume ?? data.sales ?? '—';
  const img = data.productImg || data.imageUrl || data.imgUrl || '';
  const desc = data.description || data.productDesc || '';
  const safeImg = resolveProductImage(img);
  const fallbackImg = escapeAttr(DEFAULT_PRODUCT_IMAGE);
  activeProductId = productId;
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
  populateProductIdInputs(productId);
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
  const content = item.content ? formatMultilineText(item.content) : '（无内容）';
  const btnLoadChild = commentId
    ? `<button class="btn btn-secondary btn-load-child" data-comment-id="${escapeAttr(commentId)}">查看子评论</button>`
    : '';
  return `<div class="comment-item" ${commentId ? `data-comment-id="${escapeAttr(commentId)}"` : ''}>
    <div class="comment-content">${content}</div>
    <div class="comment-meta">
      <span>评论ID：${commentId || '—'}</span>
      <span>用户ID：${escapeAttr(userId)}</span>
      <span>时间：${escapeAttr(sendTime)}</span>
      <span>点赞数：${escapeAttr(likeCount)}</span>
    </div>
    <div class="comment-actions">
      ${btnLoadChild}
    </div>
    <div class="child-comments" ${commentId ? `data-child-container="${escapeAttr(commentId)}"` : ''}></div>
  </div>`;
}

function renderChildCommentList(list) {
  if (!Array.isArray(list) || !list.length) {
    return '<div class="empty">暂无子评论</div>';
  }
  return list.map(item=>{
    const childContent = item.content ? formatMultilineText(item.content) : '（无内容）';
    const sendTime = item.sendTime || item.createdTime || item.createTime || '—';
    const userId = item.userId ?? '—';
    const likeCount = item.commentLikeCount ?? item.likeCount ?? 0;
    const commentId = item.productCommentId ?? item.commentId ?? item.id ?? '—';
    return `<div class="child-comment">
      <div class="comment-content">${childContent}</div>
      <div class="comment-meta">
        <span>评论ID：${escapeAttr(commentId)}</span>
        <span>用户ID：${escapeAttr(userId)}</span>
        <span>时间：${escapeAttr(sendTime)}</span>
        <span>点赞数：${escapeAttr(likeCount)}</span>
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
      list = normalizeChildComments(json);
      childCommentCache.set(commentId, list);
    }
    container.innerHTML = renderChildCommentList(list);
    if (triggerBtn) {
      triggerBtn.textContent = '子评论已加载';
      triggerBtn.disabled = true;
    }
  } catch (err) {
    container.innerHTML = `<div class="msg">加载失败：${escapeAttr(err.message || '网络错误')}</div>`;
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
  btnModalAddCart.addEventListener('click', ()=>openPurchaseModal('cart'));
}

if (btnModalPurchase) {
  btnModalPurchase.addEventListener('click', ()=>openPurchaseModal('purchase'));
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
    const btn = e.target.closest('.btn-load-child');
    if (!btn) return;
    const commentId = btn.getAttribute('data-comment-id');
    const container = btn.closest('.comment-item')?.querySelector('.child-comments');
    loadChildComments(commentId, container, btn);
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

