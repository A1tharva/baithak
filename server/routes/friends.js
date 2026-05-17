const express = require('express');
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const { getSocketIdByUserId } = require('../socket/socket');

const router = express.Router();

const isFriend = (arr, targetId) => {
  if (!arr || !Array.isArray(arr)) return false;
  return arr.map(id => id.toString()).includes(targetId.toString());
};

router.post('/repair-all', protect, async (req, res) => {
  try {
    console.log('=== STARTING FULL FRIENDS REPAIR ===');
    
    const allAcceptedRequests = await FriendRequest.find({ status: 'accepted' });
    console.log(`Found ${allAcceptedRequests.length} accepted requests to repair`);
    
    for (const req2 of allAcceptedRequests) {
      const senderId = req2.sender.toString();
      const receiverId = req2.receiver.toString();
      
      await User.findByIdAndUpdate(senderId, {
        $addToSet: { friends: receiverId }
      });
      await User.findByIdAndUpdate(receiverId, {
        $addToSet: { friends: senderId }
      });
      console.log(`Repaired: ${senderId} <-> ${receiverId}`);
    }
    
    const currentUser = await User.findById(req.user._id)
      .populate('friends', 'username profilePic bio');
    
    console.log('=== REPAIR COMPLETE ===');
    console.log('Current user friends after repair:', currentUser.friends.map(f => f.username));
    
    res.json({
      repairedCount: allAcceptedRequests.length,
      yourFriends: currentUser.friends,
    });
  } catch (err) {
    console.error('REPAIR ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

// Debug route
router.get('/debug', protect, async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('friends', 'username email profilePic');
  const requests = await FriendRequest.find({
    $or: [{ sender: req.user._id }, { receiver: req.user._id }]
  }).populate('sender receiver', 'username');
  
  res.json({
    userId: req.user._id,
    friendsArray: user.friends,
    friendsCount: user.friends.length,
    allRequests: requests,
  });
});

// Cleanup route
router.post('/cleanup', protect, async (req, res) => {
  try {
    const acceptedRequests = await FriendRequest.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
      status: 'accepted',
    });

    for (const req2 of acceptedRequests) {
      const senderId = req2.sender.toString();
      const receiverId = req2.receiver.toString();

      await User.findByIdAndUpdate(senderId, {
        $addToSet: { friends: receiverId }
      });
      await User.findByIdAndUpdate(receiverId, {
        $addToSet: { friends: senderId }
      });
    }

    const user = await User.findById(req.user._id)
      .populate('friends', 'username profilePic');

    res.json({
      message: 'Cleanup done.',
      friendsCount: user.friends.length,
      friends: user.friends,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search users (returns all users except self and existing friends)
router.get('/search', protect, async (req, res) => {
  try {
    const { query } = req.query;
    const trimmed = query?.trim();

    if (!trimmed || trimmed.length < 2) {
      return res.json([]);
    }

    const isEmailFormat = trimmed.includes('@');

    if (isEmailFormat) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        return res.status(400).json({ message: 'Invalid email format.' });
      }
    }

    const currentUser = await User.findById(req.user._id);

    const searchFilter = {
      _id: { $ne: req.user._id, $nin: currentUser.blockedUsers || [] },
      ...(isEmailFormat
        ? { email: trimmed.toLowerCase() }
        : { username: { $regex: trimmed, $options: 'i' } }
      ),
    };

    const users = await User.find(searchFilter)
      .select('username email profilePic bio')
      .limit(20);

    if (users.length === 0) {
      return res.json([]);
    }

    const usersWithStatus = await Promise.all(users.map(async (user) => {
      const request = await FriendRequest.findOne({
        $or: [
          { sender: req.user._id, receiver: user._id },
          { sender: user._id, receiver: req.user._id },
        ],
      });
      const isFriendLocal = isFriend(currentUser.friends, user._id);

      return {
        ...user.toObject(),
        isFriend: isFriendLocal,
        friendRequestStatus: request?.status || null,
        friendRequestId: request?._id || null,
        friendRequestSentByMe: request
          ? request.sender.toString() === req.user._id.toString()
          : false,
      };
    }));

    res.json(usersWithStatus);
  } catch (err) {
    console.error('SEARCH ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

// Send friend request
router.post('/request/:userId', protect, async (req, res) => {
  try {
    const targetId = req.params.userId;
    const currentUserId = req.user._id.toString();

    if (targetId === currentUserId) {
      return res.status(400).json({ message: 'Cannot send request to yourself.' });
    }

    const currentUser = await User.findById(currentUserId);

    const alreadyFriend = isFriend(currentUser.friends, targetId);

    if (alreadyFriend) {
      return res.status(400).json({ message: 'Already friends.' });
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: currentUserId, receiver: targetId },
        { sender: targetId, receiver: currentUserId },
      ],
      status: 'pending',
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already pending.' });
    }

    const request = await FriendRequest.create({
      sender: currentUserId,
      receiver: targetId,
    });

    const populatedRequest = await FriendRequest.findById(request._id)
      .populate('sender', 'username profilePic')
      .populate('receiver', 'username profilePic');

    const receiverSocketId = getSocketIdByUserId(targetId);
    if (receiverSocketId && req.io) {
      req.io.to(receiverSocketId).emit('friend_request_received', {
        requestId: request._id,
        sender: populatedRequest.sender,
      });
    }

    res.json({ message: 'Friend request sent.', request: populatedRequest });
  } catch (err) {
    console.error('SEND REQUEST ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

// Accept friend request
router.put('/accept/:requestId', protect, async (req, res) => {
  try {
    console.log('=== ACCEPT FRIEND REQUEST ===');
    console.log('Request ID:', req.params.requestId);
    console.log('Accepted by:', req.user._id);

    const request = await FriendRequest.findById(req.params.requestId);
    console.log('Found request:', request);

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found.' });
    }
    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Request is already ${request.status}.` });
    }

    request.status = 'accepted';
    await request.save();
    console.log('Request status updated to accepted');

    const senderId = request.sender.toString();
    const receiverId = request.receiver.toString();

    const senderBefore = await User.findById(senderId);
    const receiverBefore = await User.findById(receiverId);
    console.log('Sender friends BEFORE:', senderBefore.friends);
    console.log('Receiver friends BEFORE:', receiverBefore.friends);

    const senderAfter = await User.findByIdAndUpdate(
      senderId,
      { $addToSet: { friends: receiverId } },
      { new: true }
    );
    const receiverAfter = await User.findByIdAndUpdate(
      receiverId,
      { $addToSet: { friends: senderId } },
      { new: true }
    );

    console.log('Sender friends AFTER:', senderAfter.friends);
    console.log('Receiver friends AFTER:', receiverAfter.friends);

    const senderSocketId = getSocketIdByUserId(senderId);
    const receiverSocketId = getSocketIdByUserId(receiverId);

    if (senderSocketId && req.io) {
      req.io.to(senderSocketId).emit('friend_request_accepted', {
        newFriend: {
          _id: receiverAfter._id,
          username: receiverAfter.username,
          profilePic: receiverAfter.profilePic || '',
          bio: receiverAfter.bio || '',
        }
      });
      console.log('Emitted friend_request_accepted to sender socket:', senderSocketId);
    } else {
      console.log('Sender not connected via socket, skipping emit');
    }

    if (receiverSocketId && req.io) {
      req.io.to(receiverSocketId).emit('friend_added', {
        newFriend: {
          _id: senderAfter._id,
          username: senderAfter.username,
          profilePic: senderAfter.profilePic || '',
          bio: senderAfter.bio || '',
        }
      });
    }

    res.json({
      message: 'Friend request accepted.',
      senderId,
      receiverId,
      senderFriendsCount: senderAfter.friends.length,
      receiverFriendsCount: receiverAfter.friends.length,
    });

  } catch (err) {
    console.error('ACCEPT FRIEND REQUEST ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

// Reject friend request
router.put('/reject/:requestId', protect, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request || request.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    request.status = 'rejected';
    await request.save();
    res.json({ message: 'Friend request rejected.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all pending incoming requests
router.get('/requests/incoming', protect, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.user._id,
      status: 'pending',
    }).populate('sender', 'username profilePic bio');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get friends list
router.get('/list', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'username profilePic bio isOnline lastSeen');
    
    console.log('FRIENDS LIST REQUEST from:', req.user._id);
    console.log('Raw friends array:', user.friends);
    
    res.json(user.friends || []);
  } catch (err) {
    console.error('FRIENDS LIST ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

// Unfriend user
router.delete('/unfriend/:userId', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const friendId = req.params.userId;

    console.log('=== UNFRIEND FRIEND DEBUG ===');
    console.log('Current user ID:', userId.toString());
    console.log('Friend to remove ID:', friendId);

    if (!userId || !friendId) {
      return res.status(400).json({ message: 'Missing user ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      console.error('INVALID friendId:', friendId);
      return res.status(400).json({ message: 'Invalid friend ID' });
    }

    const currentUser = await User.findById(userId).select('friends');
    console.log('Current friends list:', currentUser.friends.map(f => f.toString()));
    
    const isFriend = currentUser.friends.some(
      f => f.toString() === friendId.toString()
    );
    console.log('Is actually a friend?', isFriend);

    if (!isFriend) {
      return res.status(400).json({ message: 'Not in friends list' });
    }

    const beforeCount = currentUser.friends.length;
    console.log('Friends count BEFORE removal:', beforeCount);

    const friendObjectId = new mongoose.Types.ObjectId(friendId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Remove friendId from current user's friends array
    const updatedUser = await User.findByIdAndUpdate(
      userObjectId,
      { $pull: { friends: friendObjectId } },
      { new: true, select: 'friends' }
    );

    const afterCount = updatedUser.friends.length;
    console.log('Friends count AFTER removal:', afterCount);
    console.log('Removed count:', beforeCount - afterCount);

    if (beforeCount - afterCount !== 1) {
      console.error('CRITICAL: Wrong number of friends removed!', {
        before: beforeCount,
        after: afterCount,
        diff: beforeCount - afterCount,
      });
      return res.status(500).json({ 
        message: 'Safety check failed — wrong removal count',
        before: beforeCount,
        after: afterCount,
      });
    }

    // Remove current user from friend's friends array
    await User.findByIdAndUpdate(
      friendObjectId,
      { $pull: { friends: userObjectId } },
      { new: true }
    );

    // Find and delete the conversation between them
    const conversation = await Conversation.findOneAndDelete({
      members: { 
        $all: [userObjectId, friendObjectId],
        $size: 2  // Only direct conversations
      }
    });

    if (conversation) {
      await Message.deleteMany({ 
        conversationId: conversation._id 
      });
      console.log('Conversation deleted:', conversation._id);
    }

    // Cancel friend requests between them only
    await FriendRequest.deleteMany({
      $or: [
        { sender: userObjectId, receiver: friendObjectId },
        { sender: friendObjectId, receiver: userObjectId },
      ]
    });

    // Emit real-time notification to the removed friend
    const receiverSocketId = getSocketIdByUserId(friendId);
    if (receiverSocketId && req.io) {
      req.io.to(receiverSocketId).emit('friend:removed', { removedBy: userId.toString() });
      req.io.to(receiverSocketId).emit('friend_removed', { fromUserId: userId.toString(), toUserId: friendId });
    }

    console.log('=== UNFRIEND SUCCESS ===');
    console.log('Removed:', friendId, 'from user:', userId.toString());

    res.json({
      message: 'Friend removed successfully',
      removedFriendId: friendId,
      remainingFriendsCount: updatedUser.friends.length,
    });
  } catch (err) {
    console.error('=== UNFRIEND ERROR ===', err);
    res.status(500).json({ message: err.message });
  }
});

// Alias route for remove friend
router.delete('/remove/:friendId', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const friendId = req.params.friendId;

    console.log('=== REMOVE FRIEND DEBUG ===');
    console.log('Current user ID:', userId.toString());
    console.log('Friend to remove ID:', friendId);

    if (!userId || !friendId) {
      return res.status(400).json({ message: 'Missing user ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      console.error('INVALID friendId:', friendId);
      return res.status(400).json({ message: 'Invalid friend ID' });
    }

    const currentUser = await User.findById(userId).select('friends');
    console.log('Current friends list:', currentUser.friends.map(f => f.toString()));
    
    const isFriend = currentUser.friends.some(
      f => f.toString() === friendId.toString()
    );
    console.log('Is actually a friend?', isFriend);

    if (!isFriend) {
      return res.status(400).json({ message: 'Not in friends list' });
    }

    const beforeCount = currentUser.friends.length;
    console.log('Friends count BEFORE removal:', beforeCount);

    const friendObjectId = new mongoose.Types.ObjectId(friendId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Remove friendId from current user's friends array
    const updatedUser = await User.findByIdAndUpdate(
      userObjectId,
      { $pull: { friends: friendObjectId } },
      { new: true, select: 'friends' }
    );

    const afterCount = updatedUser.friends.length;
    console.log('Friends count AFTER removal:', afterCount);
    console.log('Removed count:', beforeCount - afterCount);

    if (beforeCount - afterCount !== 1) {
      console.error('CRITICAL: Wrong number of friends removed!', {
        before: beforeCount,
        after: afterCount,
        diff: beforeCount - afterCount,
      });
      return res.status(500).json({ 
        message: 'Safety check failed — wrong removal count',
        before: beforeCount,
        after: afterCount,
      });
    }

    // Remove current user from friend's friends array
    await User.findByIdAndUpdate(
      friendObjectId,
      { $pull: { friends: userObjectId } },
      { new: true }
    );

    // Find and delete the conversation between them
    const conversation = await Conversation.findOneAndDelete({
      members: { 
        $all: [userObjectId, friendObjectId],
        $size: 2  // Only direct conversations
      }
    });

    if (conversation) {
      await Message.deleteMany({ 
        conversationId: conversation._id 
      });
      console.log('Conversation deleted:', conversation._id);
    }

    // Cancel friend requests between them only
    await FriendRequest.deleteMany({
      $or: [
        { sender: userObjectId, receiver: friendObjectId },
        { sender: friendObjectId, receiver: userObjectId },
      ]
    });

    // Emit real-time notification to the removed friend
    const receiverSocketId = getSocketIdByUserId(friendId);
    if (receiverSocketId && req.io) {
      req.io.to(receiverSocketId).emit('friend:removed', { removedBy: userId.toString() });
      req.io.to(receiverSocketId).emit('friend_removed', { fromUserId: userId.toString(), toUserId: friendId });
    }

    console.log('=== REMOVE FRIEND SUCCESS ===');
    console.log('Removed:', friendId, 'from user:', userId.toString());

    res.json({
      message: 'Friend removed successfully',
      removedFriendId: friendId,
      remainingFriendsCount: updatedUser.friends.length,
    });
  } catch (err) {
    console.error('=== REMOVE FRIEND ERROR ===', err);
    res.status(500).json({ message: err.message });
  }
});

// Block user
router.post('/block/:userId', protect, async (req, res) => {
  try {
    const targetId = req.params.userId;
    const currentId = req.user._id.toString();

    await User.findByIdAndUpdate(currentId, {
      $addToSet: { blockedUsers: targetId },
      $pull: { friends: targetId },
    });
    await User.findByIdAndUpdate(targetId, {
      $pull: { friends: currentId },
    });

    await FriendRequest.deleteMany({
      $or: [
        { sender: currentId, receiver: targetId },
        { sender: targetId, receiver: currentId },
      ],
    });

    console.log(`BLOCKED: ${currentId} blocked ${targetId}`);
    res.json({ message: 'User blocked.' });
  } catch (err) {
    console.error('BLOCK ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

// Unblock user
router.post('/unblock/:userId', protect, async (req, res) => {
  try {
    const targetId = req.params.userId;
    const currentId = req.user._id.toString();

    await User.findByIdAndUpdate(currentId, {
      $pull: { blockedUsers: targetId },
    });

    console.log(`UNBLOCKED: ${currentId} unblocked ${targetId}`);
    res.json({ message: 'User unblocked.' });
  } catch (err) {
    console.error('UNBLOCK ERROR:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
