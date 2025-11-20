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
  const token = getAuthToken();
  if (!token) {
    window.location.href = 'login.html';
  }
})();

(function displayUserId() {
  const display = document.getElementById('user-id-display');
  const userId = localStorage.getItem('user_id');
  if (display && userId) {
    display.textContent = `用户ID: ${userId}`;
  }
})();

const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_identity');
      localStorage.removeItem('user_id');
    } catch {/* ignore */}
    window.location.href = 'login.html';
  });
}

let profileData = null;

async function loadProfile() {
  const token = getAuthToken();
  const userId = getCurrentUserId();
  if (!token || !userId) {
    alert('未登录，请重新登录');
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/user/profile?userId=${encodeURIComponent(userId)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    console.log('[个人中心] profile接口响应:', json);
    if (json.code !== 200 || !json.data) {
      throw new Error(json.message || '获取个人信息失败');
    }
    profileData = json.data;
    displayProfile(json.data);
  } catch (err) {
    console.error('加载个人信息失败:', err);
    alert(`加载失败：${err.message || '网络错误'}`);
  }
}

function pickValue(obj, keys, fallback = '—') {
  if (!obj) return fallback;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return fallback;
}

function displayProfile(data) {
  const identityMap = { '1': '农户', '2': '买家', '3': '专家', '4': '银行', '5': '管理员' };
  const identityRaw = pickValue(data, ['identity', 'role_type', 'roleType'], '');
  const identityLabel = identityMap[String(identityRaw)] || identityRaw || '—';
  const createTimeRaw = pickValue(data, ['createTime', 'create_time', 'created_at', 'createdAt'], '');
  const createTimeDisplay = createTimeRaw ? createTimeRaw.replace('T', ' ') : '—';

  document.getElementById('display-userId').textContent =
    pickValue(data, ['userId', 'id'], localStorage.getItem('user_id') || '—');
  document.getElementById('display-username').textContent =
    pickValue(data, ['username', 'user_name']);
  document.getElementById('display-identity').textContent = identityLabel;
  document.getElementById('display-realName').textContent =
    pickValue(data, ['realName', 'real_name']);
  document.getElementById('display-phone').textContent =
    pickValue(data, ['phone', 'mobile']);
  document.getElementById('display-email').textContent =
    pickValue(data, ['email']);
  document.getElementById('display-createTime').textContent = createTimeDisplay;
}

const btnEditProfile = document.getElementById('btn-edit-profile');
if (btnEditProfile) {
  btnEditProfile.addEventListener('click', () => {
    if (!profileData) return;
    document.getElementById('edit-realName').value = profileData.realName || '';
    document.getElementById('edit-phone').value = profileData.phone || '';
    document.getElementById('edit-email').value = profileData.email || '';
    document.getElementById('edit-avatarUrl').value =
      profileData.image_url || profileData.avatarUrl || '';
    document.getElementById('profile-edit-form').classList.remove('hidden');
  });
}

const btnCancelEdit = document.getElementById('btn-cancel-edit');
if (btnCancelEdit) {
  btnCancelEdit.addEventListener('click', () => {
    document.getElementById('profile-edit-form').classList.add('hidden');
  });
}

const formEditProfile = document.getElementById('form-edit-profile');
if (formEditProfile) {
  formEditProfile.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = getAuthToken();
    const currentUserId = getCurrentUserId();
    const resolvedUserId = currentUserId
      || (profileData && (profileData.userId || profileData.user_id || profileData.id))
      || null;
    const msgEl = document.getElementById('msg-profile-edit');
    if (!resolvedUserId) {
      msgEl.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }

    const formData = new URLSearchParams();
    formData.append('userId', resolvedUserId);
    formData.append('real_name', document.getElementById('edit-realName').value.trim());
    formData.append('phone', document.getElementById('edit-phone').value.trim());
    formData.append('email', document.getElementById('edit-email').value.trim());
    formData.append('image_url', document.getElementById('edit-avatarUrl').value.trim());

    console.log('[个人中心] 更新个人信息 formData:', Object.fromEntries(formData));
    msgEl.textContent = '提交中...';

    try {
      const res = await fetch(`${API_BASE}/api/user/profile/update`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      msgEl.textContent = json.message || '修改成功';
      document.getElementById('profile-edit-form').classList.add('hidden');
      await loadProfile();
    } catch (err) {
      msgEl.textContent = `修改失败：${err.message || '网络错误'}`;
    }
  });
}

const formChangePassword = document.getElementById('form-change-password');
if (formChangePassword) {
  formChangePassword.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = getAuthToken();
    const currentUserId = getCurrentUserId();
    const resolvedUserId = currentUserId
      || (profileData && (profileData.userId || profileData.user_id || profileData.id))
      || null;
    const msgEl = document.getElementById('msg-password');
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!resolvedUserId) {
      msgEl.textContent = '未获取到用户ID，请重新登录后再试';
      return;
    }
    if (newPassword !== confirmPassword) {
      msgEl.textContent = '两次输入的新密码不一致';
      return;
    }

    const formData = new URLSearchParams();
    formData.append('old_password', oldPassword);
    formData.append('new_password', newPassword);
    formData.append('confirm_password', confirmPassword);
    formData.append('userId', resolvedUserId);

    console.log('[个人中心] 修改密码 payload:', Object.fromEntries(formData));
    msgEl.textContent = '提交中...';

    try {
      const res = await fetch(`${API_BASE}/api/user/password/update`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      msgEl.textContent = json.message || '密码修改成功，请重新登录';
      setTimeout(() => {
        localStorage.clear();
        window.location.href = 'login.html';
      }, 2000);
    } catch (err) {
      msgEl.textContent = `修改失败：${err.message || '网络错误'}`;
    }
  });
}

loadProfile();

