const firebase = require('../config/firebase');
const supabase = require('../config/supabase');

const stringifyData = (data = {}) => {
    const output = {};

    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            output[key] = String(value);
        }
    });

    return output;
};

const sendToUser = async (userId, payload) => {
    try {
        if (!userId) return;

        const { data: rows, error } = await supabase
            .from('device_tokens')
            .select('token')
            .eq('user_id', userId)
            .eq('is_active', true);

        if (error) throw error;

        const tokens = (rows || [])
            .map((row) => row.token)
            .filter(Boolean);

        if (!tokens.length) {
            console.log('No active device tokens for user:', userId);
            return;
        }

        const response = await firebase.messaging().sendEachForMulticast({
            tokens,
            notification: {
                title: payload.title || 'PVChat',
                body: payload.body || ''
            },
            data: stringifyData(payload.data || {}),
            android: {
                priority: 'high',
                notification: {
                    channelId: payload.channelId || 'pvchat_default',
                    sound: 'default'
                }
            }
        });

        const invalidTokens = [];

        response.responses.forEach((result, index) => {
            if (!result.success) {
                const code = result.error?.code || '';

                console.error('FCM send error:', code, result.error?.message);

                if (
                    code.includes('registration-token-not-registered') ||
                    code.includes('invalid-registration-token')
                ) {
                    invalidTokens.push(tokens[index]);
                }
            }
        });

        if (invalidTokens.length) {
            await supabase
                .from('device_tokens')
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString()
                })
                .in('token', invalidTokens);
        }
    } catch (error) {
        console.error('Send notification error:', error);
    }
};

module.exports = {
    sendToUser
};