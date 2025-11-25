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

(function setupProfileRoleUI() {
  const identityRaw = localStorage.getItem('user_identity');
  const identityNum = Number.parseInt(identityRaw, 10);
  const elements = document.querySelectorAll('[data-identity]');

  function shouldShow(attr) {
    if (!attr) return true;
    const identityList = attr.split(',')
      .map((item) => Number.parseInt(item.trim(), 10))
      .filter(Number.isFinite);
    if (!identityList.length || !Number.isFinite(identityNum)) {
      return !identityList.length;
    }
    return identityList.includes(identityNum);
  }

  elements.forEach((el) => {
    if (shouldShow(el.getAttribute('data-identity'))) {
      el.classList.remove('hidden');
      el.style.display = '';
    } else {
      el.classList.add('hidden');
      el.style.display = 'none';
    }
  });
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
let editingAddressId = null;

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

function initAddressManagement() {
  const section = document.getElementById('profile-addresses');
  if (!section) return;

  const modal = document.getElementById('address-edit-modal');
  const modalInput = document.getElementById('address-edit-input');
  const modalCancelBtn = document.getElementById('address-edit-cancel');
  const modalSaveBtn = document.getElementById('address-edit-save');

  const addForm = document.getElementById('form-address-add');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const addressInput = document.getElementById('add-address-newAddress');
      const msgEl = document.getElementById('msg-add-address');
      const userId = getCurrentUserId();
      const newAddress = (addressInput?.value || '').trim();
      if (!userId) {
        msgEl.textContent = '未获取到用户ID，请重新登录';
        return;
      }
      if (!newAddress) {
        msgEl.textContent = '请输入新地址';
        return;
      }
      msgEl.textContent = '提交中...';
      try {
        const json = await addressRequest('/api/user/upload/addAddress', {
          payload: { userId, newAddress }
        });
        msgEl.textContent = json.message || '新增地址成功';
        addressInput.value = '';
        await fetchAddressList(userId);
      } catch (err) {
        msgEl.textContent = `新增失败：${err.message || '网络错误'}`;
      }
    });
  }

  const addressList = document.getElementById('address-list-display');
  if (addressList) {
    addressList.addEventListener('click', async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const item = target.closest('[data-address-id]');
      if (!item) return;
      const addressId = parseInt(item.getAttribute('data-address-id'), 10);
      if (!Number.isFinite(addressId)) return;

      const msgEl = document.getElementById('msg-list-address');
      if (target.classList.contains('btn-edit-address')) {
        const currentText = item.querySelector('.address-text')?.textContent?.trim() || '';
        editingAddressId = addressId;
        if (modal && modalInput) {
          modalInput.value = currentText;
          modal.classList.remove('hidden');
          setTimeout(() => modalInput.focus(), 0);
        }
        return;
      }

      if (target.classList.contains('btn-delete-address')) {
        const addressText = item.querySelector('.address-text')?.textContent?.trim() || '';
        if (!confirm('确定删除该地址吗？')) return;
        msgEl.textContent = '删除中...';
        try {
          const query = { addressId };
          if (addressText) query.newAddress = addressText;
          const json = await addressRequest('/api/user/upload/deleteAddress', {
            method: 'DELETE',
            query
          });
          msgEl.textContent = json.message || '删除成功';
          await fetchAddressList();
        } catch (err) {
          msgEl.textContent = `删除失败：${err.message || '网络错误'}`;
        }
      }
    });
  }

  if (modalCancelBtn && modal) {
    modalCancelBtn.addEventListener('click', () => {
      editingAddressId = null;
      if (modalInput) modalInput.value = '';
      modal.classList.add('hidden');
    });
  }

  if (modalSaveBtn && modalInput && modal) {
    modalSaveBtn.addEventListener('click', async () => {
      if (!Number.isFinite(editingAddressId)) return;
      const newAddress = modalInput.value.trim();
      const msgEl = document.getElementById('msg-list-address');
      if (!newAddress) {
        msgEl.textContent = '请输入新的地址内容';
        return;
      }
      msgEl.textContent = '修改中...';
      try {
        const json = await addressRequest('/api/user/upload/modifyAddress', {
          payload: { addressId: editingAddressId, newAddress }
        });
        msgEl.textContent = json.message || '修改成功';
        editingAddressId = null;
        modalInput.value = '';
        modal.classList.add('hidden');
        await fetchAddressList();
      } catch (err) {
        msgEl.textContent = `修改失败：${err.message || '网络错误'}`;
      }
    });
  }

  fetchAddressList();
}

async function fetchAddressList(userIdOverride) {
  const msgEl = document.getElementById('msg-list-address');
  if (!msgEl) return;
  const userId = userIdOverride || getCurrentUserId();
  if (!userId) {
    msgEl.textContent = '未获取到用户ID，请重新登录';
    return;
  }
  msgEl.textContent = '查询中...';
  try {
    const json = await addressRequest('/api/user/upload/address', {
      method: 'GET',
      query: { userId }
    });
    const records = normalizeAddressData(json.data);
    renderAddressList(records);
    msgEl.textContent = '';
  } catch (err) {
    renderAddressList([]);
    msgEl.textContent = `查询失败：${err.message || '网络错误'}`;
  }
}

function renderAddressList(list) {
  const container = document.getElementById('address-list-display');
  if (!container) return;
  container.innerHTML = '';
  if (!Array.isArray(list) || !list.length) {
    container.innerHTML = '<p class="msg">暂无地址数据</p>';
    return;
  }
  list.forEach((item) => {
    const addressId = pickValue(item, ['addressId', 'address_id', 'id'], '—');
    const addressName = pickValue(item, ['address_name', 'addressName', 'address', 'newAddress'], '—');
    const wrapper = document.createElement('div');
    wrapper.className = 'list-item';
    wrapper.setAttribute('data-address-id', addressId);
    wrapper.innerHTML = `
      <p class="address-text" style="margin:0 0 12px;">${escapeHtml(addressName)}</p>
      <div class="list-item-actions">
        <button type="button" class="btn btn-secondary btn-edit-address">修改</button>
        <button type="button" class="btn btn-danger btn-delete-address">删除</button>
      </div>
    `;
    container.appendChild(wrapper);
  });
}

function normalizeAddressData(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.list)) return data.list;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.addressList)) return data.addressList;
  if (Array.isArray(data.addresses)) return data.addresses;
  return [];
}


async function addressRequest(path, { method = 'POST', payload = null, query = null } = {}) {
  const token = getAuthToken();
  if (!token) throw new Error('未登录，请重新登录');
  let url = `${API_BASE}${path}`;
  if (query) {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        qs.append(key, value);
      }
    });
    const queryString = qs.toString();
    if (queryString) {
      url = `${url}?${queryString}`;
    }
  }
  const options = {
    method,
    headers: { 'Authorization': `Bearer ${token}` }
  };
  if (payload && method !== 'GET') {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(payload);
  }
  const res = await fetch(url, options);
  let json = {};
  try {
    json = await res.json();
  } catch {/* ignore */ }
  if (!res.ok || (json.code && json.code !== 200)) {
    throw new Error(json.message || `HTTP ${res.status}`);
  }
  return json;
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

loadProfile();
initAddressManagement();

