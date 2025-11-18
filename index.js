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

// 退出登录
document.getElementById('btn-logout').onclick = function() {
  try { localStorage.removeItem('auth_token'); } catch {}
  window.location.href = 'login.html';
};

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

// ---------------- 专家预约（用户端） ----------------
const formAppointmentCreate = document.getElementById('form-appointment-create');
const msgAppointmentCreate = document.getElementById('msg-appointment-create');
if (formAppointmentCreate) {
  formAppointmentCreate.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = {
      userId: parseInt(document.getElementById('appointment-userId').value, 10),
      expertId: parseInt(document.getElementById('appointment-expertId').value, 10),
      date: document.getElementById('appointment-date').value,
      time: document.getElementById('appointment-time').value.trim(),
      topic: document.getElementById('appointment-topic').value.trim(),
      remark: document.getElementById('appointment-remark').value.trim()
    };
    if (!payload.userId || !payload.expertId || !payload.date || !payload.time || !payload.topic) {
      msgAppointmentCreate.textContent = '请完善预约信息';
      return;
    }
    msgAppointmentCreate.textContent = '提交中...';
    try {
      const res = await fetch(`${API_BASE}/api/expert-appointment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgAppointmentCreate.textContent = json?.message || '预约申请已提交';
      formAppointmentCreate.reset();
    } catch (err) {
      msgAppointmentCreate.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

const btnLoadUserAppointments = document.getElementById('btn-load-user-appointments');
const userAppointmentsList = document.getElementById('user-appointments-list');
const msgUserAppointments = document.getElementById('msg-user-appointments');
if (btnLoadUserAppointments) {
  btnLoadUserAppointments.onclick = async ()=>{
    const userId = parseInt(document.getElementById('user-appointment-userId').value, 10);
    userAppointmentsList.innerHTML = '';
    if (!userId) {
      msgUserAppointments.textContent = '请输入用户ID';
      return;
    }
    msgUserAppointments.textContent = '加载中...';
    try {
      const res = await fetch(`${API_BASE}/api/expert-appointment/user/list?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      userAppointmentsList.innerHTML = list.map(item=>
        `<div class="expert">
           <div class="name">预约#${item.id || item.appointment_id || ''}</div>
           <div>专家：${item.expert?.name || item.expertName || ''}</div>
           <div>日期：${item.date || item.appointmentDate || ''} ${item.time || ''}</div>
           <div>主题：${item.topic || ''}</div>
           <div>状态：${item.status || ''}</div>
         </div>`
      ).join('');
      msgUserAppointments.textContent = list.length ? '' : '暂无预约记录';
    } catch (err) {
      userAppointmentsList.innerHTML = '';
      msgUserAppointments.textContent = `加载失败：${err.message || '网络错误'}`;
    }
  };
}

const formAppointmentCancel = document.getElementById('form-appointment-cancel');
const msgAppointmentCancel = document.getElementById('msg-appointment-cancel');
if (formAppointmentCancel) {
  formAppointmentCancel.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const appointmentId = parseInt(document.getElementById('cancel-appointment-id').value, 10);
    if (!appointmentId) {
      msgAppointmentCancel.textContent = '请输入预约ID';
      return;
    }
    msgAppointmentCancel.textContent = '取消中...';
    try {
      const res = await fetch(`${API_BASE}/api/expert-appointment/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId })
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgAppointmentCancel.textContent = json?.message || '预约已取消';
      formAppointmentCancel.reset();
    } catch (err) {
      msgAppointmentCancel.textContent = `取消失败：${err.message || '网络错误'}`;
    }
  });
}

// ---------------- 专家预约（专家端） ----------------
const btnLoadPendingAppointments = document.getElementById('btn-load-pending-appointments');
const pendingAppointmentsList = document.getElementById('pending-appointments-list');
const msgPendingAppointments = document.getElementById('msg-pending-appointments');
if (btnLoadPendingAppointments) {
  btnLoadPendingAppointments.onclick = async ()=>{
    const expertId = parseInt(document.getElementById('pending-expert-id').value, 10);
    pendingAppointmentsList.innerHTML = '';
    msgPendingAppointments.textContent = '加载中...';
    try {
      const query = expertId ? `?expertId=${encodeURIComponent(expertId)}` : '';
      const res = await fetch(`${API_BASE}/api/expert-appointment/pending${query}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      pendingAppointmentsList.innerHTML = list.map(item=>
        `<div class="expert">
           <div class="name">预约#${item.id || item.appointment_id || ''}</div>
           <div>农户：${item.user?.name || item.userName || ''}</div>
           <div>时间：${item.date || ''} ${item.time || ''}</div>
           <div>主题：${item.topic || ''}</div>
           <div>备注：${item.remark || ''}</div>
           <div>状态：${item.status || ''}</div>
         </div>`
      ).join('');
      msgPendingAppointments.textContent = list.length ? '' : '暂无待审批预约';
    } catch (err) {
      pendingAppointmentsList.innerHTML = '';
      msgPendingAppointments.textContent = `加载失败：${err.message || '网络错误'}`;
    }
  };
}

const formAppointmentReview = document.getElementById('form-appointment-review');
const msgAppointmentReview = document.getElementById('msg-appointment-review');
if (formAppointmentReview) {
  formAppointmentReview.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = {
      appointment_id: parseInt(document.getElementById('review-appointment-id').value, 10),
      expert_id: parseInt(document.getElementById('review-expert-id').value, 10),
      action: document.getElementById('review-action').value,
      comment: document.getElementById('review-comment').value.trim()
    };
    if (!payload.appointment_id || !payload.expert_id) {
      msgAppointmentReview.textContent = '请填写预约ID和专家ID';
      return;
    }
    msgAppointmentReview.textContent = '提交中...';
    try {
      const res = await fetch(`${API_BASE}/api/expert-appointment/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgAppointmentReview.textContent = json?.message || '审批完成';
      formAppointmentReview.reset();
    } catch (err) {
      msgAppointmentReview.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

const btnLoadExpertSchedule = document.getElementById('btn-load-expert-schedule');
const expertScheduleList = document.getElementById('expert-schedule-list');
const msgExpertSchedule = document.getElementById('msg-expert-schedule');
if (btnLoadExpertSchedule) {
  btnLoadExpertSchedule.onclick = async ()=>{
    const expertId = parseInt(document.getElementById('schedule-expert-id').value, 10);
    expertScheduleList.innerHTML = '';
    if (!expertId) {
      msgExpertSchedule.textContent = '请输入专家ID';
      return;
    }
    msgExpertSchedule.textContent = '加载中...';
    try {
      const res = await fetch(`${API_BASE}/api/expert-appointment/schedule?expertId=${encodeURIComponent(expertId)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      expertScheduleList.innerHTML = list.map(item=>
        `<div class="expert">
           <div class="name">预约#${item.id || ''}</div>
           <div>农户：${item.user_name || item.userName || ''}</div>
           <div>时间：${item.date || ''} ${item.time || ''}</div>
           <div>主题：${item.topic || ''}</div>
           <div>状态：${item.status || ''}</div>
         </div>`
      ).join('');
      msgExpertSchedule.textContent = list.length ? '' : '暂无日程';
    } catch (err) {
      expertScheduleList.innerHTML = '';
      msgExpertSchedule.textContent = `加载失败：${err.message || '网络错误'}`;
    }
  };
}

const formAppointmentStatus = document.getElementById('form-appointment-update-status');
const msgAppointmentStatus = document.getElementById('msg-appointment-status');
if (formAppointmentStatus) {
  formAppointmentStatus.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = {
      appointment_id: parseInt(document.getElementById('status-appointment-id').value, 10),
      expert_id: parseInt(document.getElementById('status-expert-id').value, 10),
      status: document.getElementById('status-value').value
    };
    if (!payload.appointment_id || !payload.expert_id) {
      msgAppointmentStatus.textContent = '请填写预约ID和专家ID';
      return;
    }
    msgAppointmentStatus.textContent = '更新中...';
    try {
      const res = await fetch(`${API_BASE}/api/expert-appointment/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgAppointmentStatus.textContent = json?.message || '状态已更新';
      formAppointmentStatus.reset();
    } catch (err) {
      msgAppointmentStatus.textContent = `更新失败：${err.message || '网络错误'}`;
    }
  });
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
const formApply = document.getElementById('form-loan-apply');
const msgApply = document.getElementById('msg-loan-apply');
formApply.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const userId = parseInt(document.getElementById('apply-userId').value,10);
  const productId = parseInt(document.getElementById('apply-productId').value,10);
  const amount = parseFloat(document.getElementById('apply-amount').value);
  const term = parseInt(document.getElementById('apply-term').value,10);
  const documentFile = document.getElementById('apply-document').files[0];
  
  // 验证参数
  if (!userId || !productId || !amount || !term) {
    msgApply.textContent = '请填写所有必填字段';
    return;
  }
  
  const token = getAuthToken();
  
  const formData = new FormData();
  formData.append('userId', userId.toString());
  formData.append('productId', productId.toString());
  formData.append('amount', amount.toString());
  formData.append('term', term.toString());
  if (documentFile) {
    formData.append('documents[]', documentFile);
  }
  
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  console.log('贷款申请使用 FormData 提交'); // 调试信息
  
  msgApply.textContent = '提交中...';
  try {
    const res = await fetch(`${API_BASE}/api/loan/apply`, {
      method: 'POST',
      headers: headers,
      body: formData
    });
        
    console.log('贷款申请响应状态:', res.status, res.statusText); // 调试信息
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('贷款申请错误响应:', errorText); // 调试信息
      try {
        const errorJson = JSON.parse(errorText);
        msgApply.textContent = errorJson.message || `请求失败：${res.status} ${res.statusText}`;
      } catch {
        msgApply.textContent = `请求失败：${res.status} ${res.statusText}`;
      }
      return;
    }
    
    const json = await res.json();
    console.log('贷款申请响应:', JSON.stringify(json, null, 2)); // 调试信息：完整JSON
    msgApply.textContent = json?.message || (json?.code === 200 ? '申请提交成功' : '申请提交失败');
  } catch (err) {
    console.error('贷款申请错误:', err); // 调试信息
    msgApply.textContent = `提交失败：${err.message || '网络错误'}`;
  }
});

// ---------------- 我的申请列表 ----------------
const btnLoadApplications = document.getElementById('btn-load-applications');
const applicationsList = document.getElementById('applications-list');
const msgApplications = document.getElementById('msg-applications');
btnLoadApplications.onclick = loadApplications;

async function loadApplications(){
  const userId = parseInt(document.getElementById('query-userId').value,10);
  const status = document.getElementById('query-status').value.trim();
  msgApplications.textContent = '加载中...';
  try {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId.toString());
    if (status) params.append('status', status);
    let url = `${API_BASE}/api/loan/applications`;
    const query = params.toString();
    if (query) {
      url += `?${query}`;
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = (json && Array.isArray(json.data)) ? json.data : [];
    renderApplications(list);
    msgApplications.textContent = list.length ? '' : '暂无申请记录';
  } catch (err) {
    renderApplications([]);
    msgApplications.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function renderApplications(list){
  applicationsList.innerHTML = list.map(a=>
    `<div class="expert">
       <div class="name">申请#${a.applicationId}</div>
       <div>产品：${a.productName||''}</div>
       <div>金额：${a.amount||''}</div>
       <div>期限(月)：${a.term||''}</div>
       <div>状态：${a.status||''}</div>
     </div>`
  ).join('');
}

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
const btnLoadPlan = document.getElementById('btn-load-plan');
const planList = document.getElementById('plan-list');
const msgPlan = document.getElementById('msg-plan');
btnLoadPlan.onclick = async function(){
  const applicationId = parseInt(document.getElementById('plan-applicationId').value,10);
  planList.innerHTML = '';
  if (!applicationId) {
    msgPlan.textContent = '请输入申请ID';
    return;
  }
  msgPlan.textContent = '加载中...';
  try {
    const res = await fetch(`${API_BASE}/api/loan/repayment-plan?applicationId=${encodeURIComponent(applicationId)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const data = json?.data;
    const list = Array.isArray(data) ? data : (data ? [data] : []);
    renderPlan(list);
    msgPlan.textContent = list.length ? '' : '暂无还款计划';
  } catch (err) {
    renderPlan([]);
    msgPlan.textContent = `加载失败：${err.message || '网络错误'}`;
  }
};

function renderPlan(list){
  if (!list.length) {
    planList.innerHTML = '';
    return;
  }
  planList.innerHTML = list.map(i=>{
    const amount = i.amount ?? i.remainingAmount ?? i.RemainingAmout ?? '—';
    return `<div class="expert">
      <div>期数：${i.installmentNo || i.period || '—'}</div>
      <div>到期日：${i.dueDate || i.due_time || '—'}</div>
      <div>剩余金额：${amount}</div>
      <div>状态：${i.status || '—'}</div>
    </div>`;
  }).join('');
}

const btnLoadRepayments = document.getElementById('btn-load-repayments');
const repaymentsList = document.getElementById('repayments-list');
const msgRepayments = document.getElementById('msg-repayments');
if (btnLoadRepayments) {
  btnLoadRepayments.onclick = async function(){
    const userId = parseInt(document.getElementById('history-userId').value, 10);
    repaymentsList.innerHTML = '';
    if (!userId) {
      msgRepayments.textContent = '请输入用户ID';
      return;
    }
    msgRepayments.textContent = '加载中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/repayments?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      repaymentsList.innerHTML = list.map(item=>
        `<div class="expert">
           <div>申请ID：${item.applicationId || '—'}</div>
           <div>金额：${item.amount || item.payAmount || '—'}</div>
           <div>日期：${item.payDate || item.date || '—'}</div>
         </div>`
      ).join('');
      msgRepayments.textContent = list.length ? '' : '暂无还款记录';
    } catch (err) {
      repaymentsList.innerHTML = '';
      msgRepayments.textContent = `加载失败：${err.message || '网络错误'}`;
    }
  };
}

const formRepay = document.getElementById('form-repay');
const msgRepay = document.getElementById('msg-repay');
formRepay.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const applicationId = parseInt(document.getElementById('repay-applicationId').value,10);
  const amount = parseFloat(document.getElementById('repay-amount').value);
  const payDate = document.getElementById('repay-date').value;
  
  const requestData = {
    applicationId: applicationId,
    amount: amount,
    payDate: payDate
  };
  
  console.log('还款请求数据:', requestData); // 调试信息
  
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  msgRepay.textContent = '提交中...';
  try {
    const res = await fetch(`${API_BASE}/api/loan/repay`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData)
    });
    const json = await res.json();
    msgRepay.textContent = json?.message || (json?.code === 200 ? '还款提交成功' : '还款提交失败');
  } catch (err) {
    msgRepay.textContent = `提交失败：${err.message || '网络错误'}`;
  }
});

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

