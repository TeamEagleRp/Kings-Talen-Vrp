document.addEventListener("DOMContentLoaded", async ()=>{
  const user=await renderUser();
  const form=document.querySelector("#achievementForm");
  const list=document.querySelector("#achievements");
  const empty=document.querySelector("#empty");
  async function load(){
    const items=await api("/api/achievements");
    list.innerHTML="";
    empty.hidden=items.length>0;
    items.forEach(item=>{
      const card=document.createElement("article");
      card.className="card achievement";
      card.innerHTML=`
        ${item.image?`<img src="${item.image}" alt="">`:""}
        <div class="achievement-body">
          <div class="date">${item.date||"التاريخ غير محدد"}</div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.description)}</p>
          ${user.isAdmin?`<button class="btn delete" data-id="${item.id}">حذف الإنجاز</button>`:""}
        </div>`;
      list.appendChild(card);
    });
    list.querySelectorAll("[data-id]").forEach(b=>b.onclick=async()=>{
      if(!confirm("هل تريد حذف هذا الإنجاز؟")) return;
      await api("/api/achievements/"+b.dataset.id,{method:"DELETE"});
      await load();
    });
  }
  if(form){
    form.addEventListener("submit",async e=>{
      e.preventDefault();
      const fd=new FormData(form);
      try{await api("/api/achievements",{method:"POST",body:fd});form.reset();await load();alert("تمت إضافة الإنجاز.");}
      catch(err){alert(err.message);}
    });
  }
  await load();
});
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
