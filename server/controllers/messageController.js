const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

// @POST /api/messages — Send a message (text, image, or file)
const sendMessage = async (req, res) => {
  try {
    const { conversationId, text, messageType, attachment, replyTo, isForwarded } = req.body;
    const senderId = req.user._id;

    if (!conversationId) {
      return res.status(400).json({ message: "conversationId is required" });
    }

    const type = messageType || 'text';

    // For text messages, require content
    if (type === 'text' && !text?.trim()) {
      return res.status(400).json({ message: "text is required for text messages" });
    }

    // Create message
    const message = await Message.create({
      conversationId,
      sender: senderId,
      text:        text ? text.trim() : '',
      messageType: type,
      attachment:  attachment || null,
      replyTo:     replyTo || null,
      isForwarded: !!isForwarded
    });

    // Update conversation's lastMessage and updatedAt
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    // Increment unread count for everyone except sender
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      const otherParticipants = (conversation.members || []).filter(
        p => p.toString() !== senderId.toString()
      );

      for (const participantId of otherParticipants) {
        await Conversation.findOneAndUpdate(
          { 
            _id: conversationId,
            'unreadCounts.userId': participantId 
          },
          { $inc: { 'unreadCounts.$.count': 1 } }
        );

        // If participant not in unreadCounts array yet, push them
        const conv = await Conversation.findById(conversationId);
        const hasEntry = conv.unreadCounts.some(
          u => u.userId.toString() === participantId.toString()
        );
        if (!hasEntry) {
          await Conversation.findByIdAndUpdate(conversationId, {
            $push: { 
              unreadCounts: { userId: participantId, count: 1 } 
            }
          });
        }

        // Emit updated unread count to recipient if online
        const updatedConv = await Conversation.findById(conversationId);
        const unreadEntry = updatedConv.unreadCounts.find(
          u => u.userId.toString() === participantId.toString()
        );

        const { getSocketIdByUserId } = require("../socket/socket");
        const receiverSocketId = getSocketIdByUserId(participantId);
        if (receiverSocketId && req.io) {
          req.io.to(receiverSocketId).emit('unread:update', {
            conversationId,
            count: unreadEntry?.count || 1,
          });
        }
      }
    }

    const populated = await message.populate("sender", "username profilePic");
    const result = populated.toObject();
    res.status(201).json(result);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/messages/:conversationId — Get messages for a conversation
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const messages = await Message.find({
      conversationId,
      deleted: false,
    })
      .populate("sender", "username profilePic")
      .populate("readBy.userId", "username profilePic")
      .sort({ createdAt: 1 })
      .lean();

    // Mark messages from others as seen
    await Message.updateMany(
      { conversationId, sender: { $ne: userId }, seen: false },
      { seen: true }
    );

    // Reset unread count to 0 for this user
    await Conversation.findOneAndUpdate(
      { 
        _id: conversationId,
        'unreadCounts.userId': userId 
      },
      { $set: { 'unreadCounts.$.count': 0 } }
    );

    res.json(messages);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @DELETE /api/messages/:messageId — Soft delete a message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    message.deleted = true;
    await message.save();

    res.json({ message: "Message deleted" });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { sendMessage, getMessages, deleteMessage };
