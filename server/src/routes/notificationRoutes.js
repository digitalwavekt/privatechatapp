const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

const authModule = require('../middleware/auth');
const auth = authModule.auth || authModule.protect || authModule.verifyToken || authModule;

const getUserId = (req) => {
    return req.user?.userId || req.user?.id || req.user?._id;
};

router.post('/register-token', auth, async (req, res) => {
    try {
        const userId = getUserId(req);
        const { token, platform = 'android' } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        const { error } = await supabase
            .from('device_tokens')
            .upsert(
                {
                    user_id: userId,
                    token,
                    platform,
                    is_active: true,
                    last_used_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: 'token'
                }
            );

        if (error) throw error;

        return res.json({
            success: true,
            message: 'Device token registered'
        });
    } catch (error) {
        console.error('Register token error:', error);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;