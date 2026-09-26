import {auth,db,onAuthStateChanged,collection,getDocs,doc,deleteDoc,setDoc,serverTimestamp} from "./firebase.js";
import {getSettings,applySettings,money} from "./store.js";
let settings;
getSettings().then(s=>{settings=s;applySettings(s)});
onAuthStateChanged(auth,async user=>{
 const box=document.getElementById("cartList"),total=document.getElementById("cartTotal");
 if(!user){box.innerHTML=`<div class="empty">কার্ট sync করতে <a href="login.html">লগইন</a> করুন।</div>`;total.innerHTML="";return}
 const snap=await getDocs(collection(db,"users",user.uid,"cart"));let items=snap.docs.map(d=>({id:d.id,...d.data()}));
 render(items,user,total,box);
});
function render(items,user,total,box){
 if(!items.length){box.innerHTML=`<div class="empty">কার্ট খালি।</div>`;total.innerHTML="";return}
 box.innerHTML=items.map(x=>`<div class="cart-item"><img src="${esc(x.image||"")}" alt=""><div style="flex:1"><h3>${esc(x.name)}</h3><div>${money(x.price,settings)}</div><div class="qty"><button data-minus="${x.id}">−</button><b>${x.qty||1}</b><button data-plus="${x.id}">+</button><button class="ghost" data-remove="${x.id}">Remove</button></div></div></div>`).join("");
 total.innerHTML=`<strong>Total: ${money(items.reduce((a,x)=>a+Number(x.price||0)*Number(x.qty||1),0),settings)}</strong>`;
 box.onclick=async e=>{
  const id=e.target.dataset.plus||e.target.dataset.minus||e.target.dataset.remove;if(!id)return;
  const x=items.find(i=>i.id===id);if(!x)return;
  if(e.target.dataset.remove)await deleteDoc(doc(db,"users",user.uid,"cart",id));
  else {let q=Number(x.qty||1)+(e.target.dataset.plus?1:-1);if(q<=0)await deleteDoc(doc(db,"users",user.uid,"cart",id));else await setDoc(doc(db,"users",user.uid,"cart",id),{...x,qty:q,updatedAt:serverTimestamp()},{merge:true})}
  location.reload();
 };
}
function esc(v){return String(v||"").replace(/"/g,"&quot;").replace(/</g,"&lt;")}
