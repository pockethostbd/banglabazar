import {auth,db,onAuthStateChanged,collection,getDocs,deleteDoc,doc} from "./firebase.js";
import {getSettings,applySettings,escapeHTML,money} from "./store.js";
let settings;getSettings().then(s=>{settings=s;applySettings(s)});
onAuthStateChanged(auth,async user=>{
 const grid=document.getElementById("wishlistGrid");
 if(!user){grid.innerHTML=`<div class="empty">উইশলিস্ট দেখতে <a href="login.html">লগইন</a> করুন।</div>`;return}
 const snap=await getDocs(collection(db,"users",user.uid,"wishlist"));const items=snap.docs.map(d=>({id:d.id,...d.data()}));
 grid.innerHTML=items.map(x=>`<article class="product-card"><a class="product-image" href="products/${encodeURIComponent(x.id)}.html"><img src="${escapeHTML(x.image||"")}" alt=""></a><div class="product-body"><a class="product-name" href="products/${encodeURIComponent(x.id)}.html">${escapeHTML(x.name)}</a><div class="price-row"><span class="price">${money(x.price,settings)}</span></div><button class="small-btn" data-remove="${escapeHTML(x.id)}">Remove</button></div></article>`).join("")||`<div class="empty">উইশলিস্ট খালি।</div>`;
 grid.onclick=async e=>{const id=e.target.dataset.remove;if(id){await deleteDoc(doc(db,"users",user.uid,"wishlist",id));location.reload()}};
});
