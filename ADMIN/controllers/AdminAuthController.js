const db = require('../models')
const { Op, Sequelize } = require('sequelize')
const config = require('../config/auth')
var jwt = require('jsonwebtoken')
var bcrypt = require('bcryptjs')
// Models
const Admin = db.models.Admin

const createBaseAdmin = async (req, res) => {
  const admin = {
    name: 'Daniel - Clisha',
    email: 'admin@expectoo.dev',
    role: 'superadmin',
    password: bcrypt.hashSync('Clisha_@dm!N'),
  }

  const clisha = {
    name: 'Martins - Clisha',
    email: 'clisha@expectoo.dev',
    role: 'superadmin',
    password: bcrypt.hashSync('M@rt!el_Clisha'),
  }

  const newAdmin = await Admin.create(clisha)

  return res.send({
    status: true,
    data: newAdmin,
    message: 'Admins Created',
  })
}

const authenticate = async (req, res) => {
  try {
    let email = req.body.email,
      password = req.body.password

    let admin = await Admin.findOne({ where: { email: email } })

    if (!admin) {
      return res
        .status(404)
        .send({ status: false, message: 'Admin Not found.' })
    }

    var validPassword = bcrypt.compareSync(password, admin.password)

    if (!validPassword) {
      return res.status(401).send({
        status: false,
        accessToken: null,
        message: 'Invalid Password!',
      })
    }

    var token = jwt.sign({ id: admin.id }, config.admin_secret, {
      expiresIn: 86400 * 60, // 60 Days
    })

    return res.status(200).send({
      status: true,
      data: { admin, accessToken: token },
      message: 'Admin Login Succesfully',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

const clishaAdminList = (req, res) => {
  const admin = req.admin.id

  return res.send({
    status: true,
    admin,
    message: 'Admins Information',
  })
}

const createClishaAdmin = (req, res) => {
  console.log('Creating  User Details')

  return res.send({
    status: true,
  })
}

module.exports = {
  authenticate,
  createBaseAdmin,
  clishaAdminList,
  createClishaAdmin,
}
