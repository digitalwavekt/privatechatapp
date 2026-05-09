const admin = require('firebase-admin');

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!process.env.FIREBASE_PROJECT_ID) {
    console.warn('FIREBASE_PROJECT_ID missing');
}

if (!process.env.FIREBASE_CLIENT_EMAIL) {
    console.warn('FIREBASE_CLIENT_EMAIL missing');
}

if (!process.env.FIREBASE_PRIVATE_KEY) {
    console.warn('FIREBASE_PRIVATE_KEY missing');
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey
        })
    });
}

module.exports = admin;