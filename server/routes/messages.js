const express = require("express");
const router = express.Router();
const { sendMessage, getMessages, deleteMessage } = require("../controllers/messageController");
const { protect } = require("../middleware/auth");

router.post("/", protect, sendMessage);
router.get("/:conversationId", protect, getMessages);
router.delete("/:messageId", protect, deleteMessage);

module.exports = router;
