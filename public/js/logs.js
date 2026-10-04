document.addEventListener("DOMContentLoaded",async()=>{
  try{
    await renderUser();
    const logs=await api("/api/logs");
    const body=document.querySelector("#logsBody");
    logs.forEach(l=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${new Date(l.created_at+"Z").toLocaleString("ar")}</td><td>${escapeHtml(l.username)}</td><td>${escapeHtml(l.action)}</td><td>${escapeHtml(l.details||"-")}</td>`;
      body.appendChild(tr);
    });
  }catch(e){location.href="/home.html";}
});
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
