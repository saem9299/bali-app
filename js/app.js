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
 pilates:"🤸",crossfit:"🏋️‍♂️",hyrox:"⚡",yoga:"🧘",surf:"🏄",swimming:"🏊",recovery:"♨️",adv:"⛰️",cult:"🎭",fam:"🎡",
 mall:"🏬",market:"🧺",outlet:"🏷️",fashion:"👕",gifts:"🎁",beauty:"🧴",jewelry:"💎",decor:"🏠",nightmarket:"🌙",localmarket:"🛒",scooter:"🛵"};
const LBL={coffee:"قهوة",matcha:"ماتشا",juice:"عصائر وسموذي",protein:"بروتين وصحي",cafe:"كافيه",
 bakery:"حلا ومخبوزات",breakfast:"فطور وبرنش",italian:"إيطالي",steak:"ستيك ومشاوي",seafood:"بحري",
 indo:"إندونيسي",asian:"آسيوي",indian:"هندي",me:"شرق أوسطي وعربي",burger:"برجر",sandwich:"ساندويتش",
 mex:"مكسيكي",rest:"مطاعم متنوعة",bar:"بار ولاونج",beachclub:"بيتش كلب",nature:"شواطئ وطبيعة",
 hotel:"إقامة",spa:"سبا وجمال",shop:"تسوق",other:"أخرى",attraction:"معالم",adv:"مغامرات",
 cult:"ثقافة وعروض",fam:"عائلي",gym:"جيم",padel:"بادل",tennis:"تنس",pilates:"بيلاتس",
 crossfit:"كروس فت",hyrox:"هايروكس",boxing:"ملاكمة",muaythai:"موي تاي",yoga:"يوقا",
 surf:"سيرف",swimming:"سباحة",recovery:"استشفاء وساونا",
 mall:"مولات",market:"بازارات وأسواق",outlet:"أوتلت",fashion:"ملابس وأزياء",gifts:"هدايا وتذكارات",
 beauty:"بيوتي ولايف ستايل",jewelry:"مجوهرات وإكسسوارات",decor:"ديكور وحرف",nightmarket:"أسواق ليلية",localmarket:"أسواق محلية",
 scooter:"سكوترات ودراجات"};
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
 "map-pin":'<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
 shuffle:'<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/>',
 bike:'<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
 clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 "arrow-right":'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
 flag:'<path d="M4 22V4a1 1 0 0 1 1-1h13.382a1 1 0 0 1 .447 1.894L15 9l3.829 4.106A1 1 0 0 1 18.382 15H5"/>'
};
const licon=(name,cls)=>`<svg class="licon${cls?" "+cls:""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LICO_PATH[name]||""}</svg>`;

const SECTIONS=[
 {id:"food",label:"أكل",ic:licon("utensils"),keys:["italian","steak","seafood","indo","asian","indian","me","burger","sandwich","mex","bakery","breakfast","rest","cafe"],
  subs:["rest","italian","steak","seafood","indo","asian","indian","me","burger","sandwich","mex","bakery","breakfast","cafe"]},
 {id:"drinks",label:"مشروبات",ic:licon("cup-soda"),keys:["coffee","matcha","juice","protein","cafe"],subs:["coffee","matcha","juice","protein"]},
 {id:"sports",label:"رياضة",ic:licon("dumbbell"),keys:["gym","padel","tennis","pilates","crossfit","hyrox","boxing","muaythai","yoga","surf","swimming","recovery"],
  subs:["gym","padel","tennis","pilates","crossfit","hyrox","boxing","muaythai","yoga","surf","swimming","recovery"]},
 {id:"beach",label:"شواطئ وبيتش كلب",ic:licon("palmtree"),keys:["beachclub","nature"],subs:["beachclub","nature"]},
 {id:"visit",label:"تستحق الزيارة",ic:licon("compass"),keys:["attraction","adv","cult","fam"],subs:["attraction","adv","cult","fam"]},
 {id:"stay",label:"إقامة",ic:licon("hotel"),keys:["hotel"],subs:[]},
 {id:"spa",label:"سبا وجمال",ic:licon("flower-2"),keys:["spa","recovery"],subs:[]},
 {id:"shop",label:"تسوق",ic:licon("shopping-bag"),
  keys:["mall","market","outlet","fashion","gifts","beauty","jewelry","decor","nightmarket","localmarket","shop","other"],
  subs:["mall","market","outlet","fashion","gifts","beauty","jewelry","decor","nightmarket","localmarket","shop"]},
 // New section (PART 7): scooter/motorbike rentals. Only ONE verified place
 // in the current data actually is a rental business (IRON RENT, real
 // rating/reviews/phone/hours already in data/places.json — just recategorized
 // from "shop" into its own accurate section, not fabricated).
 {id:"rides",label:"سكوترات ودراجات",ic:licon("bike"),keys:["scooter"],subs:[]}
];
// Visual identity: one accent color per Home section. Design tokens live in
// ONE place — the CSS :root custom properties in css/styles.css — and this
// just maps each section to an existing token by name, then reads the actual
// hex back from the computed stylesheet. No hex is duplicated/hardcoded here,
// so CSS and JS can never drift out of sync with each other again.
const SECTION_TOKEN={food:"--primary",drinks:"--secondary",sports:"--info",
 beach:"--success",visit:"--accent",stay:"--muted",spa:"--muted",shop:"--muted"};
const KIND_SECTION={};
SECTIONS.forEach(S=>S.keys.forEach(k=>{if(!(k in KIND_SECTION))KIND_SECTION[k]=S.id;}));
const hexToRgb=h=>{const n=parseInt(h.slice(1),16);return[(n>>16)&255,(n>>8)&255,n&255];};
const rootStyle=getComputedStyle(document.documentElement);
const cssVarCache={};
const cssVar=name=>cssVarCache[name]||(cssVarCache[name]=rootStyle.getPropertyValue(name).trim());
const tintFg=k=>cssVar(SECTION_TOKEN[KIND_SECTION[k]]||"--muted");
const tintBg=k=>{const[r,g,b]=hexToRgb(tintFg(k));return`rgba(${r},${g},${b},.1)`;};
// Section-level variant (Home cards represent a whole section, not one place's
// kind) — looks the token up directly by section id instead of going through a
// place's kind, so a section whose first-listed place happens to be a kind
// shared with another section (e.g. "cafe" in both food and drinks) doesn't
// borrow that other section's color.
const tintFgSec=id=>cssVar(SECTION_TOKEN[id]||"--muted");
const tintBgSec=id=>{const[r,g,b]=hexToRgb(tintFgSec(id));return`rgba(${r},${g},${b},.1)`;};
// Real place photo, with a branded editorial placeholder (the section's own
// line icon on a warm tint) whenever a place has no verified `image` — never
// a stock/generic photo standing in as if it were real. `cls` is the outer
// container class (its CSS defines the aspect-ratio/sizing); the icon markup
// sits behind the <img> so a broken/blocked image just reveals it on error,
// no extra JS state needed.
const secIcon=k=>{const S=secOf(KIND_SECTION[k]);return S?S.ic:licon("map-pin");};
function photoHtml(p,cls){
  const url=p.image&&p.image.url;
  const ic=`<span class="ph-ic">${secIcon(p.k)}</span>`;
  if(!url)return `<span class="${cls} empty">${ic}</span>`;
  return `<span class="${cls}">${ic}<img src="${esc(url)}" loading="lazy" decoding="async" alt=""
    onerror="this.parentElement.classList.add('empty');this.remove()"></span>`;
}
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
// Region chip: "كل المناطق" is an ENTRY POINT that opens the region-selector
// sheet (never an inline row of every area at once — that was the reported
// confusing behavior). Once a region is picked, only that one active chip
// shows, with its own small ✕ to drop it independently of every other filter.
function renderChips(){
  const base=PLACES.filter(passSec);
  const ac=document.getElementById("areaChips");ac.innerHTML="";
  if(!state.area){
    ac.appendChild(chipBtn("كل المناطق ▾",true,base.length,openRegionSelector));
    return;
  }
  const n=base.filter(p=>p.a===state.area).length;
  const chip=document.createElement("button");chip.className="chip area-active";
  chip.setAttribute("aria-pressed","true");
  chip.innerHTML=`${esc(state.area)} <b>${n}</b>`;
  chip.onclick=openRegionSelector;
  ac.appendChild(chip);
  const clr=document.createElement("button");clr.className="chip chip-x";
  clr.setAttribute("aria-label","إزالة فلتر المنطقة");clr.textContent="✕";
  clr.onclick=e=>{e.stopPropagation();state.area="";render();};
  ac.appendChild(clr);
}
// Picking (or clearing to "كل المناطق") a region marks the current section's
// SUB-category step as already answered, for every section — this is what
// lets region compose immediately with an already-picked filter instead of
// forcing an extra "التصنيف الفرعي" screen, and later removing the region
// doesn't regress the view back into that picker.
//
// Food is the one deliberate exception: its MEAL step (فطور/غداء/عشاء…) is
// never auto-satisfied by picking a region. Product rule (explicit fix):
// "أكل + منطقة" alone must NOT skip straight to results — the user still has
// to answer "وش تبي تاكل؟" first. Region becomes an applied, visible filter
// (shown as a chip, factored into every picker screen's counts) but it never
// substitutes for that answer. Once a meal IS picked (before or after the
// region), region composes with it immediately like everywhere else.
function openRegionSelector(){
  const base=PLACES.filter(passSec);
  const row=(v,label,n,on)=>`<button class="vrow" data-area="${esc(v)}"><span class="vi">${licon("map-pin")}</span>
    <span class="vt">${esc(label)}</span><span class="vn">${n}</span><span class="va">${on?"✓":"‹"}</span></button>`;
  document.getElementById("rspanel").innerHTML=`<div class="grab"></div>
    <div class="ptitle">اختر المنطقة</div>
    <div class="vlist">
      ${row("__all","كل المناطق",base.length,!state.area)}
      ${AREAS.map(a=>{const n=base.filter(p=>p.a===a).length;return n?row(a,a,n,state.area===a):"";}).join("")}
    </div>`;
  document.querySelectorAll("#rspanel [data-area]").forEach(b=>b.onclick=()=>{
    const v=b.dataset.area;state.area=(v==="__all")?"":v;
    if(state.sec){
      state.subPicked=true;
      if(state.sec!=="food")state.mealPicked=true; // food's meal gate is answered explicitly only
    }
    close();render();});
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("regionSel").classList.add("on");
}
function pickSec(id){state.home=false;state.sec=state.sec===id?"":id;state.sub="";state.meal="";
 state.mealPicked=false;state.subPicked=false;state.customOnly=null;
 state.cats.clear();close();window.scrollTo({top:0});render();}
function goHome(){Object.assign(state,{home:true,sec:"",sub:"",meal:"",mealPicked:false,subPicked:false,
 area:"",q:"",minR:0,openNow:false,maxKm:0,starred:false,unvisited:false,sug:false,
 flowWhy:null,customOnly:null});
 state.cats.clear();state.price.clear();state.tagsOn.clear();
 const qq=document.getElementById("q");if(qq)qq.value="";
 const mapWasOpen=state.map;
 if(state.map){state.map=false;document.getElementById("mapwrap").style.display="none";
  document.getElementById("list").style.display="block";const b=document.getElementById("mapBtn");b.dataset.on="";b.textContent="خريطة";}
 close(); // close() itself pops a pending "detail" history entry, if any
 // Jumping straight Home (bottom-nav tab) while the map was open bypasses
 // closeOverlay entirely, which would otherwise leave a still-pending "map"
 // history entry un-popped — pop it here so a later Back press doesn't land
 // on a phantom entry for a screen that's already closed.
 if(mapWasOpen&&!popGuard&&history.state&&history.state.jalanOverlay==="map")history.back();
 window.scrollTo({top:0});render();}
function openMore(){
  const rest=SECTIONS.filter(S=>!TABS.includes(S.id));
  document.getElementById("mpanel").innerHTML=`<div class="grab"></div><div class="morelist">
   <button data-id="__map" class="mhero"><span class="mheroic">${licon("map-pin")}</span>
    <span class="mtxt"><b>الخريطة</b><small>استكشف الأماكن المحفوظة حولك</small></span></button>
   <button data-id="__itin" class="mhero"><span class="mheroic">${licon("compass")}</span>
    <span class="mtxt"><b>خطّط يومك</b><small>رتّب يومك في بالي بطريقتك</small></span></button>
   ${rest.map(S=>`<button data-id="${S.id}"><span style="font-size:19px">${S.ic}</span><span>${S.label}</span>
    <span class="n">${PLACES.filter(p=>inSec(p,S)).length}</span></button>`).join("")}
   <button data-id="__star"><span style="font-size:19px">${licon("star")}</span><span>المميّزة عندي</span>
    <span class="n">${PLACES.filter(p=>mk(p.n).s).length}</span></button>
   <button data-id="__vis"><span style="font-size:19px">${licon("check")}</span><span>اللي زرتها</span>
    <span class="n">${PLACES.filter(p=>mk(p.n).v).length}</span></button>
   <button data-id="__about"><span style="font-size:19px">${licon("info")}</span><span>عن جالان ونسخة احتياطية</span><span class="n"></span></button>
  </div>`;
  document.querySelectorAll("#mpanel .morelist button").forEach(b=>b.onclick=()=>{
    const id=b.dataset.id;
    if(id==="__map"){close();setMapView(true);return;}
    if(id==="__itin"){close();openItinEntry();return;}
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
  // Real fix (not a visual patch): the gate lives purely in mealPicked/
  // subPicked, never in a separate "does a region exist" check here. Food's
  // meal step (foodStep) is answered ONLY by explicitly picking a meal —
  // picking a region never flips mealPicked, so "أكل + Ubud" alone correctly
  // stays on the meal picker (openRegionSelector's handler above is the only
  // place region composes with the picker flags, and it deliberately leaves
  // food's mealPicked alone). Once a meal IS picked, region composes with it
  // immediately like every other section, because subPicked already got set
  // true when the region was chosen.
  const needPicker=(foodStep||subStep)&&!state.q;
  tb.style.display=needPicker?"none":"";ct.style.display=needPicker?"none":"";
  renderChips();
  document.getElementById("total").textContent=PLACES.length+" مكان";
  if(needPicker){renderPicker(S);return;}
  const rows=filtered();
  // Active-filter state is shown as removable chips (PART 8) — each ✕ clears
  // only that one filter and re-renders immediately, no reset-everything.
  let ctHtml=`<span>${rows.length} نتيجة</span>`;
  if(S)ctHtml+=`<span>${esc(S.label)}</span>`;
  if(state.meal){const mm=MEALS.find(m=>m[0]===state.meal);
    ctHtml+=`<button class="ctchip" data-clr="meal">${esc(mm[1])} ✕</button>`;}
  if(state.sub)ctHtml+=`<button class="ctchip" data-clr="sub">${esc(LBL[state.sub]||state.sub)} ✕</button>`;
  if(state.area)ctHtml+=`<button class="ctchip" data-clr="area">${esc(state.area)} ✕</button>`;
  if(me)ctHtml+=`<span>من ${esc(meLabel)}</span>`;
  ct.innerHTML=ctHtml;
  ct.querySelectorAll("[data-clr]").forEach(b=>b.onclick=()=>{
    const k=b.dataset.clr;
    // Clearing meal/sub un-answers that picker step (mealPicked/subPicked
    // reset too, not just the value) — otherwise removing "فطور" would
    // silently keep showing "كل أماكن الأكل" instead of asking again, which
    // is exactly the "لا تعرض كل المطاعم" rule for Food (scenario F): the
    // region stays applied, but the user is sent back to answer the meal
    // question, never shown an unscoped fallback list.
    if(k==="meal"){state.meal="";state.mealPicked=false;}
    else if(k==="sub"){state.sub="";state.subPicked=false;}
    else if(k==="area")state.area="";
    render();});
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
    const badge=(m.s?"★":"")+(m.v?"✓":"");
    const why=(state.sort==="best")?whyList(p).slice(0,2):[];
    const snip=(!why.length&&p.desc)?p.desc.replace(/\n/g," ").replace(/[⚠️📅💰💡🎾🥊🏄🧘♨️]/g,"").trim():"";
    const stats=[p.r?`<b>★ ${p.r.toFixed(1)}</b>`:null,p.rc?p.rc.toLocaleString("en"):null,p.p||null,
      km!=null?fmtKm(km):null,op===1?'<span class="op">مفتوح الآن</span>':null].filter(Boolean).join(" · ");
    return `<button class="row" data-n="${esc(p.n)}">
      ${photoHtml(p,"rph")}
      <span class="rbadges">${p.act?'<span class="b-act">نشاط</span>':""}${p.sug?'<span class="b-sug">مقترح</span>':""}
       ${op===0?'<span class="b-shut">مسكّر</span>':""}</span>
      ${badge?`<span class="rmarks-ov">${badge}</span>`:""}
      <span class="rbody"><span class="rname">${esc(p.n)}</span>
      <span class="rtagrow">
       <span class="tag" style="background:${tintBg(p.k)};color:${tintFg(p.k)}">${EMO[p.k]||"📍"} ${esc(p.c)}</span>
       <span class="dots">${esc(p.a)}</span></span>
      <span class="rstats">${stats}</span>
      ${why.length?`<span class="why">${why.map(w=>"• "+esc(w)).join(" ")}</span>`:""}
      ${snip?`<span class="snip">${esc(snip)}</span>`:""}</span></button>`;}).join("");
  const bk=document.getElementById("back");
  if(bk)bk.onclick=()=>{
    if(S&&S.subs.length&&state.subPicked){state.sub="";state.subPicked=false;}
    else if(S&&S.id==="food"&&state.mealPicked){state.meal="";state.mealPicked=false;}
    render();};
  list.querySelectorAll(".row").forEach(el=>el.onclick=()=>openDetail(el.dataset.n));
}
function renderPicker(S){
  const list=document.getElementById("list");
  // Region is an already-applied filter even while stuck on this picker
  // screen ("Ubud تصبح فلترًا مطبقًا في الـ state") — its counts must reflect
  // that instead of the unfiltered global numbers, even though the screen
  // itself doesn't advance to results until the meal question is answered.
  const pool=PLACES.filter(p=>inSec(p,S)&&(!state.area||p.a===state.area));
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
     <button class="p" data-e="sur">${licon("shuffle")} اختَر لي</button>
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
// Short "what's inside" line per section card — real taxonomy labels already
// used elsewhere (LBL), not invented business copy. Home-only display order so
// Shopping sits with the other browsing sections instead of being buried last.
const SECTION_BLURB={food:"مطاعم · كافيهات · حلويات",drinks:"قهوة · ماتشا · عصائر · بروتين",
 sports:"جيم · بادل · تنس · بيلاتس",beach:"بيتش كلب · طبيعة",visit:"معالم · مغامرات · ثقافة",
 shop:"مولات · أسواق · أوتلت",stay:"فنادق وفلل",spa:"سبا · استشفاء",rides:"تأجير سكوترات ودراجات"};
const HOME_SEC_ORDER=["food","drinks","sports","beach","visit","shop","stay","spa","rides"];
// The "⭐ يستحق الزيارة" picks reuse the existing score()/whyList() engine as-is
// (rating+distance+openNow already weighted in score(); whyList() already only
// states real, verified facts) — this just diversifies across sections instead
// of showing near-duplicates from the same category, and gives food a small
// nudge toward whichever meal slot it actually is right now.
function homePicks(){
  const hh=new Date().getHours();
  const mealNow=hh<11?"b":hh<15?"l":hh<17?"br":"d";
  const pool=PLACES.filter(p=>p.desc);
  const ranked=pool.map(p=>({p,s:score(p)+(FOODK.has(p.k)&&p[mealNow]?0.05:0)}))
    .sort((a,b)=>b.s-a.s).map(x=>x.p);
  const picks=[],seenSec=new Set();
  for(const p of ranked){const sec=KIND_SECTION[p.k]||"other";
    if(seenSec.has(sec))continue;picks.push(p);seenSec.add(sec);if(picks.length>=5)break;}
  if(picks.length<3)for(const p of ranked){if(!picks.includes(p)){picks.push(p);if(picks.length>=3)break;}}
  return picks.slice(0,5);
}
function showAllBest(){state.home=false;state.sec="";state.sort="best";setSortUI("best");
  close();window.scrollTo({top:0});render();}
function renderHome(){
  const cards=HOME_SEC_ORDER.map(id=>secOf(id)).filter(Boolean).map(S=>{const ps=PLACES.filter(p=>inSec(p,S));
   return `<button class="card" data-sec="${S.id}">
    <span class="cico" style="background:${tintBgSec(S.id)};color:${tintFgSec(S.id)}">${S.ic}</span>
    <b>${S.label}</b><span class="cn">${ps.length} مكان</span>
    <span class="cs">${esc(SECTION_BLURB[S.id]||"")}</span></button>`;}).join("");
  const picks=homePicks();
  const pickCard=p=>{const km=kmOf(p),why=whyList(p)[0];
    const meta=[p.r?`★ ${p.r.toFixed(1)}`:null,p.a,km!=null?fmtKm(km):null].filter(Boolean).join(" · ");
    const when=p.d?"عشاء":p.l?"غداء":p.br?"برنش":p.b?"فطور":"";
    const cat=[p.c,when].filter(Boolean).join(" · ");
    return `<button class="row pick" data-n="${esc(p.n)}">
     ${photoHtml(p,"pickph")}
     <div class="pickbody">
      <div class="pickname">${esc(p.n)}</div>
      <div class="pickmeta">${esc(meta)}</div>
      ${cat?`<div class="pickcat">${esc(cat)}</div>`:""}
      ${why?`<div class="pickwhy"><b>ليش؟</b> ${esc(why)}</div>`:""}
     </div>
    </button>`;};
  document.getElementById("list").innerHTML=`<div class="home-wrap">
   <button class="cta" id="flowbtn"><span class="cta-ic">${licon("compass")}</span><span>وين نروح الآن؟<small>توصية ذكية بخمس خطوات سريعة</small></span></button>
   <button class="cta2" id="surbtn">${licon("shuffle")} اختَر لي — قرار سريع</button>
   <div class="quick">
     <button data-q="near">${licon("map-pin")} قريب مني</button><button data-q="meal">${licon("utensils")} وش آكل؟</button>
     <button data-q="drinks">${licon("cup-soda")} وش أشرب؟</button>
     <button data-q="sports">${licon("dumbbell")} رياضة</button>
   </div>
   <div class="hsec">الأقسام</div><div class="grid">${cards}</div>
   <div class="hsec">${licon("star")} يستحق الزيارة</div>
   <div id="hpicks">${picks.map(pickCard).join("")}</div>
   ${picks.length?`<button class="seeall" id="seeAllBtn">شوف الكل ‹</button>`:""}
  </div>`;
  document.querySelectorAll("#list .card").forEach(b=>b.onclick=()=>pickSec(b.dataset.sec));
  // Stale-state bug: FLOW is a module-level object reused across every run of
  // "وين نروح الآن؟" — without resetting it here, re-opening the flow after
  // finishing it once silently pre-selected the PREVIOUS run's answers (what/
  // km/budget/extras), so a user who just clicked through without re-picking
  // anything got yesterday's choices applied again with no visible warning.
  document.getElementById("flowbtn").onclick=()=>{
    FLOW.where=null;FLOW.what=null;FLOW.km=null;FLOW.budget=null;FLOW.extra=new Set();
    openFlow(0);};
  document.getElementById("surbtn").onclick=surprise;
  document.querySelectorAll("#list [data-q]").forEach(b=>b.onclick=()=>{
    const q=b.dataset.q;state.home=false;
    if(q==="near"){state.sort="near";setSortUI("near");openNear();return;}
    if(q==="meal"){pickSec("food");return;}
    if(q==="drinks"){pickSec("drinks");return;}
    if(q==="sports"){pickSec("sports");return;}
    render();});
  document.querySelectorAll("#hpicks .pick").forEach(b=>b.onclick=()=>openDetail(b.dataset.n));
  const seeAll=document.getElementById("seeAllBtn");if(seeAll)seeAll.onclick=showAllBest;
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
  // Only push a new history entry when Details is actually being opened
  // fresh — this same function is also called to re-render the sheet in
  // place after starring/marking visited (see the `set()` helper below), and
  // pushing there too would silently stack a duplicate history entry per tap,
  // so a single Back press would just reopen the same place unchanged.
  const alreadyOpen=document.getElementById("detail").classList.contains("on");
  if(!alreadyOpen)pushOverlay("detail");
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
   ${photoHtml(p,"dhero")}
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
    <button id="vis" class="${m.v?"on":""}">${m.v?"✓ زرته":"سجّل زيارة"}</button>
    <button id="addplan" class="${itinHas(p.n)?"on":""}">${itinHas(p.n)?"✓ موجود في خطتي":"+ أضف لخطتي"}</button></div>
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
  document.getElementById("addplan").onclick=()=>{if(!itinHas(p.n)){addToItin(p.n);openDetail(p.n);}};
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

// Menu speed/reliability fix — diagnosed root causes (not guessed):
//  1. rawCall's fetch had NO timeout at all, so a stuck request left the user
//     staring at a static spinner indefinitely (the exact "waits forever, no
//     result" complaint) instead of failing into the error UI.
//  2. showMenu's fallback chain was up to 6 fully SEQUENTIAL network calls in
//     the worst case: runMenu's web-search loop (4 rounds) + callAny trying
//     two near-identical message shapes one after the other even when the
//     first failure was a plain network/timeout error the second attempt
//     could never fix. Each round compounds bottleneck #1.
//  3. The photo path sent the OCR engine the raw, full-resolution camera/
//     gallery file with no resizing — Tesseract's recognition time scales
//     with pixel count, so a large phone photo was the single biggest
//     contributor to "OCR feels slow" independent of any network issue.
// Fixed below: a real per-call timeout, a shorter/non-duplicated fallback
// chain, an overall timeout on the whole attempt, image downscaling before
// OCR, and staged progress text so the UI never sits static.
const MENU_CALL_TIMEOUT=20000, MENU_TOTAL_TIMEOUT=28000;
// The browser never calls api.anthropic.com directly — that API requires a
// secret key JALAN's static GitHub Pages hosting can't hold, and doesn't send
// CORS headers for arbitrary browser origins anyway. All menu-AI calls go
// through a small Cloudflare Worker (see worker/) that holds the real key as
// a server-side secret and only accepts requests from this app's own origin.
// Update this URL once the Worker is deployed (see worker/README.md).
const AI_API_URL="https://jalan-menu-ai.saem9299.workers.dev/v1/messages";
function withTimeout(promise,ms){
  return new Promise((resolve,reject)=>{
    const t=setTimeout(()=>reject(new Error("TIMEOUT")),ms);
    promise.then(v=>{clearTimeout(t);resolve(v);},e=>{clearTimeout(t);reject(e);});
  });
}
async function rawCall(body){
  const ctrl=new AbortController();
  const t=setTimeout(()=>ctrl.abort(),MENU_CALL_TIMEOUT);
  let res;
  try{
    res=await fetch(AI_API_URL,{method:"POST",
     headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:ctrl.signal});
  }catch(e){throw new Error(e&&e.name==="AbortError"?"TIMEOUT":"NETWORK");}
  finally{clearTimeout(t);}
  let data=null;try{data=await res.json();}catch(e){throw new Error("HTTP "+res.status);}
  if(data&&data.error)throw new Error((data.error.message||"خطأ").slice(0,160));
  if(!res.ok)throw new Error("HTTP "+res.status);return data;}
async function runMenu(q){let msgs=[{role:"user",content:q}];
  for(let i=0;i<2;i++){const d=await rawCall({model:"claude-sonnet-4-6",max_tokens:1000,messages:msgs,
    tools:[{type:"web_search_20250305",name:"web_search"}]});
   const t=textOf(d);
   if(d.stop_reason==="pause_turn"){msgs=msgs.concat([{role:"assistant",content:d.content}]);continue;}
   if(t)return t;
   msgs=msgs.concat([{role:"assistant",content:d.content},{role:"user",content:"اكتب المنيو الآن بالعربية."}]);}
  return "";}
// Single attempt, not two near-identical message shapes tried back-to-back —
// the API treats a string `content` and a one-block array `content` the same
// way, so the previous second attempt only ever doubled the wait on a
// network/timeout failure without ever succeeding differently.
async function callAny(prompt){
  try{const d=await rawCall({model:"claude-sonnet-4-6",max_tokens:1200,messages:[{role:"user",content:prompt}]});
   const t=textOf(d);if(t)return {txt:t,err:""};return {txt:"",err:"رد فاضي"};}
  catch(e){return {txt:"",err:e.message};}}
const menuFriendlyErr=(e,fallback)=>(e&&e.message==="TIMEOUT")?"تعذر إكمال الترجمة الآن.":(fallback||"تعذّر جلب المنيو الآن.");

// State 1: internet-based Arabic lookup (unchanged behavior from the source app).
async function showMenu(p,force){
  if(!force){const c=await getMenuCache(p);if(c&&(c.dishes||c.rawAr)){menuView="ar";paintMenu(p,{cache:c});return;}}
  paintMenu(p,{loading:"جاري جلب المنيو…"});
  const base=`مكان اسمه "${p.n}" في ${p.a} في بالي (${p.c}).
اكتب المنيو بالعربية فقط وبدون مقدمة: قسّمه لأقسام، ولكل صنف الاسم بالعربية ثم الأصلي بين قوسين ثم السعر بالروبية إن توفر،
وضع ⚠️ أمام أي صنف فيه لحم خنزير أو كحول، واذكر أشهر ٣ أصناف.`;
  let txt="",failErr=null;
  try{
    txt=await withTimeout((async()=>{
      let t="";
      try{t=await runMenu("ابحث في الإنترنت عن المنيو الحالي لـ "+base);}catch(e){/* fall through to callAny */}
      if(!t){const r=await callAny(base+"\n(اعتمد على معلوماتك واكتب في أول سطر: معلومات تقريبية غير مؤكدة)");t=r.txt;}
      return t;
    })(),MENU_TOTAL_TIMEOUT);
  }catch(e){failErr=e;}
  if(!txt){paintMenu(p,{err:menuFriendlyErr(failErr)});return;}
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
// A full-resolution phone photo (often 3000-4000px+) is the single biggest
// real slowdown in the OCR step — Tesseract's recognition time scales with
// pixel count. Downscale to a still perfectly legible max dimension before
// handing it to the OCR engine. Falls back to the original file untouched
// on any failure (never block the flow over a preprocessing error).
async function resizeImageForOCR(file){
  const MAX=1800;
  try{
    const bmp=await createImageBitmap(file);
    const w0=bmp.width,h0=bmp.height;
    if(Math.max(w0,h0)<=MAX){bmp.close&&bmp.close();return file;}
    const scale=MAX/Math.max(w0,h0);
    const w=Math.round(w0*scale),h=Math.round(h0*scale);
    const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext("2d");ctx.imageSmoothingQuality="high";
    ctx.drawImage(bmp,0,0,w,h);bmp.close&&bmp.close();
    const blob=await new Promise(res=>canvas.toBlob(res,"image/jpeg",0.88));
    return blob||file;
  }catch(e){return file;}
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
  const r=await withTimeout(callAny(prompt),MENU_CALL_TIMEOUT+2000);
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
  const img=await resizeImageForOCR(file);
  let text="";
  try{
    const res=await Tesseract.recognize(img,"eng");
    text=((res&&res.data&&res.data.text)||"").trim();
  }catch(e){paintMenu(p,{err:"تعذّر قراءة المنيو من هذه الصورة.",noRetry:true});return;}
  if(text.length<3){paintMenu(p,{err:"الصورة غير واضحة بما يكفي لقراءة المنيو.",noRetry:true});return;}
  // Progressive feedback: a real (not fabricated) line count from the text
  // just extracted, shown briefly so the UI visibly advances before the
  // slower translation call starts — never a fake percentage.
  const priceLines=text.split("\n").filter(l=>/\d[\d.,]{2,}|rp\s?\d|\$\s?\d/i.test(l)).length;
  paintMenu(p,{loading:priceLines?`تم العثور على ${priceLines} عنصرًا تقريبًا`:"تم استخراج نص المنيو"});
  await new Promise(r=>setTimeout(r,450));
  paintMenu(p,{loading:"جاري ترجمة المنيو…"});
  try{
    const{dishes,rawAr}=await translateMenuText(text,p);
    const cache={source:"ocr",dishes,rawAr,rawOrig:text,t:Date.now()};
    await setMenuCache(p,cache);menuView="ar";paintMenu(p,{cache});
  }catch(e){
    const cache={source:"ocr",dishes:null,rawAr:null,rawOrig:text,t:Date.now()};
    await setMenuCache(p,cache);menuView="orig";
    paintMenu(p,{err:menuFriendlyErr(e,"تعذّر ترجمة هذه الصورة بالكامل."),cache});
  }
}
async function retryFromCache(p){
  const c=await getMenuCache(p);
  if(c&&c.rawOrig&&!c.dishes&&!c.rawAr){
    paintMenu(p,{loading:"جاري إعادة الترجمة…"});
    try{
      const{dishes,rawAr}=await translateMenuText(c.rawOrig,p);
      const cache={source:"ocr",dishes,rawAr,rawOrig:c.rawOrig,t:Date.now()};
      await setMenuCache(p,cache);menuView="ar";paintMenu(p,{cache});
    }catch(e){paintMenu(p,{err:menuFriendlyErr(e,"تعذّر ترجمة هذه الصورة بالكامل."),cache:c});}
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

/* ---------------- خطّط يومك (itinerary) ----------------
 * UNIFIED feature (previous rounds had two overlapping, confusingly-named
 * planners — the old area-only "خطط يومي" here, and a separate "خطط يومك".
 * They're merged into exactly one: "خطّط يومك", reachable one way, with a
 * persistent segmented control ["JALAN يخطط لي" | "أبني جدولي بنفسي"] that
 * never discards the day's places when switched — see openItinEntry()).
 *
 * Time slots are ORDERED BY TIME OF DAY and reflect a real day's logical
 * flow (breakfast → morning activity → a midday sight/beach → lunch → an
 * afternoon errand/coffee → sunset → dinner → an evening drink), not just
 * "categories in some order" — see the comment on SLOTS below.
 */
const SLOTS=[
 {t:"08:00",lab:"فطور",period:"الصباح",ok:p=>p.b&&FOODK.has(p.k)},
 {t:"10:00",lab:"نشاط صباحي",period:"الصباح",ok:p=>p.act||hasCat(p,"surf")||hasCat(p,"yoga")||hasCat(p,"gym")||hasCat(p,"padel")||hasCat(p,"tennis")||hasCat(p,"crossfit")||hasCat(p,"pilates")||p.k==="adv"},
 {t:"12:00",lab:"معلم أو شاطئ",period:"الظهر",ok:p=>["beachclub","nature","attraction","cult","fam"].includes(p.k)},
 {t:"13:30",lab:"غداء",period:"الظهر",ok:p=>p.l&&FOODK.has(p.k)},
 {t:"15:30",lab:"تسوّق أو قهوة",period:"بعد الظهر",ok:p=>hasCat(p,"coffee")||hasCat(p,"matcha")||hasCat(p,"juice")||["mall","market","outlet","shop"].includes(p.k)},
 {t:"17:30",lab:"غروب",period:"المساء",ok:p=>["beachclub","nature","bar","attraction"].includes(p.k)},
 {t:"20:00",lab:"عشاء",period:"المساء",ok:p=>p.d&&FOODK.has(p.k)},
 {t:"22:00",lab:"مشروب مسائي",period:"بعد العشاء",ok:p=>p.k==="bar"||hasCat(p,"bakery")}
];
const TIME_CHIPS=SLOTS.map(S=>S.t);
// itin.places stores PLACE NAMES only (the same id pattern already used by
// marks[p.n]) — never a duplicate copy of place data, and never a write to
// data/places.json. itin.times{name:"HH:MM"} holds a SUGGESTED, always-
// editable time per place — never presented as a confirmed booking or real
// opening-hours fact. itin.mode is a view toggle only (which primary action
// is emphasized) — it never clears itin.places when switched.
let itin={mode:null,places:[],times:{},suggestions:[],area:null,date:null};
const ITIN_KEY="bali:itin";
const placeByName=n=>PLACES.find(p=>p.n===n);
const ITIN_DEFAULT=()=>({mode:null,places:[],times:{},suggestions:[],area:null,date:null});
async function loadItin(){
  try{const r=await window.storage.get(ITIN_KEY);
    if(r&&r.value)itin=Object.assign(ITIN_DEFAULT(),JSON.parse(r.value));
  }catch(e){}
}
async function saveItin(){try{await window.storage.set(ITIN_KEY,JSON.stringify(itin));}catch(e){}}
function itinHas(n){return itin.places.includes(n);}
// Best-matching SLOT for a place not placed by the AI/completion flow
// (manually added) — used only to suggest a sensible default time; always
// shown as editable, never claimed as the place's real hours.
function bestSlotFor(p){return SLOTS.find(S=>S.ok(p))||null;}
// Keeps the timeline itself in chronological order by default (PART 4/6:
// "إعادة الفرز") — items without a known time stay wherever they already
// are relative to each other, since only actual times carry ordering info.
function resortItinByTime(){
  itin.places=itin.places.map((n,i)=>({n,i,t:itin.times[n]}))
    .sort((a,b)=>{
      if(a.t&&b.t)return a.t<b.t?-1:a.t>b.t?1:a.i-b.i;
      if(a.t&&!b.t)return -1;
      if(!a.t&&b.t)return 1;
      return a.i-b.i;
    }).map(x=>x.n);
}
function addToItin(n){
  if(itinHas(n))return;
  const p=placeByName(n);
  if(p&&!itin.times[n]){const S=bestSlotFor(p);if(S)itin.times[n]=S.t;}
  itin.places.push(n);
  resortItinByTime();
  saveItin();
}
function removeItin(i){const n=itin.places[i];itin.places.splice(i,1);delete itin.times[n];saveItin();renderItin();}
function moveItin(i,dir){const j=i+dir;if(j<0||j>=itin.places.length)return;
  [itin.places[i],itin.places[j]]=[itin.places[j],itin.places[i]];saveItin();renderItin();}
function resetItin(){itin=ITIN_DEFAULT();saveItin();openItinEntry();}

// Proximity bonus toward whatever's already anchored in the day — this is
// what keeps the build from picking, say, a restaurant in Ubud between two
// Canggu stops (PART 3, rule 6/7): candidates near the anchors already
// placed score higher, on top of the existing rating/reviews/openNow score().
// Not a real routing/TSP solve — just a practical geographic bias using the
// same haversine dist() already used everywhere else in the app.
function proximityBonus(p,anchors){
  if(!p.lat)return 0;
  const withCoords=anchors.filter(h=>h.lat);
  if(!withCoords.length)return 0;
  const dmin=Math.min(...withCoords.map(h=>dist(h.lat,h.lng,p.lat,p.lng)));
  return Math.max(0,0.35*(1-dmin/25));
}
function candidateScore(p,anchors){return score(p)+proximityBonus(p,anchors);}
// Mode A — one-shot full-day build for a region: walks the SLOTS in time
// order and, for each one, greedily picks the best-scoring candidate that
// is also close to whatever's already been placed — a simple nearest-
// neighbor-style bias, not a full route solver, but enough to stop the day
// from zig-zagging between far-apart spots for no reason.
function buildItinAI(area){
  const used=new Set(),out=[],anchors=[],times={};
  SLOTS.forEach(S=>{
    const cand=PLACES.filter(p=>p.a===area&&S.ok(p)&&!used.has(p.n))
      .sort((a,b)=>candidateScore(b,anchors)-candidateScore(a,anchors))[0];
    if(cand){out.push(cand.n);used.add(cand.n);anchors.push(cand);times[cand.n]=S.t;}
  });
  return {places:out,times};
}
// Which SLOTS categories the current itinerary does NOT yet cover — this
// (not a raw place count) is what "يومك جاهز" / "كمّل لي اليوم" are based on,
// since a region may genuinely have no candidate for one slot (e.g. no
// dedicated dessert spot) without that meaning the day is "incomplete".
function itinGaps(){
  const have=itin.places.map(placeByName).filter(Boolean);
  return SLOTS.filter(S=>!have.some(p=>S.ok(p)));
}
// Real, available-data-only reasons — never a fabricated drive time (PART
// 15): region match, an actual distance to the nearest existing stop (via
// the same haversine dist() used everywhere else), slot-time fit, rating.
function whyForSuggestion(p,have,S,region){
  const reasons=[];
  if(region&&p.a===region)reasons.push("بنفس منطقة يومك");
  const withCoords=have.filter(h=>h.lat&&p.lat);
  if(withCoords.length){
    const km=Math.min(...withCoords.map(h=>dist(h.lat,h.lng,p.lat,p.lng)));
    if(km<20)reasons.push("قريب من محطتك السابقة ("+fmtKm(km)+" تقريبًا)");
  }
  if(S.lab==="غروب")reasons.push("يناسب وقت الغروب");
  else if((p.r||0)>=4.5)reasons.push("تقييمه "+p.r.toFixed(1)+" وهو من الأعلى");
  return reasons.length?reasons.slice(0,2).join(" · "):"يكمل تنوّع يومك";
}
// "كمّل لي اليوم" — the user's own picks are ANCHORS and are never touched
// or reordered here (PART 3 rule 10): every gap slot's candidate is scored
// with the same proximity bias toward those anchors, and a suggested (not
// confirmed) time is attached from the slot itself.
function completeMyDay(){
  const have=itin.places.map(placeByName).filter(Boolean);
  const haveNames=new Set(itin.places);
  const region=itin.area||modeRegion(have)||null;
  const already=new Set(itin.suggestions.map(s=>s.n));
  const added=[];
  itinGaps().forEach(S=>{
    let cand=PLACES.filter(p=>S.ok(p)&&!haveNames.has(p.n)&&!already.has(p.n));
    const inRegion=region?cand.filter(p=>p.a===region):[];
    cand=(inRegion.length?inRegion:cand).sort((a,b)=>candidateScore(b,have)-candidateScore(a,have));
    if(!cand.length)return;
    const pick=cand[0];
    added.push({n:pick.n,slot:S.lab,time:S.t,why:whyForSuggestion(pick,have,S,region)});
    already.add(pick.n);
  });
  itin.suggestions=itin.suggestions.concat(added);
  saveItin();renderItin();
}
// The most common region among the day's current places — used to bias
// "كمّل لي اليوم" toward the same area the user is already anchored in.
function modeRegion(have){
  if(!have.length)return null;
  const counts={};have.forEach(p=>{counts[p.a]=(counts[p.a]||0)+1;});
  return Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0]||null;
}
function acceptSuggestion(n){
  const s=itin.suggestions.find(x=>x.n===n);
  itin.suggestions=itin.suggestions.filter(x=>x.n!==n);
  addToItin(n);
  if(s&&s.time)itin.times[n]=s.time;
  saveItin();renderItin();
}
function rejectSuggestion(n){itin.suggestions=itin.suggestions.filter(s=>s.n!==n);saveItin();renderItin();}

// Single entry point now (PART 1: unify) — always shows the same sheet with
// a persistent segmented control, so there is never a separate "which
// feature" fork. Re-entering with existing data goes straight back to it.
function openItinEntry(){
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("itin").classList.add("on");
  pushOverlay("itin");
  renderItin();
}
function itinModeBarHtml(){
  return `<div class="itinseg">
   <button data-mode="ai" aria-pressed="${itin.mode==="ai"}">${licon("compass")} JALAN يخطط لي</button>
   <button data-mode="manual" aria-pressed="${itin.mode!=="ai"}">${licon("map-pin")} أبني جدولي بنفسي</button>
  </div>`;
}
function wireItinModeBar(){
  document.querySelectorAll("#itinpanel .itinseg button").forEach(b=>b.onclick=()=>switchItinMode(b.dataset.mode));
}
// Switching modes NEVER silently discards the day (PART 1: "لا يوجد طريق
// مسدود") — manual mode just shows the same day with manual controls;
// choosing AI while a day already exists asks first, since building a fresh
// AI day replaces the current one.
function switchItinMode(mode){
  if(mode==="ai"){
    if(itin.places.length&&!confirm("بناء يوم جديد بالكامل من JALAN سيستبدل جدولك الحالي. تكمل؟"))return;
    openAIRegionPicker();
    return;
  }
  itin.mode="manual";saveItin();renderItin();
}
function openAIRegionPicker(){
  const panel=document.getElementById("itinpanel");
  panel.innerHTML=`<div class="grab"></div>${itinModeBarHtml()}
   <div class="ptitle" style="margin-top:14px">من أي منطقة؟</div>
   <div class="psub">نبني يومك الكامل فيها</div>
   <div class="vlist" style="padding-inline:0">${AREAS.map(a=>`<button class="vrow" data-area="${esc(a)}">
     <span class="vi">${licon("map-pin")}</span><span class="vt">${esc(a)}</span><span class="va">‹</span></button>`).join("")}</div>`;
  wireItinModeBar();
  panel.querySelectorAll("[data-area]").forEach(b=>b.onclick=()=>{
    const area=b.dataset.area,built=buildItinAI(area);
    itin.mode="ai";itin.area=area;itin.places=built.places;itin.times=built.times;itin.suggestions=[];
    saveItin();renderItin();});
}
// Timeline row: a time bullet (editable, always labeled "مقترح" — PART 4:
// never claim a suggested time is confirmed), the place, and reorder/remove.
function itinRowHtml(p,i,total){
  const time=itin.times[p.n];
  const dotCls=i===0?"start":(i===total-1?"end":"");
  return `<div class="itintl">
   <div class="itintlrail"><span class="itintldot ${dotCls}">${i+1}</span>${i<total-1?'<span class="itintlline"></span>':""}</div>
   <div class="itintlcard">
    <button class="itintltime" data-time="${esc(p.n)}">${licon("clock")} ${time?esc(time):"حدد وقتًا"}<small>مقترح</small></button>
    <button class="itintlbody" data-open="${esc(p.n)}">
     <span class="itinname">${esc(p.n)}</span>
     <span class="itinmeta">${esc(p.c)} · ${esc(p.a)}</span></button>
    <div class="itintlacts">
     ${i>0?`<button data-up="${i}" aria-label="نقل لأعلى">▲</button>`:""}
     ${i<total-1?`<button data-down="${i}" aria-label="نقل لأسفل">▼</button>`:""}
     <button data-rm="${i}" aria-label="إزالة">✕</button>
    </div>
   </div></div>`;
}
function itinSuggestionHtml(s){
  const p=placeByName(s.n);if(!p)return"";
  return `<div class="itinsugg">
   <div class="itinsuggbody"><b>${esc(s.slot)}${s.time?" · "+esc(s.time):""}</b><span>${esc(p.n)}</span><small>${esc(s.why)}</small></div>
   <div class="itinsuggacts"><button data-acc="${esc(s.n)}">قبول</button><button data-rej="${esc(s.n)}">تجاهل</button></div></div>`;
}
let itinShowMap=false;
function renderItin(){
  const panel=document.getElementById("itinpanel");
  const places=itin.places.map(placeByName).filter(Boolean);
  let html=`<div class="grab"></div>${itinModeBarHtml()}
   <div class="itinhead"><div><div class="ptitle" style="margin:0">خطّط يومك</div>
    <div class="psub" style="margin:2px 0 0">${places.length?places.length+" محطات":"رتّب يومك في بالي بطريقتك"}</div></div>
    ${places.length?`<button class="tbtn" id="itinReset">جدول جديد</button>`:""}</div>`;
  if(!places.length){
    html+=`<div class="empty" style="padding:34px 10px"><b>ابدأ بإضافة أول مكان ليومك</b>
     <button class="tbtn" id="itinAddFirst" style="margin-top:14px;background:var(--jade);border-color:var(--jade);color:#fff">+ أضف مكان</button></div>`;
    panel.innerHTML=html;
    wireItinModeBar();
    document.getElementById("itinAddFirst").onclick=openItinAdd;
    const rb0=document.getElementById("itinReset");if(rb0)rb0.onclick=resetItin;
    return;
  }
  html+=`<div class="itintabs"><button data-v="list" aria-pressed="${!itinShowMap}">الجدول</button>
   <button data-v="map" aria-pressed="${itinShowMap}">الخريطة</button></div>`;
  if(itinShowMap){
    html+=`<div id="itinmapwrap"><div id="itinmap"></div></div>
     <div class="itinroutenote">${licon("map-pin")} مسار يومك التقريبي — بترتيب محطاتك، وليس مسار قيادة فعلي</div>`;
  }else{
    html+=`<div class="itintimeline">${places.map((p,i)=>itinRowHtml(p,i,places.length)).join("")}</div>
     <button class="tbtn" id="itinAddMore" style="width:100%;margin-top:10px">+ أضف مكان</button>`;
    const gaps=itinGaps();
    if(gaps.length){
      if(places.length<=2){
        html+=`<div class="itinnudge"><b>يومك بدأ 👍</b><span>هل تريد أن نكمله؟</span>
         <button class="tbtn" id="itinComplete" style="background:var(--jade);border-color:var(--jade);color:#fff">كمّل لي اليوم</button></div>`;
      }else{
        html+=`<button class="tbtn" id="itinComplete" style="width:100%;margin-top:10px;background:var(--jade);border-color:var(--jade);color:#fff">كمّل لي اليوم</button>`;
      }
    }else{
      html+=`<div class="itinnudge done"><b>يومك جاهز</b></div>`;
    }
    if(itin.suggestions.length){
      html+=`<div class="hsec" style="margin-top:22px;font-size:16px">${licon("star")} نقترح لك</div>`
       +itin.suggestions.map(itinSuggestionHtml).join("");
    }
  }
  panel.innerHTML=html;
  wireItinModeBar();
  document.querySelectorAll("#itinpanel .itintabs button").forEach(b=>b.onclick=()=>{itinShowMap=b.dataset.v==="map";renderItin();});
  const rb=document.getElementById("itinReset");if(rb)rb.onclick=resetItin;
  const addBtn=document.getElementById("itinAddMore");if(addBtn)addBtn.onclick=openItinAdd;
  const compBtn=document.getElementById("itinComplete");if(compBtn)compBtn.onclick=completeMyDay;
  panel.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openDetail(b.dataset.open));
  panel.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>moveItin(+b.dataset.up,-1));
  panel.querySelectorAll("[data-down]").forEach(b=>b.onclick=()=>moveItin(+b.dataset.down,1));
  panel.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>removeItin(+b.dataset.rm));
  panel.querySelectorAll("[data-time]").forEach(b=>b.onclick=()=>openItinTimeEdit(b.dataset.time));
  panel.querySelectorAll("[data-acc]").forEach(b=>b.onclick=()=>acceptSuggestion(b.dataset.acc));
  panel.querySelectorAll("[data-rej]").forEach(b=>b.onclick=()=>rejectSuggestion(b.dataset.rej));
  if(itinShowMap)requestAnimationFrame(()=>setTimeout(()=>drawItinMap(places),30));
}
// Time editing — a fixed set of the day's own SLOT times as quick chips,
// plus a native <input type=time> for anything else. Always framed as
// "مقترح" (suggested), never a confirmed booking.
function openItinTimeEdit(name){
  const current=itin.times[name]||"";
  document.getElementById("itinTimePanel").innerHTML=`<div class="grab"></div>
   <div class="ptitle">وقت الزيارة (مقترح)</div>
   <div class="psub">${esc(name)}</div>
   <div class="itintimechips">${TIME_CHIPS.map(t=>`<button class="chip" data-t="${t}" aria-pressed="${t===current}">${t}</button>`).join("")}</div>
   <div class="fgroup" style="margin-top:16px"><h3>أو وقت مخصص</h3>
    <input type="time" id="itinTimeCustom" value="${/^\d\d:\d\d$/.test(current)?current:""}"
     style="padding:11px;border-radius:12px;border:1px solid var(--stone);background:var(--sand);width:100%;font-size:16px"></div>
   <button class="tbtn" id="itinTimeSave" style="width:100%;margin-top:16px;background:var(--jade);border-color:var(--jade);color:#fff">حفظ الوقت</button>`;
  const done=t=>{if(t){itin.times[name]=t;resortItinByTime();}saveItin();
    document.getElementById("itinTime").classList.remove("on");
    document.getElementById("itin").classList.add("on");renderItin();};
  document.querySelectorAll("#itinTimePanel [data-t]").forEach(b=>b.onclick=()=>done(b.dataset.t));
  document.getElementById("itinTimeSave").onclick=()=>done(document.getElementById("itinTimeCustom").value);
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("itinTime").classList.add("on");
}
// Add-place browser (PART 2): reuses the app's OWN section/sub/region
// browsing (SECTIONS, hasCat, inSec, AREAS — same arrays Home/pickSec use),
// never a second copy of the data. Screen 1 = section grid; screen 2 =
// region + sub-category chips + results, exactly like the main app's own
// picker; a persistent search box on top searches across ALL of PLACES
// regardless of which screen is showing.
let itinAddSection=null,itinAddSub="",itinAddArea="";
function openItinAdd(){
  itinAddSection=null;itinAddSub="";itinAddArea="";
  document.getElementById("itinAddPanel").innerHTML=`<div class="grab"></div>
   <div class="ptitle">أضف مكانًا</div>
   <input id="itinq" type="search" placeholder="ابحث في كل الأماكن"
    style="width:100%;padding:11px;border-radius:12px;border:1px solid var(--stone);background:var(--sand);margin-top:2px;font-size:16px">
   <div id="itinAddBody" style="margin-top:10px"></div>`;
  document.getElementById("itinq").oninput=renderItinAddBody;
  renderItinAddBody();
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("itinAdd").classList.add("on");
}
function itinAddRow(p){
  const already=itinHas(p.n);
  return `<button class="vrow" data-add="${esc(p.n)}" ${already?"disabled":""}>
   <span class="vi">${EMO[p.k]||"📍"}</span><span class="vt">${esc(p.n)}</span>
   <span class="vn">${esc(p.a)}</span><span class="va">${already?"✓":"+"}</span></button>`;
}
function wireItinAddRows(){
  document.querySelectorAll("#itinAddBody [data-add]").forEach(b=>b.onclick=()=>{addToItin(b.dataset.add);renderItinAddBody();});
}
function renderItinAddBody(){
  const body=document.getElementById("itinAddBody");
  const q=(document.getElementById("itinq").value||"").trim();
  if(q){
    const qq=q.toLowerCase();
    const rows=PLACES.filter(p=>(p.n+" "+p.a+" "+p.c).toLowerCase().includes(qq)).slice(0,40);
    body.innerHTML=`<div class="vlist" style="padding-inline:0">${rows.length?rows.map(itinAddRow).join(""):
      `<div class="empty" style="padding:20px"><b>ما لقينا نتائج</b></div>`}</div>`;
    wireItinAddRows();return;
  }
  if(!itinAddSection){
    body.innerHTML=`<div class="itinaddgrid">${SECTIONS.map(S=>{
      const n=PLACES.filter(p=>inSec(p,S)).length;if(!n)return"";
      return `<button class="itinaddcard" data-sec="${S.id}">
       <span class="cico" style="background:${tintBgSec(S.id)};color:${tintFgSec(S.id)}">${S.ic}</span>
       <b>${esc(S.label)}</b><span class="cn">${n} مكان</span></button>`;}).join("")}</div>`;
    body.querySelectorAll("[data-sec]").forEach(b=>b.onclick=()=>{itinAddSection=b.dataset.sec;itinAddSub="";itinAddArea="";renderItinAddBody();});
    return;
  }
  const S=secOf(itinAddSection);
  const basePool=PLACES.filter(p=>inSec(p,S));
  let pool=itinAddArea?basePool.filter(p=>p.a===itinAddArea):basePool;
  const areas=[...new Set(basePool.map(p=>p.a))].sort((a,b)=>basePool.filter(p=>p.a===b).length-basePool.filter(p=>p.a===a).length);
  let html=`<div class="vhead"><button id="itinAddBack">‹ رجوع</button><span>${esc(S.label)}</span></div>
   <div class="chips">
    <button class="chip" data-area="" aria-pressed="${!itinAddArea}">كل المناطق <b>${basePool.length}</b></button>
    ${areas.map(a=>`<button class="chip" data-area="${esc(a)}" aria-pressed="${itinAddArea===a}">${esc(a)} <b>${basePool.filter(p=>p.a===a).length}</b></button>`).join("")}
   </div>`;
  if(S.subs&&S.subs.length){
    const subsPresent=S.subs.filter(k=>pool.some(p=>hasCat(p,k)));
    html+=`<div class="chips">
     <button class="chip" data-sub="" aria-pressed="${!itinAddSub}">الكل</button>
     ${subsPresent.map(k=>`<button class="chip" data-sub="${k}" aria-pressed="${itinAddSub===k}">${EMO[k]||""} ${LBL[k]||k}</button>`).join("")}
    </div>`;
  }
  if(itinAddSub)pool=pool.filter(p=>hasCat(p,itinAddSub));
  pool=pool.slice().sort((a,b)=>score(b)-score(a));
  html+=`<div class="vlist" style="padding-inline:0">${pool.length?pool.map(itinAddRow).join(""):
    `<div class="empty" style="padding:20px"><b>ما فيه أماكن هنا</b></div>`}</div>`;
  body.innerHTML=html;
  document.getElementById("itinAddBack").onclick=()=>{itinAddSection=null;renderItinAddBody();};
  body.querySelectorAll("[data-area]").forEach(b=>b.onclick=()=>{itinAddArea=b.dataset.area;renderItinAddBody();});
  body.querySelectorAll("[data-sub]").forEach(b=>b.onclick=()=>{itinAddSub=b.dataset.sub;renderItinAddBody();});
  wireItinAddRows();
}
// Numbered markers + a route line, using the SAME Leaflet setup (MAP_TILE_URL,
// tintFg for per-kind color) as the main map — no new map provider. The line
// is dashed and explicitly labeled "مسار تقريبي" (PART 15: never claim a real
// driving route/time without a routing engine, which this app doesn't have).
// The first/last stop get a distinct marker style, and small rotated arrow
// glyphs sit at each segment's midpoint pointing toward the next stop, so
// the day's direction reads at a glance instead of just a line.
let ItinMap=null,itinLayer=null,itinLine=null,itinArrowLayer=null;
function itinNumberIcon(n,hex,variant){
  return L.divIcon({className:"itinmarker",iconSize:[30,30],iconAnchor:[15,15],
    html:`<span class="itinmarker-dot${variant?" "+variant:""}" style="--ring:${hex}">${n}</span>`});
}
function bearingArrowIcon(deg){
  return L.divIcon({className:"itinarrow",iconSize:[18,18],iconAnchor:[9,9],
    html:`<span class="itinarrow-ic" style="transform:rotate(${deg}deg)">${licon("arrow-right")}</span>`});
}
// Compass bearing between two points, in degrees (0=east, matching the
// arrow-right glyph's default orientation) — used only for the small
// direction arrows, not presented as a real routing bearing.
function bearing(lat1,lng1,lat2,lng2){
  const toRad=x=>x*Math.PI/180,toDeg=x=>x*180/Math.PI;
  const dLon=toRad(lng2-lng1);
  const y=Math.sin(dLon)*Math.cos(toRad(lat2));
  const x=Math.cos(toRad(lat1))*Math.sin(toRad(lat2))-Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(dLon);
  return (toDeg(Math.atan2(y,x))+450)%360;
}
function drawItinMap(places){
  const el=document.getElementById("itinmap");if(!el)return;
  // Same guard as the main map's mapSdkFailed(): if the Leaflet script
  // itself never loaded (CDN unreachable / blocked), show an honest retry
  // state instead of leaving a blank empty box that looks broken.
  if(typeof L==="undefined"){
    el.innerHTML=`<div class="itinmapfail"><p>تعذر تحميل الخريطة</p><button id="itinmapretry">إعادة المحاولة</button></div>`;
    const rb=document.getElementById("itinmapretry");if(rb)rb.onclick=()=>{el.innerHTML="";drawItinMap(places);};
    return;
  }
  const pts=places.filter(p=>p.lat);
  if(!ItinMap){
    ItinMap=L.map(el,{zoomControl:false}).setView(pts.length?[pts[0].lat,pts[0].lng]:[-8.67,115.16],pts.length?12:10);
    L.tileLayer(MAP_TILE_URL,{maxZoom:20,attribution:MAP_TILE_ATTR,subdomains:"abcd"}).addTo(ItinMap);
    L.control.zoom({position:"bottomleft"}).addTo(ItinMap);
  }
  if(itinLayer)ItinMap.removeLayer(itinLayer);
  if(itinLine){ItinMap.removeLayer(itinLine);itinLine=null;}
  if(itinArrowLayer){ItinMap.removeLayer(itinArrowLayer);itinArrowLayer=null;}
  itinLayer=L.layerGroup();
  pts.forEach((p,i)=>{
    const variant=i===0?"start":(i===pts.length-1?"end":"");
    const time=itin.times[p.n];
    const marker=L.marker([p.lat,p.lng],{icon:itinNumberIcon(i+1,tintFg(p.k),variant)});
    marker.bindPopup(`<div class="itinpopup"><b>#${i+1} ${esc(p.n)}</b>`+
      `<span>${time?esc(time)+" · ":""}${esc(p.c)}</span></div>`);
    marker.addTo(itinLayer);
  });
  itinLayer.addTo(ItinMap);
  if(pts.length>1){
    itinLine=L.polyline(pts.map(p=>[p.lat,p.lng]),
      {color:cssVar("--primary"),weight:3.5,opacity:.9,dashArray:"1,8",lineCap:"round"}).addTo(ItinMap);
    itinArrowLayer=L.layerGroup();
    for(let i=0;i<pts.length-1;i++){
      const a=pts[i],b=pts[i+1];
      const deg=bearing(a.lat,a.lng,b.lat,b.lng);
      L.marker([(a.lat+b.lat)/2,(a.lng+b.lng)/2],{icon:bearingArrowIcon(deg),interactive:false}).addTo(itinArrowLayer);
    }
    itinArrowLayer.addTo(ItinMap);
    ItinMap.fitBounds(itinLine.getBounds().pad(.25));
  }else if(pts.length===1){ItinMap.setView([pts[0].lat,pts[0].lng],13);}
  setTimeout(()=>ItinMap.invalidateSize(),50);
}

/* ---------------- filters ---------------- */
// Inconsistent-state bug: this ignored state.customOnly (used by the
// Visited list), so opening Filters while viewing "اللي زرتها" computed every
// count/chip against all 345 places instead of the visited subset actually
// on screen — the panel's numbers didn't match what filtered() would return.
const filterPool=()=>(state.customOnly?PLACES.filter(state.customOnly):PLACES)
 .filter(p=>{if(state.sec){const S=secOf(state.sec);if(!S||!inSec(p,S))return false;}return true;});
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
  // "ماذا أشتري هنا؟" — shown only inside Shopping, reusing the same tag-filter
  // mechanism (state.tagsOn / p.tags) as the generic فيتشرز above, no new UI.
  const buy=[["clothes","ملابس"],["shoes","أحذية"],["sportswear","سبورتوير"],["surfwear","سيرف وير"],
   ["jewelry","مجوهرات"],["beauty","بيوتي"],["gifts","هدايا"],["souvenirs","تذكارات"],
   ["home","ديكور المنزل"],["handicrafts","حرف يدوية"],["food","أكل ومقتنيات"],["luxury","فاخر"]]
   .filter(([v])=>pool.some(p=>(p.tags||[]).includes(v)));
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
   ${state.sec==="shop"&&buy.length?`<div class="fgroup"><h3>ماذا أشتري هنا؟</h3><div class="fchips">
    ${buy.map(([v,l])=>chip(l,state.tagsOn.has(v),"tag:"+v,pool.filter(p=>(p.tags||[]).includes(v)).length)).join("")}</div></div>`:""}
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
// ---- lightweight history integration (Map + Place Details only) ----
// Real bug (PART 5): neither screen was wired to the browser/OS back
// gesture at all — a user swiping back on Safari, or a hardware/Android
// back button, would just leave the app instead of closing the sheet they
// were looking at. Scoped to Map, Details, and (added with خطّط يومك)
// Itinerary — screens you can genuinely get stuck inside — rather than
// every minor sheet (filters/more/plan/near/itinAdd/...), to keep the blast
// radius small and testable: those keep using the plain close() below
// exactly as before.
// popGuard prevents the popstate handler's own cleanup from pushing/popping
// further history entries — the one thing standing between this and an
// infinite back loop.
let popGuard=false;
function pushOverlay(kind){if(!popGuard)history.pushState({jalanOverlay:kind},"");}
function closeOverlay(){
  if(!popGuard&&history.state&&history.state.jalanOverlay){history.back();}
  else{close();if(state.map)setMapView(false);}
}
window.addEventListener("popstate",e=>{
  popGuard=true;
  const st=e.state;
  if(st&&st.jalanOverlay==="map"){
    // landed back on the map-open state (e.g. came from map→detail→back) —
    // close Details but leave the map itself open, one level at a time.
    document.getElementById("detail").classList.remove("on");
  }else if(st&&st.jalanOverlay==="itin"){
    // landed back on the itinerary-open state (e.g. itin→Details→back) —
    // #itinpanel keeps its rendered content while hidden, so just closing
    // Details and re-showing the itin sheet restores it exactly as it was.
    document.getElementById("detail").classList.remove("on");
    document.getElementById("itinAdd").classList.remove("on");
    document.getElementById("itin").classList.add("on");
  }else{
    // landed on "no overlay" — close everything Details/Map/Itinerary opened.
    document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
    if(state.map)setMapView(false);
  }
  markFilterBtn();
  popGuard=false;
});
function close(){
  // Centralized so EVERY existing call site (tab switches, "المزيد" picks,
  // region/filter selection, the flow, etc.) that happens to close an open
  // Details or Itinerary sheet also keeps the history stack balanced
  // automatically, instead of needing that logic sprinkled at each call site.
  const detailWasOpen=document.getElementById("detail").classList.contains("on");
  const itinWasOpen=document.getElementById("itin").classList.contains("on");
  document.querySelectorAll(".sheet").forEach(s=>s.classList.remove("on"));
  markFilterBtn();
  if(popGuard)return;
  if(detailWasOpen&&history.state&&history.state.jalanOverlay==="detail"){history.back();}
  else if(itinWasOpen&&history.state&&history.state.jalanOverlay==="itin"){history.back();}
}
document.querySelectorAll("[data-close]").forEach(e=>e.onclick=close);
// Details'/Itinerary's own ✕/scrim specifically route through closeOverlay
// (back()) so a device/Safari back-gesture and tapping ✕ behave identically
// and never desync the history stack from each other.
document.querySelectorAll("#detail [data-close]").forEach(e=>e.onclick=closeOverlay);
document.querySelectorAll("#itin [data-close]").forEach(e=>e.onclick=closeOverlay);
// itinAdd is a minor picker sheet layered on top of itin (like Filters is on
// top of a results list) — closing it just returns to the itin screen
// beneath it, no separate history entry of its own.
document.querySelectorAll("#itinAdd [data-close]").forEach(e=>e.onclick=()=>{
  document.getElementById("itinAdd").classList.remove("on");
  renderItin();
  document.getElementById("itin").classList.add("on");
});
// Same pattern for the time-edit mini-sheet.
document.querySelectorAll("#itinTime [data-close]").forEach(e=>e.onclick=()=>{
  document.getElementById("itinTime").classList.remove("on");
  renderItin();
  document.getElementById("itin").classList.add("on");
});

/* ---------------- map ----------------
 * Root cause of the white-screen-with-dots bug: the tile layer pointed at
 * {s}.tile.openstreetmap.org — OSM's raw tile server, which its own usage
 * policy (operations.osmfoundation.org/policies/tiles) explicitly warns
 * against embedding directly in an app: it throttles/blocks exactly this
 * traffic pattern. The markers (circleMarker) are vector shapes Leaflet
 * draws locally with no network request, so they always rendered fine —
 * only the raster basemap images were silently failing, hence "dots on
 * white". Fixed by switching to CARTO's Voyager basemap, a tile provider
 * meant for this kind of direct client embedding.
 */
const MAP_TILE_URL="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const MAP_TILE_ATTR='© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';
let L_map=null,layer=null,meMarker=null,mapLocateBtn=null,mapLocateTried=false;
function placeIcon(p){
  const hex=tintFg(p.k);
  return L.divIcon({className:"jmarker",iconSize:[26,26],iconAnchor:[13,13],
    html:`<span class="jmarker-dot" style="--ring:${hex}"></span>`});
}
function meIcon(){return L.divIcon({className:"jmarker-me",iconSize:[20,20],iconAnchor:[10,10],html:'<span></span>'});}
function openMapCard(p){
  const km=kmOf(p);
  document.getElementById("mcpanel").innerHTML=`<div class="grab"></div>
   ${photoHtml(p,"dhero")}
   <div class="mcname">${esc(p.n)}</div>
   <div class="mcmeta"><span class="tag" style="background:${tintBg(p.k)};color:${tintFg(p.k)}">${EMO[p.k]||"📍"} ${esc(p.c)}</span>
    <span>${esc(p.a)}</span></div>
   <div class="mcstats">
    ${p.r?`<span>★ ${p.r.toFixed(1)}</span>`:""}
    ${p.p?`<span>${esc(p.p)}</span>`:""}
    ${km!=null?`<span>${fmtKm(km)}</span>`:""}
   </div>
   ${p.desc?`<p class="mcdesc">${esc(p.desc.split("\n")[0])}</p>`:""}
   <button class="primary" id="mcopen" style="margin-top:14px">عرض المكان</button>`;
  document.getElementById("mcopen").onclick=()=>{document.getElementById("mapcard").classList.remove("on");openDetail(p.n);};
  document.querySelectorAll(".sheet").forEach(x=>x.classList.remove("on"));
  document.getElementById("mapcard").classList.add("on");
}
function mapLocateError(){
  const el=document.getElementById("mapbanner");if(!el)return;
  el.innerHTML=`لم نتمكن من تحديد موقعك.<button id="mapaskloc">السماح بالموقع</button>`;
  el.style.display="flex";
  document.getElementById("mapaskloc").onclick=locateOnMap;
}
function locateOnMap(){
  const el=document.getElementById("mapbanner");if(el)el.style.display="none";
  if(!navigator.geolocation){mapLocateError();return;}
  if(mapLocateBtn)mapLocateBtn.classList.add("busy");
  navigator.geolocation.getCurrentPosition(
    pos=>{
      if(mapLocateBtn)mapLocateBtn.classList.remove("busy");
      me=[pos.coords.latitude,pos.coords.longitude];meLabel="موقعك";
      if(!L_map)return;
      if(meMarker)L_map.removeLayer(meMarker);
      meMarker=L.marker(me,{icon:meIcon(),zIndexOffset:1000}).addTo(L_map).bindPopup("موقعي");
      L_map.setView(me,14);
      render();
    },
    ()=>{if(mapLocateBtn)mapLocateBtn.classList.remove("busy");mapLocateError();},
    {timeout:10000,maximumAge:60000});
}
// Root cause of the "لصق/تعلق" (lag/freeze) reports: drawMap() used to run on
// *every* render() — every keystroke in search, every filter/sort toggle, even
// unrelated state changes like starring a place — and unconditionally tore down
// and rebuilt every marker + the whole cluster group each time. With 300+ places
// that's real main-thread work happening far more often than the visible result
// set actually changes. Fixed by (a) only touching markers when the set of
// visible places actually changed (lastPtsKey below) and (b) debouncing the
// search input itself (see the "q" oninput wiring) so typing doesn't call
// render()/drawMap() once per keystroke.
let lastPtsKey=null,mapTileFailed=false;
function showMapStatus(html){const el=document.getElementById("mapstatus");if(!el)return;
  el.innerHTML=html;el.classList.add("on");}
function hideMapStatus(){const el=document.getElementById("mapstatus");if(el)el.classList.remove("on");}
function retryMap(){
  mapTileFailed=false;hideMapStatus();
  if(L_map){L_map.remove();L_map=null;layer=null;lastPtsKey=null;}
  render();
}
function mapSdkFailed(){
  mapTileFailed=true;L_map=null;layer=null;lastPtsKey=null;
  showMapStatus('<p>تعذر تحميل الخريطة</p><button id="mapretry">إعادة المحاولة</button>');
  const b=document.getElementById("mapretry");if(b)b.onclick=retryMap;
}
function drawMap(rows){
  const el=document.getElementById("map");
  const firstInit=!L_map;
  if(firstInit){
    showMapStatus('<div class="sp"></div><p>جاري تحميل الخريطة…</p>');
    // Leaflet itself (loaded from a CDN in index.html) can fail to load — no
    // network, an ad-blocker, a CDN outage. Without this guard that left the
    // "جاري التحميل" spinner up forever with an uncaught ReferenceError on `L`
    // instead of ever reaching a retry state — the real "white/blank screen
    // that never recovers" failure mode, distinct from a tile-load failure.
    if(typeof L==="undefined"){mapSdkFailed();return;}
    try{
    // zoomControl:false + our own LocateControl below — created once here and
    // never again, since L_map is a module-level singleton reused by every
    // later drawMap() call (guarded by the `firstInit` check).
    L_map=L.map(el,{zoomControl:false}).setView(me||[-8.67,115.16],me?13:10);
    const tiles=L.tileLayer(MAP_TILE_URL,{maxZoom:20,attribution:MAP_TILE_ATTR,subdomains:"abcd"}).addTo(L_map);
    let tileOk=false;
    tiles.on("load",()=>{tileOk=true;mapTileFailed=false;hideMapStatus();});
    tiles.on("tileerror",()=>{
      if(tileOk||mapTileFailed)return; // one real tile already loaded — don't flag a lone drop as total failure
      mapTileFailed=true;
      showMapStatus('<p>تعذر تحميل الخريطة</p><button id="mapretry">إعادة المحاولة</button>');
      const b=document.getElementById("mapretry");if(b)b.onclick=retryMap;
    });
    // Belt-and-suspenders: if no tile event fires at all within 6s (e.g. the
    // container was hidden/zero-size at init), stop showing the loading
    // spinner forever and offer a retry instead of a silent white screen.
    setTimeout(()=>{if(!tileOk&&!mapTileFailed){mapTileFailed=true;
      showMapStatus('<p>تعذر تحميل الخريطة</p><button id="mapretry">إعادة المحاولة</button>');
      const b=document.getElementById("mapretry");if(b)b.onclick=retryMap;}},6000);
    L.control.zoom({position:"bottomleft"}).addTo(L_map);
    const LocateControl=L.Control.extend({options:{position:"bottomleft"},
      onAdd(){const b=L.DomUtil.create("button","map-locate");b.type="button";b.title="موقعي";
        b.innerHTML=licon("map-pin");L.DomEvent.disableClickPropagation(b);
        b.onclick=locateOnMap;mapLocateBtn=b;return b;}});
    new LocateControl().addTo(L_map);
    if(me){meMarker=L.marker(me,{icon:meIcon(),zIndexOffset:1000}).addTo(L_map).bindPopup("موقعي");}
    // The container can still be display:none at the exact tick L.map() runs
    // (setMapView flips it right before calling render()); invalidateSize()
    // after layout settles is what actually fixes a blank/mis-sized map here.
    requestAnimationFrame(()=>setTimeout(()=>L_map.invalidateSize(),50));
    }catch(err){mapSdkFailed();return;}
  }
  const pts=rows.filter(p=>p.lat);
  const key=pts.length+":"+pts.map(p=>p.n).join("|");
  if(!firstInit&&key===lastPtsKey){setTimeout(()=>L_map.invalidateSize(),50);return;}
  lastPtsKey=key;
  if(layer)L_map.removeLayer(layer);
  const markers=pts.map(p=>{const m=L.marker([p.lat,p.lng],{icon:placeIcon(p)});
    m.on("click",()=>openMapCard(p));return m;});
  layer=(L.markerClusterGroup)?L.markerClusterGroup({maxClusterRadius:50,
    iconCreateFunction(cluster){const n=cluster.getChildCount();
      return L.divIcon({html:`<span class="jcluster">${n}</span>`,className:"",iconSize:[38,38]});}}):
    L.layerGroup();
  markers.forEach(m=>layer.addLayer(m));
  layer.addTo(L_map);
  if(firstInit&&!me&&pts.length)L_map.fitBounds(L.latLngBounds(pts.map(p=>[p.lat,p.lng])).pad(.15));
  if(firstInit&&!me&&!mapLocateTried){mapLocateTried=true;locateOnMap();}
}

/* ---------------- wiring ---------------- */
function setSortUI(k){document.querySelectorAll("#sortSeg button").forEach(x=>x.setAttribute("aria-pressed",x.dataset.s===k));}
let searchDebounce=null;
document.getElementById("q").oninput=e=>{state.q=e.target.value;if(state.q)state.home=false;
 clearTimeout(searchDebounce);searchDebounce=setTimeout(render,120);};
document.querySelectorAll("#sortSeg button").forEach(b=>b.onclick=()=>{
 const k=b.dataset.s;setSortUI(k);state.sort=k;if(k==="near"&&!me){openNear();return;}render();});
document.getElementById("filtBtn").onclick=openFilters;
// mapPrevHome remembers whether the user was on Home right before opening
// the map (e.g. via المزيد ← الخريطة, with no section picked at all) so
// closing the map — by the ✕ or the toolbar toggle — returns to Home instead
// of silently dumping the user into an unfiltered all-345-places list, which
// is what happened before since state.home was force-cleared on open and
// nothing ever restored it. Any section/region/search already active is left
// completely untouched by opening/closing the map either way.
let mapPrevHome=false;
function setMapView(on){
 if(on){mapPrevHome=state.home;pushOverlay("map");}
 state.map=on;
 if(on)state.home=false;
 else if(mapPrevHome&&!state.sec)state.home=true;
 const b=document.getElementById("mapBtn");b.dataset.on=on?"1":"";b.textContent=on?"قائمة":"خريطة";
 document.getElementById("mapwrap").style.display=on?"block":"none";
 document.getElementById("list").style.display=on?"none":"block";render();}
// Opening routes through setMapView (which pushes a history entry); closing
// — whether the toolbar toggle or the ✕ — routes through closeOverlay so a
// device/Safari back-gesture and tapping either close control behave
// identically and the history stack never gets out of sync with them.
document.getElementById("mapBtn").onclick=()=>{if(state.map)closeOverlay();else setMapView(true);};
document.getElementById("mapCloseX").onclick=closeOverlay;
addEventListener("scroll",()=>{document.getElementById("hdr").classList.toggle("stuck",window.scrollY>4);},{passive:true});
Promise.all([loadMarks(),loadItin()]).then(render);
