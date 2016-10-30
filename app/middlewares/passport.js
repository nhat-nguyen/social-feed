let passport = require('passport')
let LocalStrategy = require('passport-local').Strategy
let FacebookStrategy = require('passport-facebook').Strategy
let GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
let TwitterStrategy = require('passport-twitter').Strategy
let wrap = require('nodeifyit')
let User = require('../models/user')

// Handlers
async function localAuthHandler(email, password) {
  let user = await User.promise.findOne({'local.email': email})

  if (!user || email !== user.local.email) {
    return [false, {message: 'Invalid username'}]
  }

  if (!await user.validatePassword(password)) {
    return [false, {message: 'Invalid password'}]
  }
  return user
}

async function twitterLoginHandler(req, token, secretToken, account) {
  let user = await User.promise.findOne({'twitter.id': account.id})
  console.log('---------------')
  console.log(token, secretToken)
  console.log('---------------')

  if (user) return user


  let accountDetails = {
    id: account.id,
    displayName: account.displayName,
    username: account.username,
    token: token,
    secretToken: secretToken
  }

  // Link facebook account to existing user
  if (req.user) {
    return await User.promise.findByIdAndUpdate(req.user._id, { 'twitter': accountDetails })
  }

  // User doesn't exist, create a new one
  user = new User()
  user['twitter'] = accountDetails
  return await user.save()
}

async function googleLoginHandler(req, token, _ignored_, account) {
  let user = await User.promise.findOne({'google.id': account.id})

  if (user) return user

  let accountDetails = {
    id: account.id,
    name: account.displayName,
    email: account.emails[0].value,
    token: token,
  }

  // Link facebook account to existing user
  if (req.user) {
    return await User.promise.findByIdAndUpdate(req.user._id, { 'google': accountDetails })
  }

  // User doesn't exist, create a new one
  user = new User()
  user['google'] = accountDetails
  return await user.save()
}

async function facebookLoginHandler(req, token, _ignored_, account) {
  let user = await User.promise.findOne({ 'facebook.id': account.id })

  if (user) return user

  let accountDetails = {
    id: account.id,
    email: account.emails[0].value,
    token: token
  }

  // Link facebook account to existing user
  if (req.user) {
    return await User.promise.findByIdAndUpdate(req.user._id, { 'facebook': accountDetails })
  }

  // User doesn't exist, create a new one
  user = new User()
  user['facebook'] = accountDetails
  return await user.save()
}

async function localSignupHandler(email, password) {
  email = (email || '').toLowerCase()
  // Is the email taken?
  if (await User.promise.findOne({'local.email': email})) {
    return [false, {message: 'That email is already taken.'}]
  }

  // create the user
  let user = new User()
  user.local.email = email
  // Use a password hash instead of plain-text
  user.local.password = await user.generateHash(password)
  return await user.save()
}

// 3rd-party Auth Helper
function loadPassportStrategy(OauthStrategy, handler, config) {
  config.passReqToCallback = true
  passport.use(new OauthStrategy(config, wrap(handler, {spread: true})))
}

function configure(CONFIG) {
  // Required for session support / persistent login sessions
  passport.serializeUser(wrap(async (user) => user._id))
  passport.deserializeUser(wrap(async (id) => {
    return await User.promise.findById(id)
  }))

  /**
   * Local Auth
   */
  let localLoginStrategy = new LocalStrategy({
    usernameField: 'email', // Use "email" instead of "username"
    failureFlash: true // Enable session-based error logging
  }, wrap(localAuthHandler, {spread: true}))

  let localSignupStrategy = new LocalStrategy({
    usernameField: 'email',
    failureFlash: true
  }, wrap(localSignupHandler, {spread: true}))


  // used to serialize the user for the session
  passport.serializeUser((user, done) => {
      done(null, user.id)
  })

  // used to deserialize the user
  passport.deserializeUser((id, done) => {
      User.findById(id, (err, user) => {
          done(err, user);
      })
  })


  passport.use('local-login', localLoginStrategy)
  passport.use('local-signup', localSignupStrategy)

  /**
   * 3rd-Party Auth
   */

  loadPassportStrategy(FacebookStrategy, facebookLoginHandler, {
     clientID: CONFIG.facebook.consumerKey,
     clientSecret: CONFIG.facebook.consumerSecret,
     callbackURL: CONFIG.facebook.callbackURL,
     profileFields: ['id', 'emails', 'name']
  })

  loadPassportStrategy(GoogleStrategy, googleLoginHandler, {
    clientID: CONFIG.google.clientID,
    clientSecret: CONFIG.google.clientSecret,
    callbackURL: CONFIG.google.callbackURL,
  })

  loadPassportStrategy(TwitterStrategy, twitterLoginHandler, {
    consumerKey: CONFIG.twitter.consumerKey,
    consumerSecret: CONFIG.twitter.consumerSecret,
    callbackURL: CONFIG.twitter.callbackURL
  })
  // loadPassportStrategy(LinkedInStrategy, {...}, 'linkedin')
  // loadPassportStrategy(FacebookStrategy, {...}, 'facebook')

  return passport
}

module.exports = {passport, configure}
