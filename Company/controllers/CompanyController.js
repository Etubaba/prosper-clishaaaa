const db = require('../models')
const { check, body, validationResult } = require('express-validator')
const { s3BucketStorage } = require('../middleware/helper')
const multer = require('multer')
const path = require('path')
const fs = require('fs-extra')
const { Op } = require('sequelize')
const { emailService } = require('../services/email')
var bcrypt = require('bcryptjs')

const config = require('../config/mail')
const {
  adminInviteTemplate,
} = require('../services/email/template/inviteAdmin')
const {
  managerVerifyTemplate,
} = require('../services/email/template/managerVerifyTemplate')
const { BASE_URL, CLIENT_URL_MAIN } = require('../config/url')
// Models
const Token = db.models.Token
const Admin = db.models.Admin
const TempSubAdmins = db.models.TempSubAdmins

const profile = async (req, res) => {
  const { admin_id, company_id } = req.company
  const admin = await Admin.findOne({ where: { id: admin_id } })
  const token = await Token.findOne({ where: { id: company_id } })

  return res.status(200).send({
    status: true,
    data: { admin: admin, company: token },
    // message: 'Comapny Profile Information',
  })
}

const updateCompany = async (req, res) => {
  const { admin_id, company_id } = req.company

  const data = {}

  if (req.body.name) {
    data.name = req.body.name
  }

  if (req.body.description) {
    data.description = req.body.description
  }
  if (req.body.category) {
    data.category = req.body.category
  }
  if (req.body.value) {
    data.value = req.body.value
  }
  if (req.body.background) {
    data.background = req.body.background
  }
  if (req.body.foreground) {
    data.foreground = req.body.foreground
  }
  if (req.body.card_colors) {
    data.card_colors = req.body.card_colors
  }
  if (req.body.address_line) {
    data.address_line = req.body.address_line
  }
  if (req.body.address_line_two) {
    data.address_line_two = req.body.address_line_two
  }
  if (req.body.zip) {
    data.zip = req.body.zip
  }
  if (req.body.city) {
    data.city = req.body.city
  }
  if (req.body.country) {
    data.country = req.body.country
  }
  if (req.body.vat_number) {
    data.vat_number = req.body.vat_number
  }
  if (req.body.phone_number) {
    data.phone_number = req.body.phone_number
  }

  if (Object.keys(data).length == 0) {
    return res.status(401).json({
      status: false,
      message: 'Select atleast one field to update',
      data: '',
    })
  }

  const token = await Token.update(data, { where: { id: company_id } })

  return res.status(201).send({
    status: true,
    message: 'Token updated succesfully',
  })
}

const updateCompanyPhoto = async (req, res) => {
  const maxSize = 1 * 1000 * 1000
  const { admin_id, company_id } = req.company

  var uploadTokenPhoto = multer({
    storage: s3BucketStorage,
    limits: { fileSize: maxSize },
    fileFilter: function (req, file, cb) {
      var filetypes = /jpeg|jpg|png/
      var mimetype = filetypes.test(file.mimetype)

      var extname = filetypes.test(
        path.extname(file.originalname).toLowerCase()
      )

      if (mimetype && extname) {
        return cb(null, true)
      }

      cb(
        'Error: File upload only supports the ' +
          'following filetypes - ' +
          filetypes,
        false
      )
    },
  }).single('photo')

  uploadTokenPhoto(req, res, async (err) => {
    if (err) {
      return res.status(400).send({
        status: false,
        message: err,
      })
    } else {
      console.log(req.file)

      const profile_update = await Token.update(
        { photo: req.file.location },
        { where: { id: company_id } }
      )
      return res.send({
        status: true,
        message: 'Company Profile Photo Updated succesfully',
      })
    }
  })
}

const updateCompanyIcon = async (req, res) => {
  const maxSize = 1 * 1000 * 1000
  const { admin_id, company_id } = req.company

  var uploadTokenIcon = multer({
    storage: s3BucketStorage,
    limits: { fileSize: maxSize },
    fileFilter: function (req, file, cb) {
      var filetypes = /jpeg|jpg|png/
      var mimetype = filetypes.test(file.mimetype)

      var extname = filetypes.test(
        path.extname(file.originalname).toLowerCase()
      )

      if (mimetype && extname) {
        return cb(null, true)
      }

      cb(
        'Error: File upload only supports the ' +
          'following filetypes - ' +
          filetypes,
        false
      )
    },
  }).single('icon')

  uploadTokenIcon(req, res, async (err) => {
    if (err) {
      return res.status(400).send({
        status: false,
        message: err,
      })
    } else {
      // let path = `./assets/company/${token.icon}`;
      // if (token.icon && fs.existsSync(path)) fs.unlinkSync(path);

      await Token.update(
        { icon: req.file.location },
        { where: { id: company_id } }
      )

      return res.send({
        status: true,
        message: 'Company Icon Updated succesfully',
      })
    }
  })
}

const updateCompanyAdmin = async (req, res) => {
  const { admin_id, company_id } = req.company

  const data = {}

  if (req.body.firstname && req.body.lastname) {
    data.firstname = req.body.firstname
    data.lastname = req.body.lastname
    data.name = `${req.body.firstname} ${req.body.lastname}`
  }

  const admin = await Admin.update(data, { where: { id: admin_id } })

  return res.status(201).send({
    status: true,
    message: 'Admin updated successfully',
  })
}

const allAdminManagers = async (req, res) => {
  try {
    const company = await Admin.findAll({
      where: {
        role: 'clisha-manager',
      },
    })

    if (!company)
      return res.status(404).json({
        status: false,
        message: 'No company  found',
      })
    res.status(200).json({
      status: true,
      managers: company,
    })
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `An error occur getting admin ${err.message}`,
    })
  }
}

const createClishaManagers = async (req, res) => {
  const { firstname, lastname, email, password } = req.body

  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }
  try {
    const reqAdmin = await Admin.findOne({ where: { email } })

    if (reqAdmin)
      return res
        .status(400)
        .json({ status: false, message: 'Admin already exist' })

    //check id email is sent already

    let adminProps = {
      email,
      firstname,
      lastname,
      password: bcrypt.hashSync(password),
      name: 'clisha',
      role: 'clisha-manager',
    }
    //create temp admin

    const admin = await Admin.create(adminProps)

    //send verification email to admin
    const url = `${BASE_URL}/company/admin/verify/email?id=${email}`

    const html = managerVerifyTemplate(url, `${firstname + ' ' + lastname}`)
    const emailProps = {
      email,
      subject: 'Welcome To Clisha!',
      html,
    }

    emailService(emailProps)

    return res
      .status(200)
      .json({ status: true, admin, message: 'Admin created successfully' })
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `Error: ${err.message}`,
    })
  }
}

const inviteAdmin = async (req, res) => {
  const { firstname, lastname, company_id, email, password } = req.body

  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }
  try {
    //get company
    const company = await Token.findOne({ where: { adminId: company_id } })

    if (!company) {
      return res.status(404).json({
        status: false,
        message: 'Company not found',
      })
    }

    const reqAdmin = await Admin.findOne({ where: { email } })

    if (reqAdmin)
      return res
        .status(400)
        .json({ status: false, message: 'Admin already exist' })

    //check id email is sent already

    let adminProps = {
      email,
      firstname,
      lastname,
      password: bcrypt.hashSync(password),
      name: company.name,
      role: 'manager',
    }
    //create temp admin

    const admin = await Admin.create(adminProps)

    company.subAdmins === null || company.subAdmins[0] === null
      ? await Token.update(
          { subAdmins: [{ adminId: admin.id }] },
          { where: { adminId: company_id } }
        )
      : await Token.update(
          { subAdmins: [...company.subAdmins, { adminId: admin.id }] },
          { where: { adminId: company_id } }
        )

    //send invitation email
    const url = `${BASE_URL}/company/invite/verify?admin_id=${admin.id}` // adjust to fit

    const html = adminInviteTemplate(url, email, password)
    const emailProps = {
      email,
      subject: 'Invitation to Clisha',
      html,
    }
    emailService(emailProps)
    return res
      .status(200)
      .json({ status: true, message: 'Invitation sent successfully' })
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `Error: ${err.message}`,
    })
  }
}

const verifyAdminFromInvite = async (req, res) => {
  const { admin_id } = req.query
  try {
    //get admin
    const admin = await Admin.findOne({ where: { id: admin_id } })

    const date = new Date()
    await Admin.update({ email_verified_at: date }, { where: { id: admin.id } })

    res.redirect(`${CLIENT_URL_MAIN}/login`)
  } catch (err) {
    res.status(500).json({ status: false, message: `Error :${err.message}` })
  }
}

const assignAdmin = async (req, res) => {
  const { admin_id, company_id } = req.query
  try {
    const admin = await Admin.findOne({ where: { id: admin_id } })

    if (!admin) {
      return res.status(404).send('No admin found')
    }

    const company = await Token.findOne({ where: { adminId: company_id } })
    if (!company) {
      return res.status(404).send('Company not found found')
    }

    company.subAdmins === null || company.subAdmins[0] === null
      ? await Token.update(
          { subAdmins: [{ adminId: admin.id }] },
          { where: { adminId: company_id } }
        )
      : await Token.update(
          { subAdmins: [...company.subAdmins, { adminId: admin.id }] },
          { where: { adminId: company_id } }
        )

    return res
      .status(200)
      .json({ status: false, message: `Admin Assigned successfully. ` })
  } catch (err) {
    res.status(500).json({ status: false, message: `Error: ${err.message}` })
  }
}

function inviteAdminValidator() {
  return [
    check('email')
      .notEmpty()
      .withMessage('Email is required')
      .escape()
      .isEmail()
      .withMessage('Invalid Email'),

    check('firstname').notEmpty(),
    check('lastname').notEmpty(),

    check('company_id').notEmpty(),

    check('password')
      .notEmpty()
      .withMessage('password is required')
      .isLength({ min: 8, max: 25 })
      .withMessage('password must be between 8 to 25 characters'),
  ]
}

const validateCreateClishaManager = () => {
  return [
    check('email')
      .notEmpty()
      .withMessage('Email is required')
      .escape()
      .isEmail()
      .withMessage('Invalid Email'),

    check('firstname').notEmpty(),
    check('lastname').notEmpty(),
    check('password')
      .notEmpty()
      .withMessage('password is required')
      .isLength({ min: 8, max: 25 })
      .withMessage('password must be between 8 to 25 characters'),
  ]
}

module.exports = {
  profile,
  updateCompany,
  updateCompanyPhoto,
  updateCompanyIcon,
  updateCompanyAdmin,
  allAdminManagers,
  createClishaManagers,
  inviteAdmin,
  verifyAdminFromInvite,
  inviteAdminValidator,
  assignAdmin,
  validateCreateClishaManager,
}
