/* ===== Inicio de sesión y registro con Firebase Authentication ===== */
let mode = "login";
const DESTINO = "proyecto.html#disponibilidad";

function msg(t, ok) {
  $("fMsg").textContent = t;
  $("fMsg").style.color = ok ? "var(--lib)" : "var(--ocu)";
}

function setMode(m) {
  mode = m;
  const r = m === "reg";
  $("tL").classList.toggle("on", !r);
  $("tR").classList.toggle("on", r);
  $("nameWrap").style.display = $("roleWrap").style.display = r ? "block" : "none";
  $("fPass").autocomplete = r ? "new-password" : "current-password";
  $("fGo").textContent = r ? "Crear cuenta" : "Entrar";
  $("fMsg").textContent = "";
}
$("tL").onclick = () => setMode("login");
$("tR").onclick = () => setMode("reg");

if (!FIREBASE_OK) {
  msg("⚠️ Falta configurar Firebase: abre js/config.js y pega tus datos.");
  $("fGo").disabled = true;
} else if (location.protocol === "file:") {
  msg("⚠️ Abre la página con un servidor local, no con doble clic (mira FIREBASE-SETUP.md).");
}

$("fGo").onclick = async () => {
  const email = $("fMail").value.trim().toLowerCase(),
    pass = $("fPass").value,
    name = $("fName").value.trim(),
    role = $("fRole").value;
  if (!/^\S+@\S+\.\S+$/.test(email)) return msg("Correo no válido.");
  if (pass.length < 6) return msg("La contraseña debe tener al menos 6 caracteres.");
  if (mode === "reg" && !name) return msg("Escribe tu nombre.");
  if (mode === "reg" && !["Estudiante", "Docente"].includes(role)) return msg("Elige un rol.");

  $("fGo").disabled = true;
  msg("Un momento…", true);
  try {
    if (mode === "reg") {
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      try {
        await cred.user.updateProfile({ displayName: name });
        // Perfil con el rol (los administradores se asignan desde la consola de Firebase)
        await db.collection("usuarios").doc(cred.user.uid).set({ name, email, role });
      } catch (e) {
        // La cuenta ya existe; solo falló guardar el perfil (normalmente por las reglas)
        console.error(e);
        msg("Cuenta creada, pero no se guardó tu rol: " + errAuth(e));
        setTimeout(() => (location.href = DESTINO), 3500);
        return;
      }
    } else {
      await auth.signInWithEmailAndPassword(email, pass);
    }
    msg("✅ ¡Listo! Entrando…", true);
    location.href = DESTINO;
  } catch (e) {
    console.error(e);
    msg(errAuth(e));
  } finally {
    $("fGo").disabled = !FIREBASE_OK;
  }
};

[$("fMail"), $("fPass"), $("fName")].forEach((i) =>
  i.addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("fGo").click();
  }),
);