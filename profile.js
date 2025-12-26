const API_BASE = 'http://10.61.57.87:8080';

// 获取认证 token
function getAuthToken() {
  try {
    return localStorage.getItem('auth_token') || '';
  } catch {
    return '';
  }
}

// 获取当前用户 ID
function getCurrentUserId() {
  try {
    const raw = localStorage.getItem('user_id');
    const id = parseInt(raw, 10);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

// 安全地从对象中获取值
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

// 解析头像地址
function resolveAvatarSrc(src) {
  if (!src) return '';  // 如果没有头像地址，返回空
  const trimmed = String(src).trim();
  if (!trimmed) return '';
  // 已经是完整 http/https 地址，直接用
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  // 相对路径时补全为后端域名 + 路径
  try {
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${API_BASE}${path}`;
  } catch {
    return trimmed;
  }
}

// 加载个人信息
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
    displayProfile(json.data);
  } catch (err) {
    console.error('加载个人信息失败:', err);
    alert(`加载失败：${err.message || '网络错误'}`);
  }
}

// 渲染个人信息
function displayProfile(data) {
  const identityMap = { '1': '农户', '2': '买家', '3': '专家', '4': '银行', '5': '管理员' };
  const identityRaw = pickValue(data, ['identity', 'role_type', 'roleType'], '');
  const identityLabel = identityMap[String(identityRaw)] || identityRaw || '—';
  const createTimeRaw = pickValue(data, ['createTime', 'create_time', 'created_at', 'createdAt'], '');
  const createTimeDisplay = createTimeRaw ? createTimeRaw.replace('T', ' ') : '—';
  const avatarSrcRaw = pickValue(data, ['image_url', 'avatarUrl', 'avatar', 'imageUrl'], '');
  const avatarSrc = resolveAvatarSrc(avatarSrcRaw);

  // 显示字段
  document.getElementById('display-userId').textContent = pickValue(data, ['userId', 'id'], localStorage.getItem('user_id') || '—');
  document.getElementById('display-username').textContent = pickValue(data, ['username', 'user_name']);
  document.getElementById('display-identity').textContent = identityLabel;
  document.getElementById('display-realName').textContent = pickValue(data, ['realName', 'real_name']);
  document.getElementById('display-phone').textContent = pickValue(data, ['phone', 'mobile']);
  document.getElementById('display-email').textContent = pickValue(data, ['email']);
  document.getElementById('display-createTime').textContent = createTimeDisplay;

  // 头像显示
  const avatarDisplay = document.getElementById('display-avatar');
  if (avatarDisplay) {
    avatarDisplay.innerHTML = avatarSrc
      ? `<img src="${escapeHtml(avatarSrc)}" alt="用户头像" onerror="handleAvatarError(this)">`
      : '<span class="form-hint">尚未上传头像</span>';
  }

  // 确保元素存在再修改样式
  const expertIdContainer = document.getElementById('expert-id-container');
  if (expertIdContainer && data.expert_id === 0) {
    expertIdContainer.style.display = 'none';
  }

  const approverIdContainer = document.getElementById('approver-id-container');
  if (approverIdContainer && data.approver_id === 0) {
    approverIdContainer.style.display = 'none';
  }
}

// 头像加载失败时的处理函数
function handleAvatarError(imgElement) {
  imgElement.style.display = 'none';
  imgElement.insertAdjacentHTML('afterend', '<span class="form-hint">头像加载失败</span>');
}

// 显示错误消息的函数
function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 更新个人信息的处理函数
async function handleEditProfileSubmit(event) {
  event.preventDefault();  // 阻止表单默认提交行为
  
  const token = getAuthToken();
  const userId = getCurrentUserId();
  
  // 获取表单数据
  const realName = document.getElementById('edit-realName').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const avatarFile = document.getElementById('edit-avatarFile').files[0];  // 获取头像文件
  
  // 检查用户信息
  if (!realName || !phone || !email) {
    alert('所有字段都必须填写');
    return;
  }

  // 显示提交中消息
  const msgEl = document.getElementById('msg-profile-edit');
  msgEl.textContent = '提交中...';

  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('real_name', realName);
  formData.append('phone', phone);
  formData.append('email', email);

  // 如果用户选择了头像文件，添加到表单数据
  if (avatarFile) {
    formData.append('file', avatarFile);
  }

  const formData_avatar = new FormData();
  formData_avatar.append("userId", userId);
  formData_avatar.append("file", avatarFile);

  try {
    // 更新个人信息请求
    const res = await fetch(`${API_BASE}/api/user/profile/update`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,  // 使用 FormData 以支持文件上传
    });

    console.log("res:" + res.json);

    const res2 = await fetch(`${API_BASE}/api/user/upload/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData_avatar,  //
    });

    console.log("res2:" + res2.json);

    const json = await res2.json();
    
    if (!res2.ok) {
      throw new Error(json.message || `HTTP ${res.status}`);
    }

    // 如果头像上传成功，更新头像
    if (json.image_url) {
      updateAvatar(json.image_url);  // 更新头像
    }

    // 更新成功后的处理
    msgEl.textContent = json.message || '更新成功';
    
    // 隐藏表单，重新加载个人信息
    document.getElementById('profile-edit-form').classList.add('hidden');
    await loadProfile();  // 重新加载个人信息

  } catch (err) {
    // 处理错误
    console.error('更新个人信息失败:', err);
    msgEl.textContent = `更新失败：${err.message || '网络错误'}`;
  }
}

// 更新头像的函数
function updateAvatar(avatarUrl) {
  if (avatarUrl) {
    const avatarDisplay = document.getElementById('display-avatar');
    avatarDisplay.innerHTML = `<img src="${escapeHtml(avatarUrl)}" alt="用户头像" onerror="handleAvatarError(this)">`;
  }
}

// 处理头像文件的预览
document.getElementById('edit-avatarFile').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('avatar-preview');
      preview.innerHTML = `<img src="${e.target.result}" alt="头像预览" style="max-width: 100px; max-height: 100px; border-radius: 50%;">`;
    };
    reader.readAsDataURL(file);  // 显示文件预览
  }
});

// 取消编辑的处理函数
function handleCancelEdit() {
  const msgEl = document.getElementById('msg-profile-edit');
  msgEl.textContent = '';
  
  // 隐藏表单
  document.getElementById('profile-edit-form').classList.add('hidden');
}

// 绑定事件
const formEditProfile = document.getElementById('form-edit-profile');
if (formEditProfile) {
  formEditProfile.addEventListener('submit', handleEditProfileSubmit);
}

// 取消按钮绑定事件
const btnCancelEdit = document.getElementById('btn-cancel-edit');
if (btnCancelEdit) {
  btnCancelEdit.addEventListener('click', handleCancelEdit);
}

// 编辑按钮显示编辑表单
const btnEditProfile = document.getElementById('btn-edit-profile');
if (btnEditProfile) {
  btnEditProfile.addEventListener('click', () => {
    document.getElementById('profile-edit-form').classList.remove('hidden');
  });
}

// 退出登录
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

// 初始加载个人信息
loadProfile();
