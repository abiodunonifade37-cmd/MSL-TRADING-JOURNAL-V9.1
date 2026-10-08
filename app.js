/* MSL Trading Journal V9.1
   Cloud-first when Supabase is configured; local demo mode otherwise.
   Never put a Supabase service-role/secret key in this file.
*/
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY="msl_v91_state", CFG="msl_v91_supabase";
let state=loadLocal(), sb=null, user=null, authMode="login", cloudReady=false;

function loadLocal(){try{return JSON.parse(localStorage.getItem(KEY))||{trades:[],models:[],profile:{},playbook:{}}}catch{return{trades:[],models:[],profile:{},playbook:{}}}}
function saveLocal(){localStorage.setItem(KEY,JSON.stringify(state))}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function nowLocal(){const d=new Date(),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
function cfg(){try{return JSON.parse(localStorage.getItem(CFG))||{}}catch{return{}}}
function setCfg(x){localStorage.setItem(CFG,JSON.stringify(x))}
function isDemo(){return !cloudReady||!user}

async function initSupabase(){
  const c=cfg(); if(!c.url||!c.key||!window.supabase)return false;
  try{sb=window.supabase.createClient(c.url,c.key); const {data}=await sb.auth.getSession(); user=data.session?.user||null;
    sb.auth.onAuthStateChange((_e,s)=>{user=s?.user||null;if(user) enterApp(); else showAuth()});
    if(user){await cloudLoad();return true}
  }catch(e){console.warn(e)}
  return false
}
function showAuth(){$("#authView").classList.remove("hidden");$("#appView").classList.add("hidden")}
function enterApp(){$("#authView").classList.add("hidden");$("#appView").classList.remove("hidden");$("#cloudStatus").textContent=user?"● Cloud connected":"● Demo mode";renderAll()}
async function authSubmit(e){e.preventDefault();const email=$("#authEmail").value.trim(),password=$("#authPassword").value;
  if(!sb){toast("Connect Supabase in Settings first, or use Demo Mode.");return}
  try{let r=authMode==="login"?await sb.auth.signInWithPassword({email,password}):await sb.auth.signUp({email,password});
    if(r.error)throw r.error;if(authMode==="signup"&&!r.data.session)toast("Account created. Check your email if confirmation is enabled.");else toast("Signed in.");}
  catch(e){toast(e.message||"Authentication failed")}
}
async function resetPassword(){if(!sb){toast("Connect Supabase first.");return}const email=$("#authEmail").value.trim();if(!email){toast("Enter your email first.");return}const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.href});toast(error?error.message:"Password reset email sent.")}
async function logout(){if(sb&&user)await sb.auth.signOut();user=null;cloudReady=false;showAuth()}

function normalizeTrade(t){return {...t,id:t.id||crypto.randomUUID(),date:t.date||nowLocal(),pair:t.pair||"",direction:t.direction||"Long",setup:t.setup||"Reversal",session:t.session||"London",liquidity:t.liquidity||"PDL",sweep:t.sweep||"Wick sweep",zone:t.zone||"Discount",entry:t.entry||"Order Block",confirm:t.confirm||"Displacement + MSS",risk:Number(t.risk??1),result:t.result||"BE",r:Number(t.r??0),model:t.model||"",seen:t.seen||"",review:t.review||"",mistake:t.mistake||"",image:t.image||"",checks:t.checks||{}}}
function normalizeModel(m){return {...m,id:m.id||crypto.randomUUID(),name:m.name||"Untitled model",type:m.type||"Both",version:m.version||"1.0",market:m.market||"Forex",liquidity:m.liquidity||"",confirmation:m.confirmation||"",execution:m.execution||"",risk:m.risk||""}}
function dbTrade(t){return{user_id:user.id,trade_date:t.date,pair:t.pair,direction:t.direction,setup:t.setup,session:t.session,liquidity:t.liquidity,sweep:t.sweep,zone:t.zone,entry_model:t.entry,confirmation:t.confirm,risk_r:t.risk,result:t.result,r_multiple:t.r,model_version:t.model,seen:t.seen,review:t.review,mistake:t.mistake,image_url:t.image,checks:t.checks}}
function fromDb(t){return normalizeTrade({id:t.id,date:t.trade_date,pair:t.pair,direction:t.direction,setup:t.setup,session:t.session,liquidity:t.liquidity,sweep:t.sweep,zone:t.zone,entry:t.entry_model,confirm:t.confirmation,risk:t.risk_r,result:t.result,r:t.r_multiple,model:t.model_version,seen:t.seen,review:t.review,mistake:t.mistake,image:t.image_url,checks:t.checks})}
async function cloudLoad(){
  if(!sb||!user)return;
  try{
    const [tr,mo,pr]=await Promise.all([
      sb.from("trades").select("*").order("trade_date",{ascending:false}),
      sb.from("models").select("*").order("created_at",{ascending:false}),
      sb.from("profiles").select("*").eq("id",user.id).maybeSingle()
    ]);
    if(tr.error)throw tr.error;if(mo.error)throw mo.error;
    state.trades=(tr.data||[]).map(fromDb);
    state.models=(mo.data||[]).map(m=>normalizeModel({id:m.id,name:m.name,type:m.type,version:m.version,market:m.market,liquidity:m.liquidity,confirmation:m.confirmation,execution:m.execution,risk:m.risk}));
    state.profile=pr.data||{};cloudReady=true;saveLocal();renderAll();toast("Cloud journal loaded.")
  }catch(e){cloudReady=false;toast("Cloud load failed: "+e.message)}
}
async function upsertTrade(t){
  state.trades=[t,...state.trades.filter(x=>x.id!==t.id)];saveLocal();renderAll();
  if(cloudReady){const {error}=await sb.from("trades").upsert({...dbTrade(t),id:t.id},{onConflict:"id"});if(error)toast("Saved locally; cloud save failed: "+error.message)}
}
async function deleteTrade(id){state.trades=state.trades.filter(t=>t.id!==id);saveLocal();renderAll();if(cloudReady){const {error}=await sb.from("trades").delete().eq("id",id);if(error)toast(error.message)}}
async function upsertModel(m){
  state.models=[m,...state.models.filter(x=>x.id!==m.id)];saveLocal();renderAll();
  if(cloudReady){const row={...m,user_id:user.id,id:m.id};const {error}=await sb.from("models").upsert(row,{onConflict:"id"});if(error)toast("Model saved locally; cloud error: "+error.message)}
}
async function deleteModel(id){state.models=state.models.filter(m=>m.id!==id);saveLocal();renderAll();if(cloudReady)await sb.from("models").delete().eq("id",id)}

function stats(){const ts=state.trades,w=ts.filter(t=>t.result==="Win"),l=ts.filter(t=>t.result==="Loss"),net=ts.reduce((a,t)=>a+Number(t.r||0),0),win=w.length/Math.max(1,w.length+l.length),gw=w.reduce((a,t)=>a+Math.max(0,Number(t.r||0)),0),gl=Math.abs(l.reduce((a,t)=>a+Math.min(0,Number(t.r||0)),0));return{ts,w,l,net,win,exp:net/Math.max(1,ts.length),pf:gl?gw/gl:0}}
function renderDashboard(){const s=stats();$("#heroNetR").textContent=s.net.toFixed(2)+"R";$("#statWin").textContent=Math.round(s.win*100)+"%";$("#statWins").textContent=`${s.w.length}W / ${s.l.length}L`;$("#statExp").textContent=s.exp.toFixed(2)+"R";$("#statPF").textContent=s.pf.toFixed(2);$("#statTrades").textContent=s.ts.length;
  const recent=s.ts.slice(0,6);$("#recentTrades").classList.toggle("empty",!recent.length);$("#recentTrades").innerHTML=recent.length?recent.map(t=>`<div class="trade-row"><b>${esc(t.pair)}</b><span>${esc(t.setup)}</span><span class="${t.result.toLowerCase()}">${esc(t.result)}</span><b class="${Number(t.r)>=0?"win":"loss"}">${Number(t.r)>=0?"+":""}${Number(t.r).toFixed(2)}R</b></div>`).join(""):"No trades yet.";
  const checks=["liquidity","displacement","mss","zone","execution","risk"],total=s.ts.length*checks.length,done=s.ts.reduce((a,t)=>a+checks.filter(k=>t.checks?.[k]).length,0),pct=total?Math.round(done/total*100):0;$("#adherencePct").textContent=pct+"%";$(".ring").style.setProperty("--p",pct+"%");
  $("#adherenceLabel").textContent=total?`${pct}% checklist adherence`:"No data";$("#checkBars").innerHTML=checks.map(k=>{const n=s.ts.filter(t=>t.checks?.[k]).length,p=s.ts.length?Math.round(n/s.ts.length*100):0;return`<div class="bar"><span>${k}</span><i><b style="width:${p}%"></b></i><b>${p}%</b></div>`}).join("")
}
function renderJournal(){const q=$("#tradeSearch").value.toLowerCase(),rf=$("#resultFilter").value,sf=$("#setupFilter").value;const ts=state.trades.filter(t=>(!q||JSON.stringify(t).toLowerCase().includes(q))&&(!rf||t.result===rf)&&(!sf||t.setup===sf));$("#tradeTable").innerHTML=ts.length?ts.map(t=>`<tr><td>${new Date(t.date).toLocaleDateString()}</td><td><b>${esc(t.pair)}</b></td><td>${esc(t.direction)}</td><td>${esc(t.setup)}</td><td>${esc(t.liquidity)}</td><td>${esc(t.model||"—")}</td><td class="${t.result.toLowerCase()}">${esc(t.result)}</td><td class="${Number(t.r)>=0?"win":"loss"}">${Number(t.r)>=0?"+":""}${Number(t.r).toFixed(2)}R</td><td><button class="action-btn edit-trade" data-id="${t.id}">Edit</button><button class="action-btn delete-trade" data-id="${t.id}">×</button></td></tr>`).join(""):`<tr><td colspan="9" class="muted">No trades match your filters.</td></tr>`}
function renderModels(){$("#modelsGrid").innerHTML=state.models.length?state.models.map(m=>`<article class="model-card"><div class="panel-head"><div><span class="version">v${esc(m.version)}</span><h3>${esc(m.name)}</h3></div><span class="tiny">${esc(m.type)} · ${esc(m.market)}</span></div><p><b>Liquidity:</b> ${esc(m.liquidity||"—")}</p><p><b>Confirmation:</b> ${esc(m.confirmation||"—")}</p><p><b>Execution:</b> ${esc(m.execution||"—")}</p><p><b>Risk/targets:</b> ${esc(m.risk||"—")}</p><div class="model-actions"><button class="ghost edit-model" data-id="${m.id}">Edit</button><button class="ghost duplicate-model" data-id="${m.id}">Save new version</button><button class="action-btn delete-model" data-id="${m.id}">Delete</button></div></article>`).join(""):`<div class="panel"><h3>No model yet</h3><p class="muted">Create your first execution model and start measuring adherence.</p></div>`}
function groupPerf(field){const map={};state.trades.forEach(t=>{const k=t[field]||"Unknown";map[k]??=[];map[k].push(Number(t.r||0))});return map}
function metricHtml(map){const rows=Object.entries(map).sort((a,b)=>b[1].reduce((x,y)=>x+y,0)-a[1].reduce((x,y)=>x+y,0));const max=Math.max(1,...rows.map(x=>Math.abs(x[1].reduce((a,b)=>a+b,0))));return rows.length?rows.map(([k,v])=>{const r=v.reduce((a,b)=>a+b,0),p=Math.min(100,Math.round(Math.abs(r)/max*100));return`<div class="metric-row"><span>${esc(k)}</span><div class="metric-bar"><i style="width:${p}%"></i></div><b class="${r>=0?"win":"loss"}">${r>=0?"+":""}${r.toFixed(2)}R</b></div>`}).join(""):"<p class='muted'>Not enough data.</p>"}
function renderAnalytics(){const s=stats();$("#analyticsStats").innerHTML=[["Net R",s.net.toFixed(2)+"R",""],["Expectancy",s.exp.toFixed(2)+"R","per trade"],["Avg win",s.w.length?(s.w.reduce((a,t)=>a+Number(t.r||0),0)/s.w.length).toFixed(2)+"R":"0.00R",""],["Avg loss",s.l.length?(s.l.reduce((a,t)=>a+Number(t.r||0),0)/s.l.length).toFixed(2)+"R":"0.00R",""]].map(x=>`<div class="stat"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join("");$("#setupPerf").innerHTML=metricHtml(groupPerf("setup"));$("#liqPerf").innerHTML=metricHtml(groupPerf("liquidity"));
  const mm={};state.trades.forEach(t=>{if(t.mistake?.trim()){const k=t.mistake.trim();mm[k]=(mm[k]||0)+1}});$("#mistakes").innerHTML=Object.entries(mm).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>`<div class="metric-row"><span>${esc(x[0])}</span><div class="metric-bar"><i style="width:${Math.min(100,x[1]*15)}%"></i></div><b>${x[1]}</b></div>`).join("")||"<p class='muted'>No recorded mistakes.</p>";
  const keys=["liquidity","displacement","mss","zone","execution","risk"];$("#compliance").innerHTML=keys.map(k=>{const n=state.trades.filter(t=>t.checks?.[k]).length,p=state.trades.length?Math.round(n/state.trades.length*100):0;return`<div class="metric-row"><span>${k}</span><div class="metric-bar"><i style="width:${p}%"></i></div><b>${p}%</b></div>`}).join("")
}
function renderPlaybook(){const p=state.playbook||{};$("#pbCore").value=p.core||"";$("#pbRev").value=p.rev||"";$("#pbCont").value=p.cont||"";$("#pbEntry").value=p.entry||"";$("#pbRisk").value=p.risk||""}
function renderSettings(){const p=state.profile||{};$("#displayName").value=p.display_name||"";$("#defaultMarket").value=p.default_market||"";const c=cfg();$("#sbUrl").value=c.url||"";$("#sbKey").value=c.key||""}
function renderAll(){renderDashboard();renderJournal();renderModels();renderAnalytics();renderPlaybook();renderSettings()}

function openTrade(id){const t=id?state.trades.find(x=>x.id===id):normalizeTrade({});$("#tradeModalTitle").textContent=id?"Edit trade":"Log trade";$("#tradeId").value=t.id;$("#tDate").value=t.date.slice(0,16);$("#tPair").value=t.pair;$("#tDirection").value=t.direction;$("#tSetup").value=t.setup;$("#tSession").value=t.session;$("#tLiquidity").value=t.liquidity;$("#tSweep").value=t.sweep;$("#tZone").value=t.zone;$("#tEntry").value=t.entry;$("#tConfirm").value=t.confirm;$("#tRisk").value=t.risk;$("#tResult").value=t.result;$("#tR").value=t.r;$("#tModel").value=t.model;$("#tSeen").value=t.seen;$("#tReview").value=t.review;$("#tMistake").value=t.mistake;$("#tImage").value=t.image;["liquidity","displacement","mss","zone","execution","risk"].forEach(k=>$("#c"+k[0].toUpperCase()+k.slice(1)).checked=!!t.checks?.[k]);$("#tradeModal").classList.remove("hidden")}
function openModel(id){const m=id?state.models.find(x=>x.id===id):normalizeModel({});$("#mId").value=m.id;$("#mName").value=m.name;$("#mType").value=m.type;$("#mVersion").value=m.version;$("#mMarket").value=m.market;$("#mLiquidity").value=m.liquidity;$("#mConfirmation").value=m.confirmation;$("#mExecution").value=m.execution;$("#mRisk").value=m.risk;$("#modelModal").classList.remove("hidden")}

async function saveTrade(e){e.preventDefault();const t=normalizeTrade({id:$("#tradeId").value,date:$("#tDate").value,pair:$("#tPair").value.trim().toUpperCase(),direction:$("#tDirection").value,setup:$("#tSetup").value,session:$("#tSession").value,liquidity:$("#tLiquidity").value,sweep:$("#tSweep").value,zone:$("#tZone").value,entry:$("#tEntry").value,confirm:$("#tConfirm").value,risk:Number($("#tRisk").value),result:$("#tResult").value,r:Number($("#tR").value),model:$("#tModel").value.trim(),seen:$("#tSeen").value,review:$("#tReview").value,mistake:$("#tMistake").value,image:$("#tImage").value,checks:{liquidity:$("#cLiquidity").checked,displacement:$("#cDisplacement").checked,mss:$("#cMss").checked,zone:$("#cZone").checked,execution:$("#cExecution").checked,risk:$("#cRisk").checked}});await upsertTrade(t);$("#tradeModal").classList.add("hidden");toast("Trade saved.")}
async function saveModel(e){e.preventDefault();const m=normalizeModel({id:$("#mId").value,name:$("#mName").value.trim(),type:$("#mType").value,version:$("#mVersion").value.trim(),market:$("#mMarket").value.trim(),liquidity:$("#mLiquidity").value,confirmation:$("#mConfirmation").value,execution:$("#mExecution").value,risk:$("#mRisk").value});await upsertModel(m);$("#modelModal").classList.add("hidden");toast("Model saved.")}
function nav(page){$$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.page===page));$$(".page").forEach(x=>x.classList.toggle("active",x.id==="page-"+page));const title={dashboard:"Dashboard",journal:"Trade Journal",models:"My Models",analytics:"Analytics",playbook:"Playbook",settings:"Settings"}[page];$("#pageTitle").textContent=title;$("#pageEyebrow").textContent=page.toUpperCase()}
async function saveProfile(){state.profile={...(state.profile||{}),id:user?.id,display_name:$("#displayName").value.trim(),default_market:$("#defaultMarket").value.trim()};saveLocal();if(cloudReady){const {error}=await sb.from("profiles").upsert(state.profile,{onConflict:"id"});if(error)toast(error.message)}toast("Profile saved.")}
function exportData(){const blob=new Blob([JSON.stringify({...state,exported_at:new Date().toISOString()},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="MSL-Trading-Journal-backup.json";a.click();URL.revokeObjectURL(a.href)}
function importData(file){const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!Array.isArray(x.trades))throw Error("Invalid backup");state={...state,...x,trades:x.trades.map(normalizeTrade),models:(x.models||[]).map(normalizeModel)};saveLocal();renderAll();toast("Backup imported locally.")}catch(e){toast(e.message)}};r.readAsText(file)}
function connectCloud(){const url=$("#sbUrl").value.trim(),key=$("#sbKey").value.trim();if(!url||!key){toast("Enter both Supabase values.");return}setCfg({url,key});location.reload()}

$$(".nav-item").forEach(b=>b.onclick=()=>nav(b.dataset.page));$$("[data-go]").forEach(b=>b.onclick=()=>nav(b.dataset.go));
$("#quickTrade").onclick=()=>openTrade();$("#newTradeBtn").onclick=()=>openTrade();$("#newModelBtn").onclick=()=>openModel();
$("#tradeForm").onsubmit=saveTrade;$("#modelForm").onsubmit=saveModel;$("#authForm").onsubmit=authSubmit;$("#resetPassword").onclick=resetPassword;$("#logoutBtn").onclick=logout;$("#syncBtn").onclick=()=>cloudLoad();
$$("[data-auth-tab]").forEach(b=>b.onclick=()=>{$$(" [data-auth-tab]").forEach(x=>x.classList.remove("active"));b.classList.add("active");authMode=b.dataset.authTab;$("#authSubmit").textContent=authMode==="login"?"Sign in":"Create account";$("#authPassword").autocomplete=authMode==="login"?"current-password":"new-password"});
$("#demoBtn").onclick=()=>{user=null;cloudReady=false;enterApp();toast("Demo mode active. Data is stored on this device.")};
["#tradeSearch","#resultFilter","#setupFilter"].forEach(s=>$(s).addEventListener("input",renderJournal));
document.addEventListener("click",async e=>{const t=e.target;if(t.classList.contains("close-modal"))$("#tradeModal").classList.add("hidden");if(t.classList.contains("close-model"))$("#modelModal").classList.add("hidden");
 if(t.classList.contains("edit-trade"))openTrade(t.dataset.id);if(t.classList.contains("delete-trade")&&confirm("Delete this trade?"))await deleteTrade(t.dataset.id);
 if(t.classList.contains("edit-model"))openModel(t.dataset.id);if(t.classList.contains("duplicate-model")){const m=state.models.find(x=>x.id===t.dataset.id);openModel();$("#mName").value=m.name;$("#mVersion").value=String(Number(m.version)||1)+"."+1;$("#mLiquidity").value=m.liquidity;$("#mConfirmation").value=m.confirmation;$("#mExecution").value=m.execution;$("#mRisk").value=m.risk}
 if(t.classList.contains("delete-model")&&confirm("Delete this model?"))await deleteModel(t.dataset.id);
});
$("#savePlaybook").onclick=()=>{state.playbook={core:$("#pbCore").value,rev:$("#pbRev").value,cont:$("#pbCont").value,entry:$("#pbEntry").value,risk:$("#pbRisk").value};saveLocal();toast("Playbook saved.")};
$("#saveProfile").onclick=saveProfile;$("#connectSb").onclick=connectCloud;$("#exportBtn").onclick=exportData;$("#importFile").onchange=e=>e.target.files[0]&&importData(e.target.files[0]);
$("#clearBtn").onclick=()=>{if(confirm("Clear ALL local journal data?")&&confirm("This cannot be undone. Continue?")){state={trades:[],models:[],profile:state.profile||{},playbook:state.playbook||{}};saveLocal();renderAll();toast("Local journal cleared.")}};
$("#tDate").value=nowLocal();

(async()=>{if(await initSupabase()){enterApp()}else{showAuth()}})();

if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
