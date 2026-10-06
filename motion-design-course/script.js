// ===== CONFIG =====
// Remplace ces liens par tes liens de paiement (Stripe Payment Links, Gumroad, Systeme.io, Podia...)
const CHECKOUT_LINKS = {
  essentiel: "",
  pro: "",
  coaching: "",
};
// Fin de l'offre de lancement (format ISO). Laisse vide pour masquer le compte à rebours.
const LAUNCH_OFFER_END = "2026-10-31T23:59:59";

// ===== Checkout buttons =====
document.querySelectorAll("[data-checkout]").forEach((btn) => {
  const url = CHECKOUT_LINKS[btn.dataset.checkout];
  if (url) {
    btn.href = url;
  } else {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      alert("Lien de paiement à configurer dans script.js (CHECKOUT_LINKS).");
    });
  }
});

// ===== Typing demo in the hero =====
const prompts = [
  "Anime un logo qui rebondit avec un easing élastique",
  "Crée une intro de 5 s en kinetic typography",
  "Écris une expression AE pour un wiggle qui s'arrête",
  "Génère 10 variantes 9:16 de cette animation",
];
const typed = document.getElementById("typed");
let pi = 0, ci = 0, deleting = false;
function typeLoop() {
  const text = prompts[pi];
  typed.textContent = text.slice(0, ci);
  if (!deleting && ci < text.length) { ci++; setTimeout(typeLoop, 45); }
  else if (!deleting) { deleting = true; setTimeout(typeLoop, 1800); }
  else if (ci > 0) { ci--; setTimeout(typeLoop, 20); }
  else { deleting = false; pi = (pi + 1) % prompts.length; setTimeout(typeLoop, 300); }
}
if (typed) typeLoop();

// ===== Reveal on scroll =====
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
  }),
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 80}ms`;
  io.observe(el);
});

// ===== Countdown =====
const cd = document.getElementById("countdown");
if (cd && LAUNCH_OFFER_END) {
  const end = new Date(LAUNCH_OFFER_END).getTime();
  const tick = () => {
    const diff = end - Date.now();
    if (diff <= 0) { cd.parentElement.style.display = "none"; return; }
    const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24,
          m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
    cd.textContent = `${d}j ${h}h ${m}m ${s}s`;
  };
  tick();
  setInterval(tick, 1000);
} else if (cd) {
  cd.parentElement.style.display = "none";
}

document.getElementById("year").textContent = new Date().getFullYear();
