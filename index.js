// 退出登录（前端本地清理，不跳转，不请求后端）
document.getElementById('btn-logout').onclick = function() {
  try { localStorage.removeItem('auth_token'); } catch {}
  alert('已清理本地登录信息');
};

// ---------------- 新闻轮播 ----------------
const slidesEl = document.getElementById('news-slides');
const dotsEl = document.getElementById('news-dots');
const msgNews = document.getElementById('msg-news');
let news = [];
let idx = 0, timer = null;

async function fetchNews() {
  msgNews.textContent = '加载中...';
  try {
    const res = await fetch('/api/news');
    const json = await res.json();
    if (json && Array.isArray(json.newsList)) {
      news = json.newsList;
    } else {
      throw new Error('bad response');
    }
  } catch (_) {
    news = [
      { newsId:1, title:'占位新闻A', imgUrl:'https://picsum.photos/seed/a/1200/600', newsUrl:'https://example.com/a' },
      { newsId:2, title:'占位新闻B', imgUrl:'https://picsum.photos/seed/b/1200/600', newsUrl:'https://example.com/b' },
      { newsId:3, title:'占位新闻C', imgUrl:'https://picsum.photos/seed/c/1200/600', newsUrl:'https://example.com/c' }
    ];
    msgNews.textContent = '使用示例数据展示（后端未就绪）';
  }
  renderNews();
  startAuto();
}

function renderNews(){
  slidesEl.innerHTML = news.map(n=>
    `<a class="slide" href="${n.newsUrl}" target="_blank" rel="noopener">
       <img src="${n.imgUrl}" alt="${n.title}">
       <div class="title">${n.title}</div>
     </a>`).join('');
  dotsEl.innerHTML = news.map((_,i)=>`<span class="dot ${i===idx?'active':''}" data-i="${i}"></span>`).join('');
  updateSlide();
}

function updateSlide(){
  slidesEl.style.transform = `translateX(-${idx*100}%)`;
  [...dotsEl.children].forEach((d,i)=>d.classList.toggle('active', i===idx));
}
function startAuto(){ stopAuto(); timer = setInterval(()=>{ idx = (idx+1) % news.length; updateSlide(); }, 3500); }
function stopAuto(){ if(timer){ clearInterval(timer); timer=null; } }

dotsEl.addEventListener('click', e=>{
  const t = e.target; if(!t.classList.contains('dot')) return; idx = parseInt(t.getAttribute('data-i'),10)||0; updateSlide();
});
document.getElementById('news-refresh').onclick = ()=>{ idx=0; fetchNews(); };

// ---------------- 金融产品 ----------------
const productsGrid = document.getElementById('products-grid');
const msgProducts = document.getElementById('msg-products');

async function fetchProducts(){
  msgProducts.textContent = '加载中...';
  try {
    const res = await fetch('/api/financing/products/');
    const json = await res.json();
    if (json && Array.isArray(json.products)) {
      renderProducts(json.products);
      msgProducts.textContent = '';
      return;
    }
    throw new Error('bad response');
  } catch (_) {
    const demo = [
      { fpId: 1, fpName: '惠农贷', fpDescription: '面向农户的小额贷款', annualRate: 3.8, tags:['普惠','低息'] },
      { fpId: 2, fpName: '供应链保理', fpDescription: '产业链上下游融资', annualRate: 4.2, tags:['保理','灵活'] },
      { fpId: 3, fpName: '农业设备租赁', fpDescription: '分期租赁农业机械', annualRate: 0, tags:['租赁','设备'] }
    ];
    renderProducts(demo);
    msgProducts.textContent = '使用示例数据展示（后端未就绪）';
  }
}

function renderProducts(list){
  productsGrid.innerHTML = list.map(p=>
    `<div class="product">
       <div class="name">${p.fpName}</div>
       <div class="desc">${p.fpDescription||''}</div>
       <div class="rate">${p.annualRate? ('年化 ' + p.annualRate + '%') : '—'}</div>
       <div class="tags">${(p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
     </div>`
  ).join('');
}

document.getElementById('products-refresh').onclick = fetchProducts;

// ---------------- 专家列表 ----------------
const expertsList = document.getElementById('experts-list');
const msgExperts = document.getElementById('msg-experts');

async function fetchExperts(){
  msgExperts.textContent = '加载中...';
  try {
    const res = await fetch('/api/experts/');
    const json = await res.json();
    if (json && Array.isArray(json.experts)) {
      renderExperts(json.experts);
      msgExperts.textContent = '';
      return;
    }
    throw new Error('bad response');
  } catch (_) {
    const demo = [
      { expertId:1, expertName:'李田', field:['作物病虫害','小麦'], expertDescription:'从事农作物病虫害研究20年' },
      { expertId:2, expertName:'王青', field:['金融服务','乡村振兴'], expertDescription:'涉农金融与普惠金融研究' },
      { expertId:3, expertName:'周木', field:['智能灌溉','设施农业'], expertDescription:'智慧农业设备与节水灌溉' }
    ];
    renderExperts(demo);
    msgExperts.textContent = '使用示例数据展示（后端未就绪）';
  }
}

function renderExperts(list){
  expertsList.innerHTML = list.map(e=>
    `<div class="expert">
       <div class="name">${e.expertName}</div>
       <div class="fields">研究方向：${(e.field||[]).join('、')}</div>
       <div class="desc">${e.expertDescription||''}</div>
     </div>`
  ).join('');
}

// 初始化
fetchNews();
fetchProducts();
fetchExperts();

