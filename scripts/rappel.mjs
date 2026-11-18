// Envoie le rappel push aux deux heures choisies dans l'appli.
// Le téléphone vérifie lui-même les missions restantes et affiche la liste.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const webpush = require("web-push");

const raw = process.env.RAPPELS;
if (!raw) { console.log("Secret RAPPELS absent : rien à envoyer."); process.exit(0); }

let cfg;
try { cfg = JSON.parse(raw.trim()); } catch { console.error("Secret RAPPELS illisible : recopie le code depuis l'onglet Rappels de l'appli."); process.exit(1); }
const { s: sub, k: keys, t: times = [], tz = "Europe/Paris" } = cfg;

// Heure actuelle dans le fuseau du téléphone
const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
const now = +parts.find(p => p.type === "hour").value * 60 + +parts.find(p => p.type === "minute").value;

// Fenêtre de 15 min (= intervalle du cron) : GitHub peut lancer le job en retard de quelques minutes
const WINDOW = 15;
const due = times.some(t => { const [h, m] = t.split(":").map(Number); const diff = now - (h * 60 + m); return diff >= 0 && diff < WINDOW; });

if (!due && !process.env.FORCE) { console.log(`Pas l'heure (${tz} ${String(Math.floor(now / 60)).padStart(2, "0")}:${String(now % 60).padStart(2, "0")}, rappels à ${times.join(" et ")}).`); process.exit(0); }

webpush.setVapidDetails("https://github.com/univers-0/Il-rang", keys.pub, keys.priv);
try {
  await webpush.sendNotification(sub, JSON.stringify({ t: "rappel" }), { TTL: 3600, urgency: "high" });
  console.log("Rappel envoyé.");
} catch (e) {
  if (e.statusCode === 404 || e.statusCode === 410) console.error("Abonnement expiré : réactive les rappels dans l'appli et remplace le secret RAPPELS.");
  else console.error("Échec de l'envoi :", e.statusCode, e.body || e.message);
  process.exit(1);
}
