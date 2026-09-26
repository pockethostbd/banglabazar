(function(){
'use strict';

const CFG=window.BB_FIREBASE_CONFIG||{};
const WHATSAPP_NUMBER='8801949737370';
const LS={cart:'bb_cart_v3',wish:'bb_wish_v3',site:'bb_site_v3'};
let db=null,auth=null,productsCache=null,authReady=null;

try{
  if(window.firebase){
    if(!firebase.apps.length) firebase.initializeApp(CFG);
    auth=firebase.auth();
    db=firebase.firestore();
    authReady=new Promise(resolve=>auth.onAuthStateChanged(resolve));
  }
}catch(e){console.warn('Firebase initialization failed:',e)}

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const safeUrl=s=>String(s||'').replace(/javascript:/gi,'');

function isProductPage(){return /\/products\/[^/]+\.html$/i.test(location.pathname)}
function rootPrefix(){return isProductPage()?'../':''}
function productHref(p){return rootPrefix()+'products/'+encodeURIComponent(String(p.slug||p.id))+'.html'}
function siteUrl(path){return new URL(rootPrefix()+path,location.href).href}

function getSite(){try{return JSON.parse(localStorage.getItem(LS.site)||'{}')}catch{return {}}}
function applySite(){
  const s=getSite();
  if(s.name) $$('#brandName').forEach(e=>e.textContent=s.name);
  if(s.logo) $$('.brand-logo').forEach(e=>{e.innerHTML='<img src="'+esc(s.logo)+'" alt="Logo">'});
  if(s.theme) document.documentElement.style.setProperty('--primary',s.theme);
  if(s.button) document.documentElement.style.setProperty('--button',s.button);
  if($('#heroTitle')&&s.heroTitle) $('#heroTitle').textContent=s.heroTitle;
  if($('#heroText')&&s.heroText) $('#heroText').textContent=s.heroText;
}

function showLoader(v){const e=$('#app-loader');if(e)e.classList.toggle('hidden',!v)}
function fmt(n){return '৳'+Number(n||0).toLocaleString('bn-BD')}

async function loadProducts(force=false){
  if(productsCache&&!force)return productsCache;
  const url=new URL(rootPrefix()+'data/products.json',location.href).href+'?v='+Date.now();
  try{
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok) throw Error('products '+r.status);
    const j=await r.json();
    productsCache=Array.isArray(j)?j:(j.products||[]);
    return productsCache;
  }catch(e){
    console.error('Product catalog load failed:',e);
    productsCache=[];
    return [];
  }
}

function card(p,compact=false){
  const img=p.image||((p.images||[])[0]||'');
  return `<article class="product-card ${compact?'compact':''}">
    <a href="${productHref(p)}" class="product-image">${img?`<img loading="lazy" src="${esc(safeUrl(img))}" alt="${esc(p.title)}" onerror="this.parentElement.classList.add('broken');this.remove()">`:'<span>ছবি নেই</span>'}</a>
    <div class="product-body">
      <a class="product-title" href="${productHref(p)}">${esc(p.title)}</a>
      <div class="price">${fmt(p.price)} ${p.oldPrice?`<del>${fmt(p.oldPrice)}</del>`:''}</div>
      <div class="card-actions"><button class="mini-cart" data-add="${esc(p.id)}">কার্টে যোগ</button><button class="mini-wish" data-wish="${esc(p.id)}" aria-label="Wishlist">♡</button></div>
    </div>
  </article>`;
}

function localCart(){try{return JSON.parse(localStorage.getItem(LS.cart)||'{}')}catch{return {}}}
function saveLocalCart(c){localStorage.setItem(LS.cart,JSON.stringify(c));updateCartCount()}
function localWish(){try{return JSON.parse(localStorage.getItem(LS.wish)||'[]')}catch{return []}}

async function waitAuth(){if(!auth)return null;if(authReady)return await authReady;return auth.currentUser}
async function getUserDoc(uid){if(!db||!uid)return null;try{const s=await db.collection('users').doc(uid).get();return s.exists?s.data():null}catch(e){console.warn(e);return null}}
async function getUserItems(type){
  const u=await waitAuth();
  if(!u||!db)return null;
  try{const snap=await db.collection('users').doc(u.uid).collection(type).get();const out={};snap.forEach(d=>out[d.id]=d.data());return out}catch(e){console.warn(e);return null}
}
async function setUserItem(type,id,data){const u=await waitAuth();if(!u||!db)return false;try{await db.collection('users').doc(u.uid).collection(type).doc(id).set(data,{merge:true});return true}catch(e){console.warn(e);return false}}
async function removeUserItem(type,id){const u=await waitAuth();if(!u||!db)return false;try{await db.collection('users').doc(u.uid).collection(type).doc(id).delete();return true}catch(e){console.warn(e);return false}}

async function getCart(){const remote=await getUserItems('cart');return remote??localCart()}
async function getWish(){const remote=await getUserItems('wishlist');if(remote)return Object.keys(remote);return localWish()}

async function migrateLocalDataToFirebase(u){
  if(!u||!db)return;
  const c=localCart();
  const w=localWish();
  try{
    const batch=db.batch();
    Object.entries(c).forEach(([id,v])=>batch.set(db.collection('users').doc(u.uid).collection('cart').doc(id),{productId:id,quantity:Number(v?.quantity||v||1),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}));
    w.forEach(id=>batch.set(db.collection('users').doc(u.uid).collection('wishlist').doc(id),{productId:id,createdAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}));
    if(Object.keys(c).length||w.length) await batch.commit();
    localStorage.removeItem(LS.cart);localStorage.removeItem(LS.wish);
  }catch(e){console.warn('Local data migration:',e)}
}

async function addCart(id,qty=1){
  const u=await waitAuth();
  if(u&&db){const ref=db.collection('users').doc(u.uid).collection('cart').doc(id);const old=await ref.get();await ref.set({productId:id,quantity:(old.exists?Number(old.data().quantity||0):0)+qty,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})}
  else{const c=localCart();c[id]=Number(c[id]||0)+qty;saveLocalCart(c)}
  updateCartCount();toast('কার্টে যোগ হয়েছে');
}
async function removeCart(id){const u=await waitAuth();if(u&&db)await removeUserItem('cart',id);else{const c=localCart();delete c[id];saveLocalCart(c)}updateCartCount()}
async function changeCart(id,q){q=Math.max(1,Number(q));const u=await waitAuth();if(u&&db)await setUserItem('cart',id,{productId:id,quantity:q,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});else{const c=localCart();c[id]=q;saveLocalCart(c)}updateCartCount()}
async function toggleWish(id){
  const u=await waitAuth(),ids=await getWish(),has=ids.includes(id);
  if(has){if(u&&db)await removeUserItem('wishlist',id);else localStorage.setItem(LS.wish,JSON.stringify(ids.filter(x=>x!==id)));toast('উইশলিস্ট থেকে সরানো হয়েছে')}
  else{if(u&&db)await setUserItem('wishlist',id,{productId:id,createdAt:firebase.firestore.FieldValue.serverTimestamp()});else localStorage.setItem(LS.wish,JSON.stringify([...ids,id]));toast('উইশলিস্টে যোগ হয়েছে')}
  return !has;
}
async function updateCartCount(){const c=await getCart();let n=0;if(c)Object.values(c).forEach(v=>n+=typeof v==='number'?v:Number(v?.quantity||0));$$('#cartCount,#bottomCartCount').forEach(e=>e.textContent=n>99?'99+':n)}
function toast(t){let e=$('#bbToast');if(!e){e=document.createElement('div');e.id='bbToast';e.className='toast';document.body.appendChild(e)}e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2400)}

function bindCards(){
  if(document.body.dataset.cardsBound)return;document.body.dataset.cardsBound='1';
  document.addEventListener('click',async e=>{
    const b=e.target.closest('[data-add]');if(b){e.preventDefault();await addCart(b.dataset.add);return}
    const w=e.target.closest('[data-wish]');if(w){e.preventDefault();const added=await toggleWish(w.dataset.wish);w.textContent=added?'♥':'♡';return}
  });
}

async function initHome(){
  applySite();bindCards();showLoader(true);const ps=await loadProducts();
  const cats=[...new Set(ps.map(p=>p.category).filter(Boolean))];
  if($('#categories')) $('#categories').innerHTML=cats.map(c=>`<button class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')||'<span class="muted">ক্যাটাগরি নেই</span>';
  renderGrid(ps);
  if($('#categories')) $('#categories').onclick=e=>{const b=e.target.closest('[data-cat]');if(b)renderGrid(ps.filter(p=>p.category===b.dataset.cat))};
  await updateCartCount();showLoader(false);
}
function renderGrid(ps){if($('#productCount'))$('#productCount').textContent=`${ps.length.toLocaleString('bn-BD')}টি পণ্য`;if($('#productGrid'))$('#productGrid').innerHTML=ps.map(p=>card(p)).join('');if($('#emptyProducts'))$('#emptyProducts').classList.toggle('hidden',ps.length>0)}

async function initSearch(){applySite();bindCards();const ps=await loadProducts(),input=$('#searchInput');const render=()=>{const q=input.value.trim().toLowerCase();const out=ps.filter(p=>[p.title,p.category,p.id,p.slug].join(' ').toLowerCase().includes(q));$('#searchMeta').textContent=`${out.length.toLocaleString('bn-BD')}টি ফলাফল`;$(`#searchGrid`).innerHTML=out.map(p=>card(p)).join('');$('#searchEmpty').classList.toggle('hidden',out.length>0)};input.addEventListener('input',render);$('#clearSearch').onclick=()=>{input.value='';render();input.focus()};render();await updateCartCount()}

async function initWishlist(){applySite();bindCards();const ps=await loadProducts(),ids=await getWish();const out=ids.map(id=>ps.find(p=>String(p.id)===String(id))).filter(Boolean);$('#wishlistGrid').innerHTML=out.map(p=>card(p)).join('');$('#wishlistEmpty').classList.toggle('hidden',out.length>0);await updateCartCount()}

async function initCart(){
  applySite();bindCards();const ps=await loadProducts(),c=await getCart();
  const entries=Object.entries(c||{}).map(([id,v])=>({p:ps.find(x=>String(x.id)===String(id)),q:typeof v==='number'?v:Number(v?.quantity||1)})).filter(x=>x.p);
  if(!entries.length){$('#cartEmpty').classList.remove('hidden');$('#cartSummary').classList.add('hidden');await updateCartCount();return}
  $('#cartEmpty').classList.add('hidden');$('#cartSummary').classList.remove('hidden');
  $('#cartItems').innerHTML=entries.map(({p,q})=>`<div class="cart-item"><div class="cart-img">${p.image?`<img src="${esc(safeUrl(p.image))}" alt="">`:''}</div><div class="cart-info"><a href="${productHref(p)}">${esc(p.title)}</a><b>${fmt(p.price)}</b><div class="qty"><button data-q="-" data-id="${esc(p.id)}">−</button><span>${q}</span><button data-q="+" data-id="${esc(p.id)}">+</button><button class="remove" data-remove="${esc(p.id)}">সরান</button></div></div></div>`).join('');
  const total=entries.reduce((s,x)=>s+Number(x.p.price||0)*x.q,0),delivery=total?60:0;
  $('#subtotal').textContent=fmt(total);$('#delivery').textContent=fmt(delivery);$('#total').textContent=fmt(total+delivery);
  $('#cartItems').onclick=async e=>{const q=e.target.closest('[data-q]');if(q){const cur=entries.find(x=>x.p.id===q.dataset.id)?.q||1;await changeCart(q.dataset.id,cur+(q.dataset.q==='+'?1:-1));initCart();return}const r=e.target.closest('[data-remove]');if(r){await removeCart(r.dataset.remove);initCart()}};
  $('#checkoutBtn').onclick=async()=>buyCart(entries,total,delivery);
  await updateCartCount();
}

function normalizePhone(p){let x=String(p||'').replace(/[^0-9+]/g,'');if(x.startsWith('+'))x=x.slice(1);if(x.startsWith('0'))x='880'+x.slice(1);if(x.startsWith('88')&&!x.startsWith('880'))x='880'+x.slice(2);return x}
function requireProfile(d){return d&&String(d.name||'').trim()&&String(d.phone||'').trim()&&String(d.address||'').trim()&&String(d.city||'').trim()&&String(d.district||'').trim()}
function whatsappUrl(message){return 'https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent(message)}
async function getCustomer(){
  const u=await waitAuth();
  if(!u){toast('Buy Now করতে আগে লগইন করুন');location.href=rootPrefix()+'profile.html?next='+encodeURIComponent(location.href);return null}
  const d=await getUserDoc(u.uid)||{};const data={...d,email:d.email||u.email||'',uid:u.uid};
  if(!requireProfile(data)){toast('আগে প্রোফাইলে নাম, ফোন ও ঠিকানা পূরণ করুন');location.href=rootPrefix()+'profile.html?next='+encodeURIComponent(location.href);return null}
  return data;
}
function productMessage(p,user,qty=1){
  const link=siteUrl('products/'+encodeURIComponent(String(p.slug||p.id))+'.html');
  const subtotal=Number(p.price||0)*qty;
  return `আসসালামু আলাইকুম। আমি BanglaBazar থেকে এই পণ্যটি কিনতে চাই।\n\n📦 পণ্যের তথ্য\nপণ্য: ${p.title}\nProduct ID: ${p.id}\nপরিমাণ: ${qty}\nমূল্য: ${fmt(p.price)}\nমোট: ${fmt(subtotal)}\n\n🔗 পণ্যের লিংক:\n${link}\n\n👤 ক্রেতার তথ্য\nনাম: ${user.name}\nফোন: ${user.phone}\nইমেইল: ${user.email||'N/A'}\nঠিকানা: ${user.address}\nশহর: ${user.city}\nজেলা: ${user.district}\nCustomer ID: ${user.uid}\n\nআমি অর্ডারটি নিশ্চিত করতে চাই।`;
}
async function saveOrder(user,items,total,delivery,type){
  if(!db||!user?.uid)return null;
  const ref=db.collection('users').doc(user.uid).collection('orders').doc();
  const payload={orderId:ref.id,customerId:user.uid,customerName:user.name,phone:user.phone,email:user.email||'',address:user.address,city:user.city,district:user.district,items:items.map(x=>({productId:x.p.id,title:x.p.title,quantity:x.q,price:Number(x.p.price||0),url:siteUrl('products/'+encodeURIComponent(String(x.p.slug||x.p.id))+'.html')})),subtotal:Number(total||0),delivery:Number(delivery||0),grandTotal:Number(total||0)+Number(delivery||0),channel:'WhatsApp',type:type||'product',status:'whatsapp_opened',createdAt:firebase.firestore.FieldValue.serverTimestamp()};
  try{await ref.set(payload);return ref.id}catch(e){console.warn('Order save failed:',e);return null}
}
async function buyNow(p,qty=1){
  const user=await getCustomer();if(!user)return;
  const total=Number(p.price||0)*qty,delivery=60;await saveOrder(user,[{p,q:qty}],total,delivery,'buy_now');
  location.href=whatsappUrl(productMessage(p,user,qty));
}
async function buyCart(entries,total,delivery){
  const user=await getCustomer();if(!user)return;
  const lines=entries.map((x,i)=>`${i+1}. ${x.p.title}\nProduct ID: ${x.p.id}\nপরিমাণ: ${x.q}\nমূল্য: ${fmt(x.p.price)} × ${x.q} = ${fmt(Number(x.p.price||0)*x.q)}\nলিংক: ${siteUrl('products/'+encodeURIComponent(String(x.p.slug||x.p.id))+'.html')}`).join('\n\n');
  const message=`আসসালামু আলাইকুম। আমি BanglaBazar-এর কার্টের পণ্যগুলো কিনতে চাই।\n\n🛒 অর্ডারের পণ্য\n${lines}\n\n💰 সাবটোটাল: ${fmt(total)}\n🚚 ডেলিভারি: ${fmt(delivery)}\n💵 সর্বমোট: ${fmt(Number(total)+Number(delivery))}\n\n👤 ক্রেতার তথ্য\nনাম: ${user.name}\nফোন: ${user.phone}\nইমেইল: ${user.email||'N/A'}\nঠিকানা: ${user.address}\nশহর: ${user.city}\nজেলা: ${user.district}\nCustomer ID: ${user.uid}\n\nআমি অর্ডারটি নিশ্চিত করতে চাই।`;
  await saveOrder(user,entries,total,delivery,'cart_checkout');location.href=whatsappUrl(message);
}

async function initProfile(){
  applySite();
  const next=new URLSearchParams(location.search).get('next');
  if(!auth){$('#profileLoading').classList.add('hidden');$('#authBox').classList.remove('hidden');return}
  auth.onAuthStateChanged(async u=>{
    $('#profileLoading').classList.add('hidden');
    if(!u){$('#authBox').classList.remove('hidden');$('#profileForm').classList.add('hidden');return}
    $('#authBox').classList.add('hidden');$('#profileForm').classList.remove('hidden');$('#profileEmail').value=u.email||'';
    const d=await getUserDoc(u.uid)||{};
    $('#name').value=d.name||u.displayName||'';$('#phone').value=d.phone||'';$('#address').value=d.address||'';$('#city').value=d.city||'';$('#district').value=d.district||'';
    await migrateLocalDataToFirebase(u);updateCartCount();
  });
  $('#loginBtn').onclick=async()=>{try{await auth.signInWithEmailAndPassword($('#email').value.trim(),$('#password').value);$('#authMsg').className='form-msg ok';$('#authMsg').textContent='লগইন সফল হয়েছে।';if(next)setTimeout(()=>location.href=next,300)}catch(e){$('#authMsg').className='form-msg';$('#authMsg').textContent=friendlyAuthError(e)}};
  $('#signupBtn').onclick=async()=>{try{const em=$('#email').value.trim(),pw=$('#password').value;if(pw.length<6)throw Error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');const c=await auth.createUserWithEmailAndPassword(em,pw);await db.collection('users').doc(c.user.uid).set({email:em,name:'',phone:'',address:'',city:'',district:'',createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});$('#authMsg').className='form-msg ok';$('#authMsg').textContent='অ্যাকাউন্ট তৈরি হয়েছে। এখন প্রোফাইল তথ্য পূরণ করুন।'}catch(e){$('#authMsg').className='form-msg';$('#authMsg').textContent=friendlyAuthError(e)}};
  $('#profileForm').onsubmit=async e=>{e.preventDefault();const u=auth.currentUser;if(!u)return;try{await db.collection('users').doc(u.uid).set({name:$('#name').value.trim(),phone:$('#phone').value.trim(),email:u.email||'',address:$('#address').value.trim(),city:$('#city').value.trim(),district:$('#district').value.trim(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});$('#profileMsg').className='form-msg ok';$('#profileMsg').textContent='প্রোফাইল সফলভাবে সেভ হয়েছে।';if(next)setTimeout(()=>location.href=next,450)}catch(err){$('#profileMsg').className='form-msg';$('#profileMsg').textContent=err.message}}
  $('#logoutBtn').onclick=()=>auth.signOut();
}
function friendlyAuthError(e){const c=e?.code||'';if(c.includes('invalid-credential')||c.includes('wrong-password'))return'ইমেইল বা পাসওয়ার্ড সঠিক নয়।';if(c.includes('email-already-in-use'))return'এই ইমেইল দিয়ে আগে থেকেই অ্যাকাউন্ট আছে।';if(c.includes('invalid-email'))return'সঠিক ইমেইল দিন।';return e?.message||'একটি সমস্যা হয়েছে।'}

function slugFromPath(){const m=location.pathname.match(/\/products\/([^/]+)\.html$/i);return m?decodeURIComponent(m[1]):null}
async function initProductPage(){
  applySite();bindCards();showLoader(false);
  const slug=slugFromPath();const ps=await loadProducts(true);const p=ps.find(x=>String(x.slug||x.id)===String(slug)||String(x.id)===String(slug));
  $('#productLoading').classList.add('hidden');
  if(!p){$('#productError').classList.remove('hidden');$('#productErrorText').textContent=ps.length?'এই ID-এর কোনো পণ্য পাওয়া যায়নি।':'পণ্যের তালিকা লোড করা যায়নি।';await updateCartCount();return}
  document.title=p.title+' — BanglaBazar';$('#productView').classList.remove('hidden');$('#productTitle').textContent=p.title;$('#productPrice').textContent=fmt(p.price);$('#productOldPrice').textContent=p.oldPrice?fmt(p.oldPrice):'';$('#productMeta').innerHTML=`<span class="chip">${esc(p.category||'পণ্য')}</span>`;
  const imgs=[p.image,...(p.images||[])].filter(Boolean);$('#productGallery').innerHTML=imgs.length?`<div class="gallery">${imgs.map(x=>`<img src="${esc(safeUrl(x))}" alt="${esc(p.title)}" loading="lazy">`).join('')}</div>`:'<div class="gallery no-image">ছবি নেই</div>';
  $('#addCart').onclick=()=>addCart(p.id);$('#buyNow').onclick=()=>buyNow(p,1);
  $('#addWishlist').onclick=async()=>{const added=await toggleWish(p.id);$('#addWishlist').textContent=added?'♥':'♡'};
  const vids=(p.youtube||[]).filter(Boolean);$('#youtubeBox').innerHTML=vids.length?`<h2>ভিডিও</h2>${vids.map(v=>{const id=(String(v).match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/)||[])[1];return id?`<div class="video"><iframe src="https://www.youtube.com/embed/${esc(id)}" title="YouTube video" loading="lazy" allowfullscreen></iframe></div>`:`<a href="${esc(safeUrl(v))}" target="_blank" rel="noopener">YouTube ভিডিও দেখুন</a>`}).join('')}`:'';
  let md='';try{const r=await fetch(new URL(rootPrefix()+(p.description||''),location.href).href+'?v='+Date.now(),{cache:'no-store'});if(r.ok)md=await r.text()}catch(e){console.warn('Description load:',e)}$('#descriptionContent').innerHTML=markdown(md||p.description||'');
  const related=ps.filter(x=>String(x.id)!==String(p.id)&&x.category===p.category).slice(0,6);$('#relatedGrid').innerHTML=related.map(x=>card(x,true)).join('');$('#relatedSection').classList.toggle('hidden',!related.length);await updateCartCount();
}
function markdown(s){let x=esc(s).replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/^> (.*)$/gm,'<blockquote>$1</blockquote>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/`(.*?)`/g,'<code>$1</code>').replace(/!\[(.*?)\]\((.*?)\)/g,'<img src="$2" alt="$1" loading="lazy">').replace(/\[(.*?)\]\((.*?)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');x=x.replace(/(^|\n)- (.*)/g,'$1<li>$2</li>');x=x.replace(/(<li>.*<\/li>)(?:\n|$)/g,'<ul>$1</ul>');return x.split(/\n\s*\n/).map(b=>/^<(h1|h2|h3|ul|blockquote)/.test(b.trim())?b:`<p>${b.replace(/\n/g,'<br>')}</p>`).join('')}

window.BB={initHome,initSearch,initWishlist,initCart,initProfile,initProductPage,loadProducts,addCart,applySite,fmt,buyNow,toggleWish,updateCartCount};
})();
