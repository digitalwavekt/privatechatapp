require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');
const groupRoutes = require('./routes/group');
const adminRoutes = require('./routes/admin');
const callRoutes = require('./routes/call');
const mediaRoutes = require('./routes/media');

const { socketHandler } = require('./socket/handler');
const { initializeAdmin } = require('./utils/initializeAdmin');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  ...(process.env.CORS_ORIGINS || '').split(','),
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174'
]
  .map(origin => origin && origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log('CORS blocked:', origin);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('dev'));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

app.set('io', io);

io.on('connection', socket => {
  console.log('Socket connected:', socket.id);

  socket.on('join', userId => {
    if (!userId) return;
    socket.join(`user:${userId}`);
    console.log(`User joined room: user:${userId}`);
  });

  socket.on('join_user', userId => {
    if (!userId) return;
    socket.join(`user:${userId}`);
    console.log(`User joined room: user:${userId}`);
  });

  socket.on('join_admin', () => {
    socket.join('admin');
    console.log('Admin joined admin room');
  });

  socket.on('disconnect', reason => {
    console.log('Socket disconnected:', socket.id, reason);
  });
});

if (typeof socketHandler === 'function') {
  socketHandler(io);
}

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PVChat backend is running'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'PVChat API running',
    time: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    allowedOrigins
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/media', mediaRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use((err, req, res, next) => {
  console.error('Global error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`PVChat server running on port ${PORT}`);
  console.log('Allowed origins:', allowedOrigins);

  try {
    await initializeAdmin();
  } catch (error) {
    console.error('Admin initialization failed:', error.message);
  }
});