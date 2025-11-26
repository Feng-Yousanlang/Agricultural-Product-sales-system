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
  return 'http://10.61.194.227:8080';
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
    const raw = localStorage.getItem('user_id');
    const id = parseInt(raw, 10);
    return Number.isFinite(id) ? id : null;
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

// ---------------- 农户端预约功能（identity=1或2） ----------------
// 提交预约申请
const formAppointmentCreate = document.getElementById('form-appointment-create');
const msgAppointmentCreate = document.getElementById('msg-appointment-create');
if (formAppointmentCreate) {
  formAppointmentCreate.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const currentUserId = getCurrentUserId();
    if (!currentUserId) {
      msgAppointmentCreate.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }
    const expertName = document.getElementById('appointment-expertName').value.trim();
    const timeRange = document.getElementById('appointment-time').value.trim();
    const date = document.getElementById('appointment-date').value;
    const topic = document.getElementById('appointment-topic').value.trim();
    const remark = document.getElementById('appointment-remark').value.trim();
    
    // 从时间段中提取开始时间和结束时间（格式：09:00-10:00）
    let startTime = '';
    let endTime = '';
    if (timeRange) {
      const parts = timeRange.split('-');
      if (parts.length === 2) {
        startTime = parts[0].trim();
        endTime = parts[1].trim();
      }
    }
    
    if (!currentUserId || !expertName || !date || !startTime || !endTime || !topic) {
      msgAppointmentCreate.textContent = '请完善预约信息';
      return;
    }
    
    const payload = {
      user_ID: currentUserId,
      userId: currentUserId, // 保留兼容性
      expertName: expertName,
      expert_name: expertName, // 保留兼容性
      date: date,
      startTime: startTime,
      endTime: endTime,
      topic: topic,
      remark: remark || '',
      status: 'pending' // 默认状态为待审批
    };
    msgAppointmentCreate.textContent = '提交中...';
    try {
      // 根据文档，提交预约申请接口为 /api/expert-appointment/create
      const res = await fetch(`${API_BASE_REF}/api/expert-appointment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      if (!res.ok) {
        throw new Error(json?.message || res.statusText);
      }
      msgAppointmentCreate.textContent = json?.message || '预约申请已提交，等待专家确认';
      formAppointmentCreate.reset();
      loadUserAppointments();
    } catch (err) {
      msgAppointmentCreate.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

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
    const url = `${API_BASE_REF}/api/expert-appointment/user/list?user_id=${encodeURIComponent(userId)}`;
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
    const status = item.status || '';
    const expertName = item.expert?.name || item.expertName || item.expert_name || '';
    const expertId = item.expert?.id || '';
    const expertImg = item.expert?.expertImg || item.expert?.avatar || '';
    const expertField = item.expert?.field || '';
    const dateStr = item.date || item.appointmentDate || '';
    const timeStr = item.time || item.time_slot || '';
    const topic = item.topic || '';
    const canCancel = expertName && dateStr && timeStr && (status === 'pending' || status === 'approved');
    const statusText = status === 'pending' ? '待审批' : status === 'approved' ? '已批准' : status === 'completed' ? '已完成' : status === 'rejected' ? '已拒绝' : status === 'cancelled' ? '已取消' : status;
    return `<div class="expert">
      <div class="name">预约#${appointmentId}</div>
      ${expertImg ? `<div class="avatar"><img src="${escapeAttr(expertImg)}" alt="${escapeAttr(expertName)}" style="width:40px;height:40px;border-radius:50%;"></div>` : ''}
      <div>专家：${expertName || '—'}${expertId ? ` (ID: ${expertId})` : ''}</div>
      ${expertField ? `<div>专家领域：${escapeAttr(expertField)}</div>` : ''}
      <div>日期：${dateStr || '—'} ${timeStr || ''}</div>
      <div>主题：${topic || '—'}</div>
      <div>状态：${statusText}</div>
      ${canCancel ? `<button class="btn btn-danger btn-cancel-appointment"
        data-app-id="${appointmentId}"
        data-expert-name="${escapeAttr(expertName)}"
        data-date="${escapeAttr(dateStr)}"
        data-time="${escapeAttr(timeStr)}">取消预约</button>` : ''}
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
    const expertName = btn.getAttribute('data-expert-name');
    const dateStr = btn.getAttribute('data-date');
    const timeStr = btn.getAttribute('data-time');
    if (!expertName || !dateStr || !timeStr) {
      alert('无法获取专家姓名或时间段，取消失败');
      return;
    }
    const confirmed = window.confirm(`确定取消与「${expertName}」在 ${dateStr} ${timeStr} 的预约吗？`);
    if (!confirmed) return;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '取消中...';
    msgUserAppointments.textContent = '取消预约中...';
    try {
      // 根据文档，取消预约接口为 /api/expert-appointment/cancel
      const payload = {
        user_id: getCurrentUserId(),
        expert_name: expertName,
        expertName: expertName,
        date: dateStr,
        time: timeStr
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
    const requestUrl = `${API_BASE_REF}/api/expert-appointment/pending?user_id=${encodeURIComponent(expertId)}`;
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

async function submitAppointmentReview(appointmentId, action, comment = '') {
  const expertId = getCurrentUserId();
  if (!expertId) {
    msgPendingAppointments.textContent = '未获取到专家ID，请重新登录后再试';
    return;
  }
  if (!appointmentId || !action) {
    msgPendingAppointments.textContent = '缺少必要的预约信息';
    return;
  }
  const payload = {
    appointment_id: parseInt(appointmentId, 10),
    user_id: expertId,
    action
  };
  if (comment) {
    payload.comment = comment;
  }
  msgPendingAppointments.textContent = '提交审批中...';
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
  }
}

if (pendingAppointmentsList) {
  pendingAppointmentsList.addEventListener('click', (e)=>{
    const approveBtn = e.target.closest('.btn-approve-appointment');
    if (approveBtn) {
      const appointmentId = approveBtn.getAttribute('data-appointment-id');
      submitAppointmentReview(appointmentId, '同意');
      return;
    }
    const rejectBtn = e.target.closest('.btn-reject-appointment');
    if (rejectBtn) {
      const appointmentId = rejectBtn.getAttribute('data-appointment-id');
      const comment = prompt('请输入拒绝理由（可选）：') || '';
      submitAppointmentReview(appointmentId, '拒绝', comment.trim());
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
    
    if (action !== '同意' && action !== '拒绝') {
      msgReviewAppointment.textContent = '审批操作必须选择"同意"或"拒绝"';
      return;
    }
    
    const payload = {
      appointment_id: appointmentId,
      user_id: expertId,  // 使用从 localStorage 获取的 user_id
      action: action
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
let scheduleDataList = []; // 保存预约数据，供表单提交时使用

function buildMeetTime(dateStr = '', timeRange = '') {
  const start = typeof timeRange === 'string' ? timeRange.split('-')[0]?.trim() : '';
  if (!dateStr || !start) return '';
  return `${dateStr} ${start}`;
}

async function loadSchedule(showLoading = true) {
  if (!scheduleList) return;
  const userId = getCurrentUserId();  // 从 localStorage 获取 user_id
  if (!userId) {
    msgSchedule.textContent = '未获取到用户ID，请重新登录后再试';
    scheduleList.innerHTML = '';
    return;
  }
  if (showLoading) {
    msgSchedule.textContent = '加载中...';
    scheduleList.innerHTML = '';
  }
  try {
    // 根据文档，查看预约日程接口为 /api/expert-appointment/schedule
    // 使用 userId 作为参数名，值来自 localStorage 的 user_id
    const requestUrl = `${API_BASE_REF}/api/expert-appointment/schedule?userId=${encodeURIComponent(userId)}`;
    const res = await fetch(requestUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    scheduleDataList = list; // 保存预约数据
    renderSchedule(list);
    msgSchedule.textContent = list.length ? '' : '暂无预约日程';
  } catch (err) {
    scheduleList.innerHTML = '';
    msgSchedule.textContent = `加载失败：${err.message || '网络错误'}`;
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
    const timeStr = item.time || item.time_slot || '—';
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
    msgSchedule.textContent = '未获取到用户ID，请重新登录后再试';
    return;
  }
  if (!appointmentId || !status) {
    msgSchedule.textContent = '缺少必要的预约信息';
    return;
  }
  // 组合预约日期和时间作为 meetTime（仅使用开始时间）
  const meetTime = buildMeetTime(dateStr, timeStr);
  if (!meetTime) {
    msgSchedule.textContent = '缺少预约时间信息';
    return;
  }
  const payload = {
    appointment_id: parseInt(appointmentId, 10),
    user_id: userId,
    status,
    meetTime: meetTime
  };
  msgSchedule.textContent = '提交更新中...';
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
    msgSchedule.textContent = json?.message || '状态已更新';
    loadSchedule(false);
  } catch (err) {
    msgSchedule.textContent = `更新失败：${err.message || '网络错误'}`;
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
    const timeStr = appointment ? (appointment.time || appointment.time_slot || '') : '';
    const meetTime = buildMeetTime(dateStr, timeStr);
    
    if (!meetTime) {
      msgUpdateStatus.textContent = '未找到该预约的时间信息，请先刷新预约列表';
      return;
    }
    
    const payload = {
      appointment_id: appointmentId,
      user_id: userId,  // 使用从 localStorage 获取的 user_id
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

