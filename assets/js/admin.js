(() => {
  const state = { articles: [], fixtures: [], editingArticle: null, editingFixture: null };
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const formatDate = iso => { if (!iso) return ''; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; };
  const today = () => new Date().toISOString().slice(0,10);
  const slugify = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);

  async function api(action, payload={}) {
    const res = await fetch('/api/admin', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action,...payload}) });
    let data={}; try { data=await res.json(); } catch {}
    if (!res.ok) throw new Error(data.error || 'Ocurrió un error.');
    return data;
  }
  async function loadData() {
    const res = await fetch('/api/content', { cache:'no-store' });
    if (!res.ok) throw new Error('No se pudo conectar con el contenido de DropRugby.');
    const data = await res.json();
    state.articles = Array.isArray(data.articles) ? data.articles : [];
    state.fixtures = Array.isArray(data.fixtures) ? data.fixtures : [];
  }
  async function saveData() {
    await api('save', { articles: state.articles, fixtures: state.fixtures });
    window.dispatchEvent(new Event('droprugby:data-updated'));
  }

  function showApp(){ $('#login-view').hidden=true; $('#app-view').hidden=false; renderAll(); }
  function switchSection(name){
    $$('.admin-section').forEach(x=>x.classList.toggle('active', x.id===`section-${name}`));
    $$('.admin-nav').forEach(x=>x.classList.toggle('active', x.dataset.section===name));
    const titles={dashboard:'Dashboard',articles:'Noticias',fixtures:'Partidos',data:'Datos y respaldo'};
    $('#section-title').textContent=titles[name]||name;
  }
  function renderDashboard(){
    $('#stat-articles').textContent=state.articles.length; $('#stat-fixtures').textContent=state.fixtures.length;
    $('#dashboard-articles').innerHTML=state.articles.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(a=>`<div class="admin-list-item"><div><strong>${esc(a.title)}</strong><small>${esc(a.category)} · ${esc(a.author||'DropRugby')}</small></div><span class="date">${formatDate(a.date)}</span></div>`).join('') || '<p class="admin-muted">No hay noticias.</p>';
    $('#dashboard-fixtures').innerHTML=state.fixtures.slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,5).map(f=>`<div class="admin-list-item"><div><strong>${esc(f.home)} vs. ${esc(f.away)}</strong><small>${esc(f.competition)} · ${esc(f.channel||'')}</small></div><span class="date">${formatDate(f.date)}<br>${esc(f.time)}</span></div>`).join('') || '<p class="admin-muted">No hay partidos.</p>';
  }
  function renderArticles(){
    const q=($('#article-search')?.value||'').toLowerCase(), cat=$('#article-filter')?.value||'TODAS';
    const rows=state.articles.slice().sort((a,b)=>b.date.localeCompare(a.date)).filter(a=>(cat==='TODAS'||a.category===cat)&&(!q||`${a.title} ${a.category} ${a.subcategory||''}`.toLowerCase().includes(q)));
    $('#articles-table').innerHTML=rows.map(a=>`<tr><td><strong>${esc(a.title)}</strong><br><small>${esc(a.author||'DropRugby')}</small></td><td>${esc(a.category)}<br><small>${esc(a.subcategory||'Actualidad')}</small></td><td>${formatDate(a.date)}</td><td><span class="badge">PUBLICADA</span></td><td><div class="row-actions"><button data-edit-article="${esc(a.id)}">Editar</button><button data-delete-article="${esc(a.id)}">Eliminar</button></div></td></tr>`).join('')||'<tr><td colspan="5" class="empty-row">No hay noticias con esos filtros.</td></tr>';
  }
  function renderFixtures(){
    const q=($('#fixture-search')?.value||'').toLowerCase(), comp=$('#fixture-filter')?.value||'TODAS';
    const rows=state.fixtures.map((f,i)=>({...f,_i:i})).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).filter(f=>(comp==='TODAS'||f.competition===comp)&&(!q||`${f.home} ${f.away} ${f.competition}`.toLowerCase().includes(q)));
    $('#fixtures-table').innerHTML=rows.map(f=>`<tr><td><strong>${formatDate(f.date)}</strong></td><td>${esc(f.competition)}</td><td><strong>${esc(f.home)} — ${esc(f.away)}</strong>${f.venue?`<br><small>${esc(f.venue)}</small>`:''}</td><td>${esc(f.time)}</td><td>${esc(f.channel||'—')}</td><td><div class="row-actions"><button data-edit-fixture="${f._i}">Editar</button><button data-delete-fixture="${f._i}">Eliminar</button></div></td></tr>`).join('')||'<tr><td colspan="6" class="empty-row">No hay partidos con esos filtros.</td></tr>';
  }
  function renderAll(){ renderDashboard(); renderArticles(); renderFixtures(); }

  function openArticle(id=null){
    state.editingArticle=id; const a=id?state.articles.find(x=>x.id===id):null;
    $('#modal-kicker').textContent=a?'EDITAR PUBLICACIÓN':'NUEVA PUBLICACIÓN'; $('#modal-title').textContent=a?'Editar noticia':'Nueva noticia';
    $('#article-id').value=a?.id||''; $('#article-title').value=a?.title||''; $('#article-category').value=a?.category||'Los Pumas'; $('#article-subcategory').value=a?.subcategory||'Actualidad'; $('#article-author').value=a?.author||'DropRugby'; $('#article-date').value=a?.date||today(); $('#article-image').value=a?.imageUrl||a?.imageClass||'img-tone-1'; $('#article-excerpt').value=a?.excerpt||''; $('#article-content').value=a?.content||''; $('#article-featured').checked=!!a?.featured; $('#editor-modal').hidden=false;
  }
  async function saveArticle(e){
    e.preventDefault();
    const title=$('#article-title').value.trim(); const id=$('#article-id').value||`${slugify(title)}-${Date.now().toString().slice(-5)}`;
    const image=$('#article-image').value.trim()||'img-tone-1';
    const article={id,title,category:$('#article-category').value,subcategory:$('#article-subcategory').value.trim(),date:$('#article-date').value,author:$('#article-author').value.trim(),excerpt:$('#article-excerpt').value.trim(),content:$('#article-content').value.trim(),featured:$('#article-featured').checked,url:`article.html?id=${encodeURIComponent(id)}`};
    if (/^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(image)) article.imageUrl=image; else article.imageClass=image;
    if (article.featured) state.articles.forEach(a=>a.featured=false);
    const idx=state.articles.findIndex(a=>a.id===id); if(idx>=0) state.articles[idx]=article; else state.articles.push(article);
    try { await saveData(); closeModals(); renderAll(); switchSection('articles'); toast('Noticia publicada correctamente.'); } catch(e){ alert(e.message); }
  }
  async function deleteArticle(id){ if(!confirm('¿Eliminar esta noticia?'))return; state.articles=state.articles.filter(a=>a.id!==id); try{await saveData();renderAll();toast('Noticia eliminada.');}catch(e){alert(e.message);} }
  function openFixture(index=null){
    state.editingFixture=index; const f=index!==null?state.fixtures[index]:null;
    $('#fixture-modal-title').textContent=f?'Editar partido':'Nuevo partido'; $('#fixture-index').value=index===null?'':index; $('#fixture-competition').value=f?.competition||'Los Pumas'; $('#fixture-home').value=f?.home||''; $('#fixture-away').value=f?.away||''; $('#fixture-date').value=f?.date||today(); $('#fixture-time').value=f?.time||'16:00'; $('#fixture-venue').value=f?.venue||''; $('#fixture-channel').value=f?.channel||'ESPN'; $('#fixture-modal').hidden=false;
  }
  async function saveFixture(e){
    e.preventDefault(); const index=$('#fixture-index').value; const f={date:$('#fixture-date').value,competition:$('#fixture-competition').value,time:$('#fixture-time').value,home:$('#fixture-home').value.trim(),away:$('#fixture-away').value.trim(),channel:$('#fixture-channel').value.trim(),venue:$('#fixture-venue').value.trim()};
    if(index==='') state.fixtures.push(f); else state.fixtures[Number(index)]=f;
    try{await saveData();closeModals();renderAll();switchSection('fixtures');toast('Partido guardado.');}catch(e){alert(e.message);}
  }
  async function deleteFixture(i){if(!confirm('¿Eliminar este partido?'))return;state.fixtures.splice(Number(i),1);try{await saveData();renderAll();toast('Partido eliminado.');}catch(e){alert(e.message);}}
  function closeModals(){$('#editor-modal').hidden=true;$('#fixture-modal').hidden=true;}
  function exportData(){const blob=new Blob([JSON.stringify({articles:state.articles,fixtures:state.fixtures},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='droprugby-backup.json';a.click();URL.revokeObjectURL(a.href);}
  function importData(file){if(!file)return;const r=new FileReader();r.onload=async()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.articles)||!Array.isArray(d.fixtures))throw Error();state.articles=d.articles;state.fixtures=d.fixtures;await saveData();renderAll();alert('Datos importados correctamente.');}catch(e){alert(e.message||'El archivo no tiene un formato DropRugby válido.')}};r.readAsText(file);}
  async function resetData(){if(!confirm('Esto reemplazará el contenido online por los datos demo iniciales. ¿Continuar?'))return;try{const res=await fetch('/data/articles.json');const articles=await res.json();const fr=await fetch('/data/fixtures.json');const fixtures=await fr.json();state.articles=articles;state.fixtures=fixtures;await saveData();renderAll();toast('Datos demo restaurados.');}catch(e){alert(e.message);}}
  function toast(message){let t=$('#admin-toast');if(!t){t=document.createElement('div');t.id='admin-toast';document.body.appendChild(t);}t.textContent=message;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),2600);}

  async function login(e){
    e.preventDefault(); const btn=$('#login-form button'); btn.disabled=true; $('#login-error').textContent='';
    try{await api('login',{username:$('#login-user').value.trim(),password:$('#login-pass').value});await loadData();showApp();}
    catch(err){$('#login-error').textContent=err.message;}
    finally{btn.disabled=false;}
  }
  async function logout(){try{await api('logout');}finally{location.reload();}}

  $('#login-form').addEventListener('submit',login); $('#logout-btn').addEventListener('click',logout);
  $$('.admin-nav').forEach(b=>b.addEventListener('click',()=>switchSection(b.dataset.section)));
  $$('[data-go]').forEach(b=>b.addEventListener('click',()=>switchSection(b.dataset.go)));
  $$('[data-action="new-article"]').forEach(b=>b.addEventListener('click',()=>openArticle())); $$('[data-action="new-fixture"]').forEach(b=>b.addEventListener('click',()=>openFixture()));
  $('#article-form').addEventListener('submit',saveArticle); $('#fixture-form').addEventListener('submit',saveFixture); $$('[data-close]').forEach(b=>b.addEventListener('click',closeModals));
  $('#article-search').addEventListener('input',renderArticles); $('#article-filter').addEventListener('change',renderArticles); $('#fixture-search').addEventListener('input',renderFixtures); $('#fixture-filter').addEventListener('change',renderFixtures);
  document.addEventListener('click',e=>{const ea=e.target.closest('[data-edit-article]'),da=e.target.closest('[data-delete-article]'),ef=e.target.closest('[data-edit-fixture]'),df=e.target.closest('[data-delete-fixture]');if(ea)openArticle(ea.dataset.editArticle);if(da)deleteArticle(da.dataset.deleteArticle);if(ef)openFixture(Number(ef.dataset.editFixture));if(df)deleteFixture(Number(df.dataset.deleteFixture));});
  $('#export-data').addEventListener('click',exportData); $('#import-data').addEventListener('change',e=>importData(e.target.files[0])); $('#reset-data').addEventListener('click',resetData);

  (async()=>{ try { await api('session'); await loadData(); showApp(); } catch {} })();
})();
