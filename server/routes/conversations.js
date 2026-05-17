const express = require("express");
const router = express.Router();
const {
  createOrGetConversation,
  getUserConversations,
  markConversationAsRead,
} = require("../controllers/conversationController");
const { protect } = require("../middleware/auth");

router.post("/", protect, createOrGetConversation);
router.get("/:userId", protect, getUserConversations);
router.post("/:conversationId/read", protect, markConversationAsRead);

module.exports = router;
