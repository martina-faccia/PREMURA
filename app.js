const DB="premura-db-v1";
const TODAY=()=>new Date().toISOString().slice(0,10);
const tomorrow=()=>{let d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)}
const defaultState={profiles:[],reminders:[],documents:[],settings:{notifications:false},user:null};
let S=JSON.parse(localStorage.getItem(DB)||"null")||defaultState,page="home",selectedDate=TODAY(),draft={};
const app=document.querySelector("#app"),nav=document.querySelector("#bottomNav");
const save=()=>localStorage.setItem(DB,JSON.stringify(S));
const P=id=>S.profiles.find(x=>x.id==id);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

window.onPremuraFirebaseUser=function(u){
 if(!u)return;
 S.user={uid:u.uid,name:u.displayName||"Utente",email:u.email||"",photoURL:u.photoURL||"",provider:"google"};
 save();
 if(!S.profiles.length){onboarding()}else{nav.style.display="grid";go("home")}
};

function toast(t){let d=document.createElement("div");d.className="toast";d.textContent=t;document.querySelector("#toastHost").append(d);setTimeout(()=>d.remove(),1900)}
function header(t,s=""){return `<div class="top"><div><h1>${t}</h1>${s?`<p class="sub">${s}</p>`:""}</div><img class="brandLogo" src="premura-logo.png" alt="Premura"></div>`}
function setNav(){
function authScreen(mode="welcome"){
 page="auth";setNav();nav.style.display="none";
 if(mode==="welcome"){
  app.innerHTML=`<div class="authWrap"><img src="premura-logo.png" class="authLogo"><h1 class="authTitle">Premura</h1><p class="sub">Ricorda ciò che conta, in un unico posto.</p><div class="authActions"><button class="googleAuth" type="button" onclick="premuraGoogleLogin()"><span class="googleG">G</span><span>Continua con Google</span></button><div class="authDivider"><span>oppure</span></div><button class="primary" onclick="authScreen('register')">Crea account</button><button class="secondary" onclick="authScreen('login')">Accedi</button></div></div>`;return;
 }
 if(mode==="register"){
  app.innerHTML=`<button class="back" onclick="authScreen()">‹</button><h1>Crea account</h1><p class="sub">Bastano pochi dati per iniziare.</p><form onsubmit="registerUser(event)"><label>Nome</label><input id="rn" required autocomplete="name"><label>Email</label><input id="re" required type="email" autocomplete="email"><label>Password</label><input id="rp" required type="password" minlength="6" autocomplete="new-password"><label class="checkline"><input id="privacy" type="checkbox" required><span>Accetto l’informativa privacy e le condizioni d’uso.</span></label><button class="primary">Crea account</button></form><button class="authLink" onclick="authScreen('login')">Hai già un account? Accedi</button>`;return;
 }
 app.innerHTML=`<button class="back" onclick="authScreen()">‹</button><h1>Accedi</h1><p class="sub">Bentornato su Premura.</p><form onsubmit="loginUser(event)"><label>Email</label><input id="le" required type="email" autocomplete="email"><label>Password</label><input id="lp" required type="password" autocomplete="current-password"><button class="primary">Accedi</button></form><button class="authLink" onclick="toast('Il recupero password sarà collegato al backend')">Password dimenticata?</button><button class="authLink" onclick="authScreen('register')">Crea un nuovo account</button>`;
}
function registerUser(e){
 e.preventDefault();
 S.user={name:rn.value.trim(),email:re.value.trim(),demoAuth:true};save();onboarding();
}
function loginUser(e){
 e.preventDefault();
 S.user={name:le.value.split("@")[0],email:le.value.trim(),demoAuth:true};save();
 if(!S.profiles.length)onboarding();else{nav.style.display="grid";go("home")}
}
function onboarding(){
 nav.style.display="none";page="auth";setNav();
 app.innerHTML=`<button class="back" onclick="authScreen()">‹</button><h1>Da dove iniziamo?</h1><p class="sub">Crea il tuo primo profilo. Potrai aggiungerne altri quando vuoi.</p><div class="onboardGrid">${[
 ["Bambino","Figlio, nipote o minore"],
 ["Persona anziana","Genitore o altra persona"],
 ["Animale","Cane, gatto o altro"],
 ["Me stesso","Promemoria personali"]
 ].map(x=>`<button class="onboardChoice" onclick="firstProfile('${x[0]}')"><b>${x[0]}</b><span>${x[1]}</span></button>`).join("")}</div>`;
}
function firstProfile(type){
 app.innerHTML=`<button class="back" onclick="onboarding()">‹</button><h1>${type}</h1><p class="sub">Come vuoi chiamare questo profilo?</p><form onsubmit="saveFirstProfile(event,'${type}')"><label>Nome</label><input id="firstName" required autofocus><button class="primary">Inizia</button></form>`;
}
function saveFirstProfile(e,type){
 e.preventDefault();S.profiles.push({id:Date.now(),name:firstName.value.trim(),type});save();nav.style.display="grid";go("home");toast("Profilo creato ✓");
}
async async function logout(){if(window.premuraGoogleLogout)await window.premuraGoogleLogout();S.user=null;save();authScreen()}
document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.page===page))}
function go(p){page=p;setNav();({home,calendar,profiles,more}[p]||home)();scrollTo(0,0)}
function reminderCard(r){let p=P(r.profile);return `<div class="card" onclick="editReminder(${r.id})"><i class="marker"></i><div class="grow"><h3>${esc(p?.name)} · ${esc(r.title)}</h3><span class="small">${esc(r.category)} · ${fmtDate(r.date)}</span></div><span class="time">${esc(r.time||"")}</span></div>`}
function fmtDate(s){if(!s)return"";let [y,m,d]=s.split("-");return `${d}/${m}/${y}`}
function home(){
 let t=TODAY(),today=S.reminders.filter(r=>r.date===t).sort(sortR),future=S.reminders.filter(r=>r.date>t).sort(sortR),attention=[...today,...future.slice(0,3)];
 app.innerHTML=header("Premura","Ricorda ciò che conta.")+
 `<div class="search"><span>⌕</span><input id="globalQ" type="search" placeholder="Cerca profili, promemoria, documenti..." oninput="globalSearch(this.value)"></div><div id="globalOut"></div>
 <section class="control"><div><b class="eyebrow">CONTROLLO</b><h2>${attention.length?attention.length+" cose da controllare":"Tutto sotto controllo ✓"}</h2><span class="small">${attention.length?"Ecco le attività più vicine.":"Nessuna scadenza urgente."}</span></div><div class="count">${attention.length||"✓"}</div></section>
 <div class="profileStrip">${S.profiles.map((p,i)=>`<button class="mini ${i===0?"active":""}" onclick="openProfile(${p.id})"><div class="avatar">${esc(p.name[0])}</div><b>${esc(p.name)}</b><span class="small">${esc(p.type)}</span></button>`).join("")}<button class="mini" onclick="addProfile()"><div class="avatar y">+</div><b>Aggiungi</b></button></div>
 <h2>Oggi</h2>${today.length?today.map(reminderCard).join(""):`<div class="empty">Niente da ricordare oggi.</div>`}
 <h2>Prossimamente</h2>${future.length?future.slice(0,4).map(reminderCard).join(""):`<div class="empty">Nessuna scadenza vicina.</div>`}`;
}
function sortR(a,b){return (a.date+a.time).localeCompare(b.date+b.time)}
function globalSearch(v){
 let q=v.trim().toLowerCase(),o=document.querySelector("#globalOut");if(!q){o.innerHTML="";return}
 let ps=S.profiles.filter(p=>(p.name+" "+p.type).toLowerCase().includes(q));
 let rs=S.reminders.filter(r=>((P(r.profile)?.name||"")+" "+r.title+" "+r.category).toLowerCase().includes(q));
 let ds=S.documents.filter(d=>((P(d.profile)?.name||"")+" "+d.name+" "+d.category).toLowerCase().includes(q));
 let h=`<div class="searchResults">`;
 if(ps.length)h+=`<b class="sectionLabel">PROFILI</b>`+ps.map(p=>`<button class="result" onclick="openProfile(${p.id})">${esc(p.name)} · ${esc(p.type)}</button>`).join("");
 if(rs.length)h+=`<b class="sectionLabel">PROMEMORIA</b>`+rs.slice(0,5).map(r=>`<button class="result" onclick="editReminder(${r.id})">${esc(P(r.profile)?.name)} · ${esc(r.title)}</button>`).join("");
 if(ds.length)h+=`<b class="sectionLabel">DOCUMENTI</b>`+ds.slice(0,5).map(d=>`<button class="result" onclick="documents(${d.profile})">${esc(d.name)} · ${esc(P(d.profile)?.name)}</button>`).join("");
 if(!ps.length&&!rs.length&&!ds.length)h+=`<div class="empty">Nessun risultato.</div>`;
 o.innerHTML=h+"</div>";
}
function profiles(){app.innerHTML=header("Profili","Gestisci le persone e gli animali di cui ti occupi.")+`<div class="list">${S.profiles.map(p=>`<button class="row" onclick="openProfile(${p.id})"><span><b>${esc(p.name)}</b><span class="small">${esc(p.type)}</span></span><span class="chev">›</span></button>`).join("")}</div><button class="primary" onclick="addProfile()">+ Aggiungi profilo</button>`}
function addProfile(){
 sub(`<h1>Nuovo profilo</h1><p class="sub">Chi vuoi aggiungere?</p><div class="list">${["Bambino","Persona anziana","Animale","Me stesso"].map(x=>`<button class="row" onclick="profileForm('${x}')"><span>${x}</span><span>›</span></button>`).join("")}</div>`);
}
function profileForm(type){sub(`<h1>${type}</h1><form onsubmit="saveProfile(event,'${type}')"><label>Nome</label><input id="pn" required placeholder="Nome"><button class="primary">Salva</button></form>`)}
function saveProfile(e,t){e.preventDefault();S.profiles.push({id:Date.now(),name:pn.value.trim(),type:t});save();go("profiles");toast("Profilo aggiunto")}
function openProfile(id){let p=P(id),n=S.reminders.filter(r=>r.profile==id).length,d=S.documents.filter(x=>x.profile==id).length;sub(`<div style="text-align:center"><div class="avatar y" style="margin:0 auto 12px;width:58px;height:58px">${esc(p.name[0])}</div><h1>${esc(p.name)}</h1><p class="sub">${esc(p.type)}</p></div><div class="list"><button class="row" onclick="profileReminders(${id})"><span>Promemoria <span class="small">${n} elementi</span></span><span>›</span></button><button class="row" onclick="documents(${id})"><span>Documenti <span class="small">${d} file</span></span><span>›</span></button><button class="row" onclick="newReminder(${id})"><span>Aggiungi attività</span><span>›</span></button></div><button class="danger" onclick="deleteProfile(${id})">Elimina profilo</button>`)}
function deleteProfile(id){if(!confirm("Eliminare questo profilo e i suoi dati?"))return;S.profiles=S.profiles.filter(p=>p.id!=id);S.reminders=S.reminders.filter(r=>r.profile!=id);S.documents=S.documents.filter(d=>d.profile!=id);save();go("profiles")}
function profileReminders(id){let a=S.reminders.filter(r=>r.profile==id).sort(sortR);sub(`<h1>Promemoria</h1><p class="sub">${esc(P(id)?.name)}</p>${a.length?a.map(reminderCard).join(""):`<div class="empty">Nessun promemoria.</div>`}<button class="primary" onclick="newReminder(${id})">+ Nuovo promemoria</button>`)}
function sub(body){page="sub";setNav();app.innerHTML=`<button class="back" onclick="historyBack()">‹</button>${body}`;scrollTo(0,0)}
function historyBack(){go("home")}
function newReminder(pid=null){draft={profile:pid,title:"",category:"Altro",date:TODAY(),time:"",notes:"",notify:true};quick1()}
function steps(n){return `<div class="stepper">${[1,2,3].map(x=>`<i class="${x<=n?"on":""}"></i>`).join("")}</div>`}
function quick1(){sub(`${steps(1)}<h1>Cosa vuoi ricordare?</h1><p class="sub">Scrivilo in poche parole.</p><input id="qt" placeholder="Es. Dare il farmaco" value="${esc(draft.title)}"><div class="chips">${["Farmaco","Visita","Vaccino","Attività","Scadenza","Altro"].map(x=>`<button class="chip ${draft.category===x?"on":""}" onclick="draft.category='${x}';quick1()">${x}</button>`).join("")}</div><button class="primary" onclick="q1next()">Continua</button>`);setTimeout(()=>qt.focus(),50)}
function q1next(){let v=qt.value.trim();if(!v)return toast("Scrivi cosa vuoi ricordare");draft.title=v;quick2()}
function quick2(){sub(`${steps(2)}<h1>Per chi?</h1><p class="sub">Scegli un profilo.</p>${S.profiles.map(p=>`<button class="person" onclick="draft.profile=${p.id};quick3()"><div class="avatar">${esc(p.name[0])}</div><div class="grow"><b>${esc(p.name)}</b><small>${esc(p.type)}</small></div><span>›</span></button>`).join("")}`)}
function quick3(){if(!draft.profile)return quick2();let p=P(draft.profile);sub(`${steps(3)}<h1>Quando?</h1><p class="sub">${esc(p.name)} · ${esc(draft.title)}</p><div class="dates"><button class="dateBtn ${draft.date===TODAY()?"on":""}" onclick="draft.date=TODAY();quick3()"><b>Oggi</b></button><button class="dateBtn ${draft.date===tomorrow()?"on":""}" onclick="draft.date=tomorrow();quick3()"><b>Domani</b></button><button class="dateBtn" onclick="customDate.showPicker()"><b>Altra data</b></button></div><input id="customDate" type="date" value="${draft.date}" onchange="draft.date=this.value;quick3()" style="margin-top:9px"><label>Ora (facoltativa)</label><input id="qtime" type="time" value="${draft.time}"><div class="notify"><div><b>Notifica</b><span class="small">Promemoria prima dell'attività</span></div><button class="pill ${draft.notify?"on":""}" onclick="draft.notify=!draft.notify;quick3()">${draft.notify?"Attiva":"No"}</button></div><details><summary>Altre opzioni</summary><label>Note</label><textarea id="qnotes">${esc(draft.notes)}</textarea></details><button class="primary" onclick="finishReminder()">Salva</button>`)}
function finishReminder(){draft.time=document.querySelector("#qtime")?.value||"";draft.notes=document.querySelector("#qnotes")?.value||"";S.reminders.push({...draft,id:Date.now()});save();scheduleBrowserReminder(S.reminders.at(-1));go("home");toast("Promemoria salvato ✓")}
function editReminder(id){let r=S.reminders.find(x=>x.id==id);if(!r)return;sub(`<h1>${esc(r.title)}</h1><p class="sub">${esc(P(r.profile)?.name)}</p><label>Titolo</label><input id="et" value="${esc(r.title)}"><label>Data</label><input id="ed" type="date" value="${r.date}"><label>Ora</label><input id="ei" type="time" value="${r.time||""}"><label>Note</label><textarea id="en">${esc(r.notes||"")}</textarea><button class="primary" onclick="updateReminder(${id})">Salva modifiche</button><button class="danger" onclick="removeReminder(${id})">Elimina</button>`)}
function updateReminder(id){let r=S.reminders.find(x=>x.id==id);r.title=et.value;r.date=ed.value;r.time=ei.value;r.notes=en.value;save();go("home");toast("Aggiornato")}
function removeReminder(id){S.reminders=S.reminders.filter(x=>x.id!=id);save();go("home");toast("Eliminato")}
function documents(pid,q=""){
 let p=P(pid),docs=S.documents.filter(d=>d.profile==pid&&(!q||(d.name+" "+d.category).toLowerCase().includes(q.toLowerCase())));
 sub(`<h1>Documenti</h1><p class="sub">${esc(p.name)}</p><div class="search"><span>⌕</span><input type="search" placeholder="Cerca un documento..." value="${esc(q)}" oninput="filterDocs(${pid},this.value)"></div><div id="docList">${docHtml(docs,pid)}</div><input id="filePick" type="file" hidden multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onchange="addDocs(event,${pid})"><button class="primary" onclick="filePick.click()">+ Carica documento</button><p class="small" style="text-align:center">Nel prototipo il file viene salvato nel browser quando le dimensioni lo consentono.</p>`)
}
function docHtml(a,pid){return a.length?a.map(d=>`<div class="card"><i class="marker"></i><div class="grow"><h3>${esc(d.name)}</h3><span class="small">${esc(d.category)} · ${fmtDate(d.date)}</span></div><div class="docActions">${d.data?`<button onclick="openDoc(${d.id})">Apri</button>`:""}<button onclick="deleteDoc(${d.id},${pid})">×</button></div></div>`).join(""):`<div class="empty">Nessun documento.</div>`}
function filterDocs(pid,q){document.querySelector("#docList").innerHTML=docHtml(S.documents.filter(d=>d.profile==pid&&(d.name+" "+d.category).toLowerCase().includes(q.toLowerCase())),pid)}
async function addDocs(e,pid){
 for(const f of [...e.target.files]){
  let data=null;
  if(f.size<1500000) data=await fileData(f);
  S.documents.push({id:Date.now()+Math.random(),profile:pid,name:f.name,category:guessCat(f.name),date:TODAY(),type:f.type,data});
 }
 try{save();toast("Documenti aggiunti")}catch(err){S.documents.forEach(d=>{if(d.profile==pid)d.data=null});save();toast("File troppo grandi: salvati nome e riferimento")}
 documents(pid)
}
function fileData(f){return new Promise(res=>{let r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>res(null);r.readAsDataURL(f)})}
function guessCat(n){n=n.toLowerCase();if(n.includes("vacc"))return"Vaccini";if(n.includes("refert")||n.includes("analisi"))return"Referti";if(n.includes("ricett"))return"Ricette";return"Altro"}
function openDoc(id){let d=S.documents.find(x=>x.id==id);if(d?.data)window.open(d.data,"_blank")}
function deleteDoc(id,pid){S.documents=S.documents.filter(x=>x.id!=id);save();documents(pid)}
function calendar(){
 let now=new Date(),y=now.getFullYear(),m=now.getMonth(),first=new Date(y,m,1).getDay(),offset=(first+6)%7,days=new Date(y,m+1,0).getDate();
 let cells=Array(offset).fill("").concat(Array.from({length:days},(_,i)=>i+1));
 app.innerHTML=header("Calendario",now.toLocaleDateString("it-IT",{month:"long",year:"numeric"}))+`<div class="calendar">${["L","M","M","G","V","S","D"].map(x=>`<b>${x}</b>`).join("")}${cells.map(d=>d?`<button class="day ${hasDay(y,m,d)?"has":""} ${selectedDate===dateStr(y,m,d)?"sel":""}" onclick="selectedDate='${dateStr(y,m,d)}';calendar()">${d}</button>`:`<span></span>`).join("")}</div><h2>${fmtDate(selectedDate)}</h2>${S.reminders.filter(r=>r.date===selectedDate).map(reminderCard).join("")||`<div class="empty">Nessuna attività.</div>`}<button class="primary" onclick="newReminder()">+ Aggiungi</button>`;
}
function dateStr(y,m,d){return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`}function hasDay(y,m,d){return S.reminders.some(r=>r.date===dateStr(y,m,d))}
function more(){app.innerHTML=header("Altro")+`<div class="list"><button class="row" onclick="enableNotifications()"><span>Notifiche<span class="small">${S.settings.notifications?"Attive":"Da attivare"}</span></span><span>›</span></button><button class="row" onclick="exportData()"><span>Esporta i miei dati</span><span>›</span></button><button class="row" onclick="importData()"><span>Importa backup</span><span>›</span></button><button class="row" onclick="logout()"><span>Esci dall’account</span><span>›</span></button></div><input id="importFile" hidden type="file" accept=".json" onchange="doImport(event)">`}
async function enableNotifications(){if(!("Notification"in window))return toast("Notifiche non supportate");let p=await Notification.requestPermission();S.settings.notifications=p==="granted";save();toast(S.settings.notifications?"Notifiche attivate":"Permesso non concesso");more()}
function scheduleBrowserReminder(r){if(!S.settings.notifications||!r.time)return;let ms=new Date(`${r.date}T${r.time}`).getTime()-Date.now();if(ms>0&&ms<2147483647)setTimeout(()=>{if(Notification.permission==="granted")new Notification("Premura",{body:`${r.title} · ${P(r.profile)?.name}`})},ms)}
function exportData(){let b=new Blob([JSON.stringify(S,null,2)],{type:"application/json"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download="premura-backup.json";a.click();URL.revokeObjectURL(u)}
function importData(){document.querySelector("#importFile").click()}function doImport(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{S=JSON.parse(r.result);save();go("home");toast("Backup importato")}catch{toast("Backup non valido")}};r.readAsText(f)}

function authScreen(mode="welcome"){
 page="auth";setNav();nav.style.display="none";
 if(mode==="welcome"){
  app.innerHTML=`<div class="authWrap"><img src="premura-logo.png" class="authLogo"><h1 class="authTitle">Premura</h1><p class="sub">Ricorda ciò che conta, in un unico posto.</p><div class="authActions"><button class="googleAuth" type="button" onclick="premuraGoogleLogin()"><span class="googleG">G</span><span>Continua con Google</span></button><div class="authDivider"><span>oppure</span></div><button class="primary" onclick="authScreen('register')">Crea account</button><button class="secondary" onclick="authScreen('login')">Accedi</button></div></div>`;return;
 }
 if(mode==="register"){
  app.innerHTML=`<button class="back" onclick="authScreen()">‹</button><h1>Crea account</h1><p class="sub">Bastano pochi dati per iniziare.</p><form onsubmit="registerUser(event)"><label>Nome</label><input id="rn" required autocomplete="name"><label>Email</label><input id="re" required type="email" autocomplete="email"><label>Password</label><input id="rp" required type="password" minlength="6" autocomplete="new-password"><label class="checkline"><input id="privacy" type="checkbox" required><span>Accetto l’informativa privacy e le condizioni d’uso.</span></label><button class="primary">Crea account</button></form><button class="authLink" onclick="authScreen('login')">Hai già un account? Accedi</button>`;return;
 }
 app.innerHTML=`<button class="back" onclick="authScreen()">‹</button><h1>Accedi</h1><p class="sub">Bentornato su Premura.</p><form onsubmit="loginUser(event)"><label>Email</label><input id="le" required type="email" autocomplete="email"><label>Password</label><input id="lp" required type="password" autocomplete="current-password"><button class="primary">Accedi</button></form><button class="authLink" onclick="toast('Il recupero password sarà collegato al backend')">Password dimenticata?</button><button class="authLink" onclick="authScreen('register')">Crea un nuovo account</button>`;
}
function registerUser(e){
 e.preventDefault();
 S.user={name:rn.value.trim(),email:re.value.trim(),demoAuth:true};save();onboarding();
}
function loginUser(e){
 e.preventDefault();
 S.user={name:le.value.split("@")[0],email:le.value.trim(),demoAuth:true};save();
 if(!S.profiles.length)onboarding();else{nav.style.display="grid";go("home")}
}
function onboarding(){
 nav.style.display="none";page="auth";setNav();
 app.innerHTML=`<button class="back" onclick="authScreen()">‹</button><h1>Da dove iniziamo?</h1><p class="sub">Crea il tuo primo profilo. Potrai aggiungerne altri quando vuoi.</p><div class="onboardGrid">${[
 ["Bambino","Figlio, nipote o minore"],
 ["Persona anziana","Genitore o altra persona"],
 ["Animale","Cane, gatto o altro"],
 ["Me stesso","Promemoria personali"]
 ].map(x=>`<button class="onboardChoice" onclick="firstProfile('${x[0]}')"><b>${x[0]}</b><span>${x[1]}</span></button>`).join("")}</div>`;
}
function firstProfile(type){
 app.innerHTML=`<button class="back" onclick="onboarding()">‹</button><h1>${type}</h1><p class="sub">Come vuoi chiamare questo profilo?</p><form onsubmit="saveFirstProfile(event,'${type}')"><label>Nome</label><input id="firstName" required autofocus><button class="primary">Inizia</button></form>`;
}
function saveFirstProfile(e,type){
 e.preventDefault();S.profiles.push({id:Date.now(),name:firstName.value.trim(),type});save();nav.style.display="grid";go("home");toast("Profilo creato ✓");
}
async function logout(){if(window.premuraGoogleLogout)await window.premuraGoogleLogout();S.user=null;save();authScreen()}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>go(b.dataset.page));document.querySelector("#quickAdd").onclick=()=>newReminder();
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
if(S.user){nav.style.display="grid";go("home")}else authScreen();