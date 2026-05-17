const express = require("express");
const router = express.Router();
const { searchUsers, getUserById, updateProfile } = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const User = require("../models/User");

router.get("/search", protect, searchUsers);
router.put("/profile", protect, updateProfile);

// Mute routes
router.post('/mute/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const alreadyMuted = user.mutedChats.some(
      m => m.conversationId?.toString() === conversationId
    );
    if (!alreadyMuted) {
      user.mutedChats.push({ conversationId });
      await user.save();
    }
    res.json({ muted: true, conversationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/unmute/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { mutedChats: { conversationId } }
    });
    res.json({ muted: false, conversationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/muted', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('mutedChats').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user.mutedChats || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get("/:id", protect, getUserById);

module.exports = router;
