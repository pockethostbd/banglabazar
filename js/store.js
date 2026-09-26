const DEFAULTS={siteName:"BanglaBazar",logoUrl:"",primaryColor:"#1565C0",buttonColor:"#1565C0",buttonTextColor:"#FFFFFF",backgroundColor:"#F7F8FA",cardColor:"#FFFFFF",textColor:"#17202A",mutedColor:"#667085",currency:"৳",showPrices:true};

export async function getJSON(path, fallback){
  try{const r=await fetch(path+"?v="+Date.now(),{cache:"no-store"});if(!r.ok)throw new Error();return await r.json()}catch{return fallback}
}
export async function getSettings(){
  const s=await getJSON("data/settings.json",DEFAULTS);
  return {...DEFAULTS,...s};
}
export async function getProducts(){
  return await getJSON("data/products.json",[]);
}
export function applySettings(s){
  const r=document.documentElement;
  r.style.setProperty("--primary",s.primaryColor);
  r.style.setProperty("--button",s.buttonColor);
  r.style.setProperty("--button-text",s.buttonTextColor);
  r.style.setProperty("--bg",s.backgroundColor);
  r.style.setProperty("--card",s.cardColor);
  r.style.setProperty("--text",s.textColor);
  r.style.setProperty("--muted",s.mutedColor);
  document.title=s.siteName;
  document.querySelectorAll("#brandName").forEach(e=>e.textContent=s.siteName);
  document.querySelectorAll("#heroTitle").forEach(e=>e.textContent=s.siteName);
  document.querySelectorAll("#brandLogo").forEach(e=>{
    if(s.logoUrl){e.innerHTML=`<img src="${escapeAttr(s.logoUrl)}" alt="">`}else e.textContent=(s.siteName||"B").charAt(0).toUpperCase();
  });
}
export function escapeHTML(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
export function escapeAttr(v=""){return escapeHTML(v)}
export function money(v,s){return `${escapeHTML(s.currency)} ${Number(v||0).toLocaleString("en-BD")}`}
export function slugify(s){return String(s).toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"")}
export function youtubeId(url=""){
  try{const u=new URL(url);if(u.hostname.includes("youtu.be"))return u.pathname.slice(1);if(u.searchParams.get("v"))return u.searchParams.get("v");const m=u.pathname.match(/\/(shorts|embed)\/([^/?]+)/);return m?m[2]:""}catch{return ""}
}
export function productCard(p,s){
  const img=(p.images&&p.images[0])||"";
  const price=s.showPrices?`<div class="price-row"><span class="price">${money(p.salePrice||p.price,s)}</span>${p.salePrice&&Number(p.salePrice)<Number(p.price)?`<span class="old-price">${money(p.price,s)}</span>`:""}</div>`:"";
  return `<article class="product-card">
    <a class="product-image" href="products/${encodeURIComponent(p.slug)}.html">${img?`<img loading="lazy" src="${escapeAttr(img)}" alt="${escapeAttr(p.name)}">`:""}</a>
    <div class="product-body">
      <a class="product-name" href="products/${encodeURIComponent(p.slug)}.html">${escapeHTML(p.name)}</a>
      ${price}
      <div class="card-actions">
        <button class="small-btn primary" data-add-cart="${escapeAttr(p.slug)}">কার্টে যোগ</button>
        <button class="small-btn" data-wish="${escapeAttr(p.slug)}">♡</button>
      </div>
    </div>
  </article>`;
}
