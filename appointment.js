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

// ---------------- 专家预约（用户端） ----------------
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
    const payload = {
      userId: currentUserId,
      expertName,
      expert_name: expertName,
      date: document.getElementById('appointment-date').value,
      time: document.getElementById('appointment-time').value.trim(),
      topic: document.getElementById('appointment-topic').value.trim(),
      remark: document.getElementById('appointment-remark').value.trim()
    };
    if (!payload.userId || !expertName || !payload.date || !payload.time || !payload.topic) {
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
      loadUserAppointments();
    } catch (err) {
      msgAppointmentCreate.textContent = `提交失败：${err.message || '网络错误'}`;
    }
  });
}

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
    const url = `${API_BASE}/api/expert-appointment/user/list?user_id=${encodeURIComponent(userId)}`;
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
  userAppointmentsList.innerHTML = list.map(item=>{
    const appointmentId = item.id ?? item.appointment_id ?? item.appointmentId ?? item.appointmentID ?? '';
    const status = item.status || '';
    const expertName = item.expert?.name || item.expertName || item.expert_name || '';
    const dateStr = item.date || item.appointmentDate || '';
    const timeStr = item.time || item.time_slot || '';
    const canCancel = expertName && dateStr && timeStr;
    const disabledByStatus = typeof status === 'string' && status.toLowerCase() === 'cancelled';
    const disabled = (!canCancel || disabledByStatus) ? 'disabled' : '';
    return `<div class="expert">
      <div class="name">预约#${appointmentId}</div>
      <div>专家：${expertName || '—'}</div>
      <div>日期：${dateStr || '—'} ${timeStr || ''}</div>
      <div>主题：${item.topic || ''}</div>
      <div>状态：${status}</div>
      <button class="btn btn-danger btn-cancel-appointment"
        data-app-id="${appointmentId}"
        data-expert-name="${escapeAttr(expertName)}"
        data-date="${escapeAttr(dateStr)}"
        data-time="${escapeAttr(timeStr)}"
        ${disabled}>取消预约</button>
    </div>`;
  }).join('');
}

if (btnLoadUserAppointments) {
  btnLoadUserAppointments.onclick = ()=>loadUserAppointments();
}

if (userAppointmentsList) {
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
      const payload = {
        user_id: getCurrentUserId(),
        expert_name: expertName,
        expertName: expertName,
        date: dateStr,
        time: timeStr
      };
      const res = await fetch(`${API_BASE}/api/expert-appointment/cancel`, {
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

// 初始化
loadUserAppointments();

