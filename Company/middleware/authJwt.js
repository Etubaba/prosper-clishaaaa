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
    if (err) return catchError(err, res)

    req.user = user
    next()
  })
}

const verifyCompanyToken = (req, res, next) => {
  console.log('Company')

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

  return jwt.verify(token, config.company_secret, (err, company) => {
    if (err) return catchError(err, res)

    req.company = company
    next()
  })
}

const wrapAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const catchError = (err, res) => {
  console.log('Catch', err);
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
  verifyCompanyToken,
  wrapAsync
}
