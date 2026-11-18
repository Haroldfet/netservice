/* =====================================================
   Área de EMPLEADOS (se carga después de app.js)
   ===================================================== */
const U = user();
const perfil = () => {
  try { return apiRequest("profile"); }
  catch (_) { return {nombre:U.nombre,cargo:"Técnico de campo",tel:"",email:"",zona:"",bio:"",foto:""}; }
};

/* ---------- PRIORIDAD DE CITAS ----------
   Puntaje = gravedad x 10 + días en espera. Así suben primero las más graves
   y, a igual gravedad, las que llevan más tiempo sin ser tomadas. */
const hoy = new Date();
const dias = c => Math.max(0, Math.floor((hoy - new Date((c.creada||c.fecha)+"T00:00"))/864e5));
const grav = c => c.prioridad || {Reparación:3,Diagnóstico:3,Configuración:2,Instalación:2,Revisión:1}[c.tipo] || 1;
const gravTxt = {3:["Alta","er"],2:["Media","warn"],1:["Baja","info"]};
const score = c => grav(c)*10 + dias(c);
const disponibles = () => citas.filter(c=>!c.empleado && (c.estado=="Pendiente"||c.estado=="Programada")).sort((a,b)=>score(b)-score(a));
const mias = () => citas.filter(c=>c.empleado==U.nombre);

/* ---------- MENÚ LATERAL ---------- */
function side(act){
  const p = perfil(), it = [["empleado.html","🏠","Inicio"],["emp-citas.html","📅","Citas"],["emp-perfil.html","👤","Mi perfil"]];
  $("#side").innerHTML = `<div class="brand"><div class="logo">📶</div>NetService Pro</div>`
    + it.map(i=>`<a href="${i[0]}" class="${act==i[0]?"on":""}">${i[1]} ${i[2]}</a>`).join("") + `<a href="#" id="out">🚪 Cerrar sesión</a>
    <div class="me"><div class="avatar" style="background-image:url('${p.foto}')">${p.foto?"":p.nombre[0].toUpperCase()}</div><div><b>${p.nombre}</b><br><small style="color:#94a3b8">${p.cargo}</small></div></div>`;
  $("#out").onclick = e => { e.preventDefault(); try { apiRequest("logout","POST"); } finally { sessionStorage.clear(); location="index.html"; } };
}

/* ---------- TARJETAS ---------- */
const tarjeta = c => { const g = gravTxt[grav(c)];
  return `<div class="item prio-${grav(c)}"><div class="top"><span><small>${c.id}</small> <span class="b ${g[1]}">Prioridad ${g[0]}</span> <span class="b">${c.tipo}</span><br><b>${c.equipo}</b> · <small>${c.cliente}</small><br><small>${dias(c)} días en espera · ${fmt(c.fecha,c.hora)}</small></span>
  <button class="btn sm" onclick="tomar('${c.id}')">Tomar cita</button></div></div>`; };

function tomar(id){
  try {
    apiRequest("appointment_claim", "POST", {id});
    const c = citas.find(x=>x.id==id); c.empleado = U.nombre; c.tecnico = U.nombre; c.estado = "En progreso";
    toast("Cita "+id+" asignada a ti"); window.redraw && window.redraw();
  } catch (error) { toast(error.message); }
}

/* ---------- FORMULARIO DE REPORTE ---------- */
function reporteModal(id, refresh){
  const pend = mias().filter(c=>!c.reporte);
  if(!pend.length) return toast("No tienes citas pendientes de reporte");
  openModal(`<h3>Reporte de visita</h3><small>Registra lo que usaste, gastaste y ocurrió en la visita</small>
  <form id="f"><label>Cita<select name="id">${pend.map(c=>`<option value="${c.id}" ${c.id==id?"selected":""}>${c.id} — ${c.equipo}</option>`).join("")}</select></label>
  <label>Materiales y equipos usados<textarea name="materiales" rows="2" required placeholder="Ej: 2 conectores RJ45, 15 m de cable Cat6"></textarea></label>
  <div class="two"><label>Gasto total ($)<input type="number" name="gasto" min="0" value="0"></label><label>Horas trabajadas<input type="number" name="horas" min="0" step="0.5" value="1"></label></div>
  <label>¿Qué ocurrió en la visita?<textarea name="detalle" rows="3" required placeholder="Diagnóstico, acciones realizadas, observaciones..."></textarea></label>
  <label>¿Problema resuelto?<select name="resuelto"><option>Sí</option><option>No</option></select></label>
  <div class="end"><button type="button" class="btn out" onclick="closeModal()">Cancelar</button><button class="btn">Enviar reporte</button></div></form>`);
  $("#f").onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), c = citas.find(x=>x.id==d.id);
    try {
      apiRequest("report_create", "POST", {id:d.id, materiales:d.materiales, gasto:+d.gasto,
        horas:+d.horas, detalle:d.detalle, resuelto:d.resuelto});
      c.reporte = {materiales:d.materiales, gasto:+d.gasto, horas:+d.horas, detalle:d.detalle,
        resuelto:d.resuelto, empleado:U.nombre, fecha:new Date().toISOString().slice(0,10)};
      c.estado = "Completada"; c.resuelto = d.resuelto=="Sí";
      closeModal(); toast("Reporte enviado al administrador"); refresh&&refresh();
    } catch (error) { toast(error.message); }
  };
}

/* ---------- PÁGINAS ---------- */
const emp = {
  // INICIO
  empleado(){
    side("empleado.html"); $("#hola").textContent = "Hola, "+perfil().nombre;
    const m = mias(), d = disponibles();
    stats([["Citas disponibles",d.length,"s-az"],["Mis citas activas",m.filter(activa).length,"s-wa"],["Completadas",m.filter(c=>!activa(c)).length,"s-ok"],["Reportes enviados",m.filter(c=>c.reporte).length,"s-mo"]]);
    window.redraw = emp.empleado;
    $("#top").innerHTML = d.slice(0,3).map(tarjeta).join("") || '<div class="card vacio">No hay citas disponibles por ahora</div>';
  },

  // CITAS (disponibles / mis citas / reportes)
  "emp-citas"(){
    side("emp-citas.html"); let t = "disp";
    function draw(){
      const L = $("#lista");
      if(t=="disp"){ const d = disponibles();
        L.innerHTML = '<div class="nota">Ordenadas por gravedad y por el tiempo que llevan esperando. Las primeras son las más urgentes.</div>' + (d.map(tarjeta).join("") || '<div class="vacio">No hay citas disponibles</div>'); }
      if(t=="mis"){ const m = mias();
        L.innerHTML = m.map(c=>`<div class="item"><div class="top"><span><small>${c.id}</small> <span class="b ${cls(c.estado)}">${c.estado}</span> <span class="b">${c.tipo}</span><br><b>${c.equipo}</b> · <small>${c.cliente}</small><br><small>${fmt(c.fecha,c.hora)}</small></span>
          ${c.reporte?'<span class="b ok">✔ Reporte enviado</span>':`<button class="btn sm" onclick="reporteModal('${c.id}',window.redraw)">📝 Hacer reporte</button>`}</div></div>`).join("") || '<div class="vacio">Aún no has tomado citas</div>'; }
      if(t=="rep"){ const r = mias().filter(c=>c.reporte);
        L.innerHTML = r.map(c=>`<div class="card" style="margin-bottom:10px"><b>${c.id}</b> · ${c.equipo} <small>— ${c.reporte.fecha}</small> <span class="b ${c.reporte.resuelto=="Sí"?"ok":"er"}" style="float:right">${c.reporte.resuelto=="Sí"?"Resuelto":"Sin resolver"}</span>
          <p style="margin:8px 0 0">${c.reporte.detalle}</p><div class="rep-res"><div>🧰 ${c.reporte.materiales}</div><div>💲 ${c.reporte.gasto}</div><div>⏱ ${c.reporte.horas} h</div></div></div>`).join("") || '<div class="vacio">Todavía no has enviado reportes</div>'; }
    }
    window.redraw = draw;
    document.querySelectorAll(".pest button").forEach(b=>b.onclick=()=>{ t=b.dataset.t; document.querySelectorAll(".pest button").forEach(x=>x.classList.toggle("on",x==b)); draw(); });
    $("#nuevoRep").onclick = () => reporteModal(null, ()=>{ t="rep"; document.querySelectorAll(".pest button").forEach(x=>x.classList.toggle("on",x.dataset.t=="rep")); draw(); });
    draw();
  },

  // PERFIL
  "emp-perfil"(){
    side("emp-perfil.html"); let p = perfil();
    const campos = ["nombre","cargo","tel","email","zona","bio"];
    function pinta(){ $("#av").style.backgroundImage = p.foto ? `url('${p.foto}')` : ""; $("#av").textContent = p.foto ? "" : p.nombre[0].toUpperCase(); $("#nm").textContent = p.nombre; $("#cg").textContent = p.cargo; }
    campos.forEach(k => $("#f_"+k).value = p[k]); pinta();
    $("#foto").onchange = e => { const f = e.target.files[0]; if(!f) return;
      if(f.size > 1.5e6) return toast("La imagen pesa mucho (máx. 1.5 MB)");
      const r = new FileReader(); r.onload = () => { p.foto = r.result; pinta(); toast("Foto cargada, pulsa Guardar perfil"); }; r.readAsDataURL(f); };
    $("#pf").onsubmit = e => { e.preventDefault(); campos.forEach(k => p[k] = $("#f_"+k).value);
      apiRequest("profile", "POST", p); pinta(); side("emp-perfil.html"); toast("Perfil guardado"); };
  }
};
emp[page] && emp[page]();
