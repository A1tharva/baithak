const User = require("../models/User");

// @GET /api/users/search?q=query — Search users
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user._id;

    if (!q || q.trim().length < 1) {
      return res.json([]);
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    })
      .select("-password")
      .limit(10);

    res.json(users);
  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/users/:id — Get user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// @PUT /api/users/profile — Update user profile
const updateProfile = async (req, res) => {
  try {
    const { bio, profilePic, username } = req.body;
    const userId = req.user._id;

    const updateFields = {};
    if (bio !== undefined) updateFields.bio = bio;
    if (profilePic !== undefined) updateFields.profilePic = profilePic;
    
    if (username) {
      const trimmedUsername = username.trim();
      // Check if username is taken by someone else
      const existing = await User.findOne({ 
        username: trimmedUsername, 
        _id: { $ne: userId } 
      });
      if (existing) {
        return res.status(400).json({ message: 'Username already taken.' });
      }
      updateFields.username = trimmedUsername;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true }
    ).select("-password");
    
    console.log('✅ SAVED USER PROFILE:', updatedUser.username);

    res.json(updatedUser);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { searchUsers, getUserById, updateProfile };
