const db = require('../models')

const User = db.models.User
const Admin = db.models.Admin

checkDuplicateUser = async (req, res, next) => {
  let email = req.body.email

  // Email
  User.findOne({
    where: { email: email },
  }).then((user) => {
    if (user) {
      res.status(400).send({
        status: false,
        message: 'Failed! Email is already in use!',
      })
      return
    }
    next()
  })
}

checkDuplicateAdmin = async (req, res, next) => {
  let email = req.body.email

  // Email
  Admin.findOne({
    where: { email: email },
  }).then((user) => {
    if (user) {
      return res.status(400).send({
        status: false,
        message: 'Failed! Email is already in use!',
      })
      return
    }
    next()
  })
}

checkRolesExisted = (req, res, next) => {
  if (req.body.roles) {
    for (let i = 0; i < req.body.roles.length; i++) {
      if (!ROLES.includes(req.body.roles[i])) {
        return res.status(400).send({
          status: false,
          message: 'Failed! Role does not exist = ' + req.body.roles[i],
        })
        return
      }
    }
  }

  next()
}

const verifySignUp = {
  checkDuplicateUser: checkDuplicateUser,
  checkDuplicateAdmin: checkDuplicateAdmin,
}

module.exports = verifySignUp
