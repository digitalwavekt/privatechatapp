import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import api from './api';

let initialized = false;

export const initPushNotifications = async () => {
    try {
        if (initialized) return;
        initialized = true;

        if (!Capacitor.isNativePlatform()) {
            console.log('Push skipped: not native platform');
            return;
        }

        const permission = await PushNotifications.requestPermissions();

        if (permission.receive !== 'granted') {
            console.warn('Push permission not granted');
            return;
        }

        await PushNotifications.removeAllListeners();

        PushNotifications.addListener('registration', async (token) => {
            console.log('FCM token:', token.value);

            try {
                await api.post('/notifications/register-token', {
                    token: token.value,
                    platform: Capacitor.getPlatform()
                });
            } catch (err) {
                console.error('Token save failed:', err);
            }
        });

        PushNotifications.addListener('registrationError', (error) => {
            console.error('Push registration error:', error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received:', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            const data = action.notification?.data || {};

            if (data.type === 'message' && data.senderId) {
                window.location.href = `/?user=${data.senderId}`;
            }

            if (data.type === 'incoming_call' && data.callId) {
                window.location.href = `/call/${data.callId}?type=${data.callType || 'audio'}&channel=${data.channelName || ''}&token=${data.token || ''}&appId=${data.appId || ''}`;
            }
        });

        await PushNotifications.register();
    } catch (error) {
        console.error('Push init failed:', error);
    }
};