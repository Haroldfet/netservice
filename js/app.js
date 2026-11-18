/* =====================================================
   NetService Pro - Lógica del sistema
   1) DATOS  2) FUNCIONES COMUNES  3) PÁGINAS
   ===================================================== */

const API_URL = "http://localhost:8000/api.php";
function apiRequest(action, method = "GET", data = null) {
  const xhr = new XMLHttpRequest();
  xhr.open(method, `${API_URL}?action=${action}`, false);
  xhr.withCredentials = true;
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(data === null ? null : JSON.stringify(data));
  let response = {};
  try { response = JSON.parse(xhr.responseText || "{}"); } catch { response = {}; }
  if (xhr.status < 200 || xhr.status >= 300) throw new Error(response.error || "No se pudo conectar con el servidor");
  return response;
}
window.netApiRequest = apiRequest;

/* ---------- 1) CATÁLOGOS ---------- */
const tiposEquipo = ["Router","Modem","Switch","Access Point","UPS","Cable de Red"];
const estadosEquipo = ["Operativo","En mantenimiento","Disponible","Dañado"];
const tiposVisita = ["Revisión","Reparación","Diagnóstico","Configuración","Instalación"];
const estadosCita = ["Pendiente","Programada","En progreso","Completada"];

/* ---------- 2) FUNCIONES COMUNES ---------- */
const $ = s => document.querySelector(s);
const page = document.body.dataset.page, rolPag = document.body.dataset.rol;
const initialData = page === "login" ? {tecnicos:[], equipos:[], citas:[]} : apiRequest("bootstrap");
let equipos = initialData.equipos || [];
let citas = initialData.citas || [];
const tecnicos = initialData.tecnicos || [];
const user = () => JSON.parse(sessionStorage.getItem("user")||"null");
const opts = (a,sel) => a.map(x => `<option ${x==sel?"selected":""}>${x}</option>`).join("");
const fmt = (f,h) => { const d = new Date(f+"T00:00"); return d.getDate()+" de "+d.toLocaleString("es",{month:"short"}).replace(".","")+" de "+d.getFullYear()+" · "+h; };
const cls = e => ({"En progreso":"warn","Completada":"ok","Programada":"info","Operativo":"info","En mantenimiento":"warn","Dañado":"er"}[e]||"");
const res = r => r===true ? '<span class="b ok">✔ Resuelto</span>' : r===false ? '<span class="b er">⚠ Sin resolver</span>' : '<small>◔ En evaluación</small>';
const activa = c => c.estado !== "Completada";

function toast(t){ const e=$("#toast"); e.textContent=t; e.classList.add("show"); setTimeout(()=>e.classList.remove("show"),2200); }
function openModal(h){ const m=$("#modal"); m.innerHTML=`<div class="box">${h}</div>`; m.classList.add("show"); m.onclick=e=>{ if(e.target===m) closeModal(); }; }
function closeModal(){ $("#modal").classList.remove("show"); }

// Tarjetas de estadísticas: [[etiqueta, valor, clase], ...]
function stats(arr){ $("#stats").innerHTML = arr.map(a=>`<div class="stat ${a[2]||""}"><small>${a[0]}</small><b>${a[1]}</b></div>`).join(""); }

// Gráfica de dona con conic-gradient: [{l,v,c}]
function donut(data){
  const t = data.reduce((s,d)=>s+d.v,0)||1; let a=0;
  $("#donut").style.background = "conic-gradient(" + data.map(d=>{ const s=a; a+=d.v/t*100; return `${d.c} ${s}% ${a}%`; }).join(",") + ")";
  $("#leg").innerHTML = data.map(d=>`<div class="leg"><span><i class="dot" style="background:${d.c}"></i>${d.l}</span><b>${d.v}</b></div>`).join("");
}

// Barra superior (inicio: logo y usuario / interna: botón volver)
function topbar(o={}){
  const u = user();
  $("#topbar").innerHTML = o.back
    ? `<div class="bar"><div class="row"><a class="btn out" href="${o.back}">← Volver</a><div><h1>${o.title}</h1><small>${o.sub}</small></div></div>${o.btn?`<button class="btn" id="topBtn">${o.btn[0]}</button>`:""}</div>`
    : `<div class="bar"><div class="row"><div class="logo">📶</div><div><b>NetService Pro</b><br><small>Sistema de Gestión de Servicio de Internet</small></div></div><div class="row"><div class="chip"><b>${u.nombre}</b><br><small>${u.rol=="admin"?"Administrador":"Cliente"}</small></div><button class="btn out" id="logout">Cerrar Sesión</button></div></div>`;
  if(o.btn) $("#topBtn").onclick = o.btn[1];
  if($("#logout")) $("#logout").onclick = () => {
    try { apiRequest("logout", "POST"); } finally { sessionStorage.clear(); location = "index.html"; }
  };
}

// Formulario: agendar cita (cliente y admin)
function citaModal(refresh){
  const u = user();
  openModal(`<h3>Agendar Cita de Mantenimiento</h3><small>Complete los datos para programar la visita técnica</small>
  <form id="f"><label>Cliente<input name="cliente" required placeholder="Nombre del cliente" value="${u.rol=="cliente"?u.nombre:""}"></label>
  <div class="two"><label>Equipo Afectado<select name="equipo">${opts(equipos.map(e=>e.nombre))}</select></label><label>Tipo de Visita<select name="tipo">${opts(tiposVisita)}</select></label></div>
  <label>Descripción del Problema<textarea name="desc" rows="3" placeholder="Describe el problema o requerimiento..."></textarea></label>
  <div class="two"><label>Fecha<input type="date" name="fecha" required></label><label>Hora<input type="time" name="hora" required></label></div>
  <label>Técnico Asignado<select name="tecnico">${tecnicos.map(t=>`<option>${t.n}</option>`).join("")}</select></label>
  <div class="end"><button type="button" class="btn out" onclick="closeModal()">Cancelar</button><button class="btn">Agendar Cita</button></div></form>`);
  $("#f").onsubmit = e => { e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    try {
      apiRequest("appointment_create", "POST", d);
      const data = apiRequest("bootstrap");
      citas = data.citas;
      closeModal(); toast("Cita agendada"); refresh&&refresh();
    } catch (error) { toast(error.message); }
  };
}

// Formulario: agregar / editar equipo
function equipoModal(id, refresh){
  const e = equipos.find(x=>x.id==id) || {nombre:"",tipo:"Router",estado:"Operativo",marca:"",modelo:"",ubicacion:"",serie:""};
  openModal(`<h3>${id?"Editar":"Registrar Nuevo"} Equipo</h3><small>Completa la información del equipo de red</small>
  <form id="f"><label>Nombre del Equipo<input name="nombre" required value="${e.nombre}"></label>
  <div class="two"><label>Tipo<select name="tipo">${opts(tiposEquipo,e.tipo)}</select></label><label>Estado<select name="estado">${opts(estadosEquipo,e.estado)}</select></label>
  <label>Marca<input name="marca" value="${e.marca}"></label><label>Modelo<input name="modelo" value="${e.modelo}"></label></div>
  <label>Ubicación<input name="ubicacion" value="${e.ubicacion}"></label><label>Número de Serie<input name="serie" value="${e.serie}"></label>
  <div class="end"><button type="button" class="btn out" onclick="closeModal()">Cancelar</button><button class="btn">${id?"Guardar Cambios":"Agregar Equipo"}</button></div></form>`);
  $("#f").onsubmit = ev => { ev.preventDefault(); const d = Object.fromEntries(new FormData(ev.target));
    try {
      apiRequest(id ? "equipment_update" : "equipment_create", "POST", id ? {...d, id} : d);
      const data = apiRequest("bootstrap");
      equipos = data.equipos;
      closeModal(); toast("Equipo guardado"); refresh();
    } catch (error) { toast(error.message); }
  };
}

/* ---------- 3) LÓGICA POR PÁGINA ---------- */
// Protección: si no hay sesión o el rol no coincide, vuelve al login
if(page!="login"){ const u=user(); if(!u || u.rol!=rolPag){ location="login.html"; } }

const paginas = {

  // ===== LOGIN =====
  login(){
    let rol = "cliente";
    document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => {
      rol = b.dataset.rol; document.querySelectorAll(".tabs button").forEach(x=>x.classList.toggle("on",x==b)); });
    $("#loginForm").onsubmit = e => { e.preventDefault();
      try {
        const logged = apiRequest("login", "POST", {email:$("#email").value, pass:$("#pass").value});
        if (logged.rol !== rol) return toast("El usuario no tiene el rol seleccionado");
        sessionStorage.setItem("user", JSON.stringify(logged));
        location = {admin:"admin.html",empleado:"empleado.html",cliente:"cliente.html"}[rol];
      } catch (error) { toast(error.message); }
    };
  },

  // ===== CLIENTE: INICIO =====
  cliente(){ topbar(); $("#hola").textContent = "Bienvenido, "+user().nombre; $("#nueva").onclick = () => citaModal(); },

  // ===== CLIENTE: MIS CITAS =====
  "mis-citas"(){
    topbar({back:"cliente.html",title:"Mis Citas de Mantenimiento",sub:"Seguimiento de solicitudes de soporte técnico",btn:["+ Nueva Solicitud",()=>citaModal(draw)]});
    function draw(){
      const m = citas.filter(c=>c.u);
      stats([["TOTAL SOLICITUDES",m.length],["ACTIVAS",m.filter(activa).length,"s-az"],["PROBLEMAS RESUELTOS",m.filter(c=>c.resuelto===true).length,"s-ok"],["SIN RESOLVER",m.filter(c=>c.resuelto===false).length,"s-er"]]);
      $("#tbody").innerHTML = m.map(c=>`<tr><td><small>${c.id}</small></td><td><b>${c.equipo}</b></td><td><span class="b">${c.tipo}</span></td><td>${fmt(c.fecha,c.hora)}</td><td>${c.tecnico}</td><td><span class="b ${cls(c.estado)}">${c.estado}</span></td><td>${res(c.resuelto)}</td></tr>`).join("");
      const a = m.find(c=>c.estado=="En progreso"), t = a && tecnicos.find(x=>x.n==a.tecnico);
      $("#curso").style.display = a?"block":"none";
      if(a) $("#curso").innerHTML = `<b>Visita técnica en curso</b> <span class="b warn" style="float:right">En progreso</span><br>${fmt(a.fecha,a.hora)} · ${a.equipo}<p style="margin:10px 0">${a.desc}</p><div class="card"><b>${a.tecnico}</b><br><small>${t?t.e:""}</small></div>`;
    } draw();
  },

  // ===== CLIENTE: DASHBOARD =====
  "dashboard-cliente"(){
    topbar({back:"cliente.html",title:"Mi Dashboard",sub:"Resumen de tus solicitudes de mantenimiento, "+user().nombre});
    const m = citas.filter(c=>c.u);
    stats([["Total Solicitudes",m.length],["Activas",m.filter(activa).length,"s-az"],["Errores Resueltos",m.filter(c=>c.resuelto===true).length,"s-ok"],["Sin Resolver",m.filter(c=>c.resuelto===false).length,"s-er"]]);
    donut([{l:"Resueltos",v:m.filter(c=>c.resuelto===true).length,c:"#059669"},{l:"Sin resolver",v:m.filter(c=>c.resuelto===false).length,c:"#ef4444"},{l:"Pendientes",v:m.filter(activa).length,c:"#94a3b8"}]);
    $("#tbody").innerHTML = m.map(c=>`<tr><td><b>${c.equipo}</b><br><small>${c.tecnico}</small></td><td>${c.fecha.split("-").reverse().join("/")}</td><td><span class="b ${cls(c.estado)}">${c.estado}</span></td><td>${res(c.resuelto)}</td></tr>`).join("");
  },

  // ===== ADMIN: INICIO =====
  admin(){
    topbar(); $("#hola").textContent = "Bienvenido, "+user().nombre;
    stats([["Equipos Registrados",equipos.length,"s-az"],["Citas Activas",citas.filter(activa).length,"s-wa"],["Errores Resueltos Hoy",citas.filter(c=>c.resuelto===true).length,"s-ok"],["Técnicos Disponibles",tecnicos.length-1,"s-mo"]]);
  },

  // ===== ADMIN: INVENTARIO DE EQUIPOS =====
  equipos(){
    topbar({back:"admin.html",title:"Inventario de Equipos",sub:"Gestión de infraestructura de red y telecomunicaciones",btn:["+ Agregar Equipo",()=>equipoModal(null,draw)]});
    $("#ft").innerHTML = "<option value=''>Todos los tipos</option>"+opts(tiposEquipo);
    $("#fe").innerHTML = "<option value=''>Todos los estados</option>"+opts(estadosEquipo);
    function draw(){
      stats([["TOTAL EQUIPOS",equipos.length],["OPERATIVOS",equipos.filter(e=>e.estado=="Operativo").length,"s-az"],["EN MANTENIMIENTO",equipos.filter(e=>e.estado=="En mantenimiento").length,"s-wa"],["DAÑADOS",equipos.filter(e=>e.estado=="Dañado").length,"s-er"]]);
      const q = $("#q").value.toLowerCase();
      const l = equipos.filter(e => (!$("#ft").value||e.tipo==$("#ft").value) && (!$("#fe").value||e.estado==$("#fe").value) && Object.values(e).join(" ").toLowerCase().includes(q));
      $("#cnt").textContent = l.length+" equipo(s)";
      $("#tbody").innerHTML = l.map(e=>`<tr><td>#${e.id}</td><td><b>${e.nombre}</b></td><td>${e.tipo}</td><td><b>${e.marca}</b><br><small>${e.modelo}</small></td><td>${e.ubicacion}</td><td><small>${e.serie}</small></td><td><span class="b ${cls(e.estado)}">${e.estado}</span></td>
        <td><button class="btn out sm" onclick="equipoModal(${e.id},window.drawEq)">✎</button> <button class="btn del sm" onclick="delEq(${e.id})">🗑</button></td></tr>`).join("");
    }
    window.drawEq = draw;
    window.delEq = id => { if(confirm("¿Eliminar este equipo?")){ try {
      apiRequest("equipment_delete", "POST", {id});
      equipos = equipos.filter(e=>e.id!=id); draw(); toast("Equipo eliminado");
    } catch (error) { toast(error.message); } } };
    ["#q","#ft","#fe"].forEach(s=>$(s).oninput=draw); draw();
  },

  // ===== ADMIN: CITAS DE MANTENIMIENTO (lista con detalle) =====
  "citas-admin"(){
    topbar({back:"admin.html",title:"Citas de Mantenimiento",sub:"Agendamiento y seguimiento de visitas técnicas",btn:["+ Nueva Cita",()=>citaModal(draw)]});
    $("#fe").innerHTML = "<option value=''>Todos los estados</option>"+opts(estadosCita);
    function draw(){
      stats([["TOTAL CITAS",citas.length],["PENDIENTES",citas.filter(c=>c.estado=="Pendiente"||c.estado=="Programada").length,"s-az"],["EN PROGRESO",citas.filter(c=>c.estado=="En progreso").length,"s-wa"],["ERROR RESUELTO",citas.filter(c=>c.resuelto===true).length,"s-ok"],["SIN RESOLVER",citas.filter(c=>c.resuelto===false).length,"s-er"]]);
      const q = $("#q").value.toLowerCase();
      const l = citas.filter(c=>(!$("#fe").value||c.estado==$("#fe").value) && [c.id,c.cliente,c.equipo].join(" ").toLowerCase().includes(q));
      $("#cnt").textContent = l.length+" cita(s)";
      $("#lista").innerHTML = l.map(c=>`<div class="item" onclick="this.classList.toggle('open')"><div class="top"><span><small>${c.id}</small> <span class="b ${cls(c.estado)}">${c.estado}</span> <span class="b">${c.tipo}</span> ${c.resuelto===true?'<span class="b ok">Error Resuelto</span>':c.resuelto===false?'<span class="b er">⚠ Sin Resolver</span>':""}<br><b>${c.cliente}</b> · <small>${c.equipo}</small></span><small>${fmt(c.fecha,c.hora)} · 🔧 ${c.tecnico}</small></div>
        <div class="det"><p style="margin-bottom:8px">${c.desc||"Sin descripción"}</p>${activa(c)?`<button class="btn sm" onclick="event.stopPropagation();avanzar('${c.id}')">Avanzar estado</button>`:`<button class="btn out sm" onclick="event.stopPropagation();marcar('${c.id}')">Cambiar resultado</button>`}${c.reporte?`<button class="btn sm" style="margin-left:8px" onclick="event.stopPropagation();verReporte('${c.id}')">📋 Ver reporte del empleado</button>`:""}</div></div>`).join("");
    }
    // Avanza Pendiente → Programada → En progreso → Completada
    window.avanzar = id => { const c=citas.find(x=>x.id==id); const estado=estadosCita[estadosCita.indexOf(c.estado)+1]; try {
      apiRequest("appointment_update", "POST", {id, estado, ...(estado=="Completada"?{resuelto:true}:{})});
      c.estado=estado; if(estado=="Completada") c.resuelto=true; draw(); toast("Estado: "+estado);
    } catch (error) { toast(error.message); } };
    window.marcar = id => { const c=citas.find(x=>x.id==id); try {
      c.resuelto=!c.resuelto; apiRequest("appointment_update", "POST", {id, resuelto:c.resuelto}); draw();
      toast(c.resuelto?"Marcada como resuelta":"Marcada sin resolver");
    } catch (error) { toast(error.message); } };
    ["#q","#fe"].forEach(s=>$(s).oninput=draw); draw();
  },

  // ===== ADMIN: PANEL DE CITAS (tabla global) =====
  "panel-citas"(){
    topbar({back:"admin.html",title:"Panel de Citas — Administrador",sub:"Visión global de todas las citas de mantenimiento",btn:["Gestionar Citas",()=>location="citas-admin.html"]});
    $("#fe").innerHTML = "<option value=''>Todos los estados</option>"+opts(estadosCita);
    $("#ftec").innerHTML = "<option value=''>Todos los técnicos</option>"+opts(tecnicos.map(t=>t.n));
    function draw(){
      const comp = citas.filter(c=>c.estado=="Completada"), ok = comp.filter(c=>c.resuelto===true).length;
      stats([["TOTAL CITAS",citas.length],["ACTIVAS",citas.filter(activa).length,"s-az"],["COMPLETADAS",comp.length,"s-ok"],["ERROR RESUELTO",ok,"s-ok"],["SIN RESOLVER",comp.filter(c=>c.resuelto===false).length,"s-er"]]);
      $("#tasa").textContent = (comp.length?Math.round(ok/comp.length*100):0)+"%";
      $("#tasaTxt").textContent = ok+" de "+comp.length+" citas completadas con error resuelto";
      const q = $("#q").value.toLowerCase();
      const l = citas.filter(c=>(!$("#fe").value||c.estado==$("#fe").value)&&(!$("#ftec").value||c.tecnico==$("#ftec").value)&&[c.id,c.cliente,c.tecnico,c.equipo].join(" ").toLowerCase().includes(q));
      $("#cnt").textContent = l.length+" resultado(s)";
      $("#tbody").innerHTML = l.map(c=>{ const t=tecnicos.find(x=>x.n==c.tecnico); return `<tr><td><small>${c.id}</small></td><td><b>${c.cliente}</b></td><td>${c.equipo}</td><td><span class="b">${c.tipo}</span></td><td><b>${c.tecnico}</b><br><small>${t?t.e:""}</small></td><td>${fmt(c.fecha,c.hora).replace(" de "," ").replace(" de 2026","")}</td><td><span class="b ${cls(c.estado)}">${c.estado}</span></td><td>${c.resuelto===true?"✔ Sí":c.resuelto===false?"✖ No":"<small>◔ Pendiente</small>"}</td></tr>`; }).join("");
    }
    ["#q","#fe","#ftec"].forEach(s=>$(s).oninput=draw); draw();
  },

  // ===== ADMIN: REPORTES =====
  reportes(){
    topbar({back:"admin.html",title:"Dashboard — Administrador",sub:"Métricas de operación del servicio de internet"});
    const completas = citas.filter(c=>c.estado=="Completada");
    const resueltas = completas.filter(c=>c.resuelto===true).length;
    const sinResolver = completas.filter(c=>c.resuelto===false).length;
    const tasa = completas.length ? Math.round(resueltas/completas.length*100)+"%" : "0%";
    const hoy = new Date();
    const periodos = Array.from({length:6},(_,i)=>new Date(hoy.getFullYear(),hoy.getMonth()-5+i,1));
    const meses = periodos.map(d=>d.toLocaleString("es",{month:"short"}).replace(".",""));
    const claves = periodos.map(d=>d.toISOString().slice(0,7));
    const citasMes = claves.map(k=>citas.filter(c=>c.fecha.slice(0,7)==k).length);
    const res_ = claves.map(k=>citas.filter(c=>c.fecha.slice(0,7)==k&&c.resuelto===true).length);
    stats([["Total Equipos",equipos.length,"s-az"],["Citas Este Mes",citasMes[5],"s-wa"],["Errores Resueltos",resueltas,"s-ok"],["Sin Resolver",sinResolver,"s-er"],["Técnicos Activos",tecnicos.length,"s-mo"],["Tasa Resolución",tasa,"s-az"]]);
    const pts = citasMes.map((v,i)=>[20+i*72, 130-v*7]);
    $("#linea").innerHTML = `<polyline fill="#05966922" stroke="#059669" stroke-width="2" points="20,130 ${pts.map(p=>p.join(",")).join(" ")} 380,130"/>` + pts.map((p,i)=>`<text x="${p[0]}" y="146" font-size="9" text-anchor="middle" fill="#64748b">${meses[i]}</text>`).join("");
    const cols = ["#0284c7","#0ea5e9","#38bdf8","#7dd3fc","#bae6fd","#e0f2fe"];
    donut(tiposEquipo.map((t,i)=>({l:t,v:equipos.filter(e=>e.tipo==t).length,c:cols[i]})).filter(d=>d.v));
    $("#bars").innerHTML = res_.map((v,i)=>`<div style="height:${v*12}px" title="${meses[i]}: ${v}"></div>`).join("");
    $("#bars").insertAdjacentHTML("afterend",`<div class="bars" style="height:auto;border:0;margin-top:4px">${meses.map(m=>`<small>${m}</small>`).join("")}</div>`);
  }
};
paginas[page] && paginas[page]();
