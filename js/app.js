/*
 * JALAN — جالان app logic.
 * Extracted from the original single-file build with no behavior changes,
 * except for the storage shim below (see README "Known fixes").
 */

// The original build targeted a host environment that injects a `window.storage`
// async key/value API. Outside that environment (a normal browser / static host)
// `window.storage` does not exist, so Favorites/Visited/Notes/menu-cache silently
// failed to persist. This shim provides the same {get(key), set(key,value)} async
// API backed by localStorage, only when no host implementation is already present.
if (!window.storage) {
  window.storage = {
    async get(key) {
      try {
        const v = localStorage.getItem(key);
        return v == null ? null : { value: v };
      } catch (e) { return null; }
    },
    async set(key, value) {
      try { localStorage.setItem(key, value); } catch (e) {}
    }
  };
}


const HUE = {padel:150,box:0,surf:200,adv:100,cult:290,fam:50,cafe:28,bakery:44,breakfast:16,
  italian:352,steak:6,burger:22,sandwich:58,mex:330,seafood:196,indo:128,asian:272,indian:38,
  me:12,beachclub:182,bar:256,hotel:212,spa:306,gym:158,shop:230,nature:142,attraction:202,rest:88,other:210};
const SAT = {shop:12,other:8};
const EMO = {cafe:"☕",bakery:"🍰",breakfast:"🍳",italian:"🍝",steak:"🥩",burger:"🍔",sandwich:"🥪",
  mex:"🌮",seafood:"🦐",indo:"🍜",asian:"🍣",indian:"🍛",me:"🥙",beachclub:"🏖️",bar:"🍸",hotel:"🏨",
  spa:"💆",gym:"🏋️",shop:"🛍️",nature:"🌴",attraction:"📸",rest:"🍽️",other:"📍",
  padel:"🎾",box:"🥊",surf:"🏄",adv:"⛰️",cult:"🎭",fam:"🎡"};
const tintBg = k => `hsl(${HUE[k]??210} ${SAT[k]??58}% 93%)`;
const tintFg = k => `hsl(${HUE[k]??210} ${(SAT[k]??58)+2}% 30%)`;

const SECTIONS = [
  {id:"food",  label:"مطاعم وكافيهات", ic:"🍽️", keys:["cafe","bakery","italian","steak","seafood","indo",
     "asian","indian","me","burger","sandwich","mex","breakfast","rest","bar"]},
  {id:"beach", label:"شواطئ وبيتش كلب", ic:"🏖️", keys:["beachclub","nature"]},
  {id:"act",   label:"أنشطة ورياضة",  ic:"🎯", keys:["padel","box","surf","adv","cult","fam","gym"]},
  {id:"stay",  label:"إقامة",          ic:"🏨", keys:["hotel"]},
  {id:"spa",   label:"سبا وجمال",      ic:"💆", keys:["spa"]},
  {id:"shop",  label:"تسوق",           ic:"🛍️", keys:["shop","other"]},
  {id:"sight", label:"معالم",          ic:"📸", keys:["attraction"]}
];
const TABS = ["food","beach","act"];
const MEALS = [["b","🍳 فطور"],["br","🥐 برنش"],["l","🍽️ غداء"],["d","🌙 عشاء"]];
const secOf = id => SECTIONS.find(x=>x.id===id);
const AREAS = [...new Set(PLACES.map(p=>p.a))]
  .sort((a,b)=>PLACES.filter(p=>p.a===b).length-PLACES.filter(p=>p.a===a).length);

let marks = {};
const KEY = "bali:marks";
async function loadMarks(){ try{ const r = await window.storage.get(KEY); if(r&&r.value) marks = JSON.parse(r.value); }catch(e){ marks={}; } }
async function saveMarks(){ try{ await window.storage.set(KEY, JSON.stringify(marks)); }catch(e){} }
const mk = n => marks[n] || {};

const state = {q:"", area:"", sec:"", sub:"", cats:new Set(), meal:"", price:new Set(),
  minR:0, starred:false, unvisited:false, hasDesc:false, sug:false, act:false, sort:"rating", map:false, home:true};
let me = null;

const esc = s => (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmtKm = v => v<1 ? Math.round(v*1000)+" م" : (v<100 ? v.toFixed(1) : Math.round(v).toLocaleString("en")) + " كم";
const dist = (a,b,c,d)=>{const R=6371,t=x=>x*Math.PI/180;
  const dLa=t(c-a),dLo=t(d-b);const h=Math.sin(dLa/2)**2+Math.cos(t(a))*Math.cos(t(c))*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));};

function passSection(p){
  if(state.sec){ const S=secOf(state.sec); if(!S || !S.keys.includes(p.k)) return false; }
  if(state.sub){ const t=state.sub.slice(0,1), v=state.sub.slice(2);
    if(t==="m"){ if(!p[v]) return false; } else if(p.k!==v) return false; }
  return true;
}

function filtered(){
  let out = PLACES.filter(p=>{
    if(state.q){const s=(p.n+" "+p.o+" "+p.a+" "+p.c+" "+(p.desc||"")).toLowerCase();
      if(!s.includes(state.q.toLowerCase())) return false;}
    if(!passSection(p)) return false;
    if(state.area && p.a!==state.area) return false;
    if(state.cats.size && !state.cats.has(p.c)) return false;
    if(state.meal && !p[state.meal]) return false;
    if(state.price.size && !state.price.has(p.p||"")) return false;
    if(state.minR && (!p.r || p.r<state.minR)) return false;
    if(state.starred && !mk(p.n).s) return false;
    if(state.unvisited && mk(p.n).v) return false;
    if(state.hasDesc && !p.desc) return false;
    if(state.sug && !p.sug) return false;
    if(state.act && !p.act) return false;
    return true;
  });
  if(state.sort==="pop") out.sort((a,b)=>(b.rc||0)-(a.rc||0));
  else if(state.sort==="near" && me)
    out.sort((a,b)=>(a.lat?dist(me[0],me[1],a.lat,a.lng):9e9)-(b.lat?dist(me[0],me[1],b.lat,b.lng):9e9));
  else out.sort((a,b)=>(b.r||0)-(a.r||0)||(b.rc||0)-(a.rc||0));
  return out;
}

/* ---------- chips + tabs ---------- */
function chipBtn(label, on, n, onclick){
  const b = document.createElement("button");
  b.className = "chip"; b.setAttribute("aria-pressed", on);
  b.innerHTML = label + (n!=null ? ` <b>${n}</b>` : "");
  b.onclick = onclick;
  return b;
}
const secCount = S => PLACES.filter(p=>S.keys.includes(p.k)).length;

function pickSec(id){
  state.home = false;
  state.sec = (state.sec===id) ? "" : id;
  state.sub=""; state.cats.clear(); state.meal="";
  close(); window.scrollTo({top:0}); render();
}

function renderTabs(){
  const nav = document.getElementById("tabs");
  nav.innerHTML = "";
  const add=(ic,label,on,fn)=>{
    const b=document.createElement("button");
    b.setAttribute("aria-pressed",on);
    b.innerHTML=`<span class="ic">${ic}</span><span>${label}</span>`;
    b.onclick=fn; nav.appendChild(b);
  };
  add("◎","الرئيسية", state.home, goHome);
  TABS.forEach(id=>{ const S=secOf(id); add(S.ic, S.label.split(" ")[0], state.sec===id, ()=>pickSec(id)); });
  const rest = SECTIONS.filter(S=>!TABS.includes(S.id));
  add("⋯","المزيد", rest.some(S=>S.id===state.sec), openMore);
}

function openMore(){
  const rest = SECTIONS.filter(S=>!TABS.includes(S.id));
  document.getElementById("mpanel").innerHTML = `<div class="grab"></div>
    <div class="morelist">${rest.map(S=>`<button data-id="${S.id}">
      <span style="font-size:19px">${S.ic}</span><span>${S.label}</span>
      <span class="n">${secCount(S)}</span></button>`).join("")}
      <button data-id="__about"><span style="font-size:19px">ℹ️</span><span>عن جالان ونسخة احتياطية</span>
      <span class="n"></span></button>
      <button data-id="__plan"><span style="font-size:19px">🗓️</span><span>جداول مقترحة</span>
      <span class="n"></span></button>
      <button data-id="__star"><span style="font-size:19px">★</span><span>المميّزة عندي</span>
      <span class="n">${PLACES.filter(p=>mk(p.n).s).length}</span></button></div>`;
  document.querySelectorAll("#mpanel .morelist button").forEach(b=>b.onclick=()=>{
    if(b.dataset.id==="__about"){ openAbout(); return; }
    if(b.dataset.id==="__plan"){ openPlan(planArea||AREAS[0]); return; }
    if(b.dataset.id==="__star"){ state.starred=true; state.home=false; state.sec=""; state.sub=""; close(); render(); }
    else pickSec(b.dataset.id);
  });
  document.getElementById("more").classList.add("on");
}

function renderChips(){
  const sub = document.getElementById("subChips");
  sub.innerHTML = "";
  if(state.sec){
    const S = secOf(state.sec);
    const inSec = PLACES.filter(p=>S.keys.includes(p.k));
    if(state.sec === "food"){
      MEALS.forEach(([k,lab])=>{
        const n = inSec.filter(p=>p[k]).length; if(!n) return;
        sub.appendChild(chipBtn(lab, state.sub==="m:"+k, n, ()=>{
          state.sub = state.sub==="m:"+k ? "" : "m:"+k; render(); }));
      });
    }
    const cats = [...new Set(inSec.map(p=>p.k))]
      .sort((a,b)=>inSec.filter(p=>p.k===b).length-inSec.filter(p=>p.k===a).length);
    cats.forEach(k=>{
      const one = inSec.find(p=>p.k===k), n = inSec.filter(p=>p.k===k).length;
      sub.appendChild(chipBtn((EMO[k]||"")+" "+one.c.replace(/^[^\s]*\s/,""), state.sub==="c:"+k, n, ()=>{
        state.sub = state.sub==="c:"+k ? "" : "c:"+k; render(); }));
    });
  }
  const base = PLACES.filter(passSection);
  const ac = document.getElementById("areaChips");
  ac.innerHTML = "";
  ac.appendChild(chipBtn("كل المناطق", !state.area, base.length, ()=>{ state.area=""; render(); }));
  AREAS.forEach(a=>{
    const n = base.filter(p=>p.a===a).length; if(!n) return;
    ac.appendChild(chipBtn(a, state.area===a, n, ()=>{
      state.area = state.area===a ? "" : a; render(); }));
  });
}

/* ---------- list ---------- */
function goHome(){
  state.home=true; state.sec=""; state.sub=""; state.area=""; state.q="";
  document.getElementById("q").value="";
  state.cats.clear(); state.price.clear(); state.meal=""; state.minR=0;
  state.starred=false; state.unvisited=false; state.hasDesc=false; state.sug=false; state.act=false;
  if(state.map){ state.map=false; document.getElementById("map").style.display="none";
    document.getElementById("list").style.display="block";
    const b=document.getElementById("mapBtn"); b.dataset.on=""; b.textContent="خريطة"; }
  close(); window.scrollTo({top:0}); render();
}

function mealNow(){
  const h = new Date().getHours();
  if(h < 11) return ["b","🍳 فطور الحين"];
  if(h < 16) return ["l","🍽️ غداء الحين"];
  return ["d","🌙 عشاء الحين"];
}

function renderHome(){
  const [mk_, mlabel] = mealNow();
  const cards = SECTIONS.map(S=>{
    const inS = PLACES.filter(p=>S.keys.includes(p.k));
    const top = inS.slice().sort((a,b)=>(b.r||0)-(a.r||0))[0];
    const k = inS[0] ? inS[0].k : "other";
    return `<button class="card" data-sec="${S.id}">
      <span class="band" style="background:linear-gradient(135deg,${tintBg(k)},${tintBg(k)} 40%,#fff0)"></span>
      <span class="ci">${S.ic}</span>
      <b>${S.label}</b>
      <span class="cn">${inS.length} مكان</span>
      <span class="cs">${top?esc(top.n):""}</span>
    </button>`;
  }).join("");
  const HERO = "https://commons.wikimedia.org/wiki/Special:FilePath/Rice%20terraces,%20Bali.jpg?width=1200";
  document.getElementById("list").innerHTML = `<div class="home-wrap">
    <div class="hero">
      <img src="${HERO}" alt="" onerror="this.style.display='none'">
      <div class="veil"></div>
      <div class="in">
        <div class="kicker">JALAN</div>
        <h2 class="serif">وين نروح اليوم؟</h2>
        <p>${PLACES.length} محطة مختارة في ${AREAS.length} مناطق — اختر من وين تبدأ.</p>
      </div>
    </div>
    <p class="credit">صورة: Vyacheslav Argenberg ·
      <a href="https://creativecommons.org/licenses/by/4.0" target="_blank" rel="noopener">CC BY 4.0</a> · Wikimedia Commons</p>
    <div class="quick">
      <button class="hero" data-q="near">📍 الأقرب لي</button>
      <button data-q="meal">${mlabel}</button>
      <button data-q="star">★ المميّزة عندي</button>
      <button data-q="plan">🗓️ رتّب لي يوم</button>
      <button data-q="top">🔝 الأعلى تقييمًا</button>
    </div>
    <div class="grid">${cards}</div>
    <button class="allbtn" data-q="all">تصفّح كل الأماكن ←</button>
  </div>`;
  document.querySelectorAll("#list .card").forEach(b=>b.onclick=()=>pickSec(b.dataset.sec));
  document.querySelectorAll("#list [data-q]").forEach(b=>b.onclick=()=>{
    const q=b.dataset.q; state.home=false;
    if(q==="near"){ state.sort="near"; setSortUI("near"); openNear(); return; }
    else if(q==="meal"){ state.sec="food"; state.sub="m:"+mk_; }
    else if(q==="star"){ state.starred=true; }
    else if(q==="top"){ state.minR=4.7; }
    else if(q==="plan"){ state.home=true; openPlan(planArea||AREAS[0]); return; }
    window.scrollTo({top:0}); render();
  });
}

function render(){
  document.body.classList.toggle("home", state.home && !state.map);
  renderTabs();
  if(state.home && !state.map){ document.getElementById("total").textContent=""; renderHome(); return; }
  renderChips();
  const rows = filtered();
  const S = state.sec ? secOf(state.sec) : null;
  document.getElementById("total").textContent = PLACES.length + " مكان";
  document.getElementById("count").textContent =
    rows.length + " نتيجة" + (S ? " · " + S.label : "") + (state.area ? " · " + state.area : "") +
    (state.sort==="near" ? (me ? " · الأقرب من " + meLabel : " — اختر نقطة انطلاق") : "");
  const list = document.getElementById("list");
  if(state.map){ drawMap(rows); return; }
  if(!rows.length){
    list.innerHTML = `<div class="empty"><b>ما فيه نتائج هنا</b>
      جرّب تشيل فلتر أو توسّع المنطقة.
      <br><button id="reset">امسح كل الفلاتر</button></div>`;
    document.getElementById("reset").onclick = ()=>{
      state.q=""; document.getElementById("q").value="";
      state.area=""; state.sub=""; state.cats.clear(); state.price.clear();
      state.meal=""; state.minR=0; state.starred=false; state.unvisited=false;
      state.hasDesc=false; state.sug=false; state.act=false; render(); };
    return;
  }
  list.innerHTML = rows.map(p=>{
    const m = mk(p.n);
    const d = (me&&p.lat)?`<div class="dist">${fmtKm(dist(me[0],me[1],p.lat,p.lng))}</div>`:"";
    const rest = [p.p, p.a].filter(Boolean).join(" · ");
    const badge = (m.s?"★":"") + (m.v?"✓":"");
    const snip = p.desc ? p.desc.replace(/\n/g," ").replace(/[⚠️📅💰💡🎾🥊🏄]/g,"").trim() : "";
    return `<button class="row" data-n="${esc(p.n)}">
      <span class="rmain">
        <span class="rname">${esc(p.n)}</span>
        <span class="rmeta">
          ${p.act?'<span class="act">نشاط</span>':""}${p.sug?'<span class="sug">مقترح</span>':""}
          <span class="tag" style="background:${tintBg(p.k)};color:${tintFg(p.k)}">${EMO[p.k]||"📍"} ${esc(p.c)}</span>
          <span class="dots">${esc(rest)}${p.t?' · <span class="utag">'+esc(p.t)+"</span>":""}</span>
        </span>
        ${snip?`<span class="snip">${esc(snip)}</span>`:""}
      </span>
      <span class="rside">
        <div class="rate ${p.r>=4.7?"hi":""}">${p.r?p.r.toFixed(1):"—"}</div>
        ${p.rc?`<div class="rc">${p.rc.toLocaleString("en")}</div>`:""}
        ${d}${badge?`<div class="marks">${badge}</div>`:""}
      </span></button>`;
  }).join("");
  list.querySelectorAll(".row").forEach(el=>el.onclick=()=>openDetail(el.dataset.n));
}

/* ---------- detail ---------- */
function openDetail(name){
  const p = PLACES.find(x=>x.n===name); if(!p) return;
  const m = mk(p.n);
  const photos = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.n+" Bali")}`;
  document.getElementById("dpanel").innerHTML = `
    <div class="grab"></div>
    <div class="dband" style="background:linear-gradient(135deg,${tintBg(p.k)},${tintFg(p.k)}18)">
      <span>${EMO[p.k]||"📍"}</span></div>
    <div class="dname">${esc(p.n)}</div>
    <div class="dsub">
      <span class="tag" style="background:${tintBg(p.k)};color:${tintFg(p.k)}">${EMO[p.k]||"📍"} ${esc(p.c)}</span>
      <span>${esc(p.a)}${p.o?" · محفوظ باسم: "+esc(p.o):""}</span>
      ${p.sug?'<span class="sug">مقترح — مو من قوائمك</span>':""}
    </div>
    <div class="dstats">
      <div><span>التقييم</span><strong>${p.r?p.r.toFixed(1):"—"}</strong></div>
      <div><span>المراجعات</span><strong>${p.rc?p.rc.toLocaleString("en"):"—"}</strong></div>
      <div><span>السعر</span><strong>${p.p||"—"}</strong></div>
      ${me&&p.lat?`<div><span>المسافة من ${esc(meLabel)}</span><strong style="font-size:15px">${fmtKm(dist(me[0],me[1],p.lat,p.lng))}</strong></div>`:""}
    </div>
    ${p.desc?`<p class="ddesc">${esc(p.desc)}</p>`:""}
    ${p.res?`<p class="dres">${p.act?"يحتاج حجز مسبق":"يفضّل الحجز المسبق"}</p>`:""}
    <a class="primary" href="${p.u}" target="_blank" rel="noopener">افتح في الخرائط</a>
    <div class="acts">
      <a href="${photos}" target="_blank" rel="noopener">شوف الصور</a>
      ${p.ph?`<a href="https://wa.me/${p.ph.replace(/[^0-9]/g,"")}" target="_blank" rel="noopener">واتساب</a>
      <a href="tel:${p.ph}">اتصال</a>`:""}
      ${FOODK.has(p.k)?`<button id="menubtn">المنيو بالعربي</button>`:""}
      <button id="star" class="${m.s?"on":""}">${m.s?"★ مميّز":"☆ ميّزه"}</button>
      <button id="vis" class="${m.v?"on":""}">${m.v?"✓ زرته":"سجّل زيارة"}</button>
    </div>
    <div id="menuwrap"></div>
    <textarea id="note" placeholder="ملاحظاتك عن المكان…">${esc(m.note||"")}</textarea>`;
  const set = async (patch)=>{ marks[p.n] = Object.assign({}, mk(p.n), patch); await saveMarks(); openDetail(p.n); render(); };
  document.getElementById("star").onclick = ()=>set({s: mk(p.n).s?0:1});
  document.getElementById("vis").onclick  = ()=>set({v: mk(p.n).v?0:1});
  const mb = document.getElementById("menubtn");
  if(mb) mb.onclick = ()=>showMenu(p, false);
  if(FOODK.has(p.k)) peekCachedMenu(p);
  document.getElementById("note").onchange = e=>{ marks[p.n]=Object.assign({},mk(p.n),{note:e.target.value}); saveMarks(); };
  document.getElementById("detail").classList.add("on");
}

/* ---------- menu ---------- */
const FOODK = new Set(["cafe","bakery","italian","steak","seafood","indo","asian","indian","me",
  "burger","sandwich","mex","beachclub","bar","breakfast","rest"]);
const menuKey = n => "menu:" + n.slice(0,120).replace(/[\s/\\'"]/g,"_");
const textOf = d => (d.content||[]).map(b=>b.type==="text"?b.text:"").filter(Boolean).join("\n").trim();
const gsearch = p => "https://www.google.com/search?q=" + encodeURIComponent(p.n + " Bali menu");

async function peekCachedMenu(p){
  try{ const r = await window.storage.get(menuKey(p.n));
    if(r && r.value){ const c = JSON.parse(r.value); paintMenu(p, c.txt, c.t); } }catch(e){}
}
function paintMenu(p, txt, when, loading, err){
  const w = document.getElementById("menuwrap"); if(!w) return;
  const age = when ? new Date(when).toLocaleDateString("ar-EG",{day:"numeric",month:"long"}) : "";
  w.innerHTML = `<div class="menubox">
    <h4>${loading?'<span class="spin"></span> جاري جلب المنيو…':"🍽️ المنيو"}</h4>
    ${err?`<div class="txt" style="color:var(--clay)">${esc(err)}</div>`:""}
    <div class="txt">${esc(txt||"")}</div>
    ${loading?"":`<div class="meta">
      ${txt?`<span>مُجمّع من الإنترنت${age?" · "+age:""} — أكّد الأسعار مع المكان</span>`:""}
      <button id="menuref">${txt?"تحديث":"أعد المحاولة"}</button>
      <a href="${gsearch(p)}" target="_blank" rel="noopener">ابحث في قوقل</a></div>`}
  </div>`;
  const r = document.getElementById("menuref"); if(r) r.onclick = ()=>showMenu(p, true);
}
async function rawCall(body){
  const res = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body)});
  let data=null, raw="";
  try{ data = await res.json(); }
  catch(e){ try{ raw = await res.text(); }catch(e2){} throw new Error("HTTP "+res.status+" "+raw.slice(0,120)); }
  if(data && data.error) throw new Error((data.error.message||JSON.stringify(data.error)).slice(0,160));
  if(!res.ok) throw new Error("HTTP "+res.status);
  return data;
}
async function runMenu(q){
  let msgs=[{role:"user",content:q}];
  for(let i=0;i<4;i++){
    const data = await rawCall({model:"claude-sonnet-4-6",max_tokens:1000,messages:msgs,
      tools:[{type:"web_search_20250305",name:"web_search"}]});
    const t = textOf(data);
    if(data.stop_reason==="pause_turn"){ msgs=msgs.concat([{role:"assistant",content:data.content}]); continue; }
    if(t) return t;
    msgs=msgs.concat([{role:"assistant",content:data.content},{role:"user",content:"اكتب المنيو الآن بالعربية."}]);
  }
  return "";
}
async function callAny(prompt){
  const shapes=[
    {model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:prompt}]},
    {model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:[{type:"text",text:prompt}]}]}
  ];
  let last="";
  for(const b of shapes){
    try{ const d=await rawCall(b); const t=textOf(d); if(t) return {txt:t,err:""}; last="رد فاضي"; }
    catch(e){ last=(e&&e.message)?e.message:String(e); }
  }
  return {txt:"",err:last};
}
async function showMenu(p, force){
  if(!force){ try{ const c=await window.storage.get(menuKey(p.n));
    if(c&&c.value){ const v=JSON.parse(c.value); paintMenu(p,v.txt,v.t); return; } }catch(e){} }
  paintMenu(p,"",null,true);
  const base = `مكان اسمه "${p.n}" في منطقة ${p.a} في بالي بإندونيسيا (${p.c}).
اكتب المنيو بالعربية فقط وبدون مقدمة، ومختصر:
• قسّم الأصناف لأقسام حسب المتاح
• لكل صنف: الاسم بالعربية ثم الأصلي بين قوسين، ثم السعر بالروبية إن توفر
• ضع ⚠️ أمام أي صنف فيه لحم خنزير أو كحول
• اذكر أشهر ٣ أصناف يوصي بها الزوار`;
  let txt="", err="";
  try{ txt = await runMenu("ابحث في الإنترنت عن المنيو الحالي لـ " + base + "\n• آخر سطر: المصدر"); }
  catch(e){ err=(e&&e.message)?e.message:String(e); }
  if(!txt){
    const r = await callAny(base + "\n(اعتمد على معلوماتك، واكتب في أول سطر: معلومات تقريبية غير مؤكدة)");
    txt=r.txt; if(!txt) err=r.err||err;
  }
  if(!txt){ paintMenu(p,"",null,false,"تعذّر جلب المنيو"+(err?" — "+err:"")+". استخدم «ابحث في قوقل»."); return; }
  const t=Date.now(); paintMenu(p,txt,t);
  try{ await window.storage.set(menuKey(p.n), JSON.stringify({txt,t})); }catch(e){}
}

/* ---------- about + backup ---------- */
function openAbout(){
  const marked = PLACES.filter(p=>mk(p.n).s||mk(p.n).v||mk(p.n).note).length;
  document.getElementById("ppanel").innerHTML = `
    <div class="grab"></div>
    <div class="ptitle">عن جالان</div>
    <div class="psub">${PLACES.length} محطة في ${AREAS.length} مناطق · ${PLACES.filter(p=>p.desc).length} منها بوصف وأطباق مميزة</div>
    <div class="fgroup"><h3>من وين البيانات</h3>
      <p style="margin:0;font-size:13.5px;line-height:1.9;color:var(--muted)">
      الأماكن والإحداثيات من قوائمك المحفوظة في Google Maps.<br>
      التقييمات والأسعار والأرقام وساعات العمل من Google Places.<br>
      الأطباق المميزة والملاحظات مستخلصة من مراجعات الزوار.<br>
      الأماكن الموسومة «مقترح» ليست من قوائمك — أضفتها لك بناءً على شهرتها وتقييمها.<br><br>
      ⚠️ الأسعار وساعات العمل تتغيّر. أكّدها بالواتساب قبل ما تروح أو تحجز.</p>
    </div>
    <div class="fgroup"><h3>علاماتك (${marked} مكان)</h3>
      <p style="margin:0 0 10px;font-size:13.5px;color:var(--muted)">
      النجوم و«زرته» والملاحظات محفوظة على حسابك. انسخها نسخة احتياطية لو حبيت.</p>
      <div class="frow"><button class="tbtn" id="expm">انسخ علاماتي</button>
      <button class="tbtn" id="impm">استعادة من نسخة</button></div>
    </div>
    <p style="font-size:11.5px;color:var(--muted);text-align:center;margin:18px 0 0">
      جالان — وين نروح اليوم؟</p>`;
  document.getElementById("expm").onclick=()=>{
    navigator.clipboard.writeText(JSON.stringify(marks)).then(()=>{
      const b=document.getElementById("expm"); b.textContent="تم النسخ ✓";
      setTimeout(()=>b.textContent="انسخ علاماتي",1600); }).catch(()=>{});
  };
  document.getElementById("impm").onclick=async()=>{
    try{
      const t = await navigator.clipboard.readText();
      const o = JSON.parse(t);
      if(o && typeof o === "object"){ marks = Object.assign({}, marks, o); await saveMarks();
        const b=document.getElementById("impm"); b.textContent="تمت الاستعادة ✓"; render();
        setTimeout(()=>b.textContent="استعادة من نسخة",1600); }
    }catch(e){
      const b=document.getElementById("impm"); b.textContent="ما فيه نسخة في الحافظة";
      setTimeout(()=>b.textContent="استعادة من نسخة",1900);
    }
  };
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("plan").classList.add("on");
}

/* ---------- "near me" reference point ---------- */
let meLabel = "";
const areaCenter = a => {
  const ps = PLACES.filter(p=>p.a===a && p.lat);
  if(!ps.length) return null;
  return [ps.reduce((s,p)=>s+p.lat,0)/ps.length, ps.reduce((s,p)=>s+p.lng,0)/ps.length];
};
function setRef(latlng, label){
  me = latlng; meLabel = label;
  setSortUI("near"); state.sort="near"; state.home=false;
  close(); render();
}
function openNear(err){
  const hotels = PLACES.filter(p=>p.k==="hotel" && p.lat)
    .sort((a,b)=>(b.r||0)-(a.r||0)).slice(0,12);
  document.getElementById("npanel").innerHTML = `
    <div class="grab"></div>
    <div class="ptitle">من وين نحسب المسافة؟</div>
    ${err?`<div class="nerr">${esc(err)}</div>`:
      `<div class="psub">استخدم موقعك الحالي وأنت في بالي، أو اختر نقطة انطلاق.</div>`}
    <button class="primary" id="usegps" style="margin-top:0">📍 استخدم موقعي الحالي</button>
    <div class="fgroup" style="margin-top:18px"><h3>أو ابدأ من منطقة</h3>
      <div class="fchips">${AREAS.map(a=>`<button class="fchip" data-area="${esc(a)}">${esc(a)}</button>`).join("")}</div>
    </div>
    ${hotels.length?`<div class="fgroup"><h3>أو من مكان إقامتك</h3><div class="nlist">
      ${hotels.map(h=>`<button data-h="${esc(h.n)}"><span>🏨</span><span>${esc(h.n)}</span>
        <span class="n">${esc(h.a)}</span></button>`).join("")}</div></div>`:""}`;
  document.getElementById("usegps").onclick = askGps;
  document.querySelectorAll("#npanel [data-area]").forEach(b=>b.onclick=()=>{
    const c = areaCenter(b.dataset.area); if(c) setRef(c, b.dataset.area); });
  document.querySelectorAll("#npanel [data-h]").forEach(b=>b.onclick=()=>{
    const h = PLACES.find(p=>p.n===b.dataset.h); if(h) setRef([h.lat,h.lng], h.n); });
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("near").classList.add("on");
}
function askGps(){
  if(!navigator.geolocation){ openNear("متصفحك ما يدعم تحديد الموقع. اختر منطقة من تحت."); return; }
  const btn = document.getElementById("usegps");
  if(btn) btn.textContent = "جاري تحديد موقعك…";
  navigator.geolocation.getCurrentPosition(
    p=>{
      const d = dist(p.coords.latitude, p.coords.longitude, -8.65, 115.19);
      setRef([p.coords.latitude, p.coords.longitude], d>300 ? "موقعك الحالي" : "موقعك");
    },
    e=>{
      const msg = e.code===1 ? "رفض الإذن. من إعدادات آيفون ← Safari ← الموقع، فعّل «اسأل» أو «سماح»، وأعد المحاولة."
        : e.code===2 ? "ما قدر يحدد موقعك الحين. جرّب مرة ثانية أو اختر منطقة."
        : "انتهت مهلة تحديد الموقع. اختر منطقة من تحت.";
      openNear(msg);
    },
    {timeout:10000, enableHighAccuracy:false, maximumAge:60000});
}

/* ---------- suggested day plans ---------- */
const SLOTS = [
  {t:"٧:٣٠",  lab:"فطور",  ok:p=>p.b && FOODK.has(p.k)},
  {t:"١٠:٠٠", lab:"قهوة",  ok:p=>p.k==="cafe"||p.k==="bakery"},
  {t:"١٢:٣٠", lab:"غداء",  ok:p=>p.l && FOODK.has(p.k)},
  {t:"١٥:٣٠", lab:"نشاط",  ok:p=>p.act||p.k==="spa"||p.k==="gym"},
  {t:"١٧:٣٠", lab:"غروب",  ok:p=>p.k==="beachclub"||p.k==="nature"||p.k==="bar"||p.k==="attraction"},
  {t:"٢٠:٠٠", lab:"عشاء",  ok:p=>p.d && FOODK.has(p.k)},
  {t:"٢٢:٠٠", lab:"حلا",   ok:p=>p.k==="bakery"}
];
let planArea = "", planIdx = {};

function slotCands(i){
  const S = SLOTS[i];
  return PLACES.filter(p=>p.a===planArea && S.ok(p))
    .sort((a,b)=>(mk(b.n).s?1:0)-(mk(a.n).s?1:0) || (b.r||0)-(a.r||0) || (b.rc||0)-(a.rc||0));
}
function buildPlan(){
  const used = new Set(), out = [];
  SLOTS.forEach((S,i)=>{
    const c = slotCands(i).filter(p=>!used.has(p.n));
    if(!c.length){ out.push({S,p:null,n:0}); return; }
    const idx = ((planIdx[i]||0) % c.length + c.length) % c.length;
    const p = c[idx]; used.add(p.n);
    out.push({S,p,n:c.length});
  });
  return out;
}
function openPlan(area){
  planArea = area || planArea || (AREAS[0]||"");
  const rows = buildPlan();
  const areas = AREAS.filter(a=>PLACES.filter(p=>p.a===a).length>=6);
  document.getElementById("ppanel").innerHTML = `
    <div class="grab"></div>
    <div class="ptitle">يوم في ${esc(planArea)}</div>
    <div class="psub">مبني على أماكنك الأعلى تقييمًا في المنطقة — والمميّزة ★ تجي أول. بدّل أي محطة بـ ⟳.</div>
    <div class="pareas">${areas.map(a=>
      `<button class="chip" data-area="${esc(a)}" aria-pressed="${a===planArea}">${esc(a)}</button>`).join("")}</div>
    ${rows.map((r,i)=>{
      if(!r.p) return `<div class="slot"><div class="stime"><b>${r.S.t}</b><span>${r.S.lab}</span></div>
        <div class="sbody pempty">ما فيه خيار مناسب في ${esc(planArea)}</div></div>`;
      const m = mk(r.p.n);
      return `<div class="slot">
        <div class="stime"><b>${r.S.t}</b><span>${r.S.lab}</span></div>
        <div class="sbody">
          <span class="sname">${m.s?"★ ":""}${esc(r.p.n)}</span>
          <span class="smeta">
            <span class="tag" style="background:${tintBg(r.p.k)};color:${tintFg(r.p.k)}">${EMO[r.p.k]||"📍"} ${esc(r.p.c)}</span>
            <span class="num">${r.p.r?r.p.r.toFixed(1):"—"}</span>
          </span>
        </div>
        <div class="sact">
          ${r.n>1?`<button data-swap="${i}" title="بدّل">⟳</button>`:""}
          <button data-open="${esc(r.p.n)}">تفاصيل</button>
        </div></div>`;
    }).join("")}
    <div class="frow" style="margin-top:14px">
      <button class="tbtn" id="pcopy">انسخ الجدول</button>
      <button class="tbtn" id="pshuffle" style="background:var(--jade);border-color:var(--jade);color:#fff">
        جدول ثاني</button>
    </div>`;
  document.querySelectorAll("#ppanel [data-area]").forEach(b=>b.onclick=()=>{ planIdx={}; openPlan(b.dataset.area); });
  document.querySelectorAll("#ppanel [data-swap]").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.swap; planIdx[i]=(planIdx[i]||0)+1; openPlan(planArea); });
  document.querySelectorAll("#ppanel [data-open]").forEach(b=>b.onclick=()=>{
    close(); openDetail(b.dataset.open); });
  document.getElementById("pshuffle").onclick=()=>{
    SLOTS.forEach((_,i)=>planIdx[i]=(planIdx[i]||0)+1); openPlan(planArea); };
  document.getElementById("pcopy").onclick=()=>{
    const txt = "يوم في " + planArea + "\n\n" + buildPlan()
      .filter(r=>r.p).map(r=>`${r.S.t} · ${r.S.lab}: ${r.p.n}${r.p.r?" ("+r.p.r.toFixed(1)+")":""}`).join("\n")
      + "\n\nجالان — وين نروح اليوم؟";
    navigator.clipboard.writeText(txt).then(()=>{
      const b=document.getElementById("pcopy"); b.textContent="تم النسخ ✓";
      setTimeout(()=>{ b.textContent="انسخ الجدول"; },1600);
    }).catch(()=>{});
  };
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("plan").classList.add("on");
}

/* ---------- filters ---------- */
const filterPool = () => PLACES.filter(p=>{
  if(state.sec){ const S=secOf(state.sec); if(!S||!S.keys.includes(p.k)) return false; }
  return true;
});
function openFilters(){
  const chip=(t,on,id,n)=>`<button class="fchip" data-id="${id}" aria-pressed="${on}">${t}${n!=null?` <b style="font-weight:500;opacity:.55">${n}</b>`:""}</button>`;
  const pool = filterPool(), S = state.sec?secOf(state.sec):null;
  const cats = [...new Set(pool.map(p=>p.c))].sort((x,y)=>pool.filter(p=>p.c===y).length-pool.filter(p=>p.c===x).length);
  const meals = MEALS.filter(([k])=>pool.some(p=>p[k]));
  const prices = ["$","$$","$$$","$$$$"].filter(v=>pool.some(p=>p.p===v));
  const rates = [4,4.5,4.7].filter(v=>pool.some(p=>p.r>=v));
  document.getElementById("fpanel").innerHTML = `
    <div class="grab"></div>
    <div class="fctx">فلاتر داخل: <b>${S?esc(S.label):"كل الأماكن"}</b>${state.area?" · "+esc(state.area):""}</div>
    ${cats.length>1?`<div class="fgroup"><h3>التصنيف</h3><div class="fchips">
      ${cats.map(c=>chip(esc(c), state.cats.has(c), "cat:"+c, pool.filter(p=>p.c===c).length)).join("")}</div></div>`:""}
    ${meals.length?`<div class="fgroup"><h3>الوجبة</h3><div class="fchips">
      ${meals.map(([k,t])=>chip(t, state.meal===k, "meal:"+k, pool.filter(p=>p[k]).length)).join("")}</div></div>`:""}
    ${prices.length?`<div class="fgroup"><h3>السعر</h3><div class="fchips">
      ${prices.map(v=>chip(v, state.price.has(v), "price:"+v, pool.filter(x=>x.p===v).length)).join("")}</div></div>`:""}
    ${rates.length?`<div class="fgroup"><h3>أقل تقييم</h3><div class="fchips">
      ${rates.map(v=>chip(v.toFixed(1)+" فأعلى", state.minR===v, "min:"+v, pool.filter(p=>p.r>=v).length)).join("")}</div></div>`:""}
    <div class="fgroup"><h3>قوائمي</h3><div class="fchips">
      ${chip("★ المميّزة", state.starred, "star:1")}
      ${chip("اللي ما زرتها", state.unvisited, "unv:1")}
      ${chip("📝 فيها وصف", state.hasDesc, "desc:1", pool.filter(p=>p.desc).length)}
      ${chip("مقترحة لك", state.sug, "sug:1", pool.filter(p=>p.sug).length)}</div></div>
    <div class="frow">
      <button class="tbtn" id="clr">امسح الفلاتر</button>
      <button class="tbtn" id="done" style="background:var(--jade);border-color:var(--jade);color:#fff">
        عرض ${filtered().length} نتيجة</button></div>`;
  document.querySelectorAll("#fpanel .fchip").forEach(b=>b.onclick=()=>{
    const raw=b.dataset.id, i=raw.indexOf(":"), k=raw.slice(0,i), v=raw.slice(i+1);
    if(k==="cat"){ state.cats.has(v)?state.cats.delete(v):state.cats.add(v); }
    else if(k==="meal"){ state.meal = state.meal===v?"":v; }
    else if(k==="price"){ state.price.has(v)?state.price.delete(v):state.price.add(v); }
    else if(k==="min"){ state.minR = state.minR===+v?0:+v; }
    else if(k==="star"){ state.starred=!state.starred; }
    else if(k==="unv"){ state.unvisited=!state.unvisited; }
    else if(k==="desc"){ state.hasDesc=!state.hasDesc; }
    else if(k==="sug"){ state.sug=!state.sug; }
    openFilters(); render();
  });
  document.getElementById("clr").onclick=()=>{
    state.cats.clear(); state.price.clear(); state.meal=""; state.minR=0;
    state.starred=false; state.unvisited=false; state.hasDesc=false; state.sug=false; state.act=false;
    openFilters(); render(); };
  document.getElementById("done").onclick=()=>close();
  document.getElementById("filters").classList.add("on");
  markFilterBtn();
}
function markFilterBtn(){
  document.getElementById("filtBtn").dataset.on =
    (state.cats.size||state.price.size||state.meal||state.minR||
     state.starred||state.unvisited||state.hasDesc||state.sug||state.act)?"1":"";
}
function close(){
  document.querySelectorAll(".sheet").forEach(s=>s.classList.remove("on"));
  markFilterBtn();
}
document.querySelectorAll("[data-close]").forEach(e=>e.onclick=close);

/* ---------- map ---------- */
let L_map=null, layer=null;
function drawMap(rows){
  const el = document.getElementById("map");
  if(!L_map){
    L_map = L.map(el,{zoomControl:false}).setView([-8.67,115.16],10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(L_map);
    L.control.zoom({position:"bottomleft"}).addTo(L_map);
  }
  if(layer) L_map.removeLayer(layer);
  const pts = rows.filter(p=>p.lat);
  layer = L.layerGroup(pts.map(p=>{
    const m = L.circleMarker([p.lat,p.lng],{radius:6,color:"#fff",weight:1.5,fillColor:tintFg(p.k),fillOpacity:.95});
    m.bindPopup(`<div class="pop"><b>${esc(p.n)}</b>${EMO[p.k]||"📍"} ${esc(p.c)} · ${p.r?p.r.toFixed(1)+" ★ · ":""}${esc(p.a)}<br>
      <a href="${p.u}" target="_blank" rel="noopener">افتح في الخرائط</a></div>`);
    return m;
  })).addTo(L_map);
  if(pts.length) L_map.fitBounds(L.latLngBounds(pts.map(p=>[p.lat,p.lng])).pad(.15));
  setTimeout(()=>L_map.invalidateSize(),60);
}

/* ---------- wiring ---------- */
document.getElementById("q").oninput = e=>{state.q=e.target.value; if(state.q) state.home=false; render();};
function setSortUI(k){
  document.querySelectorAll("#sortSeg button").forEach(x=>x.setAttribute("aria-pressed", x.dataset.s===k));
}
function setSort(k){
  setSortUI(k); state.sort = k;
  if(k==="near" && !me){ openNear(); }
}
document.querySelectorAll("#sortSeg button").forEach(b=>b.onclick=()=>{
  const k = b.dataset.s;
  setSortUI(k); state.sort = k;
  if(k==="near"){ openNear(); return; }
  render();
});
document.getElementById("filtBtn").onclick = openFilters;
document.getElementById("mapBtn").onclick = e=>{
  state.map = !state.map; if(state.map) state.home=false;
  const b = e.currentTarget;
  b.dataset.on = state.map?"1":"";
  b.textContent = state.map?"قائمة":"خريطة";
  document.getElementById("map").style.display = state.map?"block":"none";
  document.getElementById("list").style.display = state.map?"none":"block";
  render();
};

let lastY = 0;
addEventListener("scroll", ()=>{
  const y = window.scrollY, h = document.getElementById("hdr");
  h.classList.toggle("stuck", y > 4);
  if(y > 140 && y > lastY + 6) h.classList.add("hide");
  else if(y < lastY - 6 || y < 80) h.classList.remove("hide");
  lastY = y;
}, {passive:true});

loadMarks().then(render);
