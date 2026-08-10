/* DropRugby Admin - versión estable y simple */
"use strict";

const state={content:{articles:[],fixtures:[],standings:[],players:[],instagram:[],trash:[],history:[],settings:{}},section:"dashboard"};

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const id=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);

function toast(title,msg="",type="ok"){const c=$("#toast-container");if(!c)return;const e=document.createElement("div");e.className="toast";e.innerHTML=`<strong>${esc(title)}</strong><span>${esc(msg)}</span>`;c.appendChild(e);setTimeout(()=>e.remove(),3500)}
function fmt(v){if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat("es-AR",{day:"2-digit",month:"short",year:"numeric"}).format(d)}
function fmtDT(v){if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):new Intl.DateTimeFormat("es-AR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(d)}
function slugify(v){return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}

async function api(action,body={}){
  const r=await fetch("/api/admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...body})});
  let data={};try{data=await r.json()}catch{}
  if(!r.ok||data.ok===false)throw new Error(data.error||"Error en el servidor");
  return data;
}
async function getContent(){
  const r=await fetch("/api/admin?action=get",{cache:"no-store"});
  const d=await r.json();
  if(!r.ok||!d.ok)throw new Error(d.error||"No se pudo cargar el contenido");
  state.content=d.content||state.content;renderAll();
}

function showApp(user="admin"){ $("#login-screen").classList.add("hidden");$("#admin-app").classList.remove("hidden");$("#admin-username").textContent=user;getContent().catch(e=>toast("Error",e.message,"error")) }
function showLogin(){$("#login-screen").classList.remove("hidden");$("#admin-app").classList.add("hidden")}
async function checkSession(){
  try{const r=await fetch("/api/admin?action=session",{cache:"no-store"});const d=await r.json();if(d.authenticated)showApp(d.user);else showLogin()}catch{showLogin()}
}

function switchSection(s){
  state.section=s;
  $$(".section").forEach(x=>x.classList.toggle("active",x.id==="section-"+s));
  $$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.section===s));
  const titles={dashboard:"Dashboard",articles:"Noticias",fixtures:"Partidos",standings:"Posiciones",players:"Jugadores",instagram:"Instagram",trash:"Papelera",history:"Historial",settings:"Configuración"};
  $("#page-title").textContent=titles[s]||s;
  $("#sidebar").classList.remove("open");$("#sidebar-overlay").classList.remove("show");
  if(s==="articles")renderArticles(); if(s==="fixtures")renderFixtures(); if(s==="standings")renderStandings(); if(s==="players")renderPlayers(); if(s==="instagram")renderInstagram(); if(s==="trash")renderTrash(); if(s==="history")renderHistory(); if(s==="settings")renderSettings();
}
function renderAll(){renderCounts();renderDashboard();renderArticles();renderFixtures();renderStandings();renderPlayers();renderInstagram();renderTrash();renderHistory();renderSettings()}
function renderCounts(){
  const c=state.content;
  $("#nav-articles-count").textContent=c.articles.length;$("#nav-fixtures-count").textContent=c.fixtures.length;$("#nav-players-count").textContent=c.players.length;$("#nav-trash-count").textContent=c.trash.length;
  $("#stat-articles").textContent=c.articles.length;$("#stat-fixtures").textContent=c.fixtures.length;$("#stat-teams").textContent=c.standings.length;$("#stat-players").textContent=c.players.length;
}
function articleStatus(a){
  if(a.scheduled && a.publishAt && new Date(a.publishAt)>new Date())return `<span class="badge scheduled">PROGRAMADA · ${esc(fmtDT(a.publishAt))}</span>`;
  if(a.published===false)return `<span class="badge">BORRADOR</span>`;
  return `<span class="badge live">PUBLICADA</span>`;
}
function renderDashboard(){
  const arts=[...state.content.articles].sort((a,b)=>new Date(b.createdAt||b.date)-new Date(a.createdAt||a.date));
  $("#dashboard-articles").innerHTML=arts.slice(0,6).map(a=>`<div class="list-item"><div><b>${esc(a.title)}</b><small class="muted">${esc(a.category||"Rugby")} · ${fmt(a.date)}</small></div><div>${articleStatus(a)}</div></div>`).join("")||`<div class="list-item muted">No hay noticias.</div>`;
  const sch=arts.filter(a=>a.scheduled&&a.publishAt&&new Date(a.publishAt)>new Date()).sort((a,b)=>new Date(a.publishAt)-new Date(b.publishAt));
  $("#dashboard-scheduled").innerHTML=sch.slice(0,6).map(a=>`<div class="list-item"><div><b>${esc(a.title)}</b><small class="muted">${esc(a.category||"Rugby")}</small></div><span class="badge scheduled">${esc(fmtDT(a.publishAt))}</span></div>`).join("")||`<div class="list-item muted">No hay noticias programadas.</div>`;
}
function filteredArticles(){
  const q=($("#article-search")?.value||"").toLowerCase(),cat=$("#article-category-filter")?.value||"";
  return state.content.articles.filter(a=>(!q||`${a.title} ${a.excerpt} ${a.author}`.toLowerCase().includes(q))&&(!cat||a.category===cat));
}
function renderArticles(){
  const rows=filteredArticles().sort((a,b)=>new Date(b.createdAt||b.date)-new Date(a.createdAt||a.date));
  $("#articles-table").innerHTML=rows.map(a=>`<tr>
<td class="title-cell">${esc(a.title)}<small>${esc(a.author||"DropRugby")}</small></td>
<td>${esc(a.category||"Rugby")}</td><td>${esc(fmt(a.date))}</td><td>${articleStatus(a)}</td>
<td><div class="actions"><button class="action" data-edit-article="${esc(a.id)}">EDITAR</button><button class="action ig" data-ig-article="${esc(a.id)}">INSTAGRAM</button><button class="action" data-delete-article="${esc(a.id)}">BORRAR</button></div></td></tr>`).join("")||`<tr><td colspan="5" class="muted">No hay noticias.</td></tr>`;
}
function renderFixtures(){
  const q=($("#fixture-search")?.value||"").toLowerCase(),filter=$("#fixture-status-filter")?.value||"";
  const arr=state.content.fixtures.filter(x=>(!q||JSON.stringify(x).toLowerCase().includes(q))).filter(x=>!filter||(filter==="finished"&&x.finished)||(filter==="upcoming"&&!x.finished));
  $("#fixtures-table").innerHTML=arr.map(x=>`<tr><td class="title-cell">${esc(x.home||x.team1||x.local||"Local")} vs ${esc(x.away||x.team2||x.visitante||"Visitante")}</td><td>${esc(x.date||fmt(x.datetime))}</td><td>${esc(x.competition||x.tournament||"—")}</td><td>${esc(x.score||x.result||"—")}</td><td><div class="actions"><button class="action" data-edit-fixture="${esc(x.id)}">EDITAR</button><button class="action" data-delete-fixture="${esc(x.id)}">BORRAR</button></div></td></tr>`).join("")||`<tr><td colspan="5" class="muted">No hay partidos.</td></tr>`;
}
function renderStandings(){
  $("#standings-table").innerHTML=state.content.standings.map(x=>`<tr><td class="title-cell">${esc(x.team||x.name||"Equipo")}</td><td>${esc(x.pj??x.played??0)}</td><td>${esc(x.pg??x.won??0)}</td><td>${esc(x.pe??x.drawn??0)}</td><td>${esc(x.pp??x.lost??0)}</td><td>${esc(x.points??x.pts??0)}</td><td><div class="actions"><button class="action" data-edit-team="${esc(x.id)}">EDITAR</button><button class="action" data-delete-team="${esc(x.id)}">BORRAR</button></div></td></tr>`).join("")||`<tr><td colspan="7" class="muted">No hay equipos.</td></tr>`;
}
function renderPlayers(){
  const q=($("#player-search")?.value||"").toLowerCase();
  const arr=state.content.players.filter(x=>(x.name||"").toLowerCase().includes(q));
  $("#players-grid").innerHTML=arr.map(x=>`<div class="card"><h3>${esc(x.name||"Jugador")}</h3><p>${esc(x.position||x.club||"")}</p><div class="actions"><button class="action" data-edit-player="${esc(x.id)}">EDITAR</button><button class="action" data-delete-player="${esc(x.id)}">BORRAR</button></div></div>`).join("")||`<div class="card muted">No hay jugadores.</div>`;
}
function renderInstagram(){
  const arr=state.content.instagram||[];
  $("#instagram-grid").innerHTML=arr.map(x=>`<div class="card"><span class="badge">${esc(x.status||"BORRADOR")}</span><h3 style="margin-top:10px">${esc(x.title||"Publicación")}</h3><p>${esc(x.caption||"")}</p><div class="actions"><button class="action" data-copy-caption="${esc(x.id)}">COPIAR TEXTO</button>${x.articleId?`<button class="action ig" data-publish-post="${esc(x.id)}">PUBLICAR</button>`:""}<button class="action" data-delete-instagram="${esc(x.id)}">BORRAR</button></div></div>`).join("")||`<div class="card muted">Todavía no hay publicaciones preparadas.</div>`;
}
function renderTrash(){
  $("#trash-list").innerHTML=state.content.trash.map(x=>`<div class="list-item"><div><b>${esc(x.item?.title||x.item?.name||"Elemento")}</b><small class="muted">${esc(x.type||"")}</small></div><div class="actions"><button class="action" data-restore="${esc(x.id)}">RESTAURAR</button><button class="action" data-permadelete="${esc(x.id)}">ELIMINAR</button></div></div>`).join("")||`<div class="list-item muted">La papelera está vacía.</div>`;
}
function renderHistory(){
  $("#history-list").innerHTML=(state.content.history||[]).slice(0,100).map(x=>`<div class="list-item"><div><b>${esc(x.action||"Cambio")}</b><small class="muted">${esc(x.type||"contenido")}</small></div><span class="muted">${esc(fmtDT(x.at||x.date))}</span></div>`).join("")||`<div class="list-item muted">No hay actividad.</div>`;
}
function renderSettings(){const s=state.content.settings||{};$("#settings-site-name").value=s.siteName||"DropRugby";$("#settings-site-description").value=s.description||"Noticias de rugby"}

function openModal(title,html,onSubmit){
  const root=$("#modal-root");root.innerHTML=`<div class="modal-back"><div class="modal"><div class="modal-head"><h2>${title}</h2><button class="modal-close">×</button></div><form id="modal-form"><div class="modal-body">${html}</div><div class="modal-actions"><button type="button" class="action modal-cancel">CANCELAR</button><button class="btn primary" type="submit">GUARDAR</button></div></form></div></div>`;
  root.querySelector(".modal-close").onclick=closeModal;root.querySelector(".modal-cancel").onclick=closeModal;root.querySelector(".modal-back").addEventListener("click",e=>{if(e.target.classList.contains("modal-back"))closeModal()});root.querySelector("#modal-form").onsubmit=async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;try{await onSubmit(new FormData(e.target));closeModal();await getContent();toast("Guardado","Los cambios fueron guardados.")}catch(err){toast("Error",err.message,"error");btn.disabled=false}};
}
function closeModal(){$("#modal-root").innerHTML=""}
function val(fd,k){return String(fd.get(k)||"").trim()}
function checked(fd,k){return fd.get(k)==="on"}

function articleForm(a={}){
  const isEdit=!!a.id;
  const publishLocal=a.publishAt?new Date(a.publishAt):null;
  const local=publishLocal&&!Number.isNaN(publishLocal.getTime())?new Date(publishLocal.getTime()-publishLocal.getTimezoneOffset()*60000).toISOString().slice(0,16):"";
  return `<div class="form-grid">
<label class="full">Título<input name="title" required value="${esc(a.title||"")}"></label>
<label>Categoría<select name="category"><option ${a.category==="Los Pumas"?"selected":""}>Los Pumas</option><option ${a.category==="Super Rugby"?"selected":""}>Super Rugby</option><option ${a.category==="URBA TOP 14"?"selected":""}>URBA TOP 14</option><option ${a.category==="URBA"?"selected":""}>URBA</option><option ${a.category==="Internacional"?"selected":""}>Internacional</option><option ${!a.category?"selected":""}>Rugby</option></select></label>
<label>Autor<input name="author" value="${esc(a.author||"DropRugby")}"></label>
<label class="full">Bajada / copete<textarea name="excerpt" rows="3">${esc(a.excerpt||"")}</textarea></label>
<label class="full">URL de imagen pública<input name="imageUrl" placeholder="https://..." value="${esc(a.imageUrl||a.image||"")}"></label>
<label>Fecha<input type="date" name="date" value="${esc((a.date||"").slice(0,10)||new Date().toISOString().slice(0,10))}"></label>
<label>Publicar a las <input type="datetime-local" name="publishAt" value="${esc(local)}"></label>
<label class="full">Contenido de la noticia<textarea name="content" rows="12" placeholder="Escribí la noticia. Separá párrafos con una línea en blanco.">${esc(a.content||"")}</textarea></label>
<label class="check"><input type="checkbox" name="featured" ${a.featured?"checked":""}> Noticia destacada</label>
<label class="check"><input type="checkbox" name="published" ${a.published!==false?"checked":""}> Publicada</label>
<label class="check"><input type="checkbox" name="scheduled" ${a.scheduled?"checked":""}> Programar publicación</label>
</div>`;
}
function openArticle(a={}){
  openModal(a.id?"Editar noticia":"Nueva noticia",articleForm(a),async fd=>{
    let publishAt="";
    if(val(fd,"publishAt")){const d=new Date(val(fd,"publishAt"));if(!Number.isNaN(d.getTime()))publishAt=d.toISOString()}
    const scheduled=checked(fd,"scheduled")&&!!publishAt;
    const article={id:a.id||id(),title:val(fd,"title"),slug:a.slug||slugify(val(fd,"title")),category:val(fd,"category"),author:val(fd,"author")||"DropRugby",excerpt:val(fd,"excerpt"),content:val(fd,"content"),imageUrl:val(fd,"imageUrl"),date:val(fd,"date"),featured:checked(fd,"featured"),published:checked(fd,"published"),scheduled,publishAt,createdAt:a.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    await api("create-article",{article});
  });
}

function instagramForm(post={}){
  return `<div class="form-grid">
<label class="full">Título<input name="title" value="${esc(post.title||"")}"></label>
<label class="full">Texto para Instagram<textarea name="caption" rows="8">${esc(post.caption||"")}</textarea></label>
<label class="full">Imagen pública<input name="imageUrl" placeholder="https://..." value="${esc(post.imageUrl||"")}"></label>
<label class="full">ID de noticia (opcional)<input name="articleId" value="${esc(post.articleId||"")}"></label>
</div>`;
}
function openInstagram(post={}){
  openModal(post.id?"Editar publicación":"Nueva publicación",instagramForm(post),async fd=>{
    const p={id:post.id||id(),title:val(fd,"title"),caption:val(fd,"caption"),imageUrl:val(fd,"imageUrl"),articleId:val(fd,"articleId"),status:post.status||"BORRADOR",updatedAt:new Date().toISOString()};
    await api("save-instagram",{post:p});
  });
}
function openInstagramFromArticle(a){
  const caption=`${a.title}\n\n${a.excerpt||""}\n\nLeé la nota completa en DropRugby.\n\n#DropRugby #Rugby #LosPumas`;
  openInstagram({title:a.title,caption,imageUrl:a.imageUrl||a.image||"",articleId:a.id});
}

function genericForm(title,fields,obj,action,key){
  const html=`<div class="form-grid">${fields.map(f=>`<label class="${f.full?"full":""}">${esc(f.label)}<input name="${esc(f.name)}" value="${esc(obj?.[f.name]??"")}"></label>`).join("")}</div>`;
  openModal(title,html,async fd=>{const item={...(obj||{}),id:obj?.id||id()};fields.forEach(f=>item[f.name]=val(fd,f.name));await api(action,{[key]:item})});
}
function openFixture(x={}){genericForm(x.id?"Editar partido":"Nuevo partido",[{name:"home",label:"Local"},{name:"away",label:"Visitante"},{name:"date",label:"Fecha"},{name:"competition",label:"Competición"},{name:"score",label:"Resultado"}],x,"create-fixture","fixture")}
function openTeam(x={}){genericForm(x.id?"Editar equipo":"Nuevo equipo",[{name:"team",label:"Equipo"},{name:"pj",label:"PJ"},{name:"pg",label:"PG"},{name:"pe",label:"PE"},{name:"pp",label:"PP"},{name:"points",label:"Puntos"}],x,"create-team","team")}
function openPlayer(x={}){genericForm(x.id?"Editar jugador":"Nuevo jugador",[{name:"name",label:"Nombre"},{name:"position",label:"Posición"},{name:"club",label:"Club"},{name:"number",label:"Número"}],x,"create-player","player")}

async function deleteItem(action,itemId){if(!confirm("¿Seguro que querés borrar este elemento?"))return;await api(action,{id:itemId});await getContent();toast("Eliminado","El elemento fue enviado a la papelera.")}
async function publishInstagram(postId){
  if(!confirm("¿Publicar esta publicación en Instagram ahora?"))return;
  try{const d=await api("publish-instagram",{postId});await getContent();toast("Instagram",d.message||"Publicación enviada a Instagram.")}catch(e){toast("No se pudo publicar",e.message,"error")}
}

document.addEventListener("click",e=>{
  const n=e.target.closest(".nav-item");if(n){switchSection(n.dataset.section);return}
  const g=e.target.closest("[data-go]");if(g){switchSection(g.dataset.go);return}
  if(e.target.closest("#dashboard-new-article")||e.target.closest("#new-article-button"))openArticle();
  else if(e.target.closest("#new-fixture-button"))openFixture();
  else if(e.target.closest("#new-team-button"))openTeam();
  else if(e.target.closest("#new-player-button"))openPlayer();
  else if(e.target.closest("#new-instagram-button"))openInstagram();
  const b=e.target.closest("[data-edit-article]");if(b)openArticle(state.content.articles.find(x=>x.id===b.dataset.editArticle)||{});
  const bi=e.target.closest("[data-ig-article]");if(bi){const a=state.content.articles.find(x=>x.id===bi.dataset.igArticle);if(a)openInstagramFromArticle(a)}
  const bd=e.target.closest("[data-delete-article]");if(bd)deleteItem("delete-article",bd.dataset.deleteArticle);
  const bf=e.target.closest("[data-edit-fixture]");if(bf)openFixture(state.content.fixtures.find(x=>x.id===bf.dataset.editFixture)||{});
  const bfd=e.target.closest("[data-delete-fixture]");if(bfd)deleteItem("delete-fixture",bfd.dataset.deleteFixture);
  const bt=e.target.closest("[data-edit-team]");if(bt)openTeam(state.content.standings.find(x=>x.id===bt.dataset.editTeam)||{});
  const btd=e.target.closest("[data-delete-team]");if(btd)deleteItem("delete-team",btd.dataset.deleteTeam);
  const bp=e.target.closest("[data-edit-player]");if(bp)openPlayer(state.content.players.find(x=>x.id===bp.dataset.editPlayer)||{});
  const bpd=e.target.closest("[data-delete-player]");if(bpd)deleteItem("delete-player",bpd.dataset.deletePlayer);
  const bpi=e.target.closest("[data-delete-instagram]");if(bpi)deleteItem("delete-instagram",bpi.dataset.deleteInstagram);
  const bpub=e.target.closest("[data-publish-post]");if(bpub)publishInstagram(bpub.dataset.publishPost);
  const bc=e.target.closest("[data-copy-caption]");if(bc){const p=state.content.instagram.find(x=>x.id===bc.dataset.copyCaption);navigator.clipboard?.writeText(p?.caption||"");toast("Copiado","Texto de Instagram copiado.")}
  const br=e.target.closest("[data-restore]");if(br)restore(br.dataset.restore);
  const bpr=e.target.closest("[data-permadelete]");if(bpr)deleteItem("permanent-delete",bpr.dataset.permadelete);
});
async function restore(x){try{await api("restore",{id:x});await getContent();toast("Restaurado","El elemento volvió a su sección.")}catch(e){toast("Error",e.message,"error")}}

$("#login-form").addEventListener("submit",async e=>{e.preventDefault();$("#login-error").textContent="";try{const d=await api("login",{username:$("#login-user").value,password:$("#login-password").value});showApp(d.user)}catch(err){$("#login-error").textContent=err.message}});
$("#logout-button").onclick=async()=>{try{await api("logout")}finally{showLogin()}};
$("#refresh-button").onclick=()=>getContent().then(()=>toast("Actualizado","Contenido actualizado."));
$("#menu-button").onclick=()=>{$("#sidebar").classList.add("open");$("#sidebar-overlay").classList.add("show")};
$("#sidebar-close").onclick=$("#sidebar-overlay").onclick=()=>{$("#sidebar").classList.remove("open");$("#sidebar-overlay").classList.remove("show")};
$("#article-search").oninput=renderArticles;$("#article-category-filter").onchange=renderArticles;$("#fixture-search").oninput=renderFixtures;$("#fixture-status-filter").onchange=renderFixtures;$("#player-search").oninput=renderPlayers;
$("#empty-trash-button").onclick=async()=>{if(confirm("¿Vaciar toda la papelera?")){await api("empty-trash");await getContent();toast("Papelera","Papelera vaciada.")}};
$("#clear-history-button").onclick=async()=>{if(confirm("¿Limpiar todo el historial?")){await api("clear-history");await getContent();toast("Historial","Historial limpiado.")}};
$("#settings-form").onsubmit=async e=>{e.preventDefault();await api("save-settings",{settings:{...(state.content.settings||{}),siteName:$("#settings-site-name").value,description:$("#settings-site-description").value}});await getContent();toast("Configuración","Guardada.")};

checkSession();
