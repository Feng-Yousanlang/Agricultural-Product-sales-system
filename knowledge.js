document.addEventListener("DOMContentLoaded", function () {
    const API_BASE = 'http://10.61.57.87:8080';
    let currentPage = 1;
    const pageSize = 5;
    let totalPages = 1;

    /* ================= 工具函数 ================= */
    function formatDateToLocal(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function highlightKeyword(text, keyword) {
        if (!keyword) return text;
        const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
        return text.replace(regex, '<span style="background-color: #ffeb3b; color: #333;">$1</span>');
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /* ================= 搜索历史记录 ================= */
    const SEARCH_HISTORY_KEY = 'knowledge_search_history';
    const MAX_HISTORY_LENGTH = 10;

    function getSearchHistory() {
        try {
            const history = localStorage.getItem(SEARCH_HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch (e) {
            return [];
        }
    }

    function saveSearchHistory(keyword) {
        if (!keyword.trim()) return;
        let history = getSearchHistory();
        history = history.filter(item => item !== keyword);
        history.unshift(keyword);
        if (history.length > MAX_HISTORY_LENGTH) history = history.slice(0, MAX_HISTORY_LENGTH);
        try {
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            console.error('保存搜索历史失败', e);
        }
    }

    function clearSearchHistory() {
        try {
            localStorage.removeItem(SEARCH_HISTORY_KEY);
            renderSearchHistory();
        } catch (e) {
            console.error('清除搜索历史失败', e);
        }
    }

    function renderSearchHistory() {
        const history = getSearchHistory();
        const container = document.getElementById('search-history-container');
        if (!container) return;

        if (history.length === 0) {
            container.innerHTML = '<p style="color: #999; font-size: 12px; margin: 10px 0;">暂无搜索历史</p>';
            return;
        }

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <p style="font-size: 12px; color: #666; margin: 0;">搜索历史</p>
                <button onclick="clearSearchHistory()" style="background: none; border: none; color: #999; font-size: 12px; cursor: pointer;">清除</button>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${history.map(keyword => `
                    <span class="history-tag" onclick="searchByHistory('${escapeHtml(keyword)}')" style="
                        padding: 4px 12px;
                        background-color: #f5f5f5;
                        border-radius: 16px;
                        font-size: 12px;
                        color: #666;
                        cursor: pointer;
                        user-select: none;
                        transition: all 0.2s;
                    ">
                        ${keyword}
                    </span>
                `).join('')}
            </div>
        `;
    }

    function searchByHistory(keyword) {
        const input = document.getElementById('search-query');
        input.value = keyword;
        currentPage = 1;
        fetchKnowledge(currentPage);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function initSearchHistory() {
        const searchBar = document.querySelector('.search-bar');
        if (!searchBar) return;

        const historyContainer = document.createElement('div');
        historyContainer.id = 'search-history-container';
        historyContainer.style.marginBottom = '10px';
        historyContainer.style.padding = '8px 12px';
        historyContainer.style.borderRadius = '4px';
        historyContainer.style.backgroundColor = '#fafafa';

        searchBar.parentNode.insertBefore(historyContainer, searchBar.nextSibling);
        renderSearchHistory();
    }

    function formatRelativeTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';

        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        const minutes = Math.floor(diffInSeconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        if (years > 0) return `${years}年前`;
        if (months > 0) return `${months}个月前`;
        if (days > 0) return `${days}天前`;
        if (hours > 0) return `${hours}小时前`;
        if (minutes > 0) return `${minutes}分钟前`;
        return '刚刚';
    }

    /* ================= 用户身份 ================= */
    function getCurrentUserIdentity() {
        try {
            return parseInt(localStorage.getItem('user_identity') || '1', 10);
        } catch {
            return 1;
        }
    }

    const isExpert = getCurrentUserIdentity() === 3;

    /* ================= 初始化 ================= */
    controlAddKnowledgeButton();
    bindEvents();
    initSearchHistory();
    fetchKnowledge(1);

    /* ================= 权限控制 ================= */
    function controlAddKnowledgeButton() {
        const btn = document.getElementById('add-knowledge-btn');
        if (btn) btn.style.display = isExpert ? '' : 'none';
    }

    /* ================= 事件绑定 ================= */
    function bindEvents() {
        document.getElementById('search-btn').onclick = () => { currentPage = 1; fetchKnowledge(currentPage); };
        document.getElementById('search-query').addEventListener('keypress', e => { if (e.key === 'Enter') { currentPage = 1; fetchKnowledge(currentPage); } });
        document.getElementById('prev-page').onclick = () => { if (currentPage > 1) { currentPage--; fetchKnowledge(currentPage); } };
        document.getElementById('next-page').onclick = () => { if (currentPage < totalPages) { currentPage++; fetchKnowledge(currentPage); } };
        document.getElementById('page-jump-btn').onclick = () => {
            const input = document.getElementById('page-jump-input');
            let target = parseInt(input.value, 10);
            if (isNaN(target) || target < 1) target = 1;
            if (target > totalPages) target = totalPages;
            if (target !== currentPage) { currentPage = target; fetchKnowledge(currentPage); }
        };
        document.getElementById('page-jump-input').addEventListener('keypress', e => { if (e.key === 'Enter') document.getElementById('page-jump-btn').click(); });
    }

    /* ================= 获取数据 ================= */
    async function fetchKnowledge(page) {
        currentPage = page;
        const q = document.getElementById('search-query').value.trim();
        if (q) { saveSearchHistory(q); renderSearchHistory(); }
        const url = `${API_BASE}/api/knowledge/list?page=${page}&page_size=${pageSize}&q=${encodeURIComponent(q)}`;
        document.getElementById('loading').style.display = 'block';
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            document.getElementById('loading').style.display = 'none';
            if (result.code !== 200) return;
            const list = Array.isArray(result.data) ? result.data : [];
            renderList(list);
            totalPages = list.length < pageSize ? currentPage : currentPage + 1;
            renderPagination();
        } catch (e) {
            document.getElementById('loading').style.display = 'none';
            console.error('获取知识失败', e);
        }
    }

    /* ================= 渲染列表 ================= */
    function renderList(data) {
        const box = document.getElementById('knowledge-list');
        box.innerHTML = '';
        const q = document.getElementById('search-query').value.trim();
        const emptyState = document.getElementById('empty-state');

        let filteredData = data;
        if (q) {
            const lowerQ = q.toLowerCase();
            filteredData = data.filter(item =>
                (item.title && item.title.toLowerCase().includes(lowerQ)) ||
                (item.source && item.source.toLowerCase().includes(lowerQ)) ||
                (item.url && item.url.toLowerCase().includes(lowerQ))
            );
        }

        if (filteredData.length === 0) {
            emptyState.style.display = 'block';
            emptyState.innerHTML = q ? 
                `<div style="text-align: center; padding: 40px;">
                    <p style="color: #999;">没有找到包含 "${q}" 的知识</p>
                    <p style="color: #ccc; font-size: 12px;">请尝试其他关键词</p>
                </div>` :
                `<div style="text-align: center; padding: 40px; color: #999;">暂无知识内容</div>`;
        } else {
            emptyState.style.display = 'none';
        }

        filteredData.forEach(item => {
            const div = document.createElement('div');
            div.className = 'list-card';
            div.innerHTML = `
                <div class="name">
                    <a href="${item.url}" target="_blank">${highlightKeyword(item.title, q)}</a>
                </div>
                <div style="font-size:13px;color:#888;margin:6px 0">
                    来源：${highlightKeyword(item.source, q)} ｜ 发布时间：<span title="${formatRelativeTime(item.publish)}">${formatDateToLocal(item.publish)}</span>
                </div>
            `;

            if (isExpert) {
                const actionRow = document.createElement('div');
                actionRow.className = 'action-row';

                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-outline';
                editBtn.textContent = '编辑';
                editBtn.addEventListener('click', () => openKnowledgeModal({ mode: 'edit', data: item }));

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn';
                deleteBtn.style.background = '#ff4d4f';
                deleteBtn.textContent = '删除';
                deleteBtn.addEventListener('click', () => deleteKnowledge(item.id));

                actionRow.appendChild(editBtn);
                actionRow.appendChild(deleteBtn);
                div.appendChild(actionRow);
            }

            box.appendChild(div);
        });
    }

    /* ================= 分页 ================= */
    function renderPagination() {
        document.getElementById('current-page').textContent = currentPage;
        document.getElementById('total-pages').textContent = totalPages;
        const input = document.getElementById('page-jump-input');
        input.max = totalPages;
        input.value = currentPage;
        document.getElementById('prev-page').disabled = currentPage === 1;
        document.getElementById('next-page').disabled = currentPage === totalPages;
        generatePageNumbers();
    }

    function generatePageNumbers() {
        const container = document.getElementById('page-numbers');
        container.innerHTML = '';
        if (totalPages <= 1) return;
        const max = 5;
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + max - 1);
        if (end - start < max - 1) start = Math.max(1, end - max + 1);
        if (start > 1) addPage(1);
        if (start > 2) addEllipsis();
        for (let i = start; i <= end; i++) addPage(i);
        if (end < totalPages - 1) addEllipsis();
        if (end < totalPages) addPage(totalPages);

        function addPage(p) {
            const btn = document.createElement('button');
            btn.textContent = p;
            btn.className = `btn ${p === currentPage ? 'btn-primary' : 'btn-secondary'}`;
            btn.onclick = () => { if (p !== currentPage) { currentPage = p; fetchKnowledge(p); } };
            container.appendChild(btn);
        }

        function addEllipsis() {
            const span = document.createElement('span');
            span.textContent = '...';
            span.style.margin = '0 4px';
            container.appendChild(span);
        }
    }

    /* ================= 页面级：新增 / 编辑 ================= */
    let modalMode = 'add';
    let editingId = null;

    window.addKnowledge = function () {
        openKnowledgeModal({ mode: 'add' });
    };

    function openKnowledgeModal({ mode, data = {} }) {
        modalMode = mode;
        editingId = mode === 'edit' ? data.id : null;
        document.getElementById('modal-title').textContent = mode === 'add' ? '新增知识' : '编辑知识';
        document.getElementById('km-title').value = data.title || '';
        document.getElementById('km-source').value = data.source || '';
        document.getElementById('km-url').value = data.url || '';
        document.getElementById('knowledge-modal').style.display = 'block';
    }

    window.closeKnowledgeModal = function () {
        document.getElementById('knowledge-modal').style.display = 'none';
        resetModalState();
    };

    window.submitKnowledge = async function () {
        const title = document.getElementById('km-title').value.trim();
        const source = document.getElementById('km-source').value.trim();
        const url = document.getElementById('km-url').value.trim();
        if (!title || !source || !url) { alert('请填写完整信息'); return; }

        const payload = { title, source, url };
        let api = '/api/knowledge/add';
        if (modalMode === 'edit') { payload.id = editingId; api = '/api/knowledge/update'; }

        try {
            const res = await fetch(API_BASE + api, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.code !== 200) { alert(result.message || '操作失败'); return; }

            alert(modalMode === 'add' ? '添加成功' : '更新成功');
            closeKnowledgeModal();
            fetchKnowledge(currentPage);
        } catch (err) {
            console.error(err);
            alert('网络异常，提交失败');
        }
    };

    function resetModalState() {
        modalMode = 'add';
        editingId = null;
    }

    /* ================= 删除 ================= */
    window.deleteKnowledge = function (id) {
        if (!confirm('确定删除该知识？')) return;
        fetch(`${API_BASE}/api/knowledge/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        })
        .then(res => res.json())
        .then(res => { if (res.code === 200) fetchKnowledge(currentPage); else alert('删除失败'); });
    };

    /* ================= 全局函数暴露 ================= */
    window.searchByHistory = searchByHistory;
    window.clearSearchHistory = clearSearchHistory;
});
