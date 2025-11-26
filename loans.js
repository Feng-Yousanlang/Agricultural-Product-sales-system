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

// ---------------- 贷款产品（银行端） ----------------
const loanProductsGrid = document.getElementById('loan-products-grid');
const msgLoanProducts = document.getElementById('msg-loan-products');
const btnLoanProductsRefresh = document.getElementById('loan-products-refresh');
const formLoanProductCreate = document.getElementById('form-loan-product-create');
const msgLoanProductCreate = document.getElementById('msg-loan-product-create');
const loanProductModal = document.getElementById('loan-product-modal');
const loanProductModalBody = document.getElementById('loan-product-modal-body');
const loanProductModalClose = document.getElementById('loan-product-modal-close');
const loanProductModalCancel = document.getElementById('loan-product-modal-cancel');
const btnDeleteLoanProduct = document.getElementById('btn-delete-loan-product');
const msgLoanProductModal = document.getElementById('msg-loan-product-modal');
let loanProductsCache = [];
let currentLoanProductIndex = -1;

async function loadLoanProducts() {
  if (!loanProductsGrid) return;
  if (msgLoanProducts) msgLoanProducts.textContent = '加载中...';
  try {
    const res = await fetch(`${API_BASE}/api/loan/products`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = normalizeLoanProducts(json);
    loanProductsCache = list;
    renderLoanProducts(list);
    if (msgLoanProducts) {
      msgLoanProducts.textContent = list.length ? '' : (json?.message || '暂无贷款产品');
    }
  } catch (err) {
    loanProductsCache = [];
    renderLoanProducts([]);
    if (msgLoanProducts) {
      msgLoanProducts.textContent = `加载失败：${err.message || '网络错误'}`;
    }
  }
}

function normalizeLoanProducts(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload)) return payload;
  return [];
}

function renderLoanProducts(list) {
  if (!loanProductsGrid) return;
  if (!Array.isArray(list) || !list.length) {
    loanProductsGrid.innerHTML = '<div class="msg">暂无贷款产品</div>';
    return;
  }
  loanProductsGrid.innerHTML = list.map((product, index) => {
    const id = resolveLoanProductId(product);
    const name = product.name || product.productName || product.fpName || `产品#${id || index + 1}`;
    const desc = product.description || product.fpDescription || '暂无描述';
    const category = product.category || product.type || '未分类';
    const amountRange = formatAmountRange(product);
    const rateText = formatRate(product);
    const termText = formatTerm(product);
    const tagsHtml = renderLoanProductTags(product.tags || product.tagList || product.labels);
    return `<div class="loan-product-card" data-product-index="${index}" data-product-id="${escapeHtml(String(id ?? ''))}">
      <div class="loan-product-category">${escapeHtml(category)}</div>
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

function resolveLoanProductId(product = {}) {
  return product.productId ?? product.id ?? product.fpId ?? product.loanProductId ?? null;
}

function formatAmountRange(product = {}) {
  const min = product.minAmount ?? product.min_amount ?? product.min ?? null;
  const max = product.maxAmount ?? product.max_amount ?? product.max ?? null;
  if (min === null && max === null) return '—';
  if (min !== null && max !== null) return `${formatCurrency(min)} ~ ${formatCurrency(max)}`;
  const value = formatCurrency(min ?? max ?? 0);
  return value || '—';
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

function formatRate(product = {}) {
  const rate = product.interestRate ?? product.annualRate ?? product.rate ?? null;
  if (rate === null || rate === undefined) return '—';
  return `${rate}%`;
}

function formatTerm(product = {}) {
  const term = product.term ?? product.loanTerm ?? product.maxTerm ?? null;
  if (term === null || term === undefined) return '—';
  return term;
}

function renderLoanProductTags(tags) {
  if (!tags) return '';
  const arr = Array.isArray(tags)
    ? tags
    : String(tags).split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  if (!arr.length) return '';
  return arr.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
}

function openLoanProductModal(product, index) {
  if (!loanProductModal || !loanProductModalBody || !product) return;
  currentLoanProductIndex = index;
  const name = product.name || product.productName || '未命名产品';
  const manager = product.fpManagerName || product.managerName || product.contactName || '—';
  const managerPhone = product.fpManagerPhone || product.managerPhone || product.contactPhone || '—';
  const managerEmail = product.fpManagerEmail || product.managerEmail || product.contactEmail || '—';
  const bodyHtml = `
    <div class="line"><span>产品名称</span><div>${escapeHtml(name)}</div></div>
    <div class="line"><span>类别</span><div>${escapeHtml(product.category || product.type || '—')}</div></div>
    <div class="line"><span>额度范围</span><div>${formatAmountRange(product)}</div></div>
    <div class="line"><span>年化利率</span><div>${formatRate(product)}</div></div>
    <div class="line"><span>期限(月)</span><div>${formatTerm(product)}</div></div>
    <div class="line"><span>产品ID</span><div>${escapeHtml(String(resolveLoanProductId(product) ?? '—'))}</div></div>
    <div class="line"><span>负责人</span><div>${escapeHtml(manager)}</div></div>
    <div class="line"><span>联系电话</span><div>${escapeHtml(managerPhone)}</div></div>
    <div class="line"><span>邮箱</span><div>${escapeHtml(managerEmail)}</div></div>
    <div class="line"><span>产品亮点</span><div>${escapeHtml(product.description || product.fpDescription || '—')}</div></div>
  `;
  loanProductModalBody.innerHTML = bodyHtml;
  if (msgLoanProductModal) msgLoanProductModal.textContent = '';
  loanProductModal.classList.remove('hidden');
}

function closeLoanProductModal() {
  if (!loanProductModal) return;
  loanProductModal.classList.add('hidden');
  currentLoanProductIndex = -1;
  if (loanProductModalBody) loanProductModalBody.innerHTML = '';
  if (msgLoanProductModal) msgLoanProductModal.textContent = '';
}

function getCurrentLoanProduct() {
  if (currentLoanProductIndex < 0) return null;
  return loanProductsCache[currentLoanProductIndex] || null;
}

if (loanProductsGrid) {
  loanProductsGrid.addEventListener('click', (event) => {
    const card = event.target.closest('.loan-product-card');
    if (!card) return;
    const index = Number(card.getAttribute('data-product-index'));
    if (!Number.isFinite(index)) return;
    const product = loanProductsCache[index];
    openLoanProductModal(product, index);
  });
}

if (btnLoanProductsRefresh) {
  btnLoanProductsRefresh.onclick = () => {
    loadLoanProducts();
  };
}

if (loanProductModalClose) {
  loanProductModalClose.addEventListener('click', closeLoanProductModal);
}
if (loanProductModalCancel) {
  loanProductModalCancel.addEventListener('click', closeLoanProductModal);
}
if (loanProductModal) {
  loanProductModal.addEventListener('click', (event) => {
    if (event.target === loanProductModal) {
      closeLoanProductModal();
    }
  });
}

if (btnDeleteLoanProduct) {
  btnDeleteLoanProduct.addEventListener('click', async () => {
    const product = getCurrentLoanProduct();
    if (!product) {
      if (msgLoanProductModal) msgLoanProductModal.textContent = '未找到当前产品';
      return;
    }
    const productId = resolveLoanProductId(product);
    if (!productId) {
      if (msgLoanProductModal) msgLoanProductModal.textContent = '产品ID缺失，无法删除';
      return;
    }
    if (!confirm(`确定删除产品「${product.name || product.productName || productId}」吗？该操作不可恢复`)) {
      return;
    }
    const token = getAuthToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    if (msgLoanProductModal) msgLoanProductModal.textContent = '删除中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/products/${productId}`, {
        method: 'DELETE',
        headers
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      if (msgLoanProductModal) msgLoanProductModal.textContent = json?.message || '删除成功';
      closeLoanProductModal();
      loadLoanProducts();
    } catch (err) {
      if (msgLoanProductModal) msgLoanProductModal.textContent = `删除失败：${err.message || '网络错误'}`;
    }
  });
}

if (formLoanProductCreate) {
  formLoanProductCreate.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('loan-product-name').value.trim();
    const category = document.getElementById('loan-product-category').value.trim();
    const minAmountRaw = document.getElementById('loan-product-min').value;
    const maxAmountRaw = document.getElementById('loan-product-max').value;
    const rateRaw = document.getElementById('loan-product-rate').value;
    const termRaw = document.getElementById('loan-product-term').value;
    const tagsRaw = document.getElementById('loan-product-tags').value.trim();
    const description = document.getElementById('loan-product-desc').value.trim();
    if (!name || !category) {
      if (msgLoanProductCreate) msgLoanProductCreate.textContent = '产品名称与类别为必填项';
      return;
    }
    const payload = {
      name,
      productName: name,
      category,
      type: category,
      description,
      minAmount: minAmountRaw ? Number(minAmountRaw) : undefined,
      maxAmount: maxAmountRaw ? Number(maxAmountRaw) : undefined,
      interestRate: rateRaw ? Number(rateRaw) : undefined,
      term: termRaw ? Number(termRaw) : undefined,
      tags: tagsRaw ? tagsRaw.split(/[,，]/).map((item) => item.trim()).filter(Boolean) : undefined
    };
    const token = getAuthToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (msgLoanProductCreate) msgLoanProductCreate.textContent = '提交中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      if (msgLoanProductCreate) msgLoanProductCreate.textContent = json?.message || '创建成功';
      formLoanProductCreate.reset();
      loadLoanProducts();
    } catch (err) {
      if (msgLoanProductCreate) msgLoanProductCreate.textContent = `创建失败：${err.message || '网络错误'}`;
    }
  });
}

if (loanProductsGrid) {
  loadLoanProducts();
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
    planList.innerHTML = '';
    const userId = getCurrentUserId && getCurrentUserId();
    if (!userId) {
      msgPlan.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }
    msgPlan.textContent = '加载中...';
    try {
      const res = await fetch(`${API_BASE}/api/loan/repayment-plan?userId=${encodeURIComponent(userId)}`);
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
    const amount = i.amount ?? i.remainingAmount ?? i.RemainingAmount ?? i.RemainingAmout ?? '—';
    const applicationId = i.applicationId ?? i.loanApplicationId ?? i.id ?? null;
    const safeAppId = applicationId !== null && applicationId !== undefined
      ? escapeHtml(String(applicationId))
      : '';
    const canRepay = Boolean(safeAppId);
    return `<div class="expert">
      ${safeAppId ? `<div>申请ID：${safeAppId}</div>` : ''}
      <div>期数：${i.installmentNo || i.period || '—'}</div>
      <div>到期日：${i.dueDate || i.due_time || '—'}</div>
      <div>剩余金额：${amount}</div>
      <div>状态：${i.status || '—'}</div>
      ${canRepay ? `<div class="appointment-card-actions"><button class="btn btn-secondary btn-repay-from-plan" data-application-id="${safeAppId}" data-amount="${escapeHtml(String(amount))}">去还款</button></div>` : ''}
    </div>`;
  }).join('');
}

const btnLoadRepayments = document.getElementById('btn-load-repayments');
const repaymentsList = document.getElementById('repayments-list');
const msgRepayments = document.getElementById('msg-repayments');
if (btnLoadRepayments) {
  btnLoadRepayments.onclick = async function(){
    repaymentsList.innerHTML = '';
    const userId = getCurrentUserId && getCurrentUserId();
    if (!userId) {
      msgRepayments.textContent = '未获取到用户ID，请重新登录后再试';
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
const repayApplicationDisplay = document.getElementById('repay-application-display');
if (planList && formRepay) {
  planList.addEventListener('click', (event) => {
    const btn = event.target.closest('.btn-repay-from-plan');
    if (!btn) return;
    const appId = btn.getAttribute('data-application-id');
    const amount = btn.getAttribute('data-amount');
    const appInput = document.getElementById('repay-applicationId');
    if (appId && appInput) {
      appInput.value = appId;
      if (repayApplicationDisplay) {
        repayApplicationDisplay.textContent = `当前选择的申请ID：${appId}`;
      }
      const amountInput = document.getElementById('repay-amount');
      if (amountInput && amount && amount !== '—') {
        amountInput.value = amount;
      }
      const dateInput = document.getElementById('repay-date');
      if (dateInput && !dateInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
      }
    }
  });
}

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

