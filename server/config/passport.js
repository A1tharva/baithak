const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    
    if (!user) {
      // Check if user with same email exists
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // Link google account
        user.googleId = profile.id;
        if (!user.profilePic) user.profilePic = profile.photos[0]?.value;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          googleId: profile.id,
          username: profile.displayName.replace(/\s+/g, '_').toLowerCase(),
          email: profile.emails[0].value,
          profilePic: profile.photos[0]?.value || '',
          isOnline: true
        });
      }
    }
    
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
