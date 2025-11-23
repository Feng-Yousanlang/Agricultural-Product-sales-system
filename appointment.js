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

function escapeAttr(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

// 注意：用户端预约功能已移除，现在只保留专家端功能（identity=3）

// ---------------- 专家审批预约（专家端，identity=3） ----------------
// 自动填充专家ID
(function autoFillExpertId() {
  const expertIdInput = document.getElementById('review-expert-id');
  if (expertIdInput) {
    const currentUserId = getCurrentUserId();
    if (currentUserId) {
      expertIdInput.value = currentUserId;
    }
  }
})();

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
    const res = await fetch(`${API_BASE}/api/expert-appointment/pending?expert_id=${encodeURIComponent(expertId)}`);
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
      <button class="btn btn-secondary btn-fill-review-form" 
        data-appointment-id="${escapeAttr(appointmentId)}">填入审批表单</button>
    </div>`;
  }).join('');
}

if (btnLoadPendingAppointments) {
  btnLoadPendingAppointments.addEventListener('click', ()=>loadPendingAppointments());
}

if (pendingAppointmentsList) {
  pendingAppointmentsList.addEventListener('click', (e)=>{
    const btn = e.target.closest('.btn-fill-review-form');
    if (btn) {
      const appointmentId = btn.getAttribute('data-appointment-id');
      const reviewAppointmentIdInput = document.getElementById('review-appointment-id');
      if (reviewAppointmentIdInput && appointmentId) {
        reviewAppointmentIdInput.value = appointmentId;
      }
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
    const expertIdInput = parseInt(document.getElementById('review-expert-id').value, 10);
    const action = document.getElementById('review-action').value.trim();
    const comment = document.getElementById('review-comment').value.trim();
    
    if (!appointmentId || !expertIdInput || !action) {
      msgReviewAppointment.textContent = '请完善审批信息';
      return;
    }
    
    if (action !== '同意' && action !== '拒绝') {
      msgReviewAppointment.textContent = '审批操作必须选择"同意"或"拒绝"';
      return;
    }
    
    const payload = {
      appointment_id: appointmentId,
      expert_id: expertIdInput,
      action: action
    };
    
    if (comment) {
      payload.comment = comment;
    }
    
    msgReviewAppointment.textContent = '提交审批中...';
    try {
      // 根据文档，审批预约接口为 /api/expert-appointment/review
      const res = await fetch(`${API_BASE}/api/expert-appointment/review`, {
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
      // 重新填充专家ID
      const expertIdInputEl = document.getElementById('review-expert-id');
      if (expertIdInputEl) {
        expertIdInputEl.value = expertId;
      }
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

async function loadSchedule(showLoading = true) {
  if (!scheduleList) return;
  const expertId = getCurrentUserId();
  if (!expertId) {
    msgSchedule.textContent = '未获取到专家ID，请重新登录后再试';
    scheduleList.innerHTML = '';
    return;
  }
  if (showLoading) {
    msgSchedule.textContent = '加载中...';
    scheduleList.innerHTML = '';
  }
  try {
    // 根据文档，查看预约日程接口为 /api/expert-appointment/schedule
    const res = await fetch(`${API_BASE}/api/expert-appointment/schedule?expert_id=${encodeURIComponent(expertId)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
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
      ${canUpdate && appointmentId ? `<button class="btn btn-secondary btn-fill-update-form" data-appointment-id="${escapeAttr(appointmentId)}">填入更新表单</button>` : ''}
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

// ---------------- 更新预约状态（专家端，identity=3） ----------------
// 自动填充专家ID
(function autoFillExpertIdForUpdate() {
  const expertIdInput = document.getElementById('update-expert-id');
  if (expertIdInput) {
    const currentUserId = getCurrentUserId();
    if (currentUserId) {
      expertIdInput.value = currentUserId;
    }
  }
})();

const formUpdateStatus = document.getElementById('form-update-status');
const msgUpdateStatus = document.getElementById('msg-update-status');
if (formUpdateStatus) {
  formUpdateStatus.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const expertId = getCurrentUserId();
    if (!expertId) {
      msgUpdateStatus.textContent = '未获取到专家ID，请重新登录后再试';
      return;
    }
    const appointmentId = parseInt(document.getElementById('update-appointment-id').value, 10);
    const expertIdInput = parseInt(document.getElementById('update-expert-id').value, 10);
    const status = document.getElementById('update-status').value.trim();
    
    if (!appointmentId || !expertIdInput || !status) {
      msgUpdateStatus.textContent = '请完善更新信息';
      return;
    }
    
    if (status !== 'completed' && status !== 'no_show') {
      msgUpdateStatus.textContent = '状态只能选择"已完成"或"农户未到场"';
      return;
    }
    
    const payload = {
      appointment_id: appointmentId,
      expert_id: expertIdInput,
      status: status
    };
    
    msgUpdateStatus.textContent = '提交更新中...';
    try {
      // 根据文档，更新预约状态接口为 /api/expert-appointment/update-status
      const res = await fetch(`${API_BASE}/api/expert-appointment/update-status`, {
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
      // 重新填充专家ID
      const expertIdInputEl = document.getElementById('update-expert-id');
      if (expertIdInputEl) {
        expertIdInputEl.value = expertId;
      }
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

