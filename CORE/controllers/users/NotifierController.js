const db = require('../../models')
var jwt = require('jsonwebtoken')
var bcrypt = require('bcryptjs')
const { Op } = require('sequelize')
const config = require('../../config/auth')
const { check, validationResult, body } = require('express-validator')
const Notification = require('../../middleware/notification')
const mail = require('../../config/mail')

// Initialize Queues
const { SendEmailQueue } = require('../../services/queue')
const verificationEmailQueue = new SendEmailQueue('verification_email')
const passwordResetQueue = new SendEmailQueue('password_reset_email')

// Models
const User = db.models.User
const RefreshToken = db.models.RefreshToken
const VerificationToken = db.models.VerificationToken

const emailValidator = () => {
  return [
    check('email')
      .notEmpty()
      .withMessage('Email is required')
      .escape()
      .isEmail()
      .withMessage('Invalid Email'),
  ]
}

const resetPasswordValidator = () => {
  return [
    check('email')
      .notEmpty()
      .withMessage('Email is required')
      .escape()
      .isEmail()
      .withMessage('Invalid Email'),

    check('password')
      .notEmpty()
      .withMessage('password is required')
      .isLength({ min: 8, max: 20 })
      .withMessage('password must be 8 characters'),
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

const refreshToken = async (req, res) => {
  const { refreshToken: requestToken } = req.body
  if (requestToken == null) {
    return res
      .status(403)
      .json({ status: false, message: 'Refresh Token is required!' })
  }

  try {
    let refreshToken = await RefreshToken.findOne({
      where: { token: requestToken },
      include: [User],
    })

    if (!refreshToken) {
      return res
        .status(403)
        .json({ status: false, message: 'Refresh token not available!' })
    }

    if (RefreshToken.verifyExpiration(refreshToken)) {
      RefreshToken.destroy({ where: { id: refreshToken.id } })

      return res.status(403).json({
        status: false,
        message: 'Refresh token has expired. Please make a new signin request',
      })
    }

    const user = await refreshToken.getUser()

    let newAccessToken = jwt.sign({ id: user.id }, config.secret, {
      expiresIn: config.jwtExpiration,
    })

    return res.status(200).json({
      status: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: refreshToken.token,
      },
      message: 'Refresh Token generated succesfully',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const resendVerification = async (req, res) => {
  console.log(req.body)
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  try {
    let email = req.body.email
    let user = await User.findOne({
      where: {
        email: email,
        email_verified_at: { [Op.eq]: null },
      },
    })

    if (!user) {
      return res.status(400).send({
        status: false,
        message: 'User not found',
      })
    }
    // Add email to 'verification_email' queue
    await verificationEmailQueue.addToQueue('send_verification_email', user)

    return res.status(200).send({
      status: true,
      message: 'Verification Email Resent',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const confirmVerification = async (req, res) => {
  const token = req.params.token
  try {
    let verifyToken = await VerificationToken.findOne({
      where: { token: token, verifier: 'register', status: 0 },
      include: [User],
    })

    if (!verifyToken) {
      return res.status(200).redirect(mail.client + '/signin?status=failed')
      // return res.status(403).json({  status: false, message: "Verification token not available!" });
    }

    if (VerificationToken.verifyExpiration(verifyToken)) {
      VerificationToken.destroy({ where: { id: verifyToken.id } })

      return res.status(403).json({
        status: false,
        message:
          'Verification token has expired. Please request for a new one ',
      })
    }

    verifyToken.status = 1
    await verifyToken.save()

    const user = await verifyToken.getUser()
    user.email_verified_at = new Date()
    await user.save()

    return res.status(200).redirect(mail.client + '/dashboard?complete=1')
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: errors.array(),
      })
    }

    let email = req.body.email
    let user = await User.findOne({ where: { email: email } })

    if (!user) {
      return res.status(400).send({
        status: false,
        message: 'User not found',
      })
    }
    // Add email to 'password_reset_email' queue
    await passwordResetQueue.addToQueue('send_password_reset_email', user)

    return res.status(200).send({
      status: true,
      message: 'Password Reset link sent',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const resetPassword = async (req, res) => {
  const errors = validationResult(req)
  let token = req.params.token

  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  try {
    let verifyToken = await VerificationToken.findOne({
      where: { token: token, verifier: 'reset', status: 0 },
      include: [User],
    })

    if (!verifyToken) {
      return res
        .status(403)
        .json({ status: false, message: 'Password Reset token is not valid!' })
    }

    if (VerificationToken.verifyExpiration(verifyToken)) {
      VerificationToken.destroy({ where: { id: verifyToken.id } })

      return res.status(403).json({
        status: false,
        message:
          'Password Reset token has expired. Please request for a new one ',
      })
    }

    verifyToken.status = 1
    await verifyToken.save()
    const user = await verifyToken.getUser(),
      password = bcrypt.hashSync(req.body.password)

    const reset = await User.update({ password }, { where: { id: user.id } })

    return res.send({
      status: true,
      data: reset,
      message: 'Password Reset  succesfully',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

module.exports = {
  emailValidator,
  resetPasswordValidator,
  refreshToken,
  resendVerification,
  confirmVerification,
  forgotPassword,
  resetPassword,
}
