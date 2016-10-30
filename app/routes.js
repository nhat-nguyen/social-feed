require('songbird')
let isLoggedIn = require('./middlewares/isLoggedIn')
let posts = require('../data/posts')
let Twitter = require('twitter')
let networks = {
  twitter: {
    icon: 'twitter',
    name: 'Twitter',
    class: 'btn-info'
  }
}

function facebook(app) {
  let passport = app.passport
  let scope = 'email'

  // Authentication route & Callback URL
  app.get('/auth/facebook', passport.authenticate('facebook', {scope}))
  app.get('/auth/facebook/callback', passport.authenticate('facebook', {
      successRedirect: '/profile',
      failureRedirect: '/profile',
      failureFlash: true
  }))

  // Authorization route & Callback URL
  app.get('/connect/facebook', passport.authorize('facebook', {scope}))
  app.get('/connect/facebook/callback', passport.authorize('facebook', {
      successRedirect: '/profile',
      failureRedirect: '/profile',
      failureFlash: true
  }))
}

function google(app) {
  let passport = app.passport
  let scope = ['email', 'profile', 'https://www.googleapis.com/auth/plus.login']
  // Authentication route & Callback URL
  app.get('/auth/google', passport.authenticate('google', {scope}))

  app.get('/auth/google/callback', passport.authenticate('google', {
      successRedirect: '/profile',
      failureRedirect: '/profile',
      failureFlash: true
  }))

  // Authorization route & Callback URL
  app.get('/connect/google', passport.authorize('google', {scope}))
  app.get('/connect/google/callback', passport.authorize('google', {
      successRedirect: '/profile',
      failureRedirect: '/profile',
      failureFlash: true
  }))
}

function twitter(app) {
  let passport = app.passport
  let scope = 'email'

  // Authentication route & Callback URL
  app.get('/auth/twitter', passport.authenticate('twitter', {scope}))

  app.get('/auth/twitter/callback', passport.authenticate('twitter', {
      successRedirect: '/profile',
      failureRedirect: '/profile',
      failureFlash: true
  }))

  // Authorization route & Callback URL
  app.get('/connect/twitter', passport.authorize('twitter', {scope}))
  app.get('/connect/twitter/callback', passport.authorize('twitter', {
      successRedirect: '/profile',
      failureRedirect: '/profile',
      failureFlash: true
  }))
}

module.exports = (app) => {
  let passport = app.passport
  let twitterConfig = app.config.auth.twitter

  app.get('/', (req, res) => {
    res.render('index.ejs', {message: req.flash('error')})
  })

  app.get('/profile', isLoggedIn, (req, res) => {
    res.render('profile.ejs', {
      user: req.user,
      message: req.flash('error')
    })
  })

  app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
  })

  app.get('/login', (req, res) => {
      res.render('login.ejs', {message: req.flash('error')})
  })

  app.get('/signup', (req, res) => {
      res.render('signup.ejs', {message: req.flash('error') })
  })

  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile',
    failureRedirect: '/',
    failureFlash: true
  }))
  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile',
    failureRedirect: '/',
    failureFlash: true
  }))

  app.get('/timeline', isLoggedIn, async (req, res) => {
    let client = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secretToken
    })

    let tweets = await client.promise.get('statuses/home_timeline')

    tweets = tweets.map(tweet => {
      return {
        id: tweet.id_str,
        image: tweet.user.profile_image_url,
        text: tweet.text,
        name: tweet.user.name,
        username: '@' + tweet.user.screen_name,
        liked: tweet.favorited,
        network: networks.twitter
      }
    })

    res.render('timeline.ejs', {
      posts: tweets
    })
  })

  app.get('/compose', isLoggedIn, (req, res) => {
    res.render('compose.ejs')
  })

  app.post('/compose', isLoggedIn, async (req, res) => {
    let status = req.body.reply.trim()
    if (status.length > 140) {
      return req.flash('error', 'Status is over 140 characters')
    }

    if (status.length === 0) {
      return req.flash('error', 'Status is empty')
    }

    let client = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secretToken
    })

    await client.promise.post('statuses/update', { status })

    res.redirect('/timeline')
  })

  app.post('/like/:id', isLoggedIn, async (req, res) => {
    let client = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secretToken
    })

    let id = req.params.id
    await client.promise.post('favorites/create', {id})
    res.end()
  })

  app.post('/unlike/:id', isLoggedIn, async (req, res) => {
    let client = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secretToken
    })

    let id = req.params.id
    await client.promise.post('favorites/destroy', {id})
    res.end()
  })

  app.get('/share/:id', isLoggedIn, async (req, res) => {
    let client = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secretToken
    })

    let id = req.params.id
    let tweet = await client.promise.get('statuses/show', {id})

    let post = {
      id: tweet.id_str,
      image: tweet.user.profile_image_url,
      text: tweet.text,
      name: tweet.user.name,
      username: '@' + tweet.user.screen_name,
      liked: tweet.favorited,
      network: networks.twitter
    }
    res.render('share.ejs', { post })
  })

  app.post('/share/:id', isLoggedIn, async (req, res) => {
    let client = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secretToken
    })

    let sharePostUrl = `https://twitter.com/user/status/${req.params.id}`
    let status = req.body.share + ' ' + sharePostUrl
    await client.promise.post('statuses/update', { status })
    res.redirect('/timeline')
  })

  app.get('/reply/:id', isLoggedIn, async (req, res) => {
    let client = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secretToken
    })

    let id = req.params.id
    let tweet = await client.promise.get('statuses/show', {id})
    let post = {
      id: tweet.id_str,
      image: tweet.user.profile_image_url,
      text: tweet.text,
      name: tweet.user.name,
      username: '@' + tweet.user.screen_name,
      liked: tweet.favorited,
      network: networks.twitter
    }
    res.render('reply.ejs', { post })
  })

  app.post('/reply/:id', isLoggedIn, async (req, res) => {
    let client = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secretToken
    })

    let replyToId = req.params.id
    let status = req.body.reply

    await client.promise.post('statuses/update', {in_reply_to_status_id: replyToId, status: status})
    res.redirect('/timeline')
  })

  facebook(app)
  google(app)
  twitter(app)
}
