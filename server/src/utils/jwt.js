const jwt = require('jsonwebtoken');

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

const generateTokens = (userId) => ({
  accessToken: jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' }),
  refreshToken: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
});

module.exports = { verifyToken, generateTokens };
