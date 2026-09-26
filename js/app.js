import {getSettings,getProducts,applySettings,productCard} from "./store.js";
import {auth,db,onAuthStateChanged,doc,setDoc,getDoc,serverTimestamp} from "./firebase.js";

let products=[];
let settings;
const localCartKey="banglabazar_cart";

function getLocalCart(){try{return JSON.parse(localStorage.getItem(localCartKey)||"[]")}catch{return []}}
function setLocalCart(v){localStorage.setItem(localCartKey,JSON.stringify(v));updateCartCount()}
function updateCartCount(){const n=getLocalCart().reduce((a,x)=>a+(x.qty||1),0);const el=document.getElementById("cartCount");if(el)el.textContent=n}

async function addCart(slug){
  const p=products.find(x=>x.slug===slug);if(!p)return;
  const user=auth.currentUser;
  if(user){
    const ref=doc(db,"users",user.uid,"cart",slug);
    const snap=await getDoc(ref);
    const old=snap.exists()?snap.data():{qty:0};
    await setDoc(ref,{productId:slug,qty:(old.qty||0)+1,name:p.name,image:(p.images||[])[0]||"",price:p.salePrice||p.price||0,updatedAt:serverTimestamp()});
  }else{
    const c=getLocalCart();const x=c.find(i=>i.slug===slug);if(x)x.qty++;else c.push({slug,qty:1,name:p.name,image:(p.images||[])[0]||"",price:p.salePrice||p.price||0});setLocalCart(c);
  }
  alert("কার্টে যোগ হয়েছে");
}

async function wish(slug){
  const user=auth.currentUser;
  if(!user){location.href="login.html";return}
  const p=products.find(x=>x.slug===slug);if(!p)return;
  await setDoc(doc(db,"users",user.uid,"wishlist",slug),{productId:slug,name:p.name,image:(p.images||[])[0]||"",price:p.salePrice||p.price||0,createdAt:serverTimestamp()});
  alert("উইশলিস্টে যোগ হয়েছে");
}

const settingsPromise=getSettings();
Promise.all([settingsPromise,getProducts()]).then(([s,ps])=>{
  settings=s;products=ps;applySettings(s);
  const grid=document.getElementById("productGrid");
  if(grid)grid.innerHTML=ps.filter(p=>p.status==="published").map(p=>productCard(p,s)).join("")||`<div class="empty">এখনো কোনো পণ্য নেই।</div>`;
  const count=document.getElementById("productCount");if(count)count.textContent=`${ps.length}টি পণ্য`;
  const cats=[...new Set(ps.map(p=>p.category).filter(Boolean))];
  const c=document.getElementById("categories");
  if(c)c.innerHTML=cats.map(x=>`<button class="category-chip" data-cat="${x.replace(/"/g,"&quot;")}">${x}</button>`).join("")||`<span class="muted">ক্যাটাগরি পরে যোগ করা যাবে</span>`;
  document.addEventListener("click",e=>{
    const a=e.target.closest("[data-add-cart]");if(a)addCart(a.dataset.addCart);
    const w=e.target.closest("[data-wish]");if(w)wish(w.dataset.wish);
    const cat=e.target.closest("[data-cat]");if(cat){
      const list=products.filter(p=>p.category===cat.dataset.cat&&p.status==="published");
      grid.innerHTML=list.map(p=>productCard(p,s)).join("")||`<div class="empty">এই ক্যাটাগরিতে পণ্য নেই।</div>`;
    }
  });
  updateCartCount();
});
document.getElementById("searchBtn")?.addEventListener("click",()=>document.getElementById("searchPanel")?.classList.toggle("hidden"));
document.getElementById("searchInput")?.addEventListener("input",e=>{
  const q=e.target.value.toLowerCase().trim(),grid=document.getElementById("productGrid");
  if(!grid||!settings)return;
  grid.innerHTML=products.filter(p=>JSON.stringify(p).toLowerCase().includes(q)&&p.status==="published").map(p=>productCard(p,settings)).join("")||`<div class="empty">কোনো পণ্য পাওয়া যায়নি।</div>`;
});
