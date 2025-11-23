// 后端API基础地址
const API_BASE = 'http://10.61.194.227:8080';

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

(function checkAuth() {
  try {
    if (!localStorage.getItem('auth_token')) {
      window.location.href = 'login.html';
      return;
    }
  } catch (e) {
    window.location.href = 'login.html';
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

const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
  logoutBtn.onclick = function() {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_identity');
      localStorage.removeItem('user_id');
    } catch {}
    window.location.href = 'login.html';
  };
}

// ---------------- 贷款产品 ----------------
const loanProductsGrid = document.getElementById('loan-products-grid');
const msgLoanProducts = document.getElementById('msg-loan-products');
const btnLoanProductsRefresh = document.getElementById('loan-products-refresh');

async function loadLoanProducts(){
  if (!loanProductsGrid) return;
  if (msgLoanProducts) msgLoanProducts.textContent = '加载中...';
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
    if (msgLoanProducts) msgLoanProducts.textContent = list.length ? '' : (json?.message || '暂无贷款产品');
  } catch (err) {
    renderLoanProducts([]);
    if (msgLoanProducts) msgLoanProducts.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function renderLoanProducts(list){
  if (!loanProductsGrid) return;
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

if (btnLoanProductsRefresh) {
  btnLoanProductsRefresh.onclick = loadLoanProducts;
}
if (loanProductsGrid) {
  loadLoanProducts();
}

// ---------------- 贷款申请 ----------------
const formApply = document.getElementById('form-loan-apply');
const msgApply = document.getElementById('msg-loan-apply');
if (formApply) {
  formApply.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      msgApply.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }
    const productName = document.getElementById('apply-productName').value.trim();
    const amount = parseFloat(document.getElementById('apply-amount').value);
    const term = parseInt(document.getElementById('apply-term').value,10);
    const documentFile = document.getElementById('apply-document').files[0];
    if (!productName || !amount || !term) {
      msgApply.textContent = '请填写所有必填字段';
      return;
    }
  
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('userId', currentUserId.toString());
    formData.append('productName', productName);
    formData.append('amount', amount.toString());
    formData.append('term', term.toString());
    if (documentFile) {
      formData.append('documents[]', documentFile);
    }
  
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  
    msgApply.textContent = '提交中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/apply`, {
        method: 'POST',
        headers: headers,
        body: formData
      });
      if (!res.ok) {
        const errorText = await res.text();
        try {
          const errorJson = JSON.parse(errorText);
          msgApply.textContent = errorJson.message || `请求失败：${res.status} ${res.statusText}`;
        } catch {
          msgApply.textContent = `请求失败：${res.status} ${res.statusText}`;
        }
        return;
      }
  
      const json = await res.json();
      msgApply.textContent = json?.message || (json?.code === 200 ? '申请提交成功' : '申请提交失败');
      if (json?.code === 200) {
        formApply.reset();
        loadApplications();
      }
    } catch (err) {
      msgApply.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

// ---------------- 我的申请列表 ----------------
const btnLoadApplications = document.getElementById('btn-load-applications');
const applicationsList = document.getElementById('applications-list');
const msgApplications = document.getElementById('msg-applications');

async function loadApplications(){
  if (!applicationsList) return;
  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    msgApplications.textContent = '未获取到用户ID，请重新登录后再试';
    applicationsList.innerHTML = '';
    return;
  }
  msgApplications.textContent = '加载中...';
  try {
    const url = `${API_BASE}/api/loan/applications?userId=${encodeURIComponent(currentUserId)}`;
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

if (btnLoadApplications) {
  btnLoadApplications.onclick = loadApplications;
}
if (applicationsList) {
  loadApplications();
}

// ---------------- 还款管理 ----------------
const btnLoadPlan = document.getElementById('btn-load-plan');
const planList = document.getElementById('plan-list');
const msgPlan = document.getElementById('msg-plan');
if (btnLoadPlan) {
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
}

function renderPlan(list){
  if (!planList) return;
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
if (formRepay) {
  formRepay.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const applicationId = parseInt(document.getElementById('repay-applicationId').value,10);
    const amount = parseFloat(document.getElementById('repay-amount').value);
    const payDate = document.getElementById('repay-date').value;
    if (!applicationId || !amount || !payDate) {
      msgRepay.textContent = '请填写完整的还款信息';
      return;
    }
  
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
        body: JSON.stringify({ applicationId, amount, payDate })
      });
      const json = await res.json();
      msgRepay.textContent = json?.message || (json?.code === 200 ? '还款提交成功' : '还款提交失败');
    } catch (err) {
      msgRepay.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

