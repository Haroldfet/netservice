/* Registro y recuperación de contraseña */
const $=s=>document.querySelector(s), page=document.body.dataset.page;
const toast=t=>{const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2600)};
const API_URL = "http://localhost:8000/api.php";
const apiRequest = (action, data) => {
  const xhr = new XMLHttpRequest();
  xhr.open("POST", `${API_URL}?action=${action}`, false);
  xhr.withCredentials = true;
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(JSON.stringify(data));
  let response = {};
  try { response = JSON.parse(xhr.responseText || "{}"); } catch { response = {}; }
  if (xhr.status < 200 || xhr.status >= 300) throw new Error(response.error || "No se pudo conectar con el servidor");
  return response;
};

if(page=="registro"){
  let rol="cliente";
  document.querySelectorAll(".roles div").forEach(d=>d.onclick=()=>{rol=d.dataset.r;document.querySelectorAll(".roles div").forEach(x=>x.classList.toggle("on",x==d))});
  document.querySelector(".ver").onclick=()=>{$("#p1").type=$("#p1").type=="password"?"text":"password"};
  // Medidor de seguridad de la contraseña
  $("#p1").oninput=e=>{const v=e.target.value;let n=0;if(v.length>=6)n++;if(v.length>=10)n++;if(/[A-Z]/.test(v)&&/[a-z]/.test(v))n++;if(/\d/.test(v)&&/\W/.test(v))n++;
    $("#med").style.width=n*25+"%";$("#med").style.background=["#e11d48","#e11d48","#d97706","#0284c7","#059669"][n];$("#medt").textContent=v?["Muy débil","Débil","Aceptable","Buena","Excelente"][n]:""};
  $("#reg").onsubmit=e=>{e.preventDefault();
    if($("#p1").value!=$("#p2").value) return toast("Las contraseñas no coinciden");
    try {
      apiRequest("register", {nombre:$("#nom").value,email:$("#mail").value,pass:$("#p1").value,rol});
      toast("¡Cuenta creada! Redirigiendo..."); setTimeout(()=>location="login.html",1500);
    } catch (error) { toast(error.message); }
  };
}

if(page=="recuperar"){
  let codigo="", correo="";
  const ir=n=>{document.querySelectorAll(".paso").forEach((p,i)=>p.classList.toggle("on",i==n-1));document.querySelectorAll(".dots i").forEach((d,i)=>d.classList.toggle("on",i<Math.min(n,3)))};
  const enviar=()=>{const result=apiRequest("reset_request",{email:correo});toast(result.code ? "Código de prueba: "+result.code : "Si el correo existe, se creó el código de recuperación")};
  $("#s1").onsubmit=e=>{e.preventDefault();correo=$("#rmail").value;$("#sub2").textContent="Ingresa el código generado en la sesión de recuperación";enviar();ir(2)};
  $("#reenv").onclick=e=>{e.preventDefault();enviar()};
  const cs=[...document.querySelectorAll(".code input")];
  cs.forEach((c,i)=>{c.oninput=()=>{if(c.value&&cs[i+1])cs[i+1].focus()};c.onkeydown=e=>{if(e.key=="Backspace"&&!c.value&&cs[i-1])cs[i-1].focus()}});
  $("#s2").onsubmit=e=>{e.preventDefault();try{apiRequest("reset_verify",{code:cs.map(c=>c.value).join("")});ir(3)}catch(error){toast(error.message)}};
  $("#s3").onsubmit=e=>{e.preventDefault();if($("#n1").value!=$("#n2").value)return toast("Las contraseñas no coinciden");
    try { apiRequest("reset_complete", {pass:$("#n1").value}); ir(4); }
    catch (error) { toast(error.message); }
  };
}
