import {getSettings,getProducts,applySettings,productCard} from "./store.js";
let products=[],settings;
Promise.all([getSettings(),getProducts()]).then(([s,p])=>{
 settings=s;products=p;applySettings(s);render("");
 const input=document.getElementById("searchInput");input?.focus();
 input?.addEventListener("input",()=>render(input.value));
});
function render(q){const grid=document.getElementById("productGrid");const x=q.toLowerCase().trim();const list=products.filter(p=>p.status==="published"&&(!x||JSON.stringify(p).toLowerCase().includes(x)));grid.innerHTML=list.map(p=>productCard(p,settings)).join("")||`<div class="empty">কোনো পণ্য পাওয়া যায়নি।</div>`}
