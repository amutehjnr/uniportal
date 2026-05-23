'use strict';
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: (process.env.ALLOWED_ORIGINS || '').split(','), credentials: true },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Auth middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.user = decoded;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} user: ${socket.user?.id}`);

    // Join personal & role rooms
    socket.join(`user:${socket.user.id}`);
    socket.join(`role:${socket.user.role}`);

    socket.on('join:conversation', (conversationId) => socket.join(`conv:${conversationId}`));
    socket.on('leave:conversation', (conversationId) => socket.leave(`conv:${conversationId}`));
    socket.on('typing:start', ({ conversationId }) => socket.to(`conv:${conversationId}`).emit('typing:start', { userId: socket.user.id }));
    socket.on('typing:stop', ({ conversationId }) => socket.to(`conv:${conversationId}`).emit('typing:stop', { userId: socket.user.id }));
    socket.on('disconnect', () => logger.debug(`Socket disconnected: ${socket.id}`));
  });
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}

function emitToUser(userId, event, data) { getIO().to(`user:${userId}`).emit(event, data); }
function emitToRole(role, event, data) { getIO().to(`role:${role}`).emit(event, data); }
function emitToConversation(conversationId, event, data) { getIO().to(`conv:${conversationId}`).emit(event, data); }

module.exports = { initSocket, getIO, emitToUser, emitToRole, emitToConversation };
