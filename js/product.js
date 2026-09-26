import {getSettings,getProducts,applySettings,escapeHTML,money,youtubeId,productCard} from "./store.js";
import {auth,db,onAuthStateChanged,doc,setDoc,serverTimestamp} from "./firebase.js";

const slug=location.pathname.split("/").pop().replace(/\.html$/,"");
const [settings,products]=await Promise.all([getSettings(),getProducts()]);
applySettings(settings);
const p=products.find(x=>x.slug===slug);
const root=document.getElementById("product");
if(!p){root.innerHTML=`<div class="empty"><h2>Product not found</h2><a href="../index.html">হোমে ফিরে যান</a></div>`}
else{
 document.title=`${p.name} | ${settings.siteName}`;
 const imgs=p.images||[];
 root.innerHTML=`<div class="detail-gallery">${imgs.map((x,i)=>`<img loading="${i?"lazy":"eager"} src="${escapeHTML(x)}" alt="${escapeHTML(p.name)}">`).join("")||`<div class="empty">No image</div>`}</div>
 <div class="detail-info"><div class="eyebrow">${escapeHTML(p.category||"")}</div><h1>${escapeHTML(p.name)}</h1><p class="muted">${escapeHTML(p.shortDescription||"")}</p>
 <div class="detail-price">${settings.showPrices?money(p.salePrice||p.price,settings):""}${p.salePrice&&Number(p.salePrice)<Number(p.price)?` <del>${money(p.price,settings)}</del>`:""}</div>
 <div class="detail-actions"><button class="btn" id="add">কার্টে যোগ করুন</button><button class="small-btn" id="wish">♡ উইশলিস্ট</button></div>
 <div class="markdown" id="md">লোড হচ্ছে...</div>
 ${p.videos?.length?`<div class="video-list"><h2>Product Video</h2>${p.videos.map(v=>{const id=youtubeId(v);return id?`<div class="video"><iframe loading="lazy" src="https://www.youtube.com/embed/${encodeURIComponent(id)}" title="YouTube video" allowfullscreen></iframe></div>`:`<a href="${escapeHTML(v)}" target="_blank" rel="noopener">ভিডিও দেখুন</a>`}).join("")}</div>`:""}
 </div>`;
 const md=await fetch(`../content/${encodeURIComponent(p.slug)}.md`).then(r=>r.ok?r.text():"").catch(()=>"");
 document.getElementById("md").innerHTML=markdownToHtml(md);
 document.getElementById("add").onclick=async()=>{
  const u=auth.currentUser;if(!u){location.href="../login.html";return}
  await setDoc(doc(db,"users",u.uid,"cart",p.slug),{productId:p.slug,qty:1,name:p.name,image:imgs[0]||"",price:p.salePrice||p.price||0,updatedAt:serverTimestamp()},{merge:true});alert("কার্টে যোগ হয়েছে")
 };
 document.getElementById("wish").onclick=async()=>{
  const u=auth.currentUser;if(!u){location.href="../login.html";return}
  await setDoc(doc(db,"users",u.uid,"wishlist",p.slug),{productId:p.slug,name:p.name,image:imgs[0]||"",price:p.salePrice||p.price||0,createdAt:serverTimestamp()});alert("উইশলিস্টে যোগ হয়েছে")
 };
 const related=products.filter(x=>x.slug!==p.slug&&x.status==="published"&&(x.category&&x.category===p.category||x.brand&&x.brand===p.brand||x.tags?.some(t=>p.tags?.includes(t)))).slice(0,6);
 if(related.length)document.getElementById("related").innerHTML=related.map(x=>productCard(x,settings)).join("");
}
function markdownToHtml(md){
 let h=escapeHTML(md||"");
 h=h.replace(/^###### (.*)$/gm,"<h6>$1</h6>").replace(/^##### (.*)$/gm,"<h5>$1</h5>").replace(/^#### (.*)$/gm,"<h4>$1</h4>").replace(/^### (.*)$/gm,"<h3>$1</h3>").replace(/^## (.*)$/gm,"<h2>$1</h2>").replace(/^# (.*)$/gm,"<h1>$1</h1>");
 h=h.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/`(.+?)`/g,"<code>$1</code>");
 h=h.replace(/^\- (.*)$/gm,"<li>$1</li>").replace(/(<li>.*<\/li>\n?)+/g,m=>`<ul>${m}</ul>`);
 h=h.split(/\n{2,}/).map(x=>/^\s*<(h\d|ul|li)/.test(x.trim())?x:`<p>${x.replace(/\n/g,"<br>")}</p>`).join("");
 return h;
}
