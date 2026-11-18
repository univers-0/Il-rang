const CACHE="ilrang-v2";
const STATE="ilrang-state";
const ASSETS=["./","index.html","manifest.webmanifest","icons/icon-180.png","icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==STATE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  // Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c)).catch(()=>{});return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))));
});

/* ---------- Rappels ---------- */
const ANCHOR=Date.UTC(2026,10,18);
const dayKey=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const dayIndex=d=>Math.round((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())-ANCHOR)/864e5);
const mod=(a,b)=>((a%b)+b)%b;
const isDue=(m,d)=>{const e=m.every||1;return mod(dayIndex(d),e)===mod(m.off||0,e)};

async function reminderBody(){
  try{
    const r=await (await caches.open(STATE)).match("./state.json");
    if(!r)return "Pense à valider tes missions du jour.";
    const st=await r.json(),now=new Date(),day=(st.days||{})[dayKey(now)]||{done:{}};
    const left=(st.missions||[]).filter(m=>isDue(m,now)&&!(m.id in (day.done||{})));
    if(!left.length)return null;
    return `Il te reste ${left.length} mission${left.length>1?"s":""} : ${left.map(m=>m.n).join(", ")}`;
  }catch(e){return "Pense à valider tes missions du jour."}
}
self.addEventListener("push",e=>{
  e.waitUntil(reminderBody().then(body=>
    // Le téléphone exige d'afficher quelque chose à chaque push : si tout est fait, on le dit simplement.
    self.registration.showNotification("IL Rang",{body:body||"Toutes tes missions du jour sont validées.",icon:"icons/icon-192.png",badge:"icons/icon-192.png",tag:"rappel",renotify:!!body})
  ));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(ws=>{for(const w of ws)if("focus" in w)return w.focus();return clients.openWindow("./")}));
});
