/* Animación de aparición de las tarjetas de servicios al hacer scroll */
const io = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }), {threshold:.15});
document.querySelectorAll(".rv").forEach((el,i) => { el.style.transitionDelay = (i%3)*0.1+"s"; io.observe(el); });
