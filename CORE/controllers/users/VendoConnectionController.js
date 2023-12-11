const db = require('../../models')
const { check, validationResult } = require('express-validator')
const { Op, Sequelize } = require('sequelize')
const helper = require('../../middleware/helper')
const fs = require('fs-extra')
const config = require('../../config/mail')
const shortid = require('shortid')
const mail = require('../../config/mail')
const moment = require('moment')
// Models
const User = db.models.User
const Notification = require('../../middleware/notification')
const { SendEmailQueue } = require('../../services/queue')
const VerificationToken = db.models.VerificationToken
const Task = db.models.Task
const Wallet = db.models.Wallet
const CompletedTask = db.models.CompletedTask

// VENDO_SERVER
const VENDO_SERVER = process.env.VENDO_SERVER

// Initialize Queues
const vendoVerificationEmailQueue = new SendEmailQueue(
  'vendo_verification_email'
)

shortid.characters(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@'
)

const generateClishaID = async (req, res) => {
  try {
    let users = await User.findAll({})

    users.map(async (user) => {
      const genID = shortid.generate()
      const clishaId = `CLISHA-${genID}-${Date.now()}`
      await User.update({ clishaId }, { where: { id: user.id } })
    })

    return res.status(200).send({
      status: true,
      data: null,
      message: "Clisha Users' ID was updated succesfully",
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const connectionValidator = () => {
  return [
    check('vendoEmail')
      .notEmpty()
      .withMessage('Vendo Email is required')
      .escape()
      .isEmail()
      .withMessage('Invalid Email'),

    check('clishaId')
      .escape()
      .notEmpty()
      .withMessage('Clisha Id is required')
      .isLength({ min: 10 })
      .withMessage('Input correct Clisha Id'),
  ]
}

const vendoConnectionCheck = async (req, res) => {
  try {
    const { clishaId, vendoEmail } = req.body

    const user_exists = await User.findOne({
      where: { clishaId: clishaId },
      attributes: [
        'id',
        'username',
        'firstname',
        'lastname',
        'email',
        'clishaId',
        'vendoEmail',
        'vendoConnectStatus',
      ],
    })

    if (!user_exists) {
      return res.status(400).json({
        status: false,
        message: 'User not registered on Clisha',
      })
    }

    if (user_exists.vendoConnectStatus == true) {
      return res.status(400).json({
        status: false,
        message: 'User already connected to Clisha',
      })
    }

    await vendoVerificationEmailQueue.addToQueue(
      'send_vendo_verification_email',
      { user_exists, vendoEmail }
    )

    await User.update({ vendoEmail }, { where: { clishaId: clishaId } })

    return res.status(200).json({
      status: true,
      data: user_exists,
      message:
        'Please check clisha your email inbox or spam to verify this request',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

const connectVendorAccount = async (req, res) => {
  try {
    const { token, vendoEmail } = req.query

    const verifyToken = await VerificationToken.findOne({
      where: { token: token, verifier: 'connection', status: 0 },
      include: [User],
    })

    if (!verifyToken) {
      return res
        .status(403)
        .json({ status: false, message: 'Verification token not available!' })
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

    user.vendoConnectStatus = true
    await user.save()

    return res.status(200).redirect(mail.client + '/dashboard?complete=1')
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

module.exports = {
  generateClishaID,
  connectionValidator,
  vendoConnectionCheck,
  connectVendorAccount,
}
