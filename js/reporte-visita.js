/* Vista del ADMIN: ver el reporte que envió el empleado (se carga en citas-admin.html) */
function verReporte(id){
  const c = citas.find(x=>x.id==id), r = c.reporte;
  openModal(`<div class="rep"><h3>Reporte de visita — ${c.id}</h3><small>${c.equipo} · Cliente: ${c.cliente}</small>
  <p style="margin-top:6px"><span class="b ${r.resuelto=="Sí"?"ok":"er"}">${r.resuelto=="Sí"?"Problema resuelto":"Sin resolver"}</span> <small>Enviado por ${r.empleado} el ${r.fecha}</small></p>
  <h4>Materiales y equipos usados</h4><div class="box2">${r.materiales}</div>
  <h4>Qué ocurrió en la visita</h4><div class="box2">${r.detalle}</div>
  <div class="tres"><div><b>$${r.gasto}</b><small>Gasto total</small></div><div><b>${r.horas} h</b><small>Horas</small></div><div><b>${r.empleado.split(" ")[0]}</b><small>Empleado</small></div></div>
  <div class="end"><button class="btn" onclick="closeModal()">Cerrar</button></div></div>`);
}
