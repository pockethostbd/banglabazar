import {slugify,escapeHTML} from "./store.js";

const $=id=>document.getElementById(id);
const SESSION="banglabazar_admin_session";
let products=[], settings={};

function session(){try{return JSON.parse(sessionStorage.getItem(SESSION)||"null")}catch{return null}}
function saveSession(v){sessionStorage.setItem(SESSION,JSON.stringify(v))}
function clearSession(){sessionStorage.removeItem(SESSION)}
function headers(s){return {"Accept":"application/vnd.github+json","Authorization":`Bearer ${s.token}`,"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"}}
function apiBase(s){return `https://api.github.com/repos/${encodeURIComponent(s.user)}/${encodeURIComponent(s.repo)}/contents`}
async function gh(s,path,opts={}){
 const r=await fetch(`${apiBase(s)}/${path.split("/").map(encodeURIComponent).join("/")}`,{...opts,headers:{...headers(s),...(opts.headers||{})}});
 const text=await r.text();let d;try{d=JSON.parse(text)}catch{d={message:text}};
 if(!r.ok)throw new Error(d.message||`GitHub error ${r.status}`);return d;
}
function b64(str){const bytes=new TextEncoder().encode(str);let bin="";bytes.forEach(b=>bin+=String.fromCharCode(b));return btoa(bin)}
function unb64(str){const bin=atob(str.replace(/\n/g,""));const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
async function readFile(s,path){
 try{const d=await gh(s,path);return {text:unb64(d.content),sha:d.sha}}catch(e){if(String(e.message).toLowerCase().includes("not found"))return null;throw e}
}
async function writeFile(s,path,text,message,sha){
 const body={message,content:b64(text)};if(sha)body.sha=sha;return await gh(s,path,{method:"PUT",body:JSON.stringify(body)})
}
async function deleteFile(s,path,sha,message){
 return await gh(s,path,{method:"DELETE",body:JSON.stringify({message,sha})})
}
async function ensureSession(){
 const s=session();if(!s)return false;
 try{await gh(s,"data/products.json");return true}catch{clearSession();return false}
}
function showDashboard(){ $("adminLogin").classList.add("hidden");$("dashboard").classList.remove("hidden");$("repoInfo").textContent=`${session().user}/${session().repo}`;loadAll().catch(showError)}
function showError(e){$("loginMsg").textContent=e.message||String(e)}

$("adminEnter").onclick=async()=>{
 $("loginMsg").textContent="";
 const user=$("ghUser").value.trim(),repo=$("ghRepo").value.trim(),token=$("ghToken").value.trim(),password=$("adminPassword").value;
 if(!user||!repo||!token||!password){$("loginMsg").textContent="সব ঘর পূরণ করুন।";return}
 if(password!=="BanglaBazar@Admin2026"){ $("loginMsg").textContent="Admin password ভুল।";return }
 try{await gh({user,repo,token},"data/products.json");saveSession({user,repo,token});showDashboard()}catch(e){showError(e)}
};
$("logoutBtn").onclick=()=>{clearSession();location.reload()};
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>openTab(b.dataset.tab));
document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openTab(b.dataset.open));
function openTab(id){document.querySelectorAll(".tab").forEach(x=>x.classList.add("hidden"));$(id).classList.remove("hidden");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.tab===id));if(id==="productsTab")renderProducts()}
async function loadAll(){
 const s=session();const [pd,sd]=await Promise.all([readFile(s,"data/products.json"),readFile(s,"data/settings.json")]);
 products=pd?JSON.parse(pd.text):[];settings=sd?JSON.parse(sd.text):{siteName:"BanglaBazar",logoUrl:"",primaryColor:"#1565C0",buttonColor:"#1565C0",buttonTextColor:"#FFFFFF",backgroundColor:"#F7F8FA",cardColor:"#FFFFFF",textColor:"#17202A",mutedColor:"#667085",currency:"৳",showPrices:true};
 $("statProducts").textContent=products.length;$("statCategories").textContent=new Set(products.map(x=>x.category).filter(Boolean)).size;fillSettings()
}
function renderProducts(){
 const box=$("adminProducts");box.innerHTML=products.map(p=>`<div class="admin-product"><img src="${escapeHTML(p.images?.[0]||"")}" alt=""><div class="admin-product-info"><h3>${escapeHTML(p.name)}</h3><div>${escapeHTML(p.slug)} · ${escapeHTML(p.status||"published")}</div><div>${escapeHTML(p.category||"")} ${p.salePrice||p.price?`· ৳${Number(p.salePrice||p.price).toLocaleString("en-BD")}`:""}</div></div><div class="admin-product-actions"><button data-edit="${escapeHTML(p.slug)}">Edit</button><button data-preview="${escapeHTML(p.slug)}">Preview</button><button class="danger" data-delete="${escapeHTML(p.slug)}">Delete</button></div></div>`).join("")||"<div class='panel'>কোনো product নেই।</div>";
 box.onclick=async e=>{const edit=e.target.dataset.edit,del=e.target.dataset.delete,pre=e.target.dataset.preview;if(edit)loadEdit(edit);if(pre)window.open(`products/${encodeURIComponent(pre)}.html`,"_blank");if(del)await removeProduct(del)}
}
async function loadEdit(slug){
 const p=products.find(x=>x.slug===slug);if(!p)return;
 $("formTitle").textContent="Edit Product";$("editSha").value="";$("oldSlug").value=slug;
 ["pName","pSlug","pCategory","pBrand","pSku","pPrice","pSale","pStock","pStatus","pShort","pImages","pVideos","pTags"].forEach(id=>$(id).value="");
 $("pName").value=p.name||"";$("pSlug").value=p.slug;$("pCategory").value=p.category||"";$("pBrand").value=p.brand||"";$("pSku").value=p.sku||"";$("pPrice").value=p.price??"";$("pSale").value=p.salePrice??"";$("pStock").value=p.stock??0;$("pStatus").value=p.status||"published";$("pShort").value=p.shortDescription||"";$("pImages").value=(p.images||[]).join("\n");$("pVideos").value=(p.videos||[]).join("\n");$("pTags").value=(p.tags||[]).join(", ");
 const md=await readFile(session(),`content/${p.slug}.md`);$("pMarkdown").value=md?.text||"";openTab("addTab")
}
$("resetForm").onclick=()=>{$("productForm").reset();$("oldSlug").value="";$("formTitle").textContent="Add Product"}
$("productForm").onsubmit=async e=>{
 e.preventDefault();$("productMsg").textContent="Saving...";
 const s=session();let slug=slugify($("pSlug").value||$("pName").value);if(!slug){$("productMsg").textContent="Valid slug দিন।";return}
 const p={name:$("pName").value.trim(),slug,category:$("pCategory").value.trim(),brand:$("pBrand").value.trim(),sku:$("pSku").value.trim(),price:Number($("pPrice").value||0),salePrice:Number($("pSale").value||0)||null,stock:Number($("pStock").value||0),status:$("pStatus").value,shortDescription:$("pShort").value.trim(),images:$("pImages").value.split("\n").map(x=>x.trim()).filter(Boolean),videos:$("pVideos").value.split("\n").map(x=>x.trim()).filter(Boolean),tags:$("pTags").value.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean),updatedAt:new Date().toISOString()};
 try{
  const oldSlug=$("oldSlug").value;
  if(oldSlug&&oldSlug!==slug){
   const oldHtml=await readFile(s,`products/${oldSlug}.html`);if(oldHtml)await deleteFile(s,`products/${oldSlug}.html`,oldHtml.sha,`Rename product ${oldSlug} to ${slug}`);
   const oldMd=await readFile(s,`content/${oldSlug}.md`);if(oldMd)await deleteFile(s,`content/${oldSlug}.md`,oldMd.sha,`Rename description ${oldSlug} to ${slug}`);
  }
  const html=productHTML(p);
  const existing=await readFile(s,`products/${slug}.html`);
  const mdExisting=await readFile(s,`content/${slug}.md`);
  await writeFile(s,`products/${slug}.html`,html,`${oldSlug?"Update":"Create"} product ${slug}`,existing?.sha);
  await writeFile(s,`content/${slug}.md`,$("pMarkdown").value||`# ${p.name}\n\n${p.shortDescription||""}`,`${oldSlug?"Update":"Create"} description ${slug}`,mdExisting?.sha);
  const idx=products.findIndex(x=>x.slug===oldSlug||x.slug===slug);if(idx>=0)products[idx]=p;else products.push(p);
  const oldIdx=products.findIndex((x,i)=>x.slug===oldSlug&&i!==idx);if(oldIdx>=0)products.splice(oldIdx,1);
  const idxFile=await readFile(s,"data/products.json");await writeFile(s,"data/products.json",JSON.stringify(products,null,2),`Update products index`,idxFile?.sha);
  $("productMsg").textContent="Product successfully saved.";await loadAll();renderProducts()
 }catch(err){$("productMsg").textContent=err.message||String(err)}
}
async function removeProduct(slug){
 if(!confirm(`Delete ${slug}?`))return;const s=session();
 try{
  const h=await readFile(s,`products/${slug}.html`);if(h)await deleteFile(s,`products/${slug}.html`,h.sha,`Delete product ${slug}`);
  const m=await readFile(s,`content/${slug}.md`);if(m)await deleteFile(s,`content/${slug}.md`,m.sha,`Delete description ${slug}`);
  products=products.filter(p=>p.slug!==slug);const idx=await readFile(s,"data/products.json");await writeFile(s,"data/products.json",JSON.stringify(products,null,2),"Update products index",idx?.sha);await loadAll();renderProducts()
 }catch(e){alert(e.message)}
}
function productHTML(p){
 const title=escapeHTML(`${p.name} | ${settings.siteName||"BanglaBazar"}`);
 const desc=escapeHTML(p.shortDescription||p.name);
 return `<!doctype html>
<html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${desc}"><title>${title}</title><link rel="stylesheet" href="../css/main.css"><link rel="stylesheet" href="../css/product.css"></head>
<body><header class="topbar"><a class="back" href="../index.html">←</a><a class="brand" href="../index.html"><span id="brandLogo" class="brand-logo">B</span><span id="brandName">${escapeHTML(settings.siteName||"BanglaBazar")}</span></a></header>
<main class="page"><div id="product"><div class="empty">লোড হচ্ছে...</div></div><section class="section"><h2>আপনার আরও পছন্দ হতে পারে</h2><div id="related" class="product-grid"></div></section></main><script type="module" src="../js/product.js"></script></body></html>`;
}
function fillSettings(){
 const map={sName:settings.siteName,sLogo:settings.logoUrl,sFavicon:settings.faviconUrl,sPrimary:settings.primaryColor,sButton:settings.buttonColor,sButtonText:settings.buttonTextColor,sBg:settings.backgroundColor,sCard:settings.cardColor,sText:settings.textColor,sMuted:settings.mutedColor,sCurrency:settings.currency};
 for(const [id,v] of Object.entries(map))if($(id))$(id).value=v||"";
 $("sShowPrices").checked=settings.showPrices!==false;
}
$("settingsForm").onsubmit=async e=>{
 e.preventDefault();const s=session();const next={siteName:$("sName").value.trim()||"BanglaBazar",logoUrl:$("sLogo").value.trim(),faviconUrl:$("sFavicon").value.trim(),primaryColor:$("sPrimary").value,buttonColor:$("sButton").value,buttonTextColor:$("sButtonText").value,backgroundColor:$("sBg").value,cardColor:$("sCard").value,textColor:$("sText").value,mutedColor:$("sMuted").value,currency:$("sCurrency").value||"৳",showPrices:$("sShowPrices").checked};
 try{const old=await readFile(s,"data/settings.json");await writeFile(s,"data/settings.json",JSON.stringify(next,null,2),"Update website settings",old?.sha);settings=next;$("settingsMsg").textContent="Settings saved successfully.";fillSettings()}catch(e){$("settingsMsg").textContent=e.message}
}
if(await ensureSession())showDashboard();
