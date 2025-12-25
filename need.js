// 如果API_BASE已存在（从index.js导入），则使用它；否则声明新的
const API_BASE = window.API_BASE ? window.API_BASE + '/api/buyRequest' : 'http://10.61.57.87:8080/api/buyRequest';

/* ================= 发布求购 ================= */
function publishBuyRequest() {
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    const contact = document.getElementById('contact').value.trim();
    const userId = localStorage.getItem('user_id'); // 获取用户ID

    if (!title || !content) {
        alert('标题和内容不能为空');
        return;
    }

    // 如果没有找到userid，给出提示并退出
    if (!userId) {
        alert('用户未登录或ID不存在');
        return;
    }

    fetch(`${API_BASE}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, contact, userId }) // 传递userid
    })
    .then(res => res.json())
    .then(res => {
        if (res.code === 200) {
            alert('发布成功');
            loadBuyRequestList();
            document.getElementById('title').value = '';
            document.getElementById('content').value = '';
            document.getElementById('contact').value = '';
        } else {
            alert('发布失败：' + res.message);
        }
    });
}


/* ================= 删除求购 ================= */
function deleteBuyRequest(id) {
    if (!confirm('确定删除该求购需求吗？')) return;

    const userId = localStorage.getItem('user_id'); // 假设用户ID存在localStorage中

    fetch(`${API_BASE}/delete?buyRequestId=${id}&userId=${userId}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(res => {
        if (res.code === 200) {
            alert('删除成功');
            loadBuyRequestList();
        } else {
            alert('删除失败：' + res.message);
        }
    });
}


function searchBuyRequest() {
    const keyword = document.getElementById('keyword').value.trim();
    const sort = document.getElementById('sort').value;

    // 构建请求体
    const requestBody = {
        keyword: keyword,
        sort: sort
    };

    // 发送 POST 请求
    fetch(`${API_BASE}/search`, {
        method: 'POST',  // 请求方式改为 POST
        headers: {
            'Content-Type': 'application/json'  // 设置请求头为 JSON
        },
        body: JSON.stringify(requestBody)  // 将请求体转换为 JSON 字符串
    })
    .then(res => res.json())
    .then(res => {
        if (res.code === 200) {
            renderBuyRequestList(res.data);
        } else {
            alert('搜索失败：' + res.message);
        }
    })
    .catch(error => {
        alert('请求失败：' + error.message);
    });
}


/* ================= 获取求购列表 ================= */
function loadBuyRequestList() {
    fetch(`${API_BASE}/list`)
    .then(res => res.json())
    .then(res => {
        if (res.code === 200) {
            renderBuyRequestList(res.data);
        } else {
            alert('加载列表失败：' + res.message);
        }
    });
}

/* ================= 渲染列表 ================= */
function renderBuyRequestList(list) {
    const ul = document.getElementById('buyRequestList');
    ul.innerHTML = '';
    list.forEach(item => {
        const li = document.createElement('li');
        li.className = 'list-card';
        li.innerHTML = `
            <strong>${item.title}</strong> <small class="subtle">${item.createTime}</small>
            <div>${item.content}</div>
            <div>联系方式：${item.contact || '-'}</div>
            <button class="btn btn-outline" onclick="deleteBuyRequest(${item.buyRequestId})">删除</button>
        `;
        ul.appendChild(li);
    });
}











/* ================= 初始化 ================= */
document.addEventListener('DOMContentLoaded', loadBuyRequestList);
