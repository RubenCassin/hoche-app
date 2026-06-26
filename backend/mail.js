// Envoi d'emails transactionnels (récupération de mot de passe / identifiant).
// Utilise Resend si RESEND_API_KEY est défini ; sinon repli « dev » qui logge
// le mail en console (le code marche partout, et envoie pour de vrai dès qu'une
// clé est configurée). MAIL_FROM = expéditeur (domaine vérifié chez Resend en
// prod ; par défaut le bac à sable Resend qui n'envoie qu'au propriétaire).
let resend = null;
const KEY = process.env.RESEND_API_KEY || '';
const FROM = process.env.MAIL_FROM || 'HOCHE <onboarding@resend.dev>';
if (KEY) {
  try { const { Resend } = require('resend'); resend = new Resend(KEY); }
  catch (e) { console.error('Resend init impossible :', e.message); }
}

/** Envoie un email. Ne lève jamais. Renvoie { sent } / { dev } / { error }. */
async function sendMail(to, subject, html) {
  if (!to) return { error: 'no recipient' };
  if (!resend) {
    const text = String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`\n[mail:dev] → ${to}\n[mail:dev] ${subject}\n[mail:dev] ${text}\n`);
    return { dev: true };
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
    return { sent: true };
  } catch (e) {
    console.error('Envoi mail échoué :', e.message);
    return { error: e.message };
  }
}

const wrap = (title, body) =>
  `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#1a0f08">
     <h2 style="color:#c8472f">🎯 HOCHE</h2>
     <h3>${title}</h3>${body}
     <p style="color:#888;font-size:12px;margin-top:24px">Si tu n'es pas à l'origine de cette demande, ignore cet email.</p>
   </div>`;

module.exports = { sendMail, wrap };
