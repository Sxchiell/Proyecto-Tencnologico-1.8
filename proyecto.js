/* ---------- datos y estado ---------- */
const TYPES = {
  salon: { label: "Salón", icon: "🏫" },
  proyector: { label: "Proyector", icon: "📽️" },
  laptop: { label: "Laptop", icon: "💻" },
};
const H0 = 7,
  H1 = 17; // bloques de 1 hora: 07:00 a 18:00
const WORDS = ["proyectores", "laptops", "salones"];
const LBL = { lib: "LIBRE", ocu: "OCUPADO", man: "MANTENIMIENTO" };

let RES = [], // recursos (en tiempo real desde Firestore)
  RESV = [], // reservas de hoy en adelante
  user = null, // { uid, email, name, role }
  typeF = "all",
  stF = "all",
  cur = null,
  sel = [],
  anim = true;

const pad = (n) => String(n).padStart(2, "0");
const toM = (t) => {
  const [a, b] = t.split(":");
  return +a * 60 + +b;
};
const dstr = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const nowMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
const today = () => dstr(new Date());
const isAdmin = () => !!user && user.role === "Administrador";
const lockId = (rec, date, h) => rec + "_" + date + "_" + h;
const iconOf = (r) => (TYPES[r.type] || TYPES.salon).icon;

function status(r) {
  if (r.mant) return { s: "man" };
  const d = today(),
    m = nowMin(),
    list = RESV.filter((x) => x.rec === r.id && x.date === d);
  const act = list.find((x) => toM(x.ini) <= m && m < toM(x.fin));
  if (act) {
    let end = toM(act.fin),
      ch = true;
    while (ch) {
      ch = false;
      const n = list.find((x) => toM(x.ini) === end);
      if (n) {
        end = toM(n.fin);
        ch = true;
      }
    }
    return { s: "ocu", until: pad(Math.floor(end / 60)) + ":" + pad(end % 60), by: act.name };
  }
  const nx = list.filter((x) => toM(x.ini) > m).sort((a, b) => toM(a.ini) - toM(b.ini))[0];
  return { s: "lib", until: nx ? nx.ini : null };
}

/* ---------- avisos y confeti ---------- */
function toast(t, err) {
  const e = $("toast");
  e.textContent = t;
  e.className = "on" + (err ? " err" : "");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (e.className = ""), 3200);
}
function confetti() {
  ["🎉", "✨", "💻", "📽️", "✅", "🏫"].forEach((c) => {
    for (let k = 0; k < 4; k++) {
      const s = document.createElement("span");
      s.className = "cf";
      s.textContent = c;
      s.style.left = Math.random() * 100 + "vw";
      s.style.animationDelay = Math.random() * 0.6 + "s";
      s.style.animationDuration = 1.4 + Math.random() + "s";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 3200);
    }
  });
}
function dbError(e) {
  console.error(e);
  toast("No se pudo leer la base de datos: " + (e.code || e.message), true);
}

/* ---------- tablero de disponibilidad ---------- */
function renderGrid() {
  const d = today(),
    m = nowMin(),
    rs = RESV.filter((x) => x.date === d);
  const c = { lib: 0, ocu: 0, man: 0 };
  const cards = RES.map((r) => ({ r, st: status(r) }));
  cards.forEach((x) => c[x.st.s]++);
  $("cLib").textContent = c.lib;
  $("cOcu").textContent = c.ocu;
  $("cMan").textContent = c.man;
  const vis = cards.filter(
    (x) => (typeF === "all" || x.r.type === typeF) && (stF === "all" || x.st.s === stF),
  );
  $("rg").innerHTML = vis.length
    ? vis
        .map(({ r, st }, i) => {
          const tl = [];
          for (let h = H0; h <= H1; h++) {
            const o = rs.some(
              (x) => x.rec === r.id && toM(x.ini) < (h + 1) * 60 && toM(x.fin) > h * 60,
            );
            tl.push(
              '<i class="' + (o ? "o " : "") + (Math.floor(m / 60) === h ? "n" : "") + '"></i>',
            );
          }
          const info =
            st.s === "lib"
              ? st.until
                ? "Libre hasta las " + st.until
                : "Libre el resto del día"
              : st.s === "ocu"
                ? "Ocupado hasta las " + st.until + " · " + esc(st.by)
                : "Fuera de servicio por revisión técnica";
          return (
            '<div class="res ' +
            st.s +
            '" data-id="' +
            esc(r.id) +
            '" style="' +
            (anim ? "animation-delay:" + i * 60 + "ms" : "animation:none") +
            '"><div class="rtop"><span class="rico">' +
            iconOf(r) +
            '</span><span class="badge"><span class="dot"></span>' +
            LBL[st.s] +
            "</span></div>" +
            "<h3>" +
            esc(r.name) +
            '</h3><div class="loc">📍 ' +
            esc(r.loc) +
            '</div><div class="spec">' +
            esc(r.spec) +
            '</div><div class="until">' +
            info +
            "</div>" +
            '<div class="tl">' +
            tl.join("") +
            '</div><div class="tlb"><span>' +
            H0 +
            "h</span><span>12h</span><span>" +
            (H1 + 1) +
            "h</span></div>" +
            '<div class="ract"><button data-a="book" ' +
            (st.s === "man" ? "disabled" : "") +
            ">" +
            (st.s === "ocu" ? "Ver horarios" : "Reservar") +
            "</button>" +
            (isAdmin()
              ? '<button class="ghost" data-a="mt" title="Cambiar mantenimiento">🔧</button><button class="ghost" data-a="del" title="Eliminar recurso">🗑️</button>'
              : "") +
            "</div></div>"
          );
        })
        .join("")
    : '<div class="empty">' +
      (RES.length
        ? "😕 No hay recursos con ese filtro."
        : isAdmin()
          ? "Aún no hay recursos. Agrega el primero con el formulario de arriba."
          : "Aún no hay recursos registrados. El administrador debe agregarlos.") +
      "</div>";
  anim = false;
}
$("rg").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  const id = b.closest(".res").dataset.id;
  if (b.dataset.a === "mt") toggleMant(id);
  else if (b.dataset.a === "del") deleteRes(id);
  else openBook(id);
});
$("rg").addEventListener("pointermove", (e) => {
  const c = e.target.closest(".res");
  if (!c) return;
  const b = c.getBoundingClientRect();
  c.style.setProperty("--x", e.clientX - b.left + "px");
  c.style.setProperty("--y", e.clientY - b.top + "px");
});
$("filters").addEventListener("click", (e) => {
  const b = e.target.closest(".fbtn");
  if (!b) return;
  typeF = b.dataset.t;
  document.querySelectorAll(".fbtn").forEach((x) => x.classList.toggle("on", x === b));
  anim = true;
  renderGrid();
});
$("stFilter").onchange = (e) => {
  stF = e.target.value;
  anim = true;
  renderGrid();
};

/* ---------- administración de recursos (solo Administrador) ---------- */
async function addRes() {
  if (!isAdmin()) return toast("Solo el administrador puede agregar recursos", true);
  const type = $("aType").value,
    name = $("aName").value.trim(),
    loc = $("aLoc").value.trim(),
    spec = $("aSpec").value.trim();
  if (!TYPES[type] || !name) return toast("Escribe el nombre del recurso", true);
  if (RES.some((r) => r.name.toLowerCase() === name.toLowerCase()))
    return toast("Ya existe un recurso con ese nombre", true);
  $("aBtn").disabled = true;
  try {
    await db.collection("recursos").add({
      type,
      name,
      loc: loc || "Sin ubicación",
      spec: spec || "Sin especificaciones",
      mant: false,
      orden: Date.now(),
    });
    ["aName", "aLoc", "aSpec"].forEach((i) => ($(i).value = ""));
    toast("✅ " + TYPES[type].label + " agregado");
  } catch (e) {
    toast(errAuth(e), true);
  }
  $("aBtn").disabled = false;
}
$("aBtn").onclick = addRes;

async function toggleMant(id) {
  if (!isAdmin()) return;
  const r = RES.find((x) => x.id === id);
  if (!r) return;
  try {
    await db.collection("recursos").doc(id).update({ mant: !r.mant });
    toast(r.mant ? "Recurso disponible de nuevo" : "Recurso en mantenimiento");
  } catch (e) {
    toast(errAuth(e), true);
  }
}

/* Arma un lote que borra una reserva junto con sus bloqueos horarios */
function borrarReserva(batch, r) {
  batch.delete(db.collection("reservas").doc(r.id));
  for (let h = toM(r.ini) / 60; h < toM(r.fin) / 60; h++)
    batch.delete(db.collection("bloqueos").doc(lockId(r.rec, r.date, h)));
}

async function deleteRes(id) {
  if (!isAdmin()) return;
  const r = RES.find((x) => x.id === id);
  if (!r || !confirm("¿Eliminar «" + r.name + "» y todas sus reservas?")) return;
  try {
    const snap = await db.collection("reservas").where("rec", "==", id).get();
    const batch = db.batch();
    snap.docs.forEach((d) => borrarReserva(batch, { id: d.id, ...d.data() }));
    batch.delete(db.collection("recursos").doc(id));
    await batch.commit();
    toast("Recurso eliminado");
  } catch (e) {
    toast(errAuth(e), true);
  }
}

/* ---------- reservar ---------- */
function openBook(id) {
  if (!user) {
    toast("Inicia sesión para reservar", true);
    setTimeout(() => (location.href = "login.html"), 900);
    return;
  }
  cur = RES.find((r) => r.id === id);
  if (!cur) return;
  sel = [];
  $("mTitle").textContent = cur.name;
  $("mLoc").textContent = "📍 " + cur.loc + " · " + cur.spec;
  $("mIco").textContent = iconOf(cur);
  $("mDate").min = today();
  $("mDate").value = today();
  $("mMsg").textContent = "";
  renderSlots();
  $("modal").classList.add("on");
}
function slotState(h) {
  const date = $("mDate").value;
  if (cur.mant) return "busy";
  if (date === today() && (h + 1) * 60 <= nowMin()) return "past";
  return RESV.some(
    (x) => x.rec === cur.id && x.date === date && toM(x.ini) < (h + 1) * 60 && toM(x.fin) > h * 60,
  )
    ? "busy"
    : "free";
}
function renderSlots() {
  let html = "";
  for (let h = H0; h <= H1; h++) {
    const s = slotState(h);
    html +=
      '<button class="slot ' +
      (s !== "free" ? s : "") +
      (sel.includes(h) ? " sel" : "") +
      '" data-h="' +
      h +
      '" ' +
      (s !== "free" ? "disabled" : "") +
      ">" +
      pad(h) +
      ":00</button>";
  }
  $("slots").innerHTML = html;
  if (sel.length) {
    const a = Math.min(...sel),
      b = Math.max(...sel) + 1;
    $("mMsg").textContent =
      "Seleccionado: " + pad(a) + ":00 – " + pad(b) + ":00 (" + (b - a) + " h)";
    $("mMsg").style.color = "var(--ac2)";
  } else {
    $("mMsg").textContent = cur.mant
      ? "Este recurso está en mantenimiento."
      : "Haz clic en la hora de inicio.";
    $("mMsg").style.color = "var(--mu)";
  }
  $("mGo").disabled = !sel.length;
}
$("slots").addEventListener("click", (e) => {
  const b = e.target.closest(".slot");
  if (!b || b.disabled) return;
  const h = +b.dataset.h;
  if (sel.length === 1 && sel[0] !== h) {
    const a = Math.min(sel[0], h),
      z = Math.max(sel[0], h),
      r = [];
    let ok = true;
    for (let x = a; x <= z; x++) {
      if (slotState(x) !== "free") ok = false;
      r.push(x);
    }
    sel = ok ? r : [h];
    if (!ok) toast("Hay horas ocupadas en ese rango", true);
  } else sel = sel.length === 1 && sel[0] === h ? [] : [h];
  renderSlots();
});
$("mDate").onchange = () => {
  sel = [];
  renderSlots();
};
$("mX").onclick = () => $("modal").classList.remove("on");
$("modal").onclick = (e) => {
  if (e.target.id === "modal") $("modal").classList.remove("on");
};

$("mGo").onclick = async () => {
  if (!sel.length || !user) return;
  const a = Math.min(...sel),
    b = Math.max(...sel) + 1,
    date = $("mDate").value,
    ini = pad(a) + ":00",
    fin = pad(b) + ":00";
  if (user.role === "Estudiante" && b - a > 2) {
    $("mMsg").textContent = "⛔ Los estudiantes pueden reservar máximo 2 horas.";
    $("mMsg").style.color = "var(--ocu)";
    return;
  }
  if (RESV.some((r) => r.rec === cur.id && r.date === date && ini < r.fin && fin > r.ini)) {
    renderSlots();
    return toast("⛔ Ese horario acaba de ocuparse", true);
  }
  $("mGo").disabled = true;
  try {
    // Un solo lote: la reserva + un bloqueo por cada hora. Si alguien ya tomó
    // una de esas horas, Firestore rechaza todo el lote (no hay reservas duplicadas).
    const ref = db.collection("reservas").doc(),
      batch = db.batch();
    batch.set(ref, {
      rec: cur.id,
      date,
      ini,
      fin,
      horas: b - a,
      uid: user.uid,
      name: user.name,
      email: user.email,
    });
    for (let h = a; h < b; h++)
      batch.set(db.collection("bloqueos").doc(lockId(cur.id, date, h)), {
        uid: user.uid,
        rec: cur.id,
        date,
        hour: h,
        rid: ref.id,
      });
    await batch.commit();
    $("modal").classList.remove("on");
    confetti();
    toast("✅ Reserva confirmada: " + cur.name + " · " + ini + " – " + fin);
  } catch (e) {
    toast(
      e.code === "permission-denied"
        ? "⛔ No se pudo reservar: otra persona ya tomó ese horario"
        : "No se pudo reservar: " + (e.code || e.message),
      true,
    );
    renderSlots();
  }
};

/* ---------- mis reservas ---------- */
function renderList() {
  if (!user) return;
  let rs = RESV.slice();
  if (!isAdmin()) rs = rs.filter((r) => r.uid === user.uid);
  rs.sort((a, b) => (a.date + a.ini).localeCompare(b.date + b.ini));
  $("rList").innerHTML = rs.length
    ? rs
        .map((r) => {
          const x = RES.find((y) => y.id === r.rec);
          return (
            "<tr><td>" +
            (x ? iconOf(x) + " " + esc(x.name) : esc(r.rec)) +
            "</td><td>" +
            esc(r.date) +
            "</td><td>" +
            esc(r.ini) +
            " – " +
            esc(r.fin) +
            "</td><td>" +
            esc(r.name) +
            '</td><td><button class="ghost" data-id="' +
            esc(r.id) +
            '">Cancelar</button></td></tr>'
          );
        })
        .join("")
    : '<tr><td colspan="5" style="color:var(--mu)">Aún no hay reservas. ¡Elige un recurso libre arriba!</td></tr>';
}
$("rList").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b || !user) return;
  const r = RESV.find((x) => x.id === b.dataset.id);
  if (!r || !(isAdmin() || r.uid === user.uid)) return;
  try {
    const batch = db.batch();
    borrarReserva(batch, r);
    await batch.commit();
    toast("Reserva cancelada");
  } catch (err) {
    toast(errAuth(err), true);
  }
});

/* ---------- sesión ---------- */
function renderAuth() {
  const a = $("auth");
  if (user) {
    a.innerHTML =
      "<span>" +
      esc(user.name) +
      " · <b>" +
      esc(user.role) +
      '</b></span><button class="ghost" id="outBtn">Salir</button>';
    $("outBtn").onclick = () => auth.signOut();
    $("panel").style.display = "block";
    $("adminBox").style.display = isAdmin() ? "block" : "none";
    $("welcome").textContent =
      user.role === "Administrador"
        ? "Eres administrador: ves todas las reservas y puedes agregar o eliminar salones, proyectores y laptops, y ponerlos en mantenimiento (🔧)."
        : user.role === "Estudiante"
          ? "Como estudiante puedes reservar hasta 2 horas por bloque. Los recursos solo los edita el administrador."
          : "Como docente puedes reservar bloques de varias horas. Los recursos solo los edita el administrador.";
    renderList();
  } else {
    a.innerHTML = '<a class="btn" href="login.html">Iniciar sesión</a>';
    $("panel").style.display = "none";
    $("adminBox").style.display = "none";
  }
}

/* Vuelve a dibujar todo cuando cambian los datos */
function refresh() {
  renderGrid();
  renderList();
  if ($("modal").classList.contains("on")) {
    cur = RES.find((r) => cur && r.id === cur.id);
    if (!cur) return $("modal").classList.remove("on");
    sel = sel.filter((h) => slotState(h) === "free");
    renderSlots();
  }
}

/* ---------- conexión con Firebase ---------- */
function startFirebase() {
  if (!FIREBASE_OK) {
    $("cfgWarn").style.display = "block";
    renderAuth();
    renderGrid();
    return;
  }
  // Recursos y reservas se escuchan en tiempo real (cualquiera puede verlos)
  let first = true;
  db.collection("recursos").onSnapshot((s) => {
    RES = s.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    if (first) anim = true;
    first = false;
    refresh();
  }, dbError);
  db.collection("reservas")
    .where("date", ">=", today())
    .onSnapshot((s) => {
      RESV = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      refresh();
    }, dbError);

  // Usuario conectado y su perfil (rol)
  auth.onAuthStateChanged(async (u) => {
    if (!u) {
      user = null;
    } else {
      let p = null;
      try {
        const d = await db.collection("usuarios").doc(u.uid).get();
        p = d.exists ? d.data() : null;
      } catch (e) {
        console.error(e);
      }
      user = {
        uid: u.uid,
        email: u.email,
        name: (p && p.name) || u.displayName || u.email,
        role: (p && p.role) || "Estudiante",
      };
    }
    renderAuth();
    refresh();
  });
}

/* ---------- efectos ---------- */
let wi = 0;
setInterval(() => {
  wi = (wi + 1) % WORDS.length;
  const w = $("word");
  w.style.animation = "none";
  w.offsetWidth;
  w.style.animation = "";
  w.textContent = WORDS[wi];
}, 2400);
$("track").innerHTML = Array(2)
  .fill(
    "<span>📽️ Proyectores</span><span>💻 Laptops</span><span>🏫 Salones</span><span>✅ Sin cruces de horario</span><span>⚡ Reserva en 1 minuto</span>",
  )
  .join("");
const io = new IntersectionObserver(
  (es) =>
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
      const c = e.target.querySelector("[data-count]");
      if (c) count(c);
    }),
  { threshold: 0.15 },
);
document.querySelectorAll(".rv").forEach((x) => io.observe(x));
function count(el) {
  const to = +el.dataset.count,
    dec = +(el.dataset.dec || 0),
    pre = el.dataset.pre || "",
    suf = el.dataset.suf || "",
    t0 = performance.now();
  (function f(t) {
    const p = Math.min((t - t0) / 1200, 1),
      v = to * (1 - Math.pow(1 - p, 3));
    el.innerHTML = pre + v.toFixed(dec) + suf;
    if (p < 1) requestAnimationFrame(f);
  })(t0);
}
function tick() {
  const d = new Date();
  $("clock").textContent =
    "🕒 " +
    d.toLocaleDateString("es-SV", { weekday: "long", day: "numeric", month: "long" }) +
    " · " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes());
}

/* ---------- inicio ---------- */
tick();
startFirebase();
// Cada 30 s se actualiza el reloj y el estado libre/ocupado según la hora actual
setInterval(() => {
  tick();
  renderGrid();
}, 30000);