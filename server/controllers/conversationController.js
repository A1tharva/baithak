const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// @POST /api/conversations — Create or get existing conversation
const createOrGetConversation = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId is required" });
    }

    const User = require("../models/User");
    const currentUser = await User.findById(senderId);
    
    const canChat = (currentUser.friends || [])
      .map(f => f.toString())
      .includes(receiverId.toString());

    if (!canChat) {
      return res.status(403).json({ message: "You can only chat with friends." });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    })
      .populate("members", "-password")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username profilePic" },
      });

    if (conversation) {
      return res.json(conversation);
    }

    // Create new conversation
    conversation = await Conversation.create({
      members: [senderId, receiverId],
    });

    conversation = await conversation.populate("members", "-password");
    res.status(201).json(conversation);
  } catch (err) {
    console.error("Conversation error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/conversations/:userId — Get all conversations for a user
const getUserConversations = async (req, res) => {
  try {
    const userId = req.params.userId;

    const rawConversations = await Conversation.find({
      members: { $in: [userId] },
    })
      .populate("members", "-password")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username profilePic" },
      })
      .sort({ updatedAt: -1 });

    const User = require("../models/User");
    const currentUser = await User.findById(userId);
    const friendsSet = new Set((currentUser?.friends || []).map(id => id.toString()));

    const conversations = [];
    for (const conv of rawConversations) {
      if (conv.members.length === 2) {
        const otherMember = conv.members.find(m => m._id.toString() !== userId);
        if (otherMember && !friendsSet.has(otherMember._id.toString())) {
          // Self-healing: they are no longer friends! Delete this stale conversation and its messages.
          console.log(`Self-healing: deleting stale conversation ${conv._id} between ${userId} and no-longer-friend ${otherMember._id}`);
          await Conversation.findByIdAndDelete(conv._id);
          await Message.deleteMany({ conversationId: conv._id });
          continue;
        }
      }
      conversations.push(conv);
    }

    // Add unread count per conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadEntry = conv.unreadCounts?.find(
          u => u.userId.toString() === userId.toString()
        );
        const unreadCount = unreadEntry ? unreadEntry.count : await Message.countDocuments({
          conversationId: conv._id,
          sender: { $ne: userId },
          seen: false,
        });
        return { ...conv.toObject(), unreadCount };
      })
    );

    res.json(conversationsWithUnread);
  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @POST /api/conversations/:conversationId/read — Reset unread count to 0 for a user
const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // Reset this user's unread count to 0
    await Conversation.findOneAndUpdate(
      { 
        _id: conversationId,
        'unreadCounts.userId': userId 
      },
      { $set: { 'unreadCounts.$.count': 0 } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createOrGetConversation, getUserConversations, markConversationAsRead };
