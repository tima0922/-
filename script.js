// script.js - улучшенный фронтенд: localStorage, модалки, поиск, загрузка фото
const LS_KEYS = { NEWS: 'atk_news_v1', GALLERY: 'atk_gallery_v1' };
const defaults = {
  news: [
    {id: cryptoRandom(), date:'10 ноября', text:'Участие в международной конференции IT и автоматизации!', img: 'assets/news1.svg'},
    {id: cryptoRandom(), date:'12 ноября', text:'Наши студенты прошли практику на IT‑предприятии.', img: 'assets/news2.svg'}
  ],
  gallery: [
    'assets/team.svg','assets/news1.svg'
  ]
};

function cryptoRandom(){ return Math.random().toString(36).slice(2,10); }

function $(sel, ctx=document){ return ctx.querySelector(sel); }
function $all(sel, ctx=document){ return [...ctx.querySelectorAll(sel)]; }

function readLS(){ 
  try{
    return {
      news: JSON.parse(localStorage.getItem(LS_KEYS.NEWS)) || defaults.news,
      gallery: JSON.parse(localStorage.getItem(LS_KEYS.GALLERY)) || defaults.gallery
    };
  }catch(e){ console.warn('LS parse fail',e); return defaults; }
}
function writeLS(data){
  localStorage.setItem(LS_KEYS.NEWS, JSON.stringify(data.news));
  localStorage.setItem(LS_KEYS.GALLERY, JSON.stringify(data.gallery));
}

let state = readLS();

// --- Tabs ---
$all('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $all('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    $all('.tab-panel').forEach(p=>{ p.hidden = p.id !== tab; p.classList.toggle('active', p.id===tab); });
    window.scrollTo({top:0,behavior:'smooth'});
  });
});

// --- Toaster ---
function toast(msg, time=2200){
  const t = $('#toasts');
  t.hidden = false;
  t.textContent = msg;
  setTimeout(()=>{ t.hidden = true; t.textContent=''; }, time);
}

// --- News rendering with search and edit/delete ---
const newsListEl = $('#news-list');
function renderNews(filter=''){
  newsListEl.innerHTML = '';
  const filtered = state.news.filter(n=> (n.text + ' ' + (n.date||'')).toLowerCase().includes(filter.toLowerCase()));
  if(filtered.length===0){ newsListEl.innerHTML = '<li class="news-empty">Новостей не найдено.</li>'; return; }
  filtered.forEach(item=>{
    const li = document.createElement('li'); li.className='news-item';
    li.innerHTML = `
      <img src="${item.img||'assets/placeholder.svg'}" alt="Фото новости" />
      <div class="news-meta">
        <div><strong>${item.date||''}</strong></div>
        <div class="news-text">${escapeHtml(item.text)}</div>
      </div>
      <div class="news-actions">
        <button class="btn edit" data-id="${item.id}">Ред.</button>
        <button class="btn" data-id="${item.id}" data-action="delete">Удалить</button>
      </div>
    `;
    newsListEl.appendChild(li);
  });
}

function escapeHtml(s){ return (s+'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }

$('#news-search').addEventListener('input', (e)=> renderNews(e.target.value));

// --- News modal (add/edit) ---
const modal = $('#news-modal');
const newsForm = $('#news-form');
let editId = null;

$('#add-news').addEventListener('click', ()=> openModal());
$all('.modal-close').forEach(b=>b.addEventListener('click', closeModal));
$('#modal-cancel').addEventListener('click', closeModal);

newsListEl.addEventListener('click', (e)=>{
  const id = e.target.dataset.id;
  if(!id) return;
  if(e.target.dataset.action === 'delete'){
    if(confirm('Удалить новость?')) {
      state.news = state.news.filter(n=>n.id!==id);
      writeLS(state);
      renderNews($('#news-search').value);
      toast('Новость удалена');
    }
    return;
  }
  if(e.target.classList.contains('edit')){
    const item = state.news.find(n=>n.id===id);
    if(item) openModal(item);
  }
});

function openModal(item=null){
  editId = item ? item.id : null;
  modal.setAttribute('aria-hidden','false');
  $('#news-text').value = item ? item.text : '';
  $('#news-image-url').value = item && item.img && item.img.startsWith('http') ? item.img : '';
  $('#news-image-file').value = '';
  $('#modal-title').textContent = item ? 'Редактировать новость' : 'Добавить новость';
}

function closeModal(){ modal.setAttribute('aria-hidden','true'); editId=null; newsForm.reset(); }

newsForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const text = $('#news-text').value.trim();
  const url = $('#news-image-url').value.trim();
  const file = $('#news-image-file').files[0];
  if(!text){ alert('Введите текст новости'); return; }
  let img = url || '';
  if(file){
    img = await fileToDataURL(file);
  }
  const date = new Date().toLocaleDateString('ru-RU', {day:'2-digit', month:'long'});
  if(editId){
    const idx = state.news.findIndex(n=>n.id===editId);
    if(idx>-1){ state.news[idx].text = text; state.news[idx].img = img || state.news[idx].img; }
    toast('Новость обновлена');
  } else {
    state.news.unshift({id:cryptoRandom(), date, text, img: img || 'assets/placeholder.svg'});
    toast('Новость добавлена');
  }
  writeLS(state);
  renderNews($('#news-search').value);
  closeModal();
});

function fileToDataURL(file){
  return new Promise((res,rej)=>{
    const reader = new FileReader();
    reader.onload = ()=>res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

// --- Gallery: upload multiple, preview, remove, clear ---
const galleryGrid = $('#gallery-grid');
function renderGallery(){
  galleryGrid.innerHTML = '';
  state.gallery.forEach((src, idx)=>{
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Фото группы';
    img.dataset.idx = idx;
    img.addEventListener('click', ()=> openViewer(src));
    const wrapper = document.createElement('div');
    wrapper.style.position='relative';
    wrapper.appendChild(img);
    const del = document.createElement('button');
    del.className='btn';
    del.textContent='×';
    del.title='Удалить';
    del.style.position='absolute'; del.style.top='6px'; del.style.right='6px';
    del.addEventListener('click', (ev)=>{ ev.stopPropagation(); if(confirm('Удалить фото?')){ state.gallery.splice(idx,1); writeLS(state); renderGallery(); toast('Фото удалено'); }});
    wrapper.appendChild(del);
    galleryGrid.appendChild(wrapper);
  });
}
$('#gallery-file').addEventListener('change', async (e)=>{
  const files = [...e.target.files];
  for(const f of files){
    const data = await fileToDataURL(f);
    state.gallery.unshift(data);
  }
  writeLS(state);
  renderGallery();
  toast('Фото добавлены');
  e.target.value='';
});
$('#clear-gallery').addEventListener('click', ()=>{
  if(confirm('Очистить всю галерею?')){ state.gallery = []; writeLS(state); renderGallery(); toast('Галерея очищена'); }
});

// --- Viewer ---
const viewer = $('#viewer');
$('#viewer-close').addEventListener('click', ()=> viewer.hidden = true);
function openViewer(src){ viewer.querySelector('img').src = src; viewer.hidden = false; }

// --- Contact form simple handling ---
$('#contact-form').addEventListener('submit', (e)=>{
  e.preventDefault();
  const name = $('#cf-name').value.trim(), email = $('#cf-email').value.trim(), msg = $('#cf-message').value.trim();
  if(!name || !email || !msg){ alert('Заполните все поля'); return; }
  if(!email.match(/.+@.+\..+/)){ alert('Некорректный email'); return; }
  toast('Спасибо, сообщение отправлено');
  e.target.reset();
});

// --- Init ---
renderNews();
renderGallery();

// --- Utilities ---
(function(){ // attach modal close handlers (some browsers)
  $all('.modal-close').forEach(b=>b.addEventListener('click', closeModal));
  // close modal on ESC
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ if(modal.getAttribute('aria-hidden')==='false') closeModal(); if(!viewer.hidden) viewer.hidden = true; }});
})();
