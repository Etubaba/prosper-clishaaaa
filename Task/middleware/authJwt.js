const jwt = require('jsonwebtoken')
const config = require('../config/auth')
const db = require('../models')

const { TokenExpiredError } = jwt
const User = db.models.User

const verifyToken = (req, res, next) => {
  if (!req.headers['authorization']) {
    return res.status(403).send({
      status: false,
      message: 'No token provided!',
    })
  }
  const token = req.headers['authorization'].split(' ')[1]

  if (!token) {
    return res.status(403).send({
      status: false,
      message: 'No token provided!',
    })
  }

  return jwt.verify(token, config.secret, (err, user) => {
    if (err) {
      return catchError(err, res)
    }

    req.user = user
    next()
  })
}

const verifyAdminToken = (req, res, next) => {
  console.log('Admin')
  // const token = req.headers["x-access-token"];
  // console.log(req.headers["authorization"], '<<<>>>', req.headers["x-access-token"] );
  if (!req.headers['authorization']) {
    return res.status(403).send({
      status: false,
      message: 'No token provided!',
    })
  }
  const token = req.headers['authorization'].split(' ')[1]

  if (!token) {
    return res.status(403).send({
      status: false,
      message: 'No token provided!',
    })
  }

  return jwt.verify(token, config.admin_secret, (err, admin) => {
    if (err) {
      return catchError(err, res)
    }

    req.admin = admin
    next()
  })
}

const catchError = (err, res) => {
  if (err instanceof TokenExpiredError) {
    return res.status(401).send({
      status: false,
      message: 'Unauthorized! Access Token has expired!',
    })
  }
  return res.status(401).send({ status: false, message: 'Unauthorized!' })
}

module.exports = {
  verifyToken,
  verifyAdminToken,
}
