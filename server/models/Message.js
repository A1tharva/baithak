const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    // ── File / media support ──────────────────────────────────
    messageType: {
      type: String,
      enum: ["text", "image", "video", "audio", "file", "gif", "call"],
      default: "text",
    },
    callData: {
      type: { type: String, enum: ["video", "audio"] },
      duration: { type: Number }, // in seconds
      status: { type: String, enum: ["completed", "missed", "rejected", "busy"] },
      initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    replyTo: {
      id: { type: String },
      senderName: { type: String },
      text: { type: String },
    },
    attachment: {
      url:          { type: String },          // Cloudinary secure URL
      publicId:     { type: String },          // For deletion via Cloudinary API
      fileName:     { type: String },          // Original file name
      fileSize:     { type: Number },          // In bytes
      mimeType:     { type: String },
      width:        { type: Number },          // Images only
      height:       { type: Number },          // Images only
      thumbnailUrl: { type: String },          // Auto-generated thumbnail (images)
    },
    // ─────────────────────────────────────────────────────────
    seen: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
    isForwarded: {
      type: Boolean,
      default: false,
    },
    fileUrl: { type: String },
    fileType: { type: String },
    fileName: { type: String },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for fast queries
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ sender: 1 });

module.exports = mongoose.model("Message", messageSchema);
