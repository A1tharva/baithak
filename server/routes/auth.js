const express = require("express");
const router = express.Router();
const { register, login, getMe, logout, generateToken } = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const passport = require("passport");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/logout", protect, logout);

// Google OAuth
router.get("/google", (req, res, next) => {
  try {
    if (!passport._strategy("google")) {
      console.error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing in .env");
      return res.status(503).json({
        message: "Google OAuth is not configured.",
      });
    }
    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
  } catch (err) {
    console.error("GOOGLE AUTH INITIATION ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate("google", { failureRedirect: "/login", session: true }, (err, user, info) => {
      if (err) {
        console.error("GOOGLE OAUTH STRATEGY ERROR:", err);
        return res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
      }
      if (!user) {
        console.error("GOOGLE OAUTH NO USER ERROR:", info);
        return res.redirect("/login?error=no_user");
      }
      req.logIn(user, (err) => {
        if (err) {
          console.error("GOOGLE OAUTH LOGIN ERROR:", err);
          return res.redirect("/login?error=login_failed");
        }
        
        // Generate JWT
        const token = generateToken(user._id);
        
        // Redirect to frontend with token
        const clientUrl = process.env.CLIENT_URL || "https://localhost:5173";
        res.redirect(`${clientUrl}/oauth-success?token=${token}&userId=${user._id}`);
      });
    })(req, res, next);
  }
);

module.exports = router;
