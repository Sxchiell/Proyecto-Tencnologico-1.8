const $ = (id) => document.getElementById(id);


function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}


function errAuth(e) {
  const m = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/email-already-in-use": "Ese correo ya está registrado.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/invalid-email": "Correo no válido.",
    "auth/invalid-login-credentials": "Correo o contraseña incorrectos.",
    "auth/user-disabled": "Esta cuenta fue deshabilitada.",
    "auth/operation-not-supported-in-this-environment":
      "Abre la página desde un servidor (http://localhost), no con doble clic.",
    "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase (Authentication → Settings).",
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.": "La apiKey de config.js no es válida.",
    "auth/too-many-requests": "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
    "auth/network-request-failed": "Sin conexión a internet.",
    "auth/operation-not-allowed": "Activa el acceso con correo y contraseña en Firebase.",
    "permission-denied": "Firebase rechazó la operación (publica las reglas de firestore.rules).",
    unavailable: "No hay conexión con Firebase.",
  };
  return m[e && e.code] || "Ocurrió un error: " + ((e && (e.code || e.message)) || e);
}

/* Fondo animado compartido */
(function () {
  const bg = document.createElement("div");
  bg.className = "bg";
  bg.innerHTML = '<div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div>';
  document.body.prepend(bg);
  const g = document.createElement("div");
  g.className = "glow";
  document.body.appendChild(g);
  addEventListener("pointermove", (e) => {
    g.style.setProperty("--mx", e.clientX + "px");
    g.style.setProperty("--my", e.clientY + "px");
  });
})();