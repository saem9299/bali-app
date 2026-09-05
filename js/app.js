/*
 * JALAN — جالان app logic.
 * Extracted from the source single-file build with two intentional changes
 * (see README "Known fixes" and "Drinks/Protein architecture fix"):
 *  1. A localStorage-backed shim for window.storage (persistence fix).
 *  2. Protein Shake merged into the Drinks section as a subcategory instead
 *     of its own primary Home shortcut/section, per product rule: "Protein
 *     Shake lives inside Drinks, not as a primary Home shortcut."
 */

// The source build targeted a host environment that injects a `window.storage`
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


const EMO={cafe:"☕",coffee:"☕",matcha:"🍵",juice:"🥤",protein:"💪",bakery:"🍰",breakfast:"🍳",
 italian:"🍝",steak:"🥩",burger:"🍔",sandwich:"🥪",mex:"🌮",seafood:"🦐",indo:"🍜",asian:"🍣",
 indian:"🍛",me:"🥙",beachclub:"🏖️",bar:"🍸",hotel:"🏨",spa:"💆",gym:"🏋️",shop:"🛍️",nature:"🌴",
 attraction:"📸",rest:"🍽️",other:"📍",padel:"🎾",tennis:"🎾",box:"🥊",boxing:"🥊",muaythai:"🥊",
 pilates:"🤸",crossfit:"🏋️‍♂️",hyrox:"⚡",yoga:"🧘",surf:"🏄",recovery:"♨️",adv:"⛰️",cult:"🎭",fam:"🎡"};
const LBL={coffee:"قهوة",matcha:"ماتشا",juice:"عصائر وسموذي",protein:"بروتين وصحي",cafe:"كافيه",
 bakery:"حلا ومخبوزات",breakfast:"فطور وبرنش",italian:"إيطالي",steak:"ستيك ومشاوي",seafood:"بحري",
 indo:"إندونيسي",asian:"آسيوي",indian:"هندي",me:"شرق أوسطي وعربي",burger:"برجر",sandwich:"ساندويتش",
 mex:"مكسيكي",rest:"مطاعم متنوعة",bar:"بار ولاونج",beachclub:"بيتش كلب",nature:"شواطئ وطبيعة",
 hotel:"إقامة",spa:"سبا وجمال",shop:"تسوق",other:"أخرى",attraction:"معالم",adv:"مغامرات",
 cult:"ثقافة وعروض",fam:"عائلي",gym:"جيم",padel:"بادل",tennis:"تنس",pilates:"بيلاتس",
 crossfit:"كروس فت",hyrox:"هايروكس",boxing:"ملاكمة",muaythai:"موي تاي",yoga:"يوقا",
 surf:"سيرف",recovery:"استشفاء وساونا"};
// Unified line-icon set (Lucide, MIT/ISC-licensed static SVGs — inlined so there's no
// new runtime/CDN dependency) for the Home/nav chrome, replacing the mixed-style emoji
// there (sections, bottom nav, meal picker). Per-place category glyphs in EMO above are
// left untouched — those are category/data iconography, out of this pass's scope.
const LICO_PATH={
 home:'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 utensils:'<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
 "cup-soda":'<path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"/><path d="M5 8h14"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/><path d="m12 8 1-6h2"/>',
 dumbbell:'<path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"/><path d="m2.5 21.5 1.4-1.4"/><path d="m20.1 3.9 1.4-1.4"/><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"/><path d="m9.6 14.4 4.8-4.8"/>',
 palmtree:'<path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4"/><path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3"/><path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35"/><path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14"/>',
 compass:'<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/>',
 hotel:'<path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/>',
 "flower-2":'<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1"/><circle cx="12" cy="8" r="2"/><path d="M12 10v12"/><path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z"/><path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z"/>',
 "shopping-bag":'<path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.103 6.034h17.79a1 1 0 0 1 .984 1.192l-1.964 10a1 1 0 0 1-.984.808H5.067a1 1 0 0 1-.984-.808l-1.964-10a1 1 0 0 1 .984-1.192"/><path d="M8.5 6a3.5 3.5 0 1 1 7 0"/>',
 "more-horizontal":'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
 sunrise:'<path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
 croissant:'<path d="M10.2 18H4.774a1.5 1.5 0 0 1-1.352-.97 11 11 0 0 1-.594-4.377c.05-1.83.53-3.6 1.216-5.271A2.28 2.28 0 0 1 5.774 6c2.313.098 6.017.281 8.226.281.687 0 1.35-.024 1.964-.076"/><path d="M12.75 6.53A2.28 2.28 0 0 1 14.5 6c1.146 0 2.084.35 2.916.911A11 11 0 0 1 19.5 9.5"/><path d="m14 6.5 4.5 9.5"/><path d="m10.5 18-4-9"/>',
 moon:'<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.42.402.764a7 7 0 0 0 9.31 9.31c.344-.215.786-.003.764.402z"/>',
 calendar:'<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
 star:'<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.166-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
 check:'<path d="M20 6 9 17l-5-5"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
 "map-pin":'<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'
};
const licon=(name,cls)=>`<svg class="licon${cls?" "+cls:""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LICO_PATH[name]||""}</svg>`;

const SECTIONS=[
 {id:"food",label:"أكل",ic:licon("utensils"),keys:["italian","steak","seafood","indo","asian","indian","me","burger","sandwich","mex","bakery","breakfast","rest","cafe"],
  subs:["rest","italian","steak","seafood","indo","asian","indian","me","burger","sandwich","mex","bakery","breakfast","cafe"]},
 {id:"drinks",label:"مشروبات",ic:licon("cup-soda"),keys:["coffee","matcha","juice","protein","cafe"],subs:["coffee","matcha","juice","protein"]},
 {id:"sports",label:"رياضة",ic:licon("dumbbell"),keys:["gym","padel","tennis","pilates","crossfit","hyrox","boxing","muaythai","yoga","surf","recovery"],
  subs:["gym","padel","tennis","pilates","crossfit","hyrox","boxing","muaythai","yoga","surf","recovery"]},
 {id:"beach",label:"شواطئ وبيتش كلب",ic:licon("palmtree"),keys:["beachclub","nature"],subs:["beachclub","nature"]},
 {id:"visit",label:"تستحق الزيارة",ic:licon("compass"),keys:["attraction","adv","cult","fam"],subs:["attraction","adv","cult","fam"]},
 {id:"stay",label:"إقامة",ic:licon("hotel"),keys:["hotel"],subs:[]},
 {id:"spa",label:"سبا وجمال",ic:licon("flower-2"),keys:["spa","recovery"],subs:[]},
 {id:"shop",label:"تسوق",ic:licon("shopping-bag"),keys:["shop","other"],subs:[]}
];
// Visual identity: one accent color per Home section (design tokens in css/styles.css,
// mirrored here since section→color is a lookup the renderer needs, not a CSS rule).
// A kind used by more than one section (e.g. "cafe" in both food and drinks) takes the
// color of whichever section lists it first below — sections without a brand color in
// the spec (stay/spa/shop) get the neutral secondary-text tone instead of inventing one.
const SECTION_HEX={food:"#087F5B",drinks:"#F97316",sports:"#2563EB",beach:"#0891B2",
 visit:"#EAB308",stay:"#4B5563",spa:"#4B5563",shop:"#4B5563"};
const KIND_SECTION={};
SECTIONS.forEach(S=>S.keys.forEach(k=>{if(!(k in KIND_SECTION))KIND_SECTION[k]=S.id;}));
const hexToRgb=h=>{const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255];};
const tintBg=k=>{const[r,g,b]=hexToRgb(SECTION_HEX[KIND_SECTION[k]]||"#4B5563");return`rgba(${r},${g},${b},.1)`;};
const tintFg=k=>SECTION_HEX[KIND_SECTION[k]]||"#4B5563";
const TABS=["food","drinks","sports"];
const MEALS=[["b","فطور",licon("sunrise")],["br","برنش",licon("croissant")],["l","غداء",licon("utensils")],["d","عشاء",licon("moon")]];
const secOf=id=>SECTIONS.find(s=>s.id===id);
const AREAS=[...new Set(PLACES.map(p=>p.a))].sort((a,b)=>PLACES.filter(p=>p.a===b).length-PLACES.filter(p=>p.a===a).length);
const hasCat=(p,k)=>(p.cats||[p.k]).includes(k);
const inSec=(p,S)=>S.keys.some(k=>hasCat(p,k));

let marks={};const KEY="bali:marks";
async function loadMarks(){try{const r=await window.storage.get(KEY);if(r&&r.value)marks=JSON.parse(r.value);}catch(e){marks={};}}
async function saveMarks(){try{await window.storage.set(KEY,JSON.stringify(marks));}catch(e){}}
const mk=n=>marks[n]||{};

const state={q:"",area:"",sec:"",sub:"",meal:"",mealPicked:false,subPicked:false,
 cats:new Set(),price:new Set(),minR:0,
 starred:false,unvisited:false,sug:false,openNow:false,maxKm:0,tagsOn:new Set(),
 sort:"best",map:false,home:true,flowWhy:null,customOnly:null};
let me=null,meLabel="";

const esc=s=>(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmtKm=v=>v<1?Math.round(v*1000)+" م":(v<100?v.toFixed(1):Math.round(v).toLocaleString("en"))+" كم";
const dist=(a,b,c,d)=>{const R=6371,t=x=>x*Math.PI/180;const dLa=t(c-a),dLo=t(d-b);
 const h=Math.sin(dLa/2)**2+Math.cos(t(a))*Math.cos(t(c))*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(h));};
const kmOf=p=>(me&&p.lat)?dist(me[0],me[1],p.lat,p.lng):null;
const nowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes();};
function openState(p){                      // 1 open · 0 closed · null unknown
  if(!p.oh) return null;
  const n=nowMin(),[o,c]=p.oh;
  return (c>o) ? (n>=o&&n<c?1:0) : (n>=o||n<c?1:0);
}
const hhmm=m=>{const h=Math.floor(m/60)%24,x=m%60;const ap=h<12?"ص":"م";const h12=h%12===0?12:h%12;
 return h12+(x?":"+String(x).padStart(2,"0"):"")+ap;};

/* ---------------- recommendation engine ---------------- */
function score(p){
  let s=0;const r=p.r||0;
  s+=0.42*Math.max(0,Math.min(1,(r-3.5)/1.5));
  s+=0.14*Math.max(0,Math.min(1,Math.log10((p.rc||0)+1)/4.5));
  const km=kmOf(p);
  if(km!=null){const ref=state.maxKm||25;s+=0.22*Math.max(0,1-km/ref);}
  const op=openState(p);
  s+=op===1?0.10:(op===null?0.04:0);
  if(p.desc)s+=0.04;
  if(mk(p.n).s)s+=0.12;
  if(mk(p.n).v)s-=0.06;
  return s;
}
function whyList(p){
  const w=[],km=kmOf(p),op=openState(p);
  if(km!=null&&km<3)w.push("قريب منك ("+fmtKm(km)+")");
  else if(km!=null&&km<10)w.push("على بُعد "+fmtKm(km));
  if(op===1)w.push("مفتوح الآن");
  if(op===0&&p.oh)w.push("مسكّر — يفتح "+hhmm(p.oh[0]));
  if((p.r||0)>=4.7)w.push("تقييمه "+p.r.toFixed(1)+" وهو من الأعلى");
  else if((p.r||0)>=4.4)w.push("تقييمه "+p.r.toFixed(1));
  if((p.rc||0)>=3000)w.push("مجرّب من "+p.rc.toLocaleString("en")+" شخص");
  if(state.meal){const m=MEALS.find(x=>x[0]===state.meal);if(m&&p[state.meal])w.push("مناسب لل"+m[1]);}
  if(mk(p.n).s)w.push("مميّز عندك ★");
  if(p.p&&state.price.size&&state.price.has(p.p))w.push("ضمن ميزانيتك");
  if((p.tags||[]).includes("halal"))w.push("حلال");
  if((p.tags||[]).includes("arabic"))w.push("فيه طاقم يتكلم عربي");
  if(p.desc){const m=p.desc.match(/المشهور:\s*([^\.\n]{6,70})/);if(m)w.push("جرّب: "+m[1].trim());}
  return w.slice(0,5);
}

/* ---------------- filtering ---------------- */
function passSec(p){
  if(state.sec){const S=secOf(state.sec);if(!S||!inSec(p,S))return false;}
  if(state.sub&&!hasCat(p,state.sub))return false;
  if(state.meal&&!p[state.meal])return false;
  return true;
}
function filtered(){
  let out=(state.customOnly?PLACES.filter(state.customOnly):PLACES).filter(p=>{
    if(state.q){const s=(p.n+" "+p.o+" "+p.a+" "+p.c+" "+(p.cu||"")+" "+(p.cats||[]).join(" ")+" "+(p.tags||[]).join(" ")+" "+(p.desc||"")).toLowerCase();
      if(!s.includes(state.q.toLowerCase()))return false;}
    if(!passSec(p))return false;
    if(state.area&&p.a!==state.area)return false;
    if(state.cats.size&&![...state.cats].some(c=>hasCat(p,c)))return false;
    if(state.price.size&&!state.price.has(p.p||""))return false;
    if(state.minR&&(!p.r||p.r<state.minR))return false;
    if(state.starred&&!mk(p.n).s)return false;
    if(state.unvisited&&mk(p.n).v)return false;
    if(state.sug&&!p.sug)return false;
    if(state.openNow&&openState(p)===0)return false;
    if(state.maxKm){const km=kmOf(p);if(km!=null&&km>state.maxKm)return false;}
    for(const t of state.tagsOn){
      if(t==="nopork"){if((p.tags||[]).includes("pork"))return false;}
      else if(t==="noalcohol"){if((p.tags||[]).includes("alcohol")&&!(p.tags||[]).includes("noalcohol"))return false;}
      else if(t==="nobooking"){if(p.res)return false;}
      else if(!(p.tags||[]).includes(t))return false;
    }
    return true;
  });
  if(state.sort==="pop")out.sort((a,b)=>(b.rc||0)-(a.rc||0));
  else if(state.sort==="rating")out.sort((a,b)=>(b.r||0)-(a.r||0)||(b.rc||0)-(a.rc||0));
  else if(state.sort==="near"&&me)out.sort((a,b)=>((kmOf(a)??9e9)-(kmOf(b)??9e9)));
  else out.sort((a,b)=>score(b)-score(a));
  return out;
}

/* ---------------- chrome ---------------- */
function chipBtn(label,on,n,fn){const b=document.createElement("button");b.className="chip";
 b.setAttribute("aria-pressed",on);b.innerHTML=label+(n!=null?` <b>${n}</b>`:"");b.onclick=fn;return b;}
function renderTabs(){
  const nav=document.getElementById("tabs");nav.innerHTML="";
  const add=(ic,label,on,fn)=>{const b=document.createElement("button");b.setAttribute("aria-pressed",on);
   b.innerHTML=`<span class="ic">${ic}</span><span>${label}</span>`;b.onclick=fn;nav.appendChild(b);};
  add(licon("home"),"الرئيسية",state.home,goHome);
  TABS.forEach(id=>{const S=secOf(id);add(S.ic,S.label,state.sec===id,()=>pickSec(id));});
  add(licon("more-horizontal"),"المزيد",!!state.sec&&!TABS.includes(state.sec),openMore);
}
function renderChips(){
  const base=PLACES.filter(passSec);
  const ac=document.getElementById("areaChips");ac.innerHTML="";
  ac.appendChild(chipBtn("كل المناطق",!state.area,base.length,()=>{state.area="";render();}));
  AREAS.forEach(a=>{const n=base.filter(p=>p.a===a).length;if(!n)return;
   ac.appendChild(chipBtn(a,state.area===a,n,()=>{state.area=state.area===a?"":a;render();}));});
}
function pickSec(id){state.home=false;state.sec=state.sec===id?"":id;state.sub="";state.meal="";
 state.mealPicked=false;state.subPicked=false;state.customOnly=null;
 state.cats.clear();close();window.scrollTo({top:0});render();}
function goHome(){Object.assign(state,{home:true,sec:"",sub:"",meal:"",mealPicked:false,subPicked:false,
 area:"",q:"",minR:0,openNow:false,maxKm:0,starred:false,unvisited:false,sug:false,
 flowWhy:null,customOnly:null});
 state.cats.clear();state.price.clear();state.tagsOn.clear();
 const qq=document.getElementById("q");if(qq)qq.value="";
 if(state.map){state.map=false;document.getElementById("map").style.display="none";
  document.getElementById("list").style.display="block";const b=document.getElementById("mapBtn");b.dataset.on="";b.textContent="خريطة";}
 close();window.scrollTo({top:0});render();}
function openMore(){
  const rest=SECTIONS.filter(S=>!TABS.includes(S.id));
  document.getElementById("mpanel").innerHTML=`<div class="grab"></div><div class="morelist">
   ${rest.map(S=>`<button data-id="${S.id}"><span style="font-size:19px">${S.ic}</span><span>${S.label}</span>
    <span class="n">${PLACES.filter(p=>inSec(p,S)).length}</span></button>`).join("")}
   <button data-id="__plan"><span style="font-size:19px">${licon("calendar")}</span><span>خطط يومي</span><span class="n"></span></button>
   <button data-id="__star"><span style="font-size:19px">${licon("star")}</span><span>المميّزة عندي</span>
    <span class="n">${PLACES.filter(p=>mk(p.n).s).length}</span></button>
   <button data-id="__vis"><span style="font-size:19px">${licon("check")}</span><span>اللي زرتها</span>
    <span class="n">${PLACES.filter(p=>mk(p.n).v).length}</span></button>
   <button data-id="__about"><span style="font-size:19px">${licon("info")}</span><span>عن جالان ونسخة احتياطية</span><span class="n"></span></button>
  </div>`;
  document.querySelectorAll("#mpanel .morelist button").forEach(b=>b.onclick=()=>{
    const id=b.dataset.id;
    if(id==="__plan"){openPlan(planArea||AREAS[0]);return;}
    if(id==="__about"){openAbout();return;}
    if(id==="__star"){state.starred=true;state.home=false;state.sec="";close();render();return;}
    if(id==="__vis"){state.home=false;state.sec="";state.starred=false;state.unvisited=false;
      state.q="";close();state.sort="rating";
      const only=p=>mk(p.n).v;state.customOnly=only;render();return;}
    pickSec(id);
  });
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("more").classList.add("on");
}

/* ---------------- render ---------------- */
function render(){
  document.body.classList.toggle("home",state.home&&!state.map);
  renderTabs();
  const tb=document.getElementById("toolbar"),ct=document.getElementById("count");
  if(state.home&&!state.map){tb.style.display="none";ct.style.display="none";
    document.getElementById("areaChips").style.display="none";
    document.getElementById("total").textContent="";renderHome();return;}
  document.getElementById("areaChips").style.display="";
  const S=state.sec?secOf(state.sec):null;
  const foodStep=S&&S.id==="food"&&!state.mealPicked;
  const subStep=S&&S.subs.length&&!state.subPicked&&!state.q&&!foodStep;
  const needPicker=(foodStep||subStep)&&!state.q;
  tb.style.display=needPicker?"none":"";ct.style.display=needPicker?"none":"";
  renderChips();
  document.getElementById("total").textContent=PLACES.length+" مكان";
  if(needPicker){renderPicker(S);return;}
  const rows=filtered();
  const parts=[rows.length+" نتيجة"];
  if(S)parts.push(S.label);
  if(state.meal)parts.push(MEALS.find(m=>m[0]===state.meal)[1]);
  if(state.sub)parts.push(LBL[state.sub]||state.sub);
  if(state.area)parts.push(state.area);
  if(me)parts.push("من "+meLabel);
  ct.textContent=parts.join(" · ");
  const list=document.getElementById("list");
  if(state.map){drawMap(rows);return;}
  if(!rows.length){renderEmpty();return;}
  const canBack=S&&(state.subPicked||(S.id==="food"&&state.mealPicked))&&(S.subs.length||S.id==="food");
  const headBits=[];
  if(S&&S.id==="food")headBits.push(state.meal?MEALS.find(m=>m[0]===state.meal)[1]:(state.mealPicked?"كل أماكن الأكل":""));
  if(S&&S.subs.length)headBits.push(state.sub?(LBL[state.sub]||""):(state.subPicked?"الكل":""));
  const head=canBack?`<div class="vhead"><button id="back">‹ رجوع</button>
    <span>${esc(headBits.filter(Boolean).join(" · "))}</span></div>`:"";
  list.innerHTML=head+rows.map(p=>{
    const m=mk(p.n),km=kmOf(p),op=openState(p);
    const d=km!=null?`<div class="dist">${fmtKm(km)}</div>`:"";
    const rest=[p.p,p.a].filter(Boolean).join(" · ");
    const badge=(m.s?"★":"")+(m.v?"✓":"");
    const why=(state.sort==="best")?whyList(p).slice(0,2):[];
    const snip=(!why.length&&p.desc)?p.desc.replace(/\n/g," ").replace(/[⚠️📅💰💡🎾🥊🏄🧘♨️]/g,"").trim():"";
    return `<button class="row" data-n="${esc(p.n)}">
      <span class="rmain"><span class="rname">${esc(p.n)}</span>
      <span class="rmeta">${p.act?'<span class="act">نشاط</span>':""}${p.sug?'<span class="sug">مقترح</span>':""}
       ${op===0?'<span class="shut">مسكّر</span>':""}
       <span class="tag" style="background:${tintBg(p.k)};color:${tintFg(p.k)}">${EMO[p.k]||"📍"} ${esc(p.c)}</span>
       <span class="dots">${esc(rest)}</span></span>
      ${why.length?`<span class="why">${why.map(w=>"• "+esc(w)).join(" ")}</span>`:""}
      ${snip?`<span class="snip">${esc(snip)}</span>`:""}</span>
      <span class="rside"><div class="rate ${p.r>=4.7?"hi":""}">${p.r?p.r.toFixed(1):"—"}</div>
      ${p.rc?`<div class="rc">${p.rc.toLocaleString("en")}</div>`:""}${d}
      ${badge?`<div class="marks">${badge}</div>`:""}</span></button>`;}).join("");
  const bk=document.getElementById("back");
  if(bk)bk.onclick=()=>{
    if(S&&S.subs.length&&state.subPicked){state.sub="";state.subPicked=false;}
    else if(S&&S.id==="food"&&state.mealPicked){state.meal="";state.mealPicked=false;}
    render();};
  list.querySelectorAll(".row").forEach(el=>el.onclick=()=>openDetail(el.dataset.n));
}
function renderPicker(S){
  const list=document.getElementById("list");
  const pool=PLACES.filter(p=>inSec(p,S));
  if(S.id==="food"&&!state.mealPicked){
    list.innerHTML=`<div class="vlist">
      <button class="vrow" data-meal="__all"><span class="vi">${licon("utensils")}</span><span class="vt">كل أماكن الأكل</span>
        <span class="vn">${pool.length}</span><span class="va">‹</span></button>
      ${MEALS.map(([k,lab,ic])=>{const n=pool.filter(p=>p[k]).length;return !n?"":
        `<button class="vrow" data-meal="${k}"><span class="vi">${ic}</span><span class="vt">${lab}</span>
         <span class="vn">${n}</span><span class="va">‹</span></button>`;}).join("")}</div>`;
    list.querySelectorAll("[data-meal]").forEach(b=>b.onclick=()=>{
      const v=b.dataset.meal;state.meal=(v==="__all")?"":v;state.mealPicked=true;
      window.scrollTo({top:0});render();});
    return;
  }
  const base=state.meal?pool.filter(p=>p[state.meal]):pool;
  list.innerHTML=(S.id==="food"?`<div class="vhead"><button id="back2">‹ رجوع</button>
     <span>${state.meal?esc(MEALS.find(m=>m[0]===state.meal)[1]):"كل أماكن الأكل"}</span></div>`:"")+
    `<div class="vlist">
     <button class="vrow" data-sub="__all"><span class="vi">${S.ic}</span><span class="vt">الكل</span>
       <span class="vn">${base.length}</span><span class="va">‹</span></button>
     ${S.subs.map(k=>{const n=base.filter(p=>hasCat(p,k)).length;return !n?"":
      `<button class="vrow" data-sub="${k}"><span class="vi">${EMO[k]||"📍"}</span>
       <span class="vt">${LBL[k]||k}</span><span class="vn">${n}</span><span class="va">‹</span></button>`;}).join("")}
    </div>`;
  const b2=document.getElementById("back2");
  if(b2)b2.onclick=()=>{state.meal="";state.mealPicked=false;render();};
  list.querySelectorAll("[data-sub]").forEach(b=>b.onclick=()=>{
    const v=b.dataset.sub;state.sub=(v==="__all")?"":v;state.subPicked=true;
    window.scrollTo({top:0});render();});
}
function renderEmpty(){
  document.getElementById("list").innerHTML=`<div class="empty"><b>ما لقينا شي يطابق كل اختياراتك</b>
   جرّب توسّع البحث:
   <div class="esc">
     ${state.maxKm?`<button data-e="km">وسّع المسافة</button>`:""}
     ${state.price.size?`<button data-e="price">شيل فلتر السعر</button>`:""}
     ${state.openNow?`<button data-e="open">اعرض المسكّرة كمان</button>`:""}
     ${state.area?`<button data-e="area">اعرض كل المناطق</button>`:""}
     <button data-e="all">امسح كل الفلاتر</button>
     <button class="p" data-e="sur">✨ اختَر لي</button>
   </div></div>`;
  document.querySelectorAll("#list [data-e]").forEach(b=>b.onclick=()=>{
    const e=b.dataset.e;
    if(e==="km")state.maxKm=0; else if(e==="price")state.price.clear();
    else if(e==="open")state.openNow=false; else if(e==="area")state.area="";
    else if(e==="sur"){surprise();return;}
    else{Object.assign(state,{q:"",area:"",minR:0,openNow:false,maxKm:0,starred:false,unvisited:false,sug:false});
      state.cats.clear();state.price.clear();state.tagsOn.clear();document.getElementById("q").value="";}
    render();});
}
function renderHome(){
  const H="https://commons.wikimedia.org/wiki/Special:FilePath/Rice%20terraces,%20Bali.jpg?width=1200";
  const cards=SECTIONS.map(S=>{const ps=PLACES.filter(p=>inSec(p,S));
   const top=ps.slice().sort((a,b)=>(b.r||0)-(a.r||0))[0];const k=ps[0]?ps[0].k:"other";
   return `<button class="card" data-sec="${S.id}" style="border-inline-start:3px solid ${tintFg(k)}">
    <span class="cico" style="background:${tintBg(k)};color:${tintFg(k)}">${S.ic}</span>
    <b>${S.label}</b><span class="cn">${ps.length} مكان</span>
    <span class="cs">${top?esc(top.n):""}</span></button>`;}).join("");
  const openCnt=PLACES.filter(p=>openState(p)===1).length;
  document.getElementById("list").innerHTML=`<div class="home-wrap">
   <div class="hero"><img src="${H}" alt="" onerror="this.style.display='none'"><div class="veil"></div>
    <div class="in"><div class="kicker">JALAN</div><h2 class="serif">وين نروح اليوم؟</h2>
    <p>${PLACES.length} محطة في ${AREAS.length} مناطق · ${openCnt} مفتوحة الآن</p></div></div>
   <p class="credit">صورة: Vyacheslav Argenberg · <a href="https://creativecommons.org/licenses/by/4.0" target="_blank" rel="noopener">CC BY 4.0</a></p>
   <button class="cta" id="flowbtn">🧭 وين نروح الآن؟<small>توصية ذكية بخمس خطوات سريعة</small></button>
   <button class="cta2" id="surbtn">✨ اختَر لي — قرار سريع</button>
   <div class="quick">
     <button data-q="near">${licon("map-pin")} قريب مني</button><button data-q="meal">${licon("utensils")} وش آكل؟</button>
     <button data-q="drinks">${licon("cup-soda")} مشروبات</button>
     <button data-q="sports">${licon("dumbbell")} رياضة</button><button data-q="beach">${licon("palmtree")} شواطئ</button>
     <button data-q="plan">${licon("calendar")} خطط يومي</button><button data-q="star">${licon("star")} المميّزة</button>
   </div>
   <div class="hsec">الأقسام</div><div class="grid">${cards}</div>
   <div class="hsec">مفتوح الآن وقريب</div><div id="hnow"></div>
   <div class="hsec">جديد على جالان</div><div id="hnew"></div></div>`;
  document.querySelectorAll("#list .card").forEach(b=>b.onclick=()=>pickSec(b.dataset.sec));
  document.getElementById("flowbtn").onclick=()=>openFlow(0);
  document.getElementById("surbtn").onclick=surprise;
  document.querySelectorAll("#list [data-q]").forEach(b=>b.onclick=()=>{
    const q=b.dataset.q;state.home=false;
    if(q==="near"){state.sort="near";setSortUI("near");openNear();return;}
    if(q==="meal"){pickSec("food");return;}
    if(q==="drinks"){pickSec("drinks");return;}
    if(q==="sports"){pickSec("sports");return;}
    if(q==="beach"){pickSec("beach");return;}
    if(q==="plan"){state.home=true;openPlan(planArea||AREAS[0]);return;}
    if(q==="star"){state.starred=true;}
    render();});
  const mini=(arr,el)=>{document.getElementById(el).innerHTML=arr.map(p=>
    `<button class="row" data-n="${esc(p.n)}" style="border-radius:12px;border:1px solid var(--stone);margin-bottom:8px">
     <span class="rmain"><span class="rname">${esc(p.n)}</span>
     <span class="rmeta"><span class="tag" style="background:${tintBg(p.k)};color:${tintFg(p.k)}">${EMO[p.k]||"📍"} ${esc(p.c)}</span>
     <span class="dots">${esc(p.a)}${kmOf(p)!=null?" · "+fmtKm(kmOf(p)):""}</span></span></span>
     <span class="rside"><div class="rate ${p.r>=4.7?"hi":""}">${p.r?p.r.toFixed(1):"—"}</div></span></button>`).join("");
    document.querySelectorAll("#"+el+" .row").forEach(b=>b.onclick=()=>openDetail(b.dataset.n));};
  mini(PLACES.filter(p=>openState(p)===1).sort((a,b)=>score(b)-score(a)).slice(0,4),"hnow");
  mini(PLACES.filter(p=>p.sug).sort((a,b)=>(b.r||0)-(a.r||0)).slice(0,4),"hnew");
}

/* ---------------- decision flow ---------------- */
const FLOW={where:null,what:null,km:null,budget:null,extra:new Set()};
const WHATS=[["b","فطور","🍳"],["br","برنش","🥐"],["l","غداء","🍽️"],["d","عشاء","🌙"],
 ["coffee","قهوة","☕"],["matcha","ماتشا","🍵"],["juice","عصائر","🥤"],["protein","بروتين","💪"],
 ["bakery","حلا","🍰"],["sports","رياضة","🎯"],["visit","نشاط وزيارة","📸"],["beachclub","شاطئ","🏖️"]];
function openFlow(step){
  const P_=document.getElementById("wpanel");
  const btn=(t,on,id)=>`<button class="fchip" data-id="${id}" aria-pressed="${on}">${t}</button>`;
  let html=`<div class="grab"></div><div class="step">خطوة ${step+1} من 5</div>`;
  if(step===0){html+=`<div class="ptitle">وين أنت؟</div><div class="fchips" style="flex-direction:column">
    <button class="vrow" data-w="gps"><span class="vi">📍</span><span class="vt">موقعي الحالي</span><span class="va">‹</span></button>
    ${AREAS.map(a=>`<button class="vrow" data-w="area:${esc(a)}"><span class="vi">🗺️</span><span class="vt">${esc(a)}</span>
     <span class="vn">${PLACES.filter(p=>p.a===a).length}</span><span class="va">‹</span></button>`).join("")}
    ${PLACES.filter(p=>p.k==="hotel").slice(0,6).map(h=>`<button class="vrow" data-w="hotel:${esc(h.n)}">
     <span class="vi">🏨</span><span class="vt">${esc(h.n)}</span><span class="va">‹</span></button>`).join("")}</div>`;}
  if(step===1){html+=`<div class="ptitle">وش تبي؟</div><div class="fchips">
    ${WHATS.map(([k,l,i])=>btn(i+" "+l,FLOW.what===k,"what:"+k)).join("")}</div>
    <div class="frow"><button class="tbtn" data-n="2" style="background:var(--jade);border-color:var(--jade);color:#fff">التالي</button></div>`;}
  if(step===2){html+=`<div class="ptitle">كم تبي تبعد؟</div><div class="fchips">
    ${[[2,"قريب جدًا"],[5,"أقل من ١٠ دقايق"],[10,"أقل من ٢٠ دقيقة"],[18,"أقل من ٣٠ دقيقة"],[0,"أي مسافة"]]
      .map(([v,l])=>btn(l,FLOW.km===v,"km:"+v)).join("")}</div>
    <div class="frow"><button class="tbtn" data-n="3" style="background:var(--jade);border-color:var(--jade);color:#fff">التالي</button></div>`;}
  if(step===3){html+=`<div class="ptitle">الميزانية</div><div class="fchips">
    ${[["$","اقتصادي"],["$$","متوسط"],["$$$$","مرتفع"],["","لا يهم"]].map(([v,l])=>btn(l,FLOW.budget===v,"bud:"+v)).join("")}</div>
    <div class="frow"><button class="tbtn" data-n="4" style="background:var(--jade);border-color:var(--jade);color:#fff">التالي</button></div>`;}
  if(step===4){html+=`<div class="ptitle">شي إضافي؟</div><div class="fchips">
    ${[["open","مفتوح الآن"],["nobooking","بدون حجز"],["family","مناسب للعائلة"],["quiet","هادئ"],
       ["healthy","صحي"],["halal","حلال"],["noalcohol","بدون كحول"],["nopork","بدون خنزير"],
       ["arabic","عربي"],["work","مناسب للعمل"],["view","إطلالة وغروب"]]
      .map(([v,l])=>btn(l,FLOW.extra.has(v),"ex:"+v)).join("")}</div>
    <div class="frow"><button class="tbtn" data-n="go" style="background:var(--jade);border-color:var(--jade);color:#fff">اعرض النتائج</button></div>`;}
  P_.innerHTML=html;
  P_.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{
    const v=b.dataset.w;
    if(v==="gps"){askGps(()=>openFlow(1));return;}
    if(v.startsWith("area:")){const a=v.slice(5);const c=areaCenter(a);if(c){me=c;meLabel=a;}FLOW.where=a;}
    if(v.startsWith("hotel:")){const h=PLACES.find(p=>p.n===v.slice(6));if(h){me=[h.lat,h.lng];meLabel=h.n;}}
    openFlow(1);});
  P_.querySelectorAll(".fchip").forEach(b=>b.onclick=()=>{
    const raw=b.dataset.id,i=raw.indexOf(":"),k=raw.slice(0,i),v=raw.slice(i+1);
    if(k==="what")FLOW.what=v;
    if(k==="km")FLOW.km=+v;
    if(k==="bud")FLOW.budget=v;
    if(k==="ex")FLOW.extra.has(v)?FLOW.extra.delete(v):FLOW.extra.add(v);
    openFlow(step);});
  P_.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{
    if(b.dataset.n==="go")applyFlow();else openFlow(+b.dataset.n);});
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("flow").classList.add("on");
}
function applyFlow(){
  Object.assign(state,{home:false,sec:"",sub:"",meal:"",mealPicked:true,subPicked:true,
    area:"",q:"",minR:0,openNow:false,maxKm:0,
    starred:false,unvisited:false,sug:false,sort:"best"});
  state.cats.clear();state.price.clear();state.tagsOn.clear();
  const w=FLOW.what;
  if(["b","br","l","d"].includes(w)){state.sec="food";state.meal=w;}
  else if(["coffee","matcha","juice"].includes(w)){state.sec="drinks";state.sub=w;}
  else if(w==="protein"){state.sec="drinks";state.sub="protein";}
  else if(w==="bakery"){state.sec="food";state.sub="bakery";}
  else if(w==="sports"){state.sec="sports";}
  else if(w==="visit"){state.sec="visit";}
  else if(w==="beachclub"){state.sec="beach";state.sub="beachclub";}
  if(FLOW.km)state.maxKm=FLOW.km;
  if(FLOW.budget)state.price.add(FLOW.budget);
  FLOW.extra.forEach(x=>{if(x==="open")state.openNow=true;else state.tagsOn.add(x);});
  setSortUI("best");close();window.scrollTo({top:0});render();
}
function surprise(){
  const pool=filtered().length?filtered():PLACES.filter(p=>p.desc);
  const top=pool.slice().sort((a,b)=>score(b)-score(a)).slice(0,8);
  if(!top.length)return;
  const pick=top[Math.floor(Math.random()*Math.min(5,top.length))];
  state.home=false;close();openDetail(pick.n);
}

/* ---------------- detail ---------------- */
function openDetail(name){
  const p=PLACES.find(x=>x.n===name);if(!p)return;
  const m=mk(p.n),km=kmOf(p),op=openState(p);
  const photos=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.n+" Bali")}`;
  const T=p.tags||[];
  const warn=[];if(T.includes("pork"))warn.push("فيه أطباق خنزير");
  if(T.includes("alcohol")&&!T.includes("noalcohol"))warn.push("يقدّم كحول");
  if(T.includes("minspend"))warn.push("حد أدنى للصرف");
  if(T.includes("premium"))warn.push("أسعاره مرتفعة");
  if(p.res)warn.push("يحتاج حجز مسبق");
  const good=[];if(T.includes("halal"))good.push("حلال");
  if(T.includes("arabic"))good.push("طاقم يتكلم عربي");
  if(T.includes("prayer"))good.push("فيه مصلى");
  if(T.includes("noalcohol"))good.push("خيارات بدون كحول");
  if(T.includes("family"))good.push("مناسب للعائلة");
  if(T.includes("work"))good.push("مناسب للعمل");
  const why=whyList(p);
  document.getElementById("dpanel").innerHTML=`<div class="grab"></div>
   <div class="dband" style="background:linear-gradient(135deg,${tintBg(p.k)},${tintFg(p.k)}18)"><span>${EMO[p.k]||"📍"}</span></div>
   <div class="dname">${esc(p.n)}</div>
   <div class="dsub"><span class="tag" style="background:${tintBg(p.k)};color:${tintFg(p.k)}">${EMO[p.k]||"📍"} ${esc(p.c)}</span>
    <span>${esc(p.a)}${p.o?" · محفوظ باسم: "+esc(p.o):""}</span>
    ${p.sug?'<span class="sug">مقترح</span>':""}
    ${op===1?'<span class="sug">مفتوح الآن</span>':op===0?`<span class="shut">مسكّر · يفتح ${hhmm(p.oh[0])}</span>`:""}</div>
   <div class="dstats">
    <div><span>التقييم</span><strong>${p.r?p.r.toFixed(1):"—"}</strong></div>
    <div><span>المراجعات</span><strong>${p.rc?p.rc.toLocaleString("en"):"—"}</strong></div>
    <div><span>السعر</span><strong>${p.p||"—"}</strong></div>
    ${km!=null?`<div><span>من ${esc(meLabel)}</span><strong style="font-size:15px">${fmtKm(km)}</strong></div>`:""}
    ${p.oh?`<div><span>الدوام</span><strong style="font-size:14px">${hhmm(p.oh[0])}–${hhmm(p.oh[1])}</strong></div>`:""}</div>
   ${why.length?`<div class="whybox"><h4>ليش هذا المكان؟</h4><ul>${why.map(w=>"<li>"+esc(w)+"</li>").join("")}</ul></div>`:""}
   ${warn.length?`<div class="warn">${warn.map(w=>"<span>⚠️ "+esc(w)+"</span>").join("")}</div>`:""}
   ${good.length?`<div class="warn good">${good.map(w=>"<span>✓ "+esc(w)+"</span>").join("")}</div>`:""}
   ${p.desc?`<p class="ddesc">${esc(p.desc)}</p>`:""}
   <a class="primary" href="${p.u}" target="_blank" rel="noopener">افتح في الخرائط</a>
   <div class="acts"><a href="${photos}" target="_blank" rel="noopener">شوف الصور</a>
    ${p.ph?`<a href="https://wa.me/${p.ph.replace(/[^0-9]/g,"")}" target="_blank" rel="noopener">واتساب</a>
    <a href="tel:${p.ph}">اتصال</a>`:""}
    <button id="star" class="${m.s?"on":""}">${m.s?"★ مميّز":"☆ ميّزه"}</button>
    <button id="vis" class="${m.v?"on":""}">${m.v?"✓ زرته":"سجّل زيارة"}</button></div>
   ${FOODK.has(p.k)?`<div class="menusec"><h4>🍽️ المنيو</h4>
    <div class="menubtns">
     <button id="menutxt" class="mprimary">ترجمة المنيو</button>
     ${p.menuUrl?`<a class="mlink" href="${esc(p.menuUrl)}" target="_blank" rel="noopener">فتح المنيو الأصلي ↗</a>`:""}
     <button id="menuimgbtn">📷 ترجمة من صورة</button>
    </div>
    <input type="file" accept="image/*" id="menuimg" class="menuimg-input">
    <input type="file" accept="image/*" capture="environment" id="menuimgcam" class="menuimg-input">
    <div id="menuwrap"></div>
   </div>`:""}
   <textarea id="note" placeholder="ملاحظاتك عن المكان…">${esc(m.note||"")}</textarea>`;
  const set=async patch=>{marks[p.n]=Object.assign({},mk(p.n),patch);await saveMarks();openDetail(p.n);render();};
  document.getElementById("star").onclick=()=>set({s:mk(p.n).s?0:1});
  document.getElementById("vis").onclick=()=>set({v:mk(p.n).v?0:1});
  if(FOODK.has(p.k)){
    document.getElementById("menutxt").onclick=()=>showMenu(p,false);
    document.getElementById("menuimgbtn").onclick=()=>triggerImagePick(p);
    peekCachedMenu(p);
  }
  document.getElementById("note").onchange=e=>{marks[p.n]=Object.assign({},mk(p.n),{note:e.target.value});saveMarks();};
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("detail").classList.add("on");
}

/* ---------------- menu ---------------- */
// Menu system: 1) internet Arabic lookup (existing rawCall/Anthropic path — needs a
// backend proxy with a real API key to actually succeed outside a dev sandbox; already
// degrades gracefully when it can't reach one), 2) a direct menuUrl link when the data
// has one, 3) photo OCR (Tesseract.js, runs fully client-side, no key needed) followed
// by the same Arabic-translation call. Whichever step fails, the user still keeps
// whatever the earlier steps produced — see paintMenu's err branch.
const FOODK=new Set(["cafe","bakery","italian","steak","seafood","indo","asian","indian","me","burger",
 "sandwich","mex","beachclub","bar","breakfast","rest","matcha","juice","protein"]);
const menuKey=n=>"menu:"+n.slice(0,120).replace(/[\s/\\'"]/g,"_");
const textOf=d=>(d.content||[]).map(b=>b.type==="text"?b.text:"").filter(Boolean).join("\n").trim();
const gsearch=p=>"https://www.google.com/search?q="+encodeURIComponent(p.n+" Bali menu");
let menuView="ar"; // "ar" | "orig" — which side of the toggle is showing for the open place

async function getMenuCache(p){try{const r=await window.storage.get(menuKey(p.n));
 return r&&r.value?JSON.parse(r.value):null;}catch(e){return null;}}
async function setMenuCache(p,cache){try{await window.storage.set(menuKey(p.n),JSON.stringify(cache));}catch(e){}}

function dishListHtml(dishes){
  let out="",lastSec=null;
  dishes.forEach(d=>{
    if(d.sec&&d.sec!==lastSec){out+=`<div class="dishsec">${esc(d.sec)}</div>`;lastSec=d.sec;}
    out+=`<div class="dish${d.unclear?" unclear":""}"><div class="dmain">
     <div class="dname2">${esc(d.unclear?"غير واضح":(d.name_ar||d.name_en||""))}</div>
     ${!d.unclear&&d.name_ar&&d.name_en?`<div class="dorig">${esc(d.name_en)}</div>`:""}
     ${!d.unclear&&d.desc_ar?`<div class="ddesc2">${esc(d.desc_ar)}</div>`:""}
     ${d.unclear&&d.name_en?`<div class="dorig">${esc(d.name_en)}</div>`:""}
     </div><div class="dprice">${d.price?esc(d.price):""}</div></div>`;
  });
  return out;
}
function paintMenu(p,state){
  const w=document.getElementById("menuwrap");if(!w)return;
  const c=state.cache;
  let body="";
  if(state.loading){
    body=`<div class="menuempty"><span class="spin"></span> ${esc(state.loading)}</div>`;
  }else if(state.err){
    body=`<div class="menuerr">${esc(state.err)}
     <div class="merow">
      ${state.noRetry?"":'<button id="menuretry">إعادة المحاولة</button>'}
      <button id="menuupload2">اختيار صورة أخرى</button>
      ${p.menuUrl?`<a href="${esc(p.menuUrl)}" target="_blank" rel="noopener">فتح المنيو الأصلي</a>`:
       `<a href="${gsearch(p)}" target="_blank" rel="noopener">ابحث في قوقل</a>`}
     </div></div>`;
    if(c&&c.rawOrig)body+=`<div class="menucap" style="margin-top:12px">النص الأصلي المستخرج من الصورة:</div><div class="txt">${esc(c.rawOrig)}</div>`;
  }else if(c&&(c.dishes||c.rawAr)){
    const hasOrig=!!c.rawOrig;
    const age=c.t?new Date(c.t).toLocaleDateString("ar-EG",{day:"numeric",month:"long"}):"";
    if(hasOrig)body+=`<div class="menutoggle"><button data-v="ar" aria-pressed="${menuView==="ar"}">العربية</button>
     <button data-v="orig" aria-pressed="${menuView==="orig"}">الأصلي</button></div>`;
    if(menuView==="orig"&&hasOrig)body+=`<div class="txt">${esc(c.rawOrig)}</div>`;
    else if(c.dishes)body+=dishListHtml(c.dishes);
    else body+=`<div class="txt">${esc(c.rawAr||"")}</div>`;
    body+=`<div class="meta"><span>${c.source==="ocr"?"مترجم من صورة":"مُجمّع من الإنترنت"}${age?" · "+age:""} — أكّد الأسعار مع المكان</span>
     <button id="menuref">${c.source==="ocr"?"📷 صورة جديدة":"تحديث"}</button></div>`;
  }else{
    body=`<div class="menuempty">المنيو غير متوفر حاليًا<br>📷 أضف صورة المنيو وترجمتها</div>`;
  }
  w.innerHTML=body;
  w.querySelectorAll(".menutoggle button").forEach(b=>b.onclick=()=>{menuView=b.dataset.v;paintMenu(p,state);});
  const rf=document.getElementById("menuref");if(rf)rf.onclick=()=>c.source==="ocr"?triggerImagePick(p):showMenu(p,true);
  const rt=document.getElementById("menuretry");if(rt)rt.onclick=()=>retryFromCache(p);
  const up2=document.getElementById("menuupload2");if(up2)up2.onclick=()=>triggerImagePick(p);
}
async function peekCachedMenu(p){
  const c=await getMenuCache(p);
  if(c&&(c.dishes||c.rawAr||c.rawOrig)){
    menuView=(c.rawOrig&&!c.dishes&&!c.rawAr)?"orig":"ar";
    paintMenu(p,{cache:c});
  }
}

async function rawCall(body){
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
   headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  let data=null;try{data=await res.json();}catch(e){throw new Error("HTTP "+res.status);}
  if(data&&data.error)throw new Error((data.error.message||"خطأ").slice(0,160));
  if(!res.ok)throw new Error("HTTP "+res.status);return data;}
async function runMenu(q){let msgs=[{role:"user",content:q}];
  for(let i=0;i<4;i++){const d=await rawCall({model:"claude-sonnet-4-6",max_tokens:1000,messages:msgs,
    tools:[{type:"web_search_20250305",name:"web_search"}]});
   const t=textOf(d);
   if(d.stop_reason==="pause_turn"){msgs=msgs.concat([{role:"assistant",content:d.content}]);continue;}
   if(t)return t;
   msgs=msgs.concat([{role:"assistant",content:d.content},{role:"user",content:"اكتب المنيو الآن بالعربية."}]);}
  return "";}
async function callAny(prompt){
  for(const b of [{model:"claude-sonnet-4-6",max_tokens:1200,messages:[{role:"user",content:prompt}]},
   {model:"claude-sonnet-4-6",max_tokens:1200,messages:[{role:"user",content:[{type:"text",text:prompt}]}]}]){
   try{const d=await rawCall(b);const t=textOf(d);if(t)return {txt:t,err:""};}catch(e){var last=e.message;}}
  return {txt:"",err:typeof last!=="undefined"?last:"رد فاضي"};}

// State 1: internet-based Arabic lookup (unchanged behavior from the source app).
async function showMenu(p,force){
  if(!force){const c=await getMenuCache(p);if(c&&(c.dishes||c.rawAr)){menuView="ar";paintMenu(p,{cache:c});return;}}
  paintMenu(p,{loading:"جاري جلب المنيو…"});
  const base=`مكان اسمه "${p.n}" في ${p.a} في بالي (${p.c}).
اكتب المنيو بالعربية فقط وبدون مقدمة: قسّمه لأقسام، ولكل صنف الاسم بالعربية ثم الأصلي بين قوسين ثم السعر بالروبية إن توفر،
وضع ⚠️ أمام أي صنف فيه لحم خنزير أو كحول، واذكر أشهر ٣ أصناف.`;
  let txt="",err="";
  try{txt=await runMenu("ابحث في الإنترنت عن المنيو الحالي لـ "+base);}catch(e){err=e.message;}
  if(!txt){const r=await callAny(base+"\n(اعتمد على معلوماتك واكتب في أول سطر: معلومات تقريبية غير مؤكدة)");
   txt=r.txt;if(!txt)err=r.err||err;}
  if(!txt){paintMenu(p,{err:"تعذّر جلب المنيو"+(err?" — "+err:"")+"."});return;}
  const cache={source:"web",dishes:null,rawAr:txt,rawOrig:null,t:Date.now()};
  await setMenuCache(p,cache);menuView="ar";paintMenu(p,{cache});
}

// State 4: photo OCR + Arabic translation. Tesseract.js runs entirely in the browser
// (no API key); only the translation step needs the same backend-dependent call as
// showMenu() above. Never invents dishes/prices — see the prompt in translateMenuText.
let tesseractLoad=null;
function ensureTesseract(){
  if(window.Tesseract)return Promise.resolve();
  if(tesseractLoad)return tesseractLoad;
  tesseractLoad=new Promise((resolve,reject)=>{
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js";
    s.onload=resolve;s.onerror=()=>reject(new Error("تعذّر تحميل أداة قراءة الصور — تحقق من الاتصال بالإنترنت."));
    document.head.appendChild(s);
  });
  return tesseractLoad;
}
function openImageInput(p,id){
  const inp=document.getElementById(id);if(!inp)return;
  inp.value="";inp.onchange=()=>{const f=inp.files&&inp.files[0];if(f)startImageMenu(p,f);};inp.click();
}
// Shows the "choose source" mini-screen inline in the menu section instead of
// jumping straight to a capture-forced camera input — a plain <input capture=environment>
// on many mobile browsers skips the photo library entirely, which is exactly the gap
// this adds: an explicit "Choose from Photos" path alongside "Take a Photo".
function triggerImagePick(p){
  const w=document.getElementById("menuwrap");if(!w)return;
  w.innerHTML=`<div class="menuchoose">
    <h5>ترجمة المنيو</h5>
    <p>اختر صورة واضحة للمنيو وسيحاول جالان قراءتها وترجمتها.</p>
    <button id="menufromgallery" class="mprimary">🖼️ اختيار من الصور</button>
    <button id="menufromcamera">📷 تصوير المنيو</button>
  </div>`;
  document.getElementById("menufromgallery").onclick=()=>openImageInput(p,"menuimg");
  document.getElementById("menufromcamera").onclick=()=>openImageInput(p,"menuimgcam");
}
async function translateMenuText(text,p){
  const prompt=`النص التالي مستخرج بتقنية OCR من صورة منيو مطعم اسمه "${p.n}" في بالي، وقد يحتوي أخطاء OCR بسيطة.
حوّله إلى مصفوفة JSON فقط (بدون أي نص أو شرح قبلها أو بعدها، وبدون markdown) بهذا الشكل بالضبط:
[{"sec":"اسم القسم كما في المنيو إن وجد وإلا null","name_en":"اسم الطبق كما ورد بالأصل","name_ar":"الاسم بالعربية: النطق الشائع للطبق المعروف، وإلا ترجمة معناه","desc_ar":"وصف قصير بالعربية إن أمكن استنتاجه، وإلا null","price":"السعر والعملة كما وردا بالضبط بدون أي تغيير، وإلا null","unclear":false}]
قواعد صارمة يجب اتباعها:
- لا تخترع أطباقًا أو أسعارًا أو أوصافًا أو مكونات غير موجودة في النص.
- إذا كان مقطع من النص غير مقروء أو غير مفهوم، أضف عنصرًا له "unclear":true و"name_en" يحتوي المقطع كما ظهر (أو "نص غير واضح" إن لم يظهر شيء إطلاقًا) — لا تخترع اسمًا بديلاً له.
- السعر يبقى كما كُتب بالضبط، رقمًا وعملة، بدون أي تحويل أو تقريب.
- استخدم النطق العربي الشائع لأسماء الأطباق والعلامات المعروفة (مثل: Nasi Goreng → ناسي غورينغ) بدل ترجمة حرفية غريبة، مع وصف قصير عند الإمكان.
- أخرج JSON صالح فقط.
النص المستخرج من الصورة:
"""${text.slice(0,4000)}"""`;
  const r=await callAny(prompt);
  if(!r.txt)throw new Error(r.err||"لا يوجد رد من خدمة الترجمة");
  const cleaned=r.txt.trim().replace(/^```json\s*/i,"").replace(/^```\s*/,"").replace(/```\s*$/,"");
  try{const dishes=JSON.parse(cleaned);if(!Array.isArray(dishes)||!dishes.length)throw 0;return{dishes,rawAr:null};}
  catch(e){return{dishes:null,rawAr:r.txt};}
}
async function startImageMenu(p,file){
  menuView="orig";
  paintMenu(p,{loading:"جاري قراءة المنيو…"});
  try{await ensureTesseract();}
  catch(e){paintMenu(p,{err:(e&&e.message)||"تعذّر تحميل أداة قراءة الصور. تحقّق من اتصالك بالإنترنت."});return;}
  let text="";
  try{
    const res=await Tesseract.recognize(file,"eng");
    text=((res&&res.data&&res.data.text)||"").trim();
  }catch(e){paintMenu(p,{err:"تعذّر قراءة المنيو من هذه الصورة.",noRetry:true});return;}
  if(text.length<3){paintMenu(p,{err:"الصورة غير واضحة بما يكفي لقراءة المنيو.",noRetry:true});return;}
  paintMenu(p,{loading:"جاري ترجمة المنيو…"});
  try{
    const{dishes,rawAr}=await translateMenuText(text,p);
    const cache={source:"ocr",dishes,rawAr,rawOrig:text,t:Date.now()};
    await setMenuCache(p,cache);menuView="ar";paintMenu(p,{cache});
  }catch(e){
    const cache={source:"ocr",dishes:null,rawAr:null,rawOrig:text,t:Date.now()};
    await setMenuCache(p,cache);menuView="orig";
    paintMenu(p,{err:"تعذّر ترجمة هذه الصورة بالكامل.",cache});
  }
}
async function retryFromCache(p){
  const c=await getMenuCache(p);
  if(c&&c.rawOrig&&!c.dishes&&!c.rawAr){
    paintMenu(p,{loading:"📝 جاري إعادة الترجمة…"});
    try{
      const{dishes,rawAr}=await translateMenuText(c.rawOrig,p);
      const cache={source:"ocr",dishes,rawAr,rawOrig:c.rawOrig,t:Date.now()};
      await setMenuCache(p,cache);menuView="ar";paintMenu(p,{cache});
    }catch(e){paintMenu(p,{err:"تعذّر ترجمة هذه الصورة بالكامل.",cache:c});}
    return;
  }
  showMenu(p,true);
}

/* ---------------- about / backup ---------------- */
function openAbout(){
  const marked=PLACES.filter(p=>mk(p.n).s||mk(p.n).v||mk(p.n).note).length;
  document.getElementById("ppanel").innerHTML=`<div class="grab"></div>
   <div class="ptitle">عن جالان</div>
   <div class="psub">${PLACES.length} محطة · ${PLACES.filter(p=>p.desc).length} بوصف · ${PLACES.filter(p=>p.oh).length} بساعات دوام</div>
   <div class="fgroup"><h3>من وين البيانات</h3>
    <p style="margin:0;font-size:13.5px;line-height:1.9;color:var(--muted)">
    الأماكن من قوائمك في Google Maps · التقييمات والأسعار والأرقام والدوام من Google Places ·
    الأطباق والملاحظات من مراجعات الزوار · الموسومة «مقترح» أضفناها لك.<br><br>
    ⚠️ الأسعار والدوام يتغيّران. أكّدهما بالواتساب قبل الحجز. الأماكن اللي ما عندها دوام موثّق تظهر بدون حالة فتح.</p></div>
   <div class="fgroup"><h3>علاماتك (${marked} مكان)</h3>
    <div class="frow"><button class="tbtn" id="expm">انسخ علاماتي</button>
    <button class="tbtn" id="impm">استعادة من نسخة</button></div></div>`;
  document.getElementById("expm").onclick=()=>navigator.clipboard.writeText(JSON.stringify(marks))
   .then(()=>{const b=document.getElementById("expm");b.textContent="تم النسخ ✓";setTimeout(()=>b.textContent="انسخ علاماتي",1600);}).catch(()=>{});
  document.getElementById("impm").onclick=async()=>{try{const o=JSON.parse(await navigator.clipboard.readText());
   marks=Object.assign({},marks,o);await saveMarks();render();
   const b=document.getElementById("impm");b.textContent="تمت الاستعادة ✓";setTimeout(()=>b.textContent="استعادة من نسخة",1600);}
   catch(e){const b=document.getElementById("impm");b.textContent="ما فيه نسخة صالحة";setTimeout(()=>b.textContent="استعادة من نسخة",1900);}};
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("plan").classList.add("on");}

/* ---------------- near-me reference ---------------- */
const areaCenter=a=>{const ps=PLACES.filter(p=>p.a===a&&p.lat);if(!ps.length)return null;
 return [ps.reduce((s,p)=>s+p.lat,0)/ps.length,ps.reduce((s,p)=>s+p.lng,0)/ps.length];};
function setRef(ll,label){me=ll;meLabel=label;setSortUI("near");state.sort="near";state.home=false;close();render();}
function openNear(err){
  const hotels=PLACES.filter(p=>p.k==="hotel"&&p.lat).sort((a,b)=>(b.r||0)-(a.r||0)).slice(0,10);
  document.getElementById("npanel").innerHTML=`<div class="grab"></div>
   <div class="ptitle">من وين نحسب المسافة؟</div>
   ${err?`<div class="nerr">${esc(err)}</div>`:`<div class="psub">موقعك الحالي وأنت في بالي، أو نقطة انطلاق.</div>`}
   <button class="primary" id="usegps" style="margin-top:0">📍 استخدم موقعي الحالي</button>
   <div class="fgroup" style="margin-top:18px"><h3>أو ابدأ من منطقة</h3><div class="fchips">
    ${AREAS.map(a=>`<button class="fchip" data-area="${esc(a)}">${esc(a)}</button>`).join("")}</div></div>
   ${hotels.length?`<div class="fgroup"><h3>أو من مكان إقامتك</h3><div class="nlist">
    ${hotels.map(h=>`<button data-h="${esc(h.n)}"><span>🏨</span><span>${esc(h.n)}</span>
     <span class="n">${esc(h.a)}</span></button>`).join("")}</div></div>`:""}`;
  document.getElementById("usegps").onclick=()=>askGps();
  document.querySelectorAll("#npanel [data-area]").forEach(b=>b.onclick=()=>{
   const c=areaCenter(b.dataset.area);if(c)setRef(c,b.dataset.area);});
  document.querySelectorAll("#npanel [data-h]").forEach(b=>b.onclick=()=>{
   const h=PLACES.find(p=>p.n===b.dataset.h);if(h)setRef([h.lat,h.lng],h.n);});
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("near").classList.add("on");}
function askGps(then){
  if(!navigator.geolocation){openNear("متصفحك ما يدعم تحديد الموقع. اختر منطقة.");return;}
  const b=document.getElementById("usegps");if(b)b.textContent="جاري تحديد موقعك…";
  navigator.geolocation.getCurrentPosition(
   p=>{me=[p.coords.latitude,p.coords.longitude];meLabel="موقعك";
     if(then){then();}else{setRef(me,"موقعك");}},
   e=>{openNear(e.code===1?"رفض الإذن. إعدادات آيفون ← Safari ← الموقع، فعّل «اسأل» أو «سماح»."
     :e.code===2?"ما قدر يحدد موقعك الحين. اختر منطقة.":"انتهت المهلة. اختر منطقة.");},
   {timeout:10000,maximumAge:60000});}

/* ---------------- planner ---------------- */
const SLOTS=[{t:"٧:٣٠",lab:"فطور",ok:p=>p.b&&FOODK.has(p.k)},
 {t:"١٠:٠٠",lab:"قهوة",ok:p=>hasCat(p,"coffee")||hasCat(p,"matcha")||hasCat(p,"juice")},
 {t:"١٢:٣٠",lab:"غداء",ok:p=>p.l&&FOODK.has(p.k)},
 {t:"١٥:٣٠",lab:"نشاط",ok:p=>p.act||p.k==="spa"||hasCat(p,"gym")||hasCat(p,"recovery")},
 {t:"١٧:٣٠",lab:"غروب",ok:p=>["beachclub","nature","bar","attraction"].includes(p.k)},
 {t:"٢٠:٠٠",lab:"عشاء",ok:p=>p.d&&FOODK.has(p.k)},
 {t:"٢٢:٠٠",lab:"حلا",ok:p=>hasCat(p,"bakery")}];
let planArea="",planIdx={};
function slotCands(i){const S=SLOTS[i];
 return PLACES.filter(p=>p.a===planArea&&S.ok(p))
  .sort((a,b)=>(mk(b.n).s?1:0)-(mk(a.n).s?1:0)||score(b)-score(a));}
function buildPlan(){const used=new Set(),out=[];
 SLOTS.forEach((S,i)=>{const c=slotCands(i).filter(p=>!used.has(p.n));
  if(!c.length){out.push({S,p:null,n:0});return;}
  const idx=((planIdx[i]||0)%c.length+c.length)%c.length;const p=c[idx];used.add(p.n);out.push({S,p,n:c.length});});
 return out;}
function openPlan(area){
  planArea=area||planArea||AREAS[0];const rows=buildPlan();
  const areas=AREAS.filter(a=>PLACES.filter(p=>p.a===a).length>=6);
  document.getElementById("ppanel").innerHTML=`<div class="grab"></div>
   <div class="ptitle">يوم في ${esc(planArea)}</div>
   <div class="psub">مبني على أماكنك — المميّزة ★ أول، ثم الأنسب. بدّل أي محطة بـ ⟳.</div>
   <div class="pareas">${areas.map(a=>`<button class="chip" data-area="${esc(a)}" aria-pressed="${a===planArea}">${esc(a)}</button>`).join("")}</div>
   ${rows.map((r,i)=>{
    if(!r.p)return `<div class="slot"><div class="stime"><b>${r.S.t}</b><span>${r.S.lab}</span></div>
      <div class="sbody" style="color:var(--muted);font-size:13.5px">ما فيه خيار مناسب هنا</div></div>`;
    const op=openState(r.p);
    return `<div class="slot"><div class="stime"><b>${r.S.t}</b><span>${r.S.lab}</span></div>
     <div class="sbody"><span class="sname">${mk(r.p.n).s?"★ ":""}${esc(r.p.n)}</span>
      <span class="smeta"><span class="tag" style="background:${tintBg(r.p.k)};color:${tintFg(r.p.k)}">${EMO[r.p.k]||"📍"} ${esc(r.p.c)}</span>
      <span class="num">${r.p.r?r.p.r.toFixed(1):"—"}</span>${op===0?' <span class="shut">مسكّر الحين</span>':""}</span></div>
     <div class="sact">${r.n>1?`<button data-swap="${i}">⟳</button>`:""}<button data-open="${esc(r.p.n)}">تفاصيل</button></div></div>`;}).join("")}
   <div class="frow" style="margin-top:14px"><button class="tbtn" id="pcopy">انسخ الجدول</button>
    <button class="tbtn" id="pshuffle" style="background:var(--jade);border-color:var(--jade);color:#fff">جدول ثاني</button></div>`;
  document.querySelectorAll("#ppanel [data-area]").forEach(b=>b.onclick=()=>{planIdx={};openPlan(b.dataset.area);});
  document.querySelectorAll("#ppanel [data-swap]").forEach(b=>b.onclick=()=>{const i=+b.dataset.swap;
   planIdx[i]=(planIdx[i]||0)+1;openPlan(planArea);});
  document.querySelectorAll("#ppanel [data-open]").forEach(b=>b.onclick=()=>{close();openDetail(b.dataset.open);});
  document.getElementById("pshuffle").onclick=()=>{SLOTS.forEach((_,i)=>planIdx[i]=(planIdx[i]||0)+1);openPlan(planArea);};
  document.getElementById("pcopy").onclick=()=>{
   const t="يوم في "+planArea+"\n\n"+buildPlan().filter(r=>r.p)
    .map(r=>`${r.S.t} · ${r.S.lab}: ${r.p.n}${r.p.r?" ("+r.p.r.toFixed(1)+")":""}`).join("\n")+"\n\nجالان — وين نروح اليوم؟";
   navigator.clipboard.writeText(t).then(()=>{const b=document.getElementById("pcopy");
    b.textContent="تم النسخ ✓";setTimeout(()=>b.textContent="انسخ الجدول",1600);}).catch(()=>{});};
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("plan").classList.add("on");}

/* ---------------- filters ---------------- */
const filterPool=()=>PLACES.filter(p=>{if(state.sec){const S=secOf(state.sec);if(!S||!inSec(p,S))return false;}return true;});
function openFilters(){
  const chip=(t,on,id,n)=>`<button class="fchip" data-id="${id}" aria-pressed="${on}">${t}${n!=null?` <b style="font-weight:500;opacity:.55">${n}</b>`:""}</button>`;
  const pool=filterPool(),S=state.sec?secOf(state.sec):null;
  const subs=(S&&S.subs.length?S.subs:[...new Set(pool.map(p=>p.k))]).filter(k=>pool.some(p=>hasCat(p,k)));
  const meals=MEALS.filter(([k])=>pool.some(p=>p[k]));
  const prices=["$","$$","$$$","$$$$"].filter(v=>pool.some(p=>p.p===v));
  const rates=[4,4.5,4.7].filter(v=>pool.some(p=>p.r>=v));
  const feats=[["open","مفتوح الآن"],["nobooking","بدون حجز"],["family","للعائلة"],["quiet","هادئ"],
   ["healthy","صحي"],["halal","حلال"],["arabic","عربي"],["noalcohol","بدون كحول"],["nopork","بدون خنزير"],
   ["work","للعمل"],["view","إطلالة"],["budget","اقتصادي"],["premium","فاخر"]];
  document.getElementById("fpanel").innerHTML=`<div class="grab"></div>
   <div class="fctx">فلاتر داخل: <b>${S?esc(S.label):"كل الأماكن"}</b>${state.area?" · "+esc(state.area):""}</div>
   ${subs.length>1?`<div class="fgroup"><h3>التصنيف</h3><div class="fchips">
    ${subs.map(k=>chip((EMO[k]||"")+" "+(LBL[k]||k),state.cats.has(k),"cat:"+k,pool.filter(p=>hasCat(p,k)).length)).join("")}</div></div>`:""}
   ${meals.length?`<div class="fgroup"><h3>الوجبة</h3><div class="fchips">
    ${meals.map(([k,t,i])=>chip(i+" "+t,state.meal===k,"meal:"+k,pool.filter(p=>p[k]).length)).join("")}</div></div>`:""}
   ${prices.length?`<div class="fgroup"><h3>السعر</h3><div class="fchips">
    ${prices.map(v=>chip(v,state.price.has(v),"price:"+v,pool.filter(x=>x.p===v).length)).join("")}</div></div>`:""}
   ${rates.length?`<div class="fgroup"><h3>أقل تقييم</h3><div class="fchips">
    ${rates.map(v=>chip(v.toFixed(1)+" فأعلى",state.minR===v,"min:"+v,pool.filter(p=>p.r>=v).length)).join("")}</div></div>`:""}
   ${me?`<div class="fgroup"><h3>المسافة</h3><div class="fchips">
    ${[2,5,10,18].map(v=>chip("أقل من "+v+" كم",state.maxKm===v,"km:"+v)).join("")}</div></div>`:""}
   <div class="fgroup"><h3>مواصفات</h3><div class="fchips">
    ${feats.map(([v,l])=>chip(l,v==="open"?state.openNow:state.tagsOn.has(v),"tag:"+v)).join("")}</div></div>
   <div class="fgroup"><h3>قوائمي</h3><div class="fchips">
    ${chip("★ المميّزة",state.starred,"star:1")}${chip("اللي ما زرتها",state.unvisited,"unv:1")}
    ${chip("مقترحة لك",state.sug,"sug:1",pool.filter(p=>p.sug).length)}</div></div>
   <div class="frow"><button class="tbtn" id="clr">امسح الفلاتر</button>
    <button class="tbtn" id="done" style="background:var(--jade);border-color:var(--jade);color:#fff">عرض ${filtered().length} نتيجة</button></div>`;
  document.querySelectorAll("#fpanel .fchip").forEach(b=>b.onclick=()=>{
    const raw=b.dataset.id,i=raw.indexOf(":"),k=raw.slice(0,i),v=raw.slice(i+1);
    if(k==="cat")state.cats.has(v)?state.cats.delete(v):state.cats.add(v);
    else if(k==="meal")state.meal=state.meal===v?"":v;
    else if(k==="price")state.price.has(v)?state.price.delete(v):state.price.add(v);
    else if(k==="min")state.minR=state.minR===+v?0:+v;
    else if(k==="km")state.maxKm=state.maxKm===+v?0:+v;
    else if(k==="tag"){if(v==="open")state.openNow=!state.openNow;
      else state.tagsOn.has(v)?state.tagsOn.delete(v):state.tagsOn.add(v);}
    else if(k==="star")state.starred=!state.starred;
    else if(k==="unv")state.unvisited=!state.unvisited;
    else if(k==="sug")state.sug=!state.sug;
    openFilters();render();});
  document.getElementById("clr").onclick=()=>{state.cats.clear();state.price.clear();state.tagsOn.clear();
   state.meal="";state.minR=0;state.maxKm=0;state.openNow=false;state.starred=false;state.unvisited=false;
   state.sug=false;openFilters();render();};
  document.getElementById("done").onclick=close;
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("filters").classList.add("on");markFilterBtn();}
function markFilterBtn(){document.getElementById("filtBtn").dataset.on=
 (state.cats.size||state.price.size||state.tagsOn.size||state.meal||state.minR||state.maxKm||
  state.openNow||state.starred||state.unvisited||state.sug)?"1":"";}
function close(){document.querySelectorAll(".sheet").forEach(s=>s.classList.remove("on"));markFilterBtn();}
document.querySelectorAll("[data-close]").forEach(e=>e.onclick=close);

/* ---------------- map ---------------- */
let L_map=null,layer=null;
function drawMap(rows){
  const el=document.getElementById("map");
  if(!L_map){L_map=L.map(el,{zoomControl:false}).setView([-8.67,115.16],10);
   L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(L_map);
   L.control.zoom({position:"bottomleft"}).addTo(L_map);}
  if(layer)L_map.removeLayer(layer);
  const pts=rows.filter(p=>p.lat);
  layer=L.layerGroup(pts.map(p=>{const m=L.circleMarker([p.lat,p.lng],
    {radius:6,color:"#fff",weight:1.5,fillColor:tintFg(p.k),fillOpacity:.95});
   m.bindPopup(`<div class="pop"><b>${esc(p.n)}</b>${EMO[p.k]||"📍"} ${esc(p.c)} · ${p.r?p.r.toFixed(1)+" ★ · ":""}${esc(p.a)}<br>
    <a href="${p.u}" target="_blank" rel="noopener">افتح في الخرائط</a></div>`);return m;})).addTo(L_map);
  if(pts.length)L_map.fitBounds(L.latLngBounds(pts.map(p=>[p.lat,p.lng])).pad(.15));
  setTimeout(()=>L_map.invalidateSize(),60);}

/* ---------------- wiring ---------------- */
function setSortUI(k){document.querySelectorAll("#sortSeg button").forEach(x=>x.setAttribute("aria-pressed",x.dataset.s===k));}
document.getElementById("q").oninput=e=>{state.q=e.target.value;if(state.q)state.home=false;render();};
document.querySelectorAll("#sortSeg button").forEach(b=>b.onclick=()=>{
 const k=b.dataset.s;setSortUI(k);state.sort=k;if(k==="near"&&!me){openNear();return;}render();});
document.getElementById("filtBtn").onclick=openFilters;
document.getElementById("mapBtn").onclick=e=>{state.map=!state.map;if(state.map)state.home=false;
 const b=e.currentTarget;b.dataset.on=state.map?"1":"";b.textContent=state.map?"قائمة":"خريطة";
 document.getElementById("map").style.display=state.map?"block":"none";
 document.getElementById("list").style.display=state.map?"none":"block";render();};
addEventListener("scroll",()=>{document.getElementById("hdr").classList.toggle("stuck",window.scrollY>4);},{passive:true});
loadMarks().then(render);
