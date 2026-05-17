const User = require("../models/User");
const Message = require("../models/Message");

// Map: userId -> socketId
const onlineUsers = new Map();

const isBlocked = async (userId1, userId2) => {
  if (!userId1 || !userId2) return false;
  try {
    const user1 = await User.findById(userId1).select('blockedUsers');
    const user2 = await User.findById(userId2).select('blockedUsers');
    const blocked1 = (user1?.blockedUsers || []).map(id => id.toString());
    const blocked2 = (user2?.blockedUsers || []).map(id => id.toString());
    return blocked1.includes(userId2.toString()) || blocked2.includes(userId1.toString());
  } catch (err) {
    console.error("isBlocked check failed:", err);
    return false;
  }
};

const initSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // User connects and registers
    socket.on("addUser", async (userId) => {
      if (!userId) return;
      onlineUsers.set(userId, socket.id);

      // Update DB
      await User.findByIdAndUpdate(userId, { isOnline: true });

      // Broadcast online users list
      io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
    });

    // Join a conversation room
    socket.on("joinConversation", (conversationId) => {
      socket.join(conversationId);
      console.log(`👤 User joined room: ${conversationId}`);
    });

    // Leave a conversation room
    socket.on("leaveConversation", (conversationId) => {
      socket.leave(conversationId);
      console.log(`👤 User left room: ${conversationId}`);
    });

    // Send a message
    socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
      if (await isBlocked(senderId, receiverId)) {
        socket.emit('action_blocked', { type: 'message', message: 'You cannot message this user.' });
        return;
      }
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("getMessage", message);
      }
    });

    // Forward a message
    socket.on("forward_message", async ({ targetChatId, text, fileUrl, fileType, fileName, message }) => {
      // Use existing message from DB if provided, otherwise create new
      const forwardedMsg = message ? { ...message, isForwarded: true } : {
        text: text || '',
        fileUrl,
        fileType,
        fileName,
        isForwarded: true,
        createdAt: new Date(),
        sender: socket.userId || 'system'
      };

      // Emit to the target room
      io.to(targetChatId).emit("getMessage", forwardedMsg);
    });

    // Typing indicator
    socket.on("typing:start", ({ conversationId, userId }) => {
      socket.to(conversationId).emit("typing:start", { userId });
    });

    socket.on("typing:stop", ({ conversationId, userId }) => {
      socket.to(conversationId).emit("typing:stop", { userId });
    });

    // Message read receipt
    socket.on("message:read", async ({ messageId, userId, conversationId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { readBy: { userId, readAt: new Date() } },
          seen: true, // Also set seen for backward compatibility
        });
        socket.to(conversationId).emit("message:read", { messageId, userId });
      } catch (err) {
        console.error("message:read error:", err);
      }
    });

    // Keep legacy messageSeen for compatibility but update its logic
    socket.on("messageSeen", async ({ conversationId, userId, receiverId }) => {
      try {
        await Message.updateMany(
          { conversationId, sender: { $ne: userId }, seen: false },
          { 
            seen: true,
            $addToSet: { readBy: { userId, readAt: new Date() } }
          }
        );

        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageSeen", { conversationId });
        }
      } catch (err) {
        console.error("messageSeen error:", err);
      }
    });

    // WebRTC Signaling
    socket.on('call:offer', async ({ to, from, offer, callerName, callerAvatar, callType, conversationId }) => {
      if (await isBlocked(from, to)) {
        socket.emit('action_blocked', { type: 'call', message: 'You cannot call this user.' });
        return;
      }
      const receiverSocketId = onlineUsers.get(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call:incoming', { from, offer, callerName, callerAvatar, callType, conversationId });
      }
    });

    socket.on('call:answer', ({ to, answer }) => {
      const receiverSocketId = onlineUsers.get(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call:answered', { answer });
      }
    });

    socket.on('call:ice-candidate', ({ to, candidate }) => {
      const receiverSocketId = onlineUsers.get(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call:ice-candidate', { candidate });
      }
    });

    socket.on('call:reject', ({ to }) => {
      const receiverSocketId = onlineUsers.get(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call:rejected');
      }
    });

    socket.on('call:end', async ({ to, conversationId, callerId, callType, duration, status }) => {
      const receiverSocketId = onlineUsers.get(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call:ended');
      }

      // Create a system message for the call record
      if (conversationId && callerId) {
        try {
          const callMessage = await Message.create({
            conversationId,
            sender: callerId,
            messageType: 'call',
            text: '',
            callData: {
              type: callType,
              duration: duration || 0,
              status: status || 'completed',
              initiatedBy: callerId,
            }
          });
          io.to(conversationId).emit('getMessage', callMessage);
        } catch (err) {
          console.error("Error saving call record:", err);
        }
      }
    });

    socket.on('call:busy', ({ to }) => {
      const receiverSocketId = onlineUsers.get(to);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('call:busy');
      }
    });

    // Profile updates
    socket.on('profile_updated', ({ userId, profilePic, bio, username }) => {
      console.log('📡 Broadcasting profile update for:', userId);
      io.emit('user_profile_updated', { userId, profilePic, bio, username });
    });

    // Social Action: Friend Removed
    socket.on('friend_removed', ({ fromUserId, toUserId }) => {
      const receiverSocketId = onlineUsers.get(toUserId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('friend_removed', { fromUserId, toUserId });
      }
    });

    // Social Action: User Blocked
    socket.on('user_blocked', ({ blockedBy, blockedUser }) => {
      const receiverSocketId = onlineUsers.get(blockedUser);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user_blocked', { blockedBy, blockedUser });
      }
    });

    // Disconnect
    socket.on("disconnect", async () => {
      let disconnectedUserId = null;

      // Find and remove user from online map
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          onlineUsers.delete(userId);
          break;
        }
      }

      if (disconnectedUserId) {
        await User.findByIdAndUpdate(disconnectedUserId, {
          isOnline: false,
          lastSeen: new Date(),
        });
        io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
      }

      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = { 
  initSocket, 
  getSocketIdByUserId: (userId) => onlineUsers.get(userId?.toString() || userId)
};
