const db = require('../models')
const { Op, Sequelize } = require('sequelize')
const config = require('../config/auth')
var jwt = require('jsonwebtoken')
var bcrypt = require('bcryptjs')
require('dotenv').config()
const { check, validationResult, body } = require('express-validator')

// Initialize Queues
const { ClishaRecordQueue } = require('../services/queue')
const { emailService } = require('../services/email')
const { verifyTemplate } = require('../services/email/template/verifyemail')
const {
  comfirmPasswordTemplate,
} = require('../services/email/template/confirmPassword')
const { BASE_URL, CLIENT_URL_MAIN } = require('../config/url')

const verificationEmailQueue = new ClishaRecordQueue(
  'company_verification_email'
)

// Models
const Admin = db.models.Admin
const Token = db.models.Token
const CompanyWallet = db.models.CompanyWallet

const createCompany = async (req, res) => {
  const { firstname, lastname, company_name, email, password } = req.body

  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: errors.array(),
      })
    }

    const adminExists = await Admin.findOne({ where: { email } })

    if (adminExists) {
      return res.status(401).json({
        status: false,
        message: 'Admin already exists',
        data: '',
      })
    }

    const clisha = {
      firstname,
      lastname,
      name: company_name,
      email,
      password: bcrypt.hashSync(password),
      email_verified_at: new Date(),
    }

    const admin = await Admin.create(clisha)

    const company = await Token.create({
      name: company_name,
      companyId: admin.id,
      adminId: admin.id,
    })

    const wallet = await CompanyWallet.create({
      companyId: company.id,
    })

    //send verification email to admin
    const url = `${BASE_URL}/company/admin/verify/email?id=${email}` //url for verification (to be updated)

    const html = verifyTemplate(url)
    const emailProps = {
      email,
      subject: 'Welcome To Clisha!',
      html,
    }

    emailService(emailProps)

    return res.send({
      status: true,
      data: { admin, company },
      message: 'Company created successfully',
    })
  } catch (err) {
    res.send({ statusCode: 500, message: 'Error occur ' + err })
    console.log(err)
  }
}

const loginCompany = async (req, res) => {
  const { email, password } = req.body

  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }
  try {
    // check if admin already exist
    // const admin = await Admin.findOne({
    //   where: { email: email, role: 'clisha-manager' },
    // })

    const rolesToFind = ['company', 'manager', 'clisha-manager']
    const admin = await Admin.findOne({
      where: {
        email: email,
        role: {
          [Op.or]: rolesToFind,
        },
      },
    })

    if (!admin) {
      return res
        .status(404)
        .send({ status: false, message: 'Admin not found.' })
    }

    const validPassword = bcrypt.compareSync(password, admin.password)

    if (!validPassword) {
      return res.status(401).send({
        status: false,
        accessToken: null,
        message: 'Invalid Password!',
      })
    }

    const company = await Token.findOne({ where: { companyId: admin.id } })
    if (company) {
      const wallet = await CompanyWallet.findOne({
        where: { companyId: company.id },
      })
      if (!wallet) {
        await CompanyWallet.create({ companyId: company.id })
      }

      const token = jwt.sign(
        { admin_id: admin.id, company_id: company.id },
        config.company_secret,
        {
          expiresIn: 86400 * 60, // 60 Days
        }
      )

      return res.status(200).send({
        status: true,
        data: { admin, company, accessToken: token },
        message: 'Company authentication successful',
      })
    } else {
      //check if its subadmin
      const allCompany = await Token.findAll({})

      const targetCompany = allCompany.filter(
        (x) =>
          x.subAdmins !== null &&
          x.subAdmins.some((y) => y.adminId === admin.id)
      )

      if (!targetCompany) {
        return res.status(404).send({
          status: false,
          message: 'Company Not found here.',
        })
      }

      if (targetCompany.length > 1) {
        //subadmin should choose admin

        return res.status(200).json({
          status: true,
          data: {
            admin,
            company: targetCompany,
            message: 'Please Select a company',
          },
        })
      } else {
        const token = jwt.sign(
          { admin_id: admin.id, company_id: targetCompany[0].id },
          config.company_secret,
          {
            expiresIn: 86400 * 60, // 60 Days
          }
        )
        return res.status(200).json({
          status: true,
          data: { admin, company: targetCompany[0], accessToken: token },
          message: 'Company authentication successful',
        })
      }
    }
  } catch (err) {
    res.status(500).json({ status: false, message: `Error :${err.message}` })
  }
}

const subAdminSelectedCompany = async (req, res) => {
  const { admin_id, company_id } = req.query

  try {
    // check if admin already exist
    const admin = await Admin.findOne({
      where: { id: admin_id },
    })

    if (!admin) {
      return res
        .status(404)
        .send({ status: false, message: 'Admin Not found.' })
    }
    const company = await Token.findOne({ where: { companyId: company_id } })

    if (!company) {
      return res
        .status(404)
        .send({ status: false, message: 'Company Not found.' })
    }

    const token = jwt.sign(
      { admin_id: admin.id, company_id: company.id },
      config.company_secret,
      {
        expiresIn: 86400 * 60, // 60 Days
      }
    )

    return res.status(200).json({
      status: true,
      data: { admin, company, accessToken: token },
      message: 'Company authentication successful',
    })
  } catch (err) {
    return res
      .status(500)
      .send({ status: false, message: `Error: ${err.message}` })
  }
}

const registerCompanyValidator = () => {
  return [
    check('email')
      .notEmpty()
      .withMessage('Email is required')
      .escape()
      .isEmail()
      .withMessage('Invalid Email'),

    check('firstname').notEmpty(),
    check('lastname').notEmpty(),

    check('company_name')
      .notEmpty()
      .withMessage('Company name is required')
      .isLength({ min: 3, max: 25 })
      .withMessage('Company name must be between 3 to 25 characters'),

    check('password')
      .notEmpty()
      .withMessage('password is required')
      .isLength({ min: 8, max: 25 })
      .withMessage('password must be between 8 to 25 characters'),

    check('confirmPassword')
      .notEmpty()
      .withMessage('Confirm Password should not be empty')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match with password')
        }
        return true
      }),
  ]
}

const loginValidator = () => {
  return [
    check('email').notEmpty().withMessage('Email is required'),
    check('password').notEmpty().withMessage('password is required'),
  ]
}

const resendValidationEmail = async (req, res) => {
  const { email } = req.body
  try {
    const adminExist = await Admin.findOne({ where: { email } })
    if (!adminExist) {
      return res.status(400).send({
        status: false,
        errors: 'Error: Admin do not  exist',
      })
    }

    const url = `${BASE_URL}/company/admin/verify/email?id=${email}` //url for verification (to be updated)

    const html = verifyTemplate(url)
    const emailProps = {
      email,
      subject: 'Welcome To Clisha!',
      html,
    }
    emailService(emailProps)

    res.status(200).json({ status: true, message: 'Email Sent successfully' })
  } catch (err) {
    res.status(500).json({ status: false, message: 'Error occur:' + err })
  }
}

const verifyEmail = async (req, res) => {
  const { id: email } = req.query

  try {
    const adminExist = await Admin.findOne({ where: { email } })
    if (!adminExist) {
      return res.status(400).send({
        status: false,
        errors: 'Error admin do not  exist',
      })
    }

    //update flag
    const date = new Date()
    await Admin.update({ email_verified_at: date }, { where: { email } })

    //redirect to login page

    res.redirect(`${CLIENT_URL_MAIN}/login`)
    // res.status(200).json({ status: true, message: 'ok' })
  } catch (err) {
    res.status(500).json({ status: false, message: 'Error occur:' + err })
  }
}

const passwordResetInit = async (req, res) => {
  const { email } = req.body
  try {
    //check if user exist
    const adminExist = await Admin.findOne({ where: { email } })

    if (!adminExist) {
      return res.status(404).json({
        status: false,
        message: 'Admin not found',
      })
    }

    //send email to user
    const url = `${CLIENT_URL_MAIN}/forget_password?email=${email}`

    const html = comfirmPasswordTemplate(url)
    const emailProps = {
      email,
      subject: 'Recover Your Password',
      html,
    }
    emailService(emailProps)
    res.status(200).json({ status: true, message: 'Email Sent Successfully' })
  } catch (err) {
    res.status(500).json({ status: false, message: 'Error occur:' + err })
  }
}

const changePassword = async (req, res) => {
  const { email, password, confirm_password } = req.body

  //check if password and confirm password matches

  if (password != confirm_password)
    return res.status(401).json({
      status: false,
      message: 'Password doesnt match with confirm password',
    })

  //check if user exist
  const adminExist = await Admin.findOne({ where: { email } })

  if (!adminExist) {
    return res.status(404).json({
      status: false,
      message: 'Admin not found',
    })
  }

  //update password

  await Admin.update(
    { password: bcrypt.hashSync(password) },
    { where: { email } }
  )
  return res.status(200).json({
    status: true,
    message: 'Admin password updated',
  })
}

module.exports = {
  createCompany,
  loginCompany,
  registerCompanyValidator,
  loginValidator,
  verifyEmail,
  changePassword,
  passwordResetInit,
  resendValidationEmail,
  subAdminSelectedCompany,
}
