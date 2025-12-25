// 获取知识列表的 API URL
const knowledgeListUrl = "/api/knowledge/list";
const knowledgeSearchUrl = "/api/knowledge/search";

// 获取 DOM 元素
const knowledgeList = document.getElementById('knowledge-list');
const searchInput = document.getElementById('search-query');
const searchButton = document.getElementById('search-btn');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');
const msgElement = document.getElementById('msg-knowledge');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const currentPageSpan = document.getElementById('current-page');
const totalPagesSpan = document.getElementById('total-pages');

// 全局状态
let currentPage = 1;
let totalPages = 1;
let totalItems = 0;
let currentQuery = '';
const pageSize = 10;

// 防抖函数
function debounce(func, delay) {
    let timer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(context, args), delay);
    };
}

// 显示加载状态
function showLoading() {
    loading.style.display = 'block';
    knowledgeList.style.display = 'none';
    emptyState.style.display = 'none';
    msgElement.innerHTML = '';
}

// 隐藏加载状态
function hideLoading() {
    loading.style.display = 'none';
}

// 显示消息
function showMessage(message, type = 'info') {
    msgElement.className = `msg ${type}`;
    msgElement.textContent = message;
}

// 显示空状态
function showEmptyState() {
    knowledgeList.style.display = 'none';
    emptyState.style.display = 'block';
}

// 显示知识列表
function showKnowledgeList() {
    knowledgeList.style.display = 'block';
    emptyState.style.display = 'none';
}

// 更新分页信息
function updatePagination() {
    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
}

// 获取农业知识列表
function fetchKnowledgeList(page, pageSize, query = '') {
    showLoading();
    
    const url = query 
        ? `${knowledgeSearchUrl}?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`
        : `${knowledgeListUrl}?page=${page}&page_size=${pageSize}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            return response.json();
        })
        .then(data => {
            hideLoading();
            
            if (data.code === 200) {
                // 假设API返回的数据结构包含total、page、page_size等分页信息
                currentPage = data.page || page;
                totalPages = Math.ceil((data.total || data.data.length) / pageSize);
                totalItems = data.total || data.data.length;
                
                renderKnowledgeList(data.data);
                updatePagination();
            } else {
                showMessage(`获取数据失败：${data.message || '未知错误'}`, 'error');
                showEmptyState();
            }
        })
        .catch(error => {
            hideLoading();
            console.error('请求出错:', error);
            showMessage('请求出错，请稍后再试', 'error');
            showEmptyState();
        });
}

// 渲染知识列表
function renderKnowledgeList(data) {
    knowledgeList.innerHTML = ''; // 清空列表
    
    if (!data || data.length === 0) {
        showEmptyState();
        return;
    }
    
    showKnowledgeList();
    
    data.forEach(item => {
        const listItem = document.createElement('div');
        listItem.classList.add('list-item');
        listItem.style.padding = '16px';
        listItem.style.borderBottom = '1px solid #eee';
        listItem.style.transition = 'background-color 0.2s';
        listItem.style.cursor = 'pointer';
        
        listItem.addEventListener('mouseenter', () => {
            listItem.style.backgroundColor = '#f9f9f9';
        });
        
        listItem.addEventListener('mouseleave', () => {
            listItem.style.backgroundColor = '#fff';
        });
        
        listItem.innerHTML = `
            <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #333;">${item.title}</h3>
            <div style="display: flex; gap: 20px; margin-bottom: 8px; font-size: 14px; color: #666;">
                <span><strong>来源:</strong> ${item.source}</span>
                <span><strong>发布时间:</strong> ${item.publish}</span>
            </div>
            <div style="display: flex; justify-content: flex-end;">
                <a href="${item.url}" target="_blank" class="btn btn-secondary" style="padding: 4px 12px; font-size: 14px;">
                    阅读全文 <i class="fa-solid fa-arrow-up-right-from-square" style="margin-left: 4px;"></i>
                </a>
            </div>
        `;
        
        knowledgeList.appendChild(listItem);
    });
}

// 搜索功能
function searchKnowledge(query) {
    currentQuery = query;
    currentPage = 1; // 搜索时重置到第一页
    fetchKnowledgeList(currentPage, pageSize, query);
}

// 防抖搜索函数
const debouncedSearch = debounce((query) => {
    searchKnowledge(query);
}, 500);

// 搜索按钮点击事件
searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    searchKnowledge(query);
});

// 输入框防抖搜索
searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim();
    debouncedSearch(query);
});

// 回车键搜索
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        searchKnowledge(query);
    }
});

// 分页事件
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        fetchKnowledgeList(currentPage, pageSize, currentQuery);
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        fetchKnowledgeList(currentPage, pageSize, currentQuery);
    }
});

// 初始加载农业知识列表
fetchKnowledgeList(currentPage, pageSize);
