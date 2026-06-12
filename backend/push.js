// ─── Expo push delivery ───────────────────────────────────────────────────────
// Fire-and-forget sender that hits the Expo Push API for a user's registered
// device tokens. It's a no-op when a user has no tokens (e.g. while everyone is
// still on Expo Go, where remote push isn't delivered). The moment the app runs
// as a dev/EAS build and registers a token, these notifications start arriving.

const { prisma, jarr } = require('./db/prisma');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function isExpoToken(t) {
  return typeof t === 'string' && (t.indexOf('ExponentPushToken[') === 0 || t.indexOf('ExpoPushToken[') === 0);
}

/**
 * Send a push to every device registered for `userId`. Never throws.
 * @param payload { title, body, data }
 */
async function sendPush(userId, payload) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const tokens = user ? jarr(user.pushTokens) : [];
    if (tokens.length === 0) return;

    const messages = tokens.filter(isExpoToken).map(function (to) {
      return {
        to: to,
        sound: 'default',
        title: (payload && payload.title) || 'HOCHE',
        body: (payload && payload.body) || '',
        data: (payload && payload.data) || {},
      };
    });
    if (messages.length === 0) return;
    if (typeof fetch !== 'function') return; // Node < 18 has no global fetch

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    // Push is best-effort; the in-app notification is the source of truth.
  }
}

module.exports = { sendPush };
