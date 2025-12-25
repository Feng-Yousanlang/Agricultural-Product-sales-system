document.addEventListener("DOMContentLoaded", function () {
    const API_BASE = 'http://10.61.57.87:8080';  // 请替换为实际API的基础URL
    const btnLoadUserList = document.getElementById('btn-load-user-list');
    const inputUserId = document.getElementById('input-user-id');
    const userListContainer = document.getElementById('user-list');
    const msgContainer = document.getElementById('msg-user-list');

    // 获取用户列表函数
    function loadUserList(userId = getCurrentUserId()) {
        // msgContainer.textContent = '正在加载用户列表...';

        fetch(`${API_BASE}/api/user/list?userId=${userId}`, {
            method: 'GET',
        })
        .then(response => response.json())
        .then(data => {
            // 确保接口返回成功且数据格式正确
            if (data.code === 200 && Array.isArray(data.data)) {
                renderUserCards(data.data);  // 渲染用户卡片
            } else {
                msgContainer.textContent = '获取用户列表失败！';
            }
        })
        .catch(error => {
            console.error('Error fetching user list:', error);
            msgContainer.textContent = '网络错误，请稍后再试。';
        });
    }

    // 渲染用户卡片
    function renderUserCards(users) {
        userListContainer.innerHTML = '';  // 清空当前的用户列表

        // 循环遍历用户数据，创建每个用户的卡片
        users.forEach(user => {
            const userCard = document.createElement('section');
            userCard.classList.add('user-card');
            userCard.innerHTML = `
                <div class="user-card-header">
                    <p><strong>用户名:</strong> ${user.username}</p>
                    <p><strong>角色类型:</strong> ${getRoleName(user.roleType)}</p>
                </div>
                <div class="user-card-actions">
                    <button class="btn-update-permission">修改权限</button>
                    <button class="btn-delete-user">删除用户</button>
                </div>
            `;

            // 获取按钮元素并绑定事件
            const updateBtn = userCard.querySelector('.btn-update-permission');
            const deleteBtn = userCard.querySelector('.btn-delete-user');

            // 绑定修改权限事件
            updateBtn.addEventListener('click', () => updateUserPermission(user.userId));

            // 绑定删除用户事件
            deleteBtn.addEventListener('click', () => deleteUser(user.userId));

            // 将用户卡片添加到容器中
            userListContainer.appendChild(userCard);
        });
    }

    // 获取角色名称
    function getRoleName(roleType) {
        switch(roleType) {
            case 1: return '农户';
            case 2: return '买家';
            case 3: return '专家';
            case 4: return '银行工作人员';
            default: return '管理员';
        }
    }


    // 用户权限修改操作
    function updateUserPermission(userId) {
        const newRole = prompt("请输入新的角色类型 (1: 农户, 2: 买家, 3: 专家, 4: 银行工作人员):");
        if (newRole === null || newRole === "") return;  // 用户取消或没有输入

        const requestData = {
            userId: getCurrentUserId(),  // 当前管理员用户ID
            roleType: parseInt(newRole),  // 新角色类型
            userId_change: userId  // 被修改权限的用户ID
        };

        fetch(`${API_BASE}/api/user/auth/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                alert('用户权限修改成功');
                loadUserList();  // 刷新用户列表
            } else {
                alert('用户权限修改失败');
            }
        })
        .catch(error => {
            console.error('Error updating user permission:', error);
            alert('网络错误，请稍后再试。');
        });
    }

    // 用户删除操作
    function deleteUser(userId) {
        const confirmation = confirm("确定删除该用户吗？");
        if (!confirmation) return;

        const requestData = {
            userId: getCurrentUserId(),  // 当前管理员用户ID
            userId_delete: userId  // 被删除用户的ID
        };

        fetch(`${API_BASE}/api/user/auth/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                alert('用户删除成功');
                loadUserList();  // 刷新用户列表
            } else {
                alert('用户删除失败');
            }
        })
        .catch(error => {
            console.error('Error deleting user:', error);
            alert('网络错误，请稍后再试。');
        });
    }

    // 默认加载用户列表
    loadUserList();

    // 绑定点击事件，点击按钮时触发筛选查询
    btnLoadUserList.addEventListener('click', function () {
        const filterUserId = inputUserId.value.trim();
        loadUserList(filterUserId);  // 带参数调用
    });
});
