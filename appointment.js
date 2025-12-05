// 后端API基础地址
// 注意：如果 index.js 已加载，API_BASE 应该已经存在（由 index.js 声明并挂载到 window.API_BASE）
// 这里不声明 const API_BASE，避免与 index.js 重复声明
// 直接使用 window.API_BASE 或全局 API_BASE（如果存在）
// 为了在代码中使用，创建一个局部引用
var API_BASE_REF = (function() {
  // 优先使用 window.API_BASE（由 index.js 设置）
  if (typeof window !== 'undefined' && window.API_BASE) {
    return window.API_BASE;
  }
  // 如果 window.API_BASE 不存在，尝试使用全局 API_BASE（需要小心，可能未声明）
  try {
    if (typeof API_BASE !== 'undefined') {
      return API_BASE;
    }
  } catch (e) {
    // 如果 API_BASE 未声明，会抛出 ReferenceError，这里捕获
  }
  // 如果都不存在，使用默认值
  return 'http://10.61.12.174:8080';
})();

function getAuthToken() {
  try {
    return localStorage.getItem('auth_token') || '';
  } catch {
    return '';
  }
}

// 如果这些函数已在 index.js 中定义，则不再重复定义
if (typeof getCurrentUserId === 'undefined') {
function getCurrentUserId() {
  try {
    const candidateKeys = ['user_id', 'userId', 'userID'];
    for (const key of candidateKeys) {
      const raw = localStorage.getItem(key);
      if (raw !== null && raw !== undefined && raw !== '') {
    const id = parseInt(raw, 10);
        if (Number.isFinite(id)) {
          return id;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
  }
}

if (typeof escapeAttr === 'undefined') {
function escapeAttr(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
    const userId = localStorage.getItem('user_id') || localStorage.getItem('userId') || localStorage.getItem('userID');
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

// ---------------- 农户端预约功能（identity=1或2） ----------------
// 提交预约申请功能已移至专家详情弹窗的预约按钮

// 查看我的预约记录
const btnLoadUserAppointments = document.getElementById('btn-load-user-appointments');
const userAppointmentsList = document.getElementById('user-appointments-list');
const msgUserAppointments = document.getElementById('msg-user-appointments');

async function loadUserAppointments(showLoading = true){
  if (!userAppointmentsList) return;
  const userId = getCurrentUserId();
  userAppointmentsList.innerHTML = '';
  if (!userId) {
    msgUserAppointments.textContent = '未获取到用户ID，请重新登录后再试';
    return;
  }
  if (showLoading) {
    msgUserAppointments.textContent = '加载中...';
  }
  try {
    // 根据文档，查看我的预约记录接口为 /api/expert-appointment/user/list
    const url = `${API_BASE_REF}/api/expert-appointment/user/list?userId=${encodeURIComponent(userId)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text().catch(()=>res.statusText);
      throw new Error(errText || `HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    renderUserAppointments(list);
    msgUserAppointments.textContent = list.length ? '' : '暂无预约记录';
  } catch (err) {
    userAppointmentsList.innerHTML = '';
    msgUserAppointments.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function renderUserAppointments(list){
  if (!userAppointmentsList) return;
  if (!Array.isArray(list) || !list.length) {
    userAppointmentsList.innerHTML = '<div class="empty">暂无预约记录</div>';
    return;
  }
  userAppointmentsList.innerHTML = list.map(item=>{
    const appointmentId = item.id ?? item.appointment_id ?? item.appointmentId ?? item.appointmentID ?? '';
    const rawStatus = item.status || '';
    const status = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : rawStatus;
    const expertName = item.expert?.name || item.expertName || item.expert_name || '';
    const expertId = item.expert?.id || item.expertId || '';
    const expertImg = item.expert?.expertImg || item.expert?.avatar || item.expertImg || '';
    const expertField = item.expert?.field || item.field || '';
    const dateStr = item.date || item.appointmentDate || '';
    const startTime = item.startTime || item.start_time || '';
    const endTime = item.endTime || item.end_time || '';
    const legacyTime = item.time || item.time_slot || '';
    const timeDisplay = startTime && endTime ? `${startTime}-${endTime}` : (startTime || endTime || legacyTime);
    const topic = item.topic || '';
    const canCancel = Boolean(appointmentId) && ['pending', 'approved'].includes(status);
    const statusText = status === 'pending' ? '待审批'
      : status === 'approved' ? '已批准'
      : status === 'completed' ? '已完成'
      : status === 'rejected' ? '已拒绝'
      : status === 'cancelled' ? '已取消'
      : rawStatus || '—';
    return `<div class="expert appointment-card">
      <div class="name">预约 #${appointmentId || '—'}</div>
      ${expertImg ? `<div class="avatar"><img src="${escapeAttr(expertImg)}" alt="${escapeAttr(expertName)}" style="width:40px;height:40px;border-radius:50%;"></div>` : ''}
      <div>专家：${expertName || '—'}${expertId ? ` (ID: ${expertId})` : ''}</div>
      ${expertField ? `<div>专家领域：${escapeAttr(expertField)}</div>` : ''}
      <div>日期：${dateStr || '—'} ${timeDisplay || ''}</div>
      <div>主题：${topic || '—'}</div>
      <div>状态：${statusText}</div>
      ${canCancel ? `<div class="appointment-card-actions">
      <button class="btn btn-danger btn-cancel-appointment"
        data-app-id="${appointmentId}"
        data-expert-name="${escapeAttr(expertName)}"
        data-date="${escapeAttr(dateStr)}"
          data-time="${escapeAttr(timeDisplay)}">取消预约</button>
      </div>` : ''}
    </div>`;
  }).join('');
}

if (btnLoadUserAppointments) {
  btnLoadUserAppointments.onclick = ()=>loadUserAppointments();
}

if (userAppointmentsList) {
  loadUserAppointments();
  userAppointmentsList.addEventListener('click', async (e)=>{
    const btn = e.target.closest('.btn-cancel-appointment');
    if (!btn) return;
    const appointmentId = btn.getAttribute('data-app-id');
    const expertName = btn.getAttribute('data-expert-name');
    const dateStr = btn.getAttribute('data-date');
    const timeStr = btn.getAttribute('data-time');
    if (!appointmentId) {
      alert('无法获取预约ID，取消失败');
      return;
    }
    const confirmed = window.confirm(`确定取消预约#${appointmentId}${expertName ? `（专家：${expertName}）` : ''}${dateStr && timeStr ? `（${dateStr} ${timeStr}）` : ''}吗？`);
    if (!confirmed) return;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '取消中...';
    msgUserAppointments.textContent = '取消预约中...';
    try {
      // 根据文档，取消预约接口为 /api/expert-appointment/cancel
      const payload = {
        appointmentId: appointmentId
      };
      const res = await fetch(`${API_BASE_REF}/api/expert-appointment/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgUserAppointments.textContent = json?.message || '预约已取消';
      await loadUserAppointments(false);
    } catch (err) {
      msgUserAppointments.textContent = `取消失败：${err.message || '网络错误'}`;
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

// ---------------- 专家端预约功能（identity=3，仅在index.html中使用） ----------------
// 专家审批预约（专家端，identity=3）
// 不再需要自动填充专家ID，直接使用 getCurrentUserId()

// 待审批预约列表
const pendingAppointmentsList = document.getElementById('pending-appointments-list');
const msgPendingAppointments = document.getElementById('msg-pending-appointments');
const btnLoadPendingAppointments = document.getElementById('btn-load-pending-appointments');

async function loadPendingAppointments(showLoading = true) {
  if (!pendingAppointmentsList) return;
  const expertId = getCurrentUserId();
  if (!expertId) {
    msgPendingAppointments.textContent = '未获取到专家ID，请重新登录后再试';
    pendingAppointmentsList.innerHTML = '';
    return;
  }
  if (showLoading) {
    msgPendingAppointments.textContent = '加载中...';
    pendingAppointmentsList.innerHTML = '';
  }
  try {
    // 根据文档，获取待审核预约列表接口为 /api/expert-appointment/pending
    // 参数：userId, page, size
    const requestUrl = `${API_BASE_REF}/api/expert-appointment/pending?userId=${encodeURIComponent(expertId)}&page=1&size=100`;
    const res = await fetch(requestUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    renderPendingAppointments(list);
    msgPendingAppointments.textContent = list.length ? '' : '暂无待审批预约';
  } catch (err) {
    pendingAppointmentsList.innerHTML = '';
    msgPendingAppointments.textContent = `加载失败：${err.message || '网络错误'}`;
  }
}

function renderPendingAppointments(list) {
  if (!pendingAppointmentsList) return;
  if (!Array.isArray(list) || !list.length) {
    pendingAppointmentsList.innerHTML = '<div class="empty">暂无待审批预约</div>';
    return;
  }
  pendingAppointmentsList.innerHTML = list.map(item=>{
    const appointmentId = item.id ?? item.appointment_id ?? item.appointmentId ?? '';
    const userName = item.user?.name || item.userName || item.user_name || '—';
    const userId = item.user?.id || item.userId || '';
    const avatar = item.user?.avatar || '';
    const dateStr = item.date || item.appointmentDate || '—';
    const timeStr = item.time || item.time_slot || '—';
    const topic = item.topic || '—';
    const remark = item.remark || '';
    const status = item.status || 'pending';
    return `<div class="expert">
      <div class="name">预约#${appointmentId}</div>
      ${avatar ? `<div class="avatar"><img src="${escapeAttr(avatar)}" alt="${escapeAttr(userName)}" style="width:40px;height:40px;border-radius:50%;"></div>` : ''}
      <div>申请人：${userName}${userId ? ` (ID: ${userId})` : ''}</div>
      <div>日期：${dateStr} ${timeStr}</div>
      <div>主题：${topic}</div>
      ${remark ? `<div>备注：${escapeAttr(remark)}</div>` : ''}
      <div>状态：${status === 'pending' ? '待审批' : status}</div>
      <div class="action-row">
        <button class="btn btn-secondary btn-approve-appointment" data-appointment-id="${escapeAttr(appointmentId)}" data-action="同意">同意</button>
        <button class="btn btn-danger btn-reject-appointment" data-appointment-id="${escapeAttr(appointmentId)}" data-action="拒绝">拒绝</button>
      </div>
    </div>`;
  }).join('');
}

if (btnLoadPendingAppointments) {
  btnLoadPendingAppointments.addEventListener('click', ()=>loadPendingAppointments());
}

async function submitAppointmentReview(appointmentId, action, comment = '', triggerBtn = null) {
  const expertId = getCurrentUserId();
  if (!expertId) {
    msgPendingAppointments.textContent = '未获取到专家ID，请重新登录后再试';
    return;
  }
  if (!appointmentId || !action) {
    msgPendingAppointments.textContent = '缺少必要的预约信息';
    return;
  }
  const numericId = Number(appointmentId);
  const normalizedAppointmentId = Number.isFinite(numericId) ? numericId : appointmentId;
  const normalizedAction = (action === '同意' || action === 'approved' || action === 1 || action === '1') ? 1 : 0;
  const payload = {
    appointmentId: normalizedAppointmentId,
    userId: expertId,  // 文档要求是userId
    action: normalizedAction
  };
  if (comment) {
    payload.comment = comment;
  }
  msgPendingAppointments.textContent = '提交审批中...';
  let originalText = '';
  if (triggerBtn) {
    triggerBtn.disabled = true;
    originalText = triggerBtn.textContent;
    triggerBtn.textContent = '提交中...';
  }
  try {
    const res = await fetch(`${API_BASE_REF}/api/expert-appointment/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(()=>({}));
    if (!res.ok) {
      throw new Error(json?.message || res.statusText);
    }
    msgPendingAppointments.textContent = json?.message || '预约已审批';
    loadPendingAppointments(false);
    loadSchedule(false);
  } catch (err) {
    msgPendingAppointments.textContent = `审批失败：${err.message || '网络错误'}`;
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = originalText || triggerBtn.textContent;
    }
  }
}

if (pendingAppointmentsList) {
  pendingAppointmentsList.addEventListener('click', (e)=>{
    const approveBtn = e.target.closest('.btn-approve-appointment');
    if (approveBtn) {
      const appointmentId = approveBtn.getAttribute('data-appointment-id');
      submitAppointmentReview(appointmentId, 'approved', '', approveBtn);
      return;
    }
    const rejectBtn = e.target.closest('.btn-reject-appointment');
    if (rejectBtn) {
      const appointmentId = rejectBtn.getAttribute('data-appointment-id');
      const comment = prompt('请输入拒绝理由（可选）：') || '';
      submitAppointmentReview(appointmentId, 'rejected', comment.trim(), rejectBtn);
    }
  });
}

// 审批预约表单
const formReviewAppointment = document.getElementById('form-review-appointment');
const msgReviewAppointment = document.getElementById('msg-review-appointment');
if (formReviewAppointment) {
  formReviewAppointment.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const expertId = getCurrentUserId();
    if (!expertId) {
      msgReviewAppointment.textContent = '未获取到专家ID，请重新登录后再试';
      return;
    }
    const appointmentId = parseInt(document.getElementById('review-appointment-id').value, 10);
    const action = document.getElementById('review-action').value.trim();
    const comment = document.getElementById('review-comment').value.trim();
    
    if (!appointmentId || !action) {
      msgReviewAppointment.textContent = '请完善审批信息';
      return;
    }
    
    // 将中文操作转换为英文
    let actionValue = action;
    if (action === '同意') {
      actionValue = 1;
    } else if (action === '拒绝') {
      actionValue = 0;
    } else if (action === 'approved' || action === '1') {
      actionValue = 1;
    } else if (action === 'rejected' || action === '0') {
      actionValue = 0;
    } else {
      msgReviewAppointment.textContent = '审批操作必须选择"同意"或"拒绝"';
      return;
    }
    
    const payload = {
      appointmentId: appointmentId,
      userId: expertId,  // 文档要求是userId
      action: actionValue
    };
    
    if (comment) {
      payload.comment = comment;
    }
    
    msgReviewAppointment.textContent = '提交审批中...';
    try {
      // 根据文档，审批预约接口为 /api/expert-appointment/review
      const res = await fetch(`${API_BASE_REF}/api/expert-appointment/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgReviewAppointment.textContent = json?.message || '预约已审批';
      formReviewAppointment.reset();
      // 刷新待审批列表
      loadPendingAppointments(false);
    } catch (err) {
      msgReviewAppointment.textContent = `审批失败：${err.message || '网络错误'}`;
    }
  });
}

// ---------------- 专家预约日程（专家端，identity=3） ----------------
const scheduleList = document.getElementById('schedule-list');
const msgSchedule = document.getElementById('msg-schedule');
const btnLoadSchedule = document.getElementById('btn-load-schedule');
const SCHEDULE_REFRESH_DELAY_MS = 2500;
const SCHEDULE_MSG_HOLD_MS = 6000;
let scheduleDataList = []; // 保存预约数据，供表单提交时使用
let scheduleMsgTimer = null;

function setScheduleMessage(text, autoClear = true) {
  if (!msgSchedule) return;
  msgSchedule.textContent = text;
  if (scheduleMsgTimer) {
    clearTimeout(scheduleMsgTimer);
    scheduleMsgTimer = null;
  }
  if (autoClear && text) {
    scheduleMsgTimer = setTimeout(()=>{
      if (msgSchedule.textContent === text) {
        msgSchedule.textContent = '';
      }
    }, SCHEDULE_MSG_HOLD_MS);
  }
}

function buildMeetTime(dateStr = '', timeRange = '') {
  const start = typeof timeRange === 'string' ? timeRange.split('-')[0]?.trim() : '';
  if (!dateStr || !start) return '';
  return `${dateStr} ${start}`;
}

function extractScheduleList(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  const data = json?.data;
  const containers = [json, data];
  const candidateKeys = ['list', 'records', 'rows', 'appointments', 'items', 'data'];
  for (const container of containers) {
    if (Array.isArray(container)) {
      return container;
    }
    if (container && typeof container === 'object') {
      for (const key of candidateKeys) {
        const value = container[key];
        if (Array.isArray(value)) {
          return value;
        }
      }
    }
  }
  return [];
}

async function loadSchedule(showLoading = true) {
  if (!scheduleList) return;
  const userId = getCurrentUserId();  // 从 localStorage 获取 user_id
  if (!userId) {
    setScheduleMessage('未获取到用户ID，请重新登录后再试');
    scheduleList.innerHTML = '';
    return;
  }
  if (showLoading) {
    setScheduleMessage('加载中...', false);
    scheduleList.innerHTML = '';
  }
  try {
    // 根据文档，查看预约日程接口为 /api/expert-appointment/schedule
    // 参数：expertId, date(可选) —— 兼容部分环境仍接受 userId
    const params = new URLSearchParams();
    params.set('expertId', userId);
    params.set('userId', userId);
    const dateInput = document.getElementById('schedule-date-filter');
    if (dateInput && dateInput.value) {
      params.set('date', dateInput.value);
    }
    const res = await fetch(`${API_BASE_REF}/api/expert-appointment/schedule?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json().catch(()=>({}));
    const list = extractScheduleList(json);
    scheduleDataList = list; // 保存预约数据
    renderSchedule(list);
    if (list.length) {
      setScheduleMessage('', false);
    } else {
      setScheduleMessage('暂无预约日程');
    }
  } catch (err) {
    scheduleList.innerHTML = '';
    setScheduleMessage(`加载失败：${err.message || '网络错误'}`);
  }
}

function renderSchedule(list) {
  if (!scheduleList) return;
  if (!Array.isArray(list) || !list.length) {
    scheduleList.innerHTML = '<div class="empty">暂无预约日程</div>';
    return;
  }
  scheduleList.innerHTML = list.map(item=>{
    const appointmentId = item.id ?? item.appointment_id ?? item.appointmentId ?? '';
    const userName = item.user_name || item.userName || item.user?.name || '—';
    const dateStr = item.date || item.appointmentDate || '—';
    const startTime = item.startTime || item.start_time || '';
    const endTime = item.endTime || item.end_time || '';
    const legacyTime = item.time || item.time_slot || '';
    const timeStr = startTime && endTime ? `${startTime}-${endTime}` : legacyTime || startTime || endTime || '—';
    const topic = item.topic || '—';
    const status = item.status || '';
    const statusText = status === 'approved' ? '已批准' : status === 'pending' ? '待审批' : status === 'completed' ? '已完成' : status === 'no_show' ? '未到场' : status === 'rejected' ? '已拒绝' : status;
    // 只有已批准状态的预约可以更新状态
    const canUpdate = status === 'approved';
    return `<div class="expert">
      <div class="name">预约#${appointmentId}</div>
      <div>农户：${userName}</div>
      <div>日期：${dateStr} ${timeStr}</div>
      <div>主题：${topic}</div>
      <div>状态：${statusText}</div>
      ${canUpdate && appointmentId ? `<div class="action-row">
        <button class="btn btn-secondary btn-update-status" data-appointment-id="${escapeAttr(appointmentId)}" data-status="completed" data-date="${escapeAttr(dateStr)}" data-time="${escapeAttr(timeStr)}">标记已完成</button>
        <button class="btn btn-danger btn-update-status" data-appointment-id="${escapeAttr(appointmentId)}" data-status="no_show" data-date="${escapeAttr(dateStr)}" data-time="${escapeAttr(timeStr)}">标记未到场</button>
      </div>` : ''}
    </div>`;
  }).join('');
}

if (btnLoadSchedule) {
  btnLoadSchedule.addEventListener('click', ()=>loadSchedule());
}

if (scheduleList) {
  scheduleList.addEventListener('click', (e)=>{
    const btn = e.target.closest('.btn-fill-update-form');
    if (btn) {
      const appointmentId = btn.getAttribute('data-appointment-id');
      const updateAppointmentIdInput = document.getElementById('update-appointment-id');
      if (updateAppointmentIdInput && appointmentId) {
        updateAppointmentIdInput.value = appointmentId;
        // 滚动到更新状态表单
        const updateSection = document.getElementById('expert-update-status');
        if (updateSection) {
          updateSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  });
}

async function submitAppointmentStatus(appointmentId, status, dateStr, timeStr) {
  const userId = getCurrentUserId();
  if (!userId) {
    setScheduleMessage('未获取到用户ID，请重新登录后再试');
    return;
  }
  if (!appointmentId || !status) {
    setScheduleMessage('缺少必要的预约信息');
    return;
  }
  // 根据文档，使用meetTime（只传开始时间）
  const meetTime = buildMeetTime(dateStr, timeStr);
  if (!meetTime) {
    setScheduleMessage('缺少预约时间信息');
    return;
  }
  const payload = {
    appointmentId: parseInt(appointmentId, 10),
    status,
    meetTime: meetTime
  };
  setScheduleMessage('提交更新中...', false);
  try {
    const res = await fetch(`${API_BASE_REF}/api/expert-appointment/update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(()=>({}));
    if (!res.ok) {
      throw new Error(json?.message || res.statusText);
    }
    const successMsg = json?.message || '状态已更新';
    setScheduleMessage(successMsg);
    setTimeout(()=>loadSchedule(false), SCHEDULE_REFRESH_DELAY_MS);
  } catch (err) {
    const errorMsg = `更新失败：${err.message || '网络错误'}`;
    setScheduleMessage(errorMsg);
  }
}

if (scheduleList) {
  scheduleList.addEventListener('click', (e)=>{
    const actionBtn = e.target.closest('.btn-update-status');
    if (!actionBtn) return;
    const appointmentId = actionBtn.getAttribute('data-appointment-id');
    const status = actionBtn.getAttribute('data-status');
    const dateStr = actionBtn.getAttribute('data-date');
    const timeStr = actionBtn.getAttribute('data-time');
    if (status === 'completed') {
      if (!confirm('确认将该预约标记为"已完成"？')) return;
    } else if (status === 'no_show') {
      if (!confirm('确认记录"农户未到场"？')) return;
    }
    submitAppointmentStatus(appointmentId, status, dateStr, timeStr);
  });
}

// ---------------- 更新预约状态（专家端，identity=3） ----------------
// 不再需要自动填充专家ID，直接使用 getCurrentUserId()

const formUpdateStatus = document.getElementById('form-update-status');
const msgUpdateStatus = document.getElementById('msg-update-status');
if (formUpdateStatus) {
  formUpdateStatus.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const userId = getCurrentUserId();  // 从 localStorage 获取 user_id
    if (!userId) {
      msgUpdateStatus.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }
    const appointmentId = parseInt(document.getElementById('update-appointment-id').value, 10);
    const status = document.getElementById('update-status').value.trim();
    
    if (!appointmentId || !status) {
      msgUpdateStatus.textContent = '请完善更新信息';
      return;
    }
    
    if (status !== 'completed' && status !== 'no_show') {
      msgUpdateStatus.textContent = '状态只能选择"已完成"或"农户未到场"';
      return;
    }
    
    // 从已加载的预约数据中查找对应的预约时间
    const appointment = scheduleDataList.find(item => {
      const id = item.id ?? item.appointment_id ?? item.appointmentId;
      return id && parseInt(id, 10) === appointmentId;
    });
    const dateStr = appointment ? (appointment.date || appointment.appointmentDate || '') : '';
    const startTime = appointment ? (appointment.startTime || appointment.start_time || '') : '';
    const endTime = appointment ? (appointment.endTime || appointment.end_time || '') : '';
    const legacyTime = appointment ? (appointment.time || appointment.time_slot || '') : '';
    const timeStr = startTime && endTime ? `${startTime}-${endTime}` : legacyTime || startTime || endTime || '';
    
    // 根据文档，使用meetTime（只传开始时间）
    const meetTime = buildMeetTime(dateStr, timeStr);
    if (!meetTime) {
      msgUpdateStatus.textContent = '未找到该预约的时间信息，请先刷新预约列表';
      return;
    }
    
    const payload = {
      appointmentId: appointmentId,
      status: status,
      meetTime: meetTime
    };
    
    msgUpdateStatus.textContent = '提交更新中...';
    try {
      // 根据文档，更新预约状态接口为 /api/expert-appointment/update-status
      const res = await fetch(`${API_BASE_REF}/api/expert-appointment/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgUpdateStatus.textContent = json?.message || '状态已更新';
      formUpdateStatus.reset();
      // 刷新预约日程
      loadSchedule(false);
    } catch (err) {
      msgUpdateStatus.textContent = `更新失败：${err.message || '网络错误'}`;
    }
  });
}

// ---------------- 专家列表 ----------------
const expertsList = document.getElementById('experts-list');
const msgExperts = document.getElementById('msg-experts');
const expertSearchInput = document.getElementById('expert-search-input');
const btnExpertSearch = document.getElementById('btn-expert-search');
const btnExpertReset = document.getElementById('btn-expert-reset');
const btnExpertRefresh = document.getElementById('btn-expert-refresh');
const EXPERTS_PAGE_SIZE = 8;
let expertsCache = [];
let expertsFilteredIndices = [];
let expertsDisplayOffset = 0;
let expertsSearchMode = false;

async function fetchExperts(){
  if (!expertsList || !msgExperts) return;
  msgExperts.textContent = '加载中...';
  try {
    const res = await fetch(`${API_BASE_REF}/api/experts/`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    
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
      expertsCache = experts;
      expertsFilteredIndices = expertsCache.map((_, idx)=>idx);
      applyExpertsSearch(expertSearchInput?.value || '');
      return;
    }
    console.error('专家数据格式错误:', json);
    throw new Error('响应格式错误：未找到专家列表');
  } catch (err) {
    console.error('专家加载错误:', err);
    expertsCache = [];
    expertsFilteredIndices = [];
    if (expertsList) {
      expertsList.innerHTML = '<div class="empty">加载专家失败</div>';
    }
    if (msgExperts) {
      msgExperts.textContent = `加载失败：${err.message || '网络错误'}`;
    }
  }
}

function applyExpertsSearch(keyword = ''){
  if (!expertsList) return;
  const trimmed = (keyword || '').trim();
  expertsSearchMode = Boolean(trimmed);
  expertsDisplayOffset = 0;
  if (!expertsCache.length) {
    expertsFilteredIndices = [];
    expertsList.innerHTML = '<div class="empty">暂无专家数据</div>';
    if (msgExperts) msgExperts.textContent = '暂无专家数据';
    return;
  }
  const allIndices = expertsCache.map((_, idx)=>idx);
  if (!expertsSearchMode) {
    expertsFilteredIndices = allIndices;
    renderExpertsView();
    if (msgExperts) {
      msgExperts.textContent = allIndices.length > EXPERTS_PAGE_SIZE
        ? '展示前 8 位专家，可点击“换一批”查看更多'
        : '';
    }
    return;
  }
  const matches = allIndices.filter(idx=>{
    const data = expertsCache[idx];
    const name = (data.expertName || data.name || '').trim();
    return name.includes(trimmed);
  });
  expertsFilteredIndices = matches;
  renderExpertsView();
  if (msgExperts) {
    msgExperts.textContent = matches.length ? `找到 ${matches.length} 位匹配的专家` : '未找到匹配的专家';
  }
}

function renderExpertsView(){
  if (!expertsList) return;
  if (!expertsFilteredIndices.length) {
    expertsList.innerHTML = '<div class="empty">暂无匹配的专家</div>';
    return;
  }
  let indicesToRender = expertsFilteredIndices;
  if (!expertsSearchMode && expertsFilteredIndices.length > EXPERTS_PAGE_SIZE) {
    if (expertsDisplayOffset >= expertsFilteredIndices.length) {
      expertsDisplayOffset = 0;
    }
    indicesToRender = expertsFilteredIndices.slice(expertsDisplayOffset, expertsDisplayOffset + EXPERTS_PAGE_SIZE);
  }
  renderExpertsByIndices(indicesToRender);
}

function renderExpertsByIndices(indices){
  if (!expertsList) return;
  if (!indices.length) {
    expertsList.innerHTML = '<div class="empty">暂无匹配的专家</div>';
    return;
  }
  expertsList.innerHTML = indices.map(idx=>{
    const e = expertsCache[idx];
    if (!e) return '';
    const expertId = e.expertId || e.id || '';
    const expertName = e.expertName || e.name || '未命名';
    const fieldsText = formatField(e.field);
    const description = e.expertDescription || e.description || '';
    const expertImg = e.expertImg || '';
    return `<div class="expert-card expert-card-clickable" data-expert-index="${idx}" data-expert-id="${expertId}">
      ${expertImg ? `<div class="expert-avatar"><img src="${escapeAttr(expertImg)}" alt="${escapeAttr(expertName)}"></div>` : '<div class="expert-avatar-placeholder">👨‍🔬</div>'}
      <div class="expert-info">
        <div class="expert-name">${escapeAttr(expertName)}</div>
        <div class="expert-fields">${escapeAttr(fieldsText)}</div>
        ${description ? `<div class="expert-desc">${escapeAttr(description.length > 60 ? description.substring(0, 60) + '...' : description)}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

if (btnExpertSearch) {
  btnExpertSearch.addEventListener('click', ()=>{
    applyExpertsSearch(expertSearchInput?.value || '');
  });
}

if (expertSearchInput) {
  expertSearchInput.addEventListener('keydown', (event)=>{
    if (event.key === 'Enter') {
      event.preventDefault();
      applyExpertsSearch(expertSearchInput.value || '');
    }
  });
}

if (btnExpertReset) {
  btnExpertReset.addEventListener('click', ()=>{
    if (expertSearchInput) expertSearchInput.value = '';
    applyExpertsSearch('');
  });
}

if (btnExpertRefresh) {
  btnExpertRefresh.addEventListener('click', ()=>{
    if (!expertsCache.length) {
      fetchExperts();
      return;
    }
    if (expertsSearchMode) {
      applyExpertsSearch(expertSearchInput?.value || '');
      return;
    }
    if (!expertsFilteredIndices.length) return;
    expertsDisplayOffset = (expertsDisplayOffset + EXPERTS_PAGE_SIZE) % Math.max(expertsFilteredIndices.length, 1);
    renderExpertsView();
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

// 专家详情弹窗相关元素
const expertDetailModal = document.getElementById('expert-detail-modal');
const expertDetailContent = document.getElementById('expert-detail-content');
const expertModalClose = document.getElementById('expert-modal-close');
const expertAppointmentForm = document.getElementById('expert-appointment-form');
const appointmentDateInput = document.getElementById('appointment-date');
const appointmentTimeSelect = document.getElementById('appointment-time-slot');
const appointmentTopicInput = document.getElementById('appointment-topic');
const appointmentRemarkInput = document.getElementById('appointment-remark');
const appointmentFormMsg = document.getElementById('msg-expert-appointment');
let currentExpertData = null;

function resolveExpertId(expertData) {
  if (!expertData) return null;
  return expertData.expertId || expertData.id || expertData.expert_id || null;
}

// 打开专家详情弹窗
function setDefaultAppointmentDate() {
  if (!appointmentDateInput) return;
  const today = new Date();
  const iso = today.toISOString().split('T')[0];
  appointmentDateInput.min = iso;
  if (!appointmentDateInput.value) {
    appointmentDateInput.value = iso;
  }
}

function resetAppointmentForm() {
  if (!expertAppointmentForm) return;
  expertAppointmentForm.reset();
  expertAppointmentForm.dataset.expertId = '';
  expertAppointmentForm.dataset.expertName = '';
  setDefaultAppointmentDate();
  if (appointmentFormMsg) {
    appointmentFormMsg.textContent = '';
  }
}

setDefaultAppointmentDate();

function prepareAppointmentForm(expertData) {
  if (!expertAppointmentForm) return;
  expertAppointmentForm.dataset.expertId = resolveExpertId(expertData) || '';
  expertAppointmentForm.dataset.expertName = expertData.expertName || expertData.name || '';
  expertAppointmentForm.reset();
  setDefaultAppointmentDate();
  if (appointmentFormMsg) {
    appointmentFormMsg.textContent = '';
  }
  if (appointmentTimeSelect) {
    appointmentTimeSelect.selectedIndex = 0;
  }
}

function openExpertDetailModal(expertData) {
  if (!expertDetailModal || !expertDetailContent) return;
  // 记录当前专家数据，并补齐 expertId 字段
  currentExpertData = {
    ...expertData,
    expertId: resolveExpertId(expertData)
  };
  prepareAppointmentForm(currentExpertData);
  
  const fieldsText = formatField(expertData.field);
  expertDetailContent.innerHTML = `
    <div class="expert-detail-header">
      ${expertData.expertImg ? `<div class="expert-detail-avatar"><img src="${escapeAttr(expertData.expertImg)}" alt="${escapeAttr(expertData.expertName)}"></div>` : '<div class="expert-detail-avatar-placeholder">👨‍🔬</div>'}
      <div class="expert-detail-title">
        <h2>${escapeAttr(expertData.expertName)}</h2>
        <div class="expert-detail-fields">${escapeAttr(fieldsText)}</div>
      </div>
    </div>
    <div class="expert-detail-body">
      ${expertData.expertDescription ? `<div class="expert-detail-item">
        <div class="expert-detail-label">简介：</div>
        <div class="expert-detail-value">${escapeAttr(expertData.expertDescription)}</div>
      </div>` : ''}
      ${expertData.example ? `<div class="expert-detail-item">
        <div class="expert-detail-label">案例：</div>
        <div class="expert-detail-value">${escapeAttr(expertData.example)}</div>
      </div>` : ''}
      ${expertData.expertPhone ? `<div class="expert-detail-item">
        <div class="expert-detail-label">电话：</div>
        <div class="expert-detail-value">${escapeAttr(expertData.expertPhone)}</div>
      </div>` : ''}
      ${expertData.expertEmail ? `<div class="expert-detail-item">
        <div class="expert-detail-label">邮箱：</div>
        <div class="expert-detail-value">${escapeAttr(expertData.expertEmail)}</div>
      </div>` : ''}
      ${expertData.contact ? `<div class="expert-detail-item">
        <div class="expert-detail-label">联系方式：</div>
        <div class="expert-detail-value">${escapeAttr(expertData.contact)}</div>
      </div>` : ''}
    </div>
  `;
  expertDetailModal.style.display = 'flex';
}

// 关闭专家详情弹窗
function closeExpertDetailModal() {
  if (!expertDetailModal) return;
  expertDetailModal.style.display = 'none';
  currentExpertData = null;
  resetAppointmentForm();
}

// 点击专家卡片时，先尝试获取完整详情
async function openExpertDetailModalWithFetch(expertData) {
  // 如果有expertId，尝试获取完整详情
  if (expertData.expertId) {
    try {
      const detailRes = await fetch(`${API_BASE_REF}/api/experts/${expertData.expertId}`);
      if (detailRes.ok) {
        const detailJson = await detailRes.json();
        const detailCandidates = extractExpertsFromResponse(detailJson, 'detail-fetch');
        if (detailCandidates.length) {
          expertData = { ...expertData, ...detailCandidates[0] };
        } else {
          const data = detailJson?.data && !Array.isArray(detailJson.data) ? detailJson.data : detailJson;
          if (data && !Array.isArray(data)) {
            expertData = { ...expertData, ...data };
          }
        }
      }
    } catch (err) {
      console.warn('获取专家详情失败，使用基础信息:', err);
    }
  }
  openExpertDetailModal(expertData);
}

// 点击专家卡片打开弹窗
if (expertsList) {
  fetchExperts();
  expertsList.addEventListener('click', (e)=>{
    const card = e.target.closest('.expert-card-clickable');
    if (!card) return;
    const expertIndex = Number(card.getAttribute('data-expert-index'));
    if (!Number.isFinite(expertIndex) || !expertsCache[expertIndex]) {
      console.warn('未找到对应的专家数据，无法打开详情');
      return;
    }
    const expertData = { ...expertsCache[expertIndex] };
    openExpertDetailModalWithFetch(expertData);
  });
}

// 关闭弹窗按钮
if (expertModalClose) {
  expertModalClose.onclick = closeExpertDetailModal;
}

// 点击弹窗外部关闭
if (expertDetailModal) {
  expertDetailModal.onclick = (e)=>{
    if (e.target === expertDetailModal) {
      closeExpertDetailModal();
    }
  };
}

// 预约表单提交
if (expertAppointmentForm) {
  expertAppointmentForm.addEventListener('submit', async (event)=>{
    event.preventDefault();
    if (!currentExpertData) {
      alert('请先选择专家');
      return;
    }
    const expertId = resolveExpertId(currentExpertData);
    if (!expertId) {
      alert('无法获取专家ID，请刷新页面后重试');
      return;
    }
    const userId = getCurrentUserId();
    if (!userId) {
      alert('未获取到用户ID，请重新登录后再试');
      return;
    }
    const date = appointmentDateInput?.value?.trim();
    if (!date) {
      if (appointmentFormMsg) appointmentFormMsg.textContent = '请选择预约日期';
      return;
    }
    const timeRange = appointmentTimeSelect?.value;
    if (!timeRange) {
      if (appointmentFormMsg) appointmentFormMsg.textContent = '请选择预约时间段';
      return;
    }
    const [startTime, endTime] = timeRange.split('-').map(part => part.trim());
    if (!startTime || !endTime) {
      if (appointmentFormMsg) appointmentFormMsg.textContent = '时间段格式不正确';
      return;
    }
    const topic = appointmentTopicInput?.value?.trim();
    if (!topic) {
      if (appointmentFormMsg) appointmentFormMsg.textContent = '请输入预约主题';
      return;
    }
    const remark = (appointmentRemarkInput?.value || '').trim();
    
    const payload = {
      expertId: expertId,
      userId: userId,
      date: date,
      startTime: startTime,
      endTime: endTime,
      topic: topic,
      remark: remark,
      status: 'pending'
    };

    const submitBtn = expertAppointmentForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.original = submitBtn.textContent;
      submitBtn.textContent = '提交中...';
    }
    if (appointmentFormMsg) appointmentFormMsg.textContent = '提交中...';

    try {
      const res = await fetch(`${API_BASE_REF}/api/expert-appointment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      if (appointmentFormMsg) {
        appointmentFormMsg.textContent = json?.message || '预约申请已提交，等待专家确认';
      }
      if (typeof loadUserAppointments === 'function') {
        loadUserAppointments(false);
      }
      setTimeout(()=>{
        closeExpertDetailModal();
      }, 1000);
    } catch (err) {
      const message = err?.message || '网络错误';
      if (appointmentFormMsg) appointmentFormMsg.textContent = `提交失败：${message}`;
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.original || '提交预约';
      }
    }
  });
}

// 如果页面加载时是专家身份，初始化专家功能
(function initExpertReview() {
  try {
    const identity = parseInt(localStorage.getItem('user_identity') || '0', 10);
    if (identity === 3) {
      if (pendingAppointmentsList) {
        loadPendingAppointments();
      }
      if (scheduleList) {
        loadSchedule();
      }
    }
  } catch (e) {
    console.error('初始化专家功能失败:', e);
  }
})();

