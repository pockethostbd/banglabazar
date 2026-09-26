import {auth,db,createUserWithEmailAndPassword,signInWithEmailAndPassword,updateProfile,doc,setDoc,serverTimestamp} from "./firebase.js";
const reg=document.getElementById("registerForm"),login=document.getElementById("loginForm"),error=document.getElementById("error");
reg?.addEventListener("submit",async e=>{
 e.preventDefault();error.textContent="";
 try{
  const name=document.getElementById("name").value.trim(),email=document.getElementById("email").value.trim(),password=document.getElementById("password").value;
  const c=await createUserWithEmailAndPassword(auth,email,password);
  await updateProfile(c.user,{displayName:name});
  await setDoc(doc(db,"users",c.user.uid),{uid:c.user.uid,name,email,createdAt:serverTimestamp()},{merge:true});
  location.href="profile.html";
 }catch(err){error.textContent=err.message}
});
login?.addEventListener("submit",async e=>{
 e.preventDefault();error.textContent="";
 try{await signInWithEmailAndPassword(auth,document.getElementById("email").value.trim(),document.getElementById("password").value);location.href="profile.html"}catch(err){error.textContent=err.message}
});
