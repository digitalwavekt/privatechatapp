let firebaseAdmin = null;
let webpush = null;

try {
  firebaseAdmin = require('firebase-admin');
  if (!firebaseAdmin.apps.length && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
} catch (_) {}

try {
  webpush = require('web-push');
  if (process.env.VAPID_SUBJECT && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  }
} catch (_) {}

const sendPushNotification = async (fcmToken, payload) => {
  try {
    if (!firebaseAdmin?.apps?.length || !fcmToken) return;
    await firebaseAdmin.messaging().send({ token: fcmToken, notification: { title: payload.title, body: payload.body }, data: payload.data || {} });
  } catch (error) { console.error('Push notification error:', error.message); }
};

const sendWebPush = async (subscription, payload) => {
  try {
    if (!webpush || !subscription) return;
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (error) { console.error('Web push error:', error.message); }
};

module.exports = { sendPushNotification, sendWebPush };
