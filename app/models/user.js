let crypto = require('crypto')
let mongoose = require('mongoose')

let userSchema = mongoose.Schema({
  local: {
    email: String,
    password: String
  },
  facebook: {
    id: String,
    token: String,
    email: String
  },
  google: {
    id: String,
    token: String,
    email: String,
    name: String
  },
  twitter: {
    id: String,
    token: String,
    secretToken: String,
    username: String,
    displayName: String
  }
})

userSchema.methods.generateHash = async function(password) {
  let hash = await crypto.promise.pbkdf2(password, 'PEPPER', 4096, 512, 'sha256')
  return hash.toString('hex')
}

userSchema.methods.validatePassword = async function(password) {
  let hash = await crypto.promise.pbkdf2(password, 'PEPPER', 4096, 512, 'sha256');
  return hash.toString('hex') === this.local.password
}

// Utility function for linking accounts
userSchema.methods.linkAccount = function(type, values) {
  // linkAccount('facebook', ...) => linkFacebookAccount(values)
  return this['link'+_.capitalize(type)+'Account'](values)
}

userSchema.methods.linkLocalAccount = function({email, password}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkFacebookAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkTwitterAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkGoogleAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkLinkedinAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.unlinkAccount = function(type) {
  throw new Error('Not Implemented.')
}

module.exports = mongoose.model('User', userSchema)
