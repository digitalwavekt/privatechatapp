const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
    privateKey = privateKey
        .replace(/^"|"$/g, '')
        .replace(/\\n/g, '\n');
}

if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase env missing. Push notifications disabled.');
} else if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey
        })
    });

    console.log('Firebase Admin initialized');
}

module.exports = admin;