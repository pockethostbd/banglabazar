import {auth,db,onAuthStateChanged,signOut,doc,getDoc} from "./firebase.js";
import {getSettings,applySettings} from "./store.js";
getSettings().then(applySettings);
onAuthStateChanged(auth,async user=>{
 const box=document.getElementById("profileBox");
 if(!user){box.innerHTML=`<h2>আপনি লগইন করেননি</h2><p class="muted">কার্ট/উইশলিস্ট sync করতে লগইন করুন।</p><a class="btn" href="login.html">লগইন</a>`;return}
 const snap=await getDoc(doc(db,"users",user.uid));const d=snap.exists()?snap.data():{};
 box.innerHTML=`<h2>প্রোফাইল</h2><div class="profile-line"><b>নাম</b><br>${escapeHtml(d.name||user.displayName||"")}</div><div class="profile-line"><b>Email</b><br>${escapeHtml(user.email||"")}</div><div class="profile-actions"><button class="btn" id="logout">Logout</button></div>`;
 document.getElementById("logout").onclick=async()=>{await signOut(auth);location.reload()};
});
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
