const db = require('../../models')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const config = require('../../config/auth')
const { Op, Sequelize } = require('sequelize')
const { check, validationResult, body } = require('express-validator')
const Notification = require('../../middleware/notification')
const Helper = require('../../middleware/helper')
const shortid = require('shortid')

// Initialize Queues
const { SendEmailQueue } = require('../../services/queue')
const verificationEmailQueue = new SendEmailQueue('verification_email')

// Models
const User = db.models.User
const UserHobby = db.models.UserHobby
const Wallet = db.models.Wallet
const RefreshToken = db.models.RefreshToken

shortid.characters(
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@'
)

const registerValidator = () => {
  return [
    check('email')
      .notEmpty()
      .withMessage('Email is required')
      .escape()
      .isEmail()
      .withMessage('Invalid Email'),

    check('firstname').notEmpty().withMessage('Firstname is required'),

    check('lastname').notEmpty().withMessage('Lastname is required'),

    // check('code')
    //   .notEmpty().withMessage('Referral code is required'),

    check('username').escape().notEmpty().withMessage('Username is required'),
    // .isLength({min: 3,max:35 })
    // .withMessage('Username must be between 3 and 25 characters')
    // .matches(/^[A-Za-z0-9 .,'!& ]+$/)
    // .withMessage('Username cannot contain special characters'),

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

const checkDuplicate = async (req, res) => {
  let { email, username, code } = req.query

  try {
    let errors = []

    if (email) {
      let user = await User.findOne({ where: { email: email } })
      if (user) {
        let error = {
          msg: 'Email is already in use!',
          param: 'email',
          location: 'body',
        }
        errors.push(error)
      }
    }

    if (username) {
      let user = await User.findOne({ where: { username: username } })
      if (user) {
        let error = {
          msg: 'Username is already in use!',
          param: 'username',
          location: 'body',
        }
        errors.push(error)
      }
    }

    if (code) {
      let user = await User.findOne({ where: { clishaId: code } })
      if (!user) {
        let error = {
          msg: 'Clisha code is not recognise',
          param: 'code',
          location: 'body',
        }
        errors.push(error)
      }
    }

    let status = errors.length ? false : true,
      message = errors.length ? 'Duplicate Exist' : 'No Duplication'
    // console.log(status, message);

    return res.status(200).send({
      status: status,
      errors: errors,
      message: message,
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const register = async (req, res) => {
  try {
    console.log('Registering')
    const errors = validationResult(req)

    const { username, email, password, code, firstname, lastname } = req.body
    let referralId

    if (!errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: errors.array(),
      })
    }

    const referral = await User.findOne({ where: { clishaId: code } }),
      isEmail = await User.findOne({ where: { email: email } }),
      isUsername = await User.findOne({ where: { username: username } })

    if (isEmail || isUsername) {
      let error = {},
        errors = []
      if (isEmail)
        error = {
          msg: 'Email is already in use!',
          param: 'email',
          location: 'body',
        }
      errors.push(error)

      if (isUsername)
        error = {
          msg: 'Username is already in use!',
          param: 'username',
          location: 'body',
        }
      errors.push(error)

      // if (!referral)
      //   error = {
      //     msg: 'Referral code is not recognise!',
      //     param: 'code',
      //     location: 'body',
      //   }
      // errors.push(error)

      return res.status(400).send({
        status: false,
        errors: errors,
      })
    }

    if (code) referralId = referral.id

    const genID = shortid.generate()

    const userinfo = {
      firstname,
      lastname,
      username: username,
      email: email.toLowerCase(),
      clishaId: `CLISHA-${genID}-${Date.now()}`,
      password: bcrypt.hashSync(password),
      referralId: referralId,
    }

    const user = await User.create(userinfo)
    const hobby = await UserHobby.create({ UserId: user.id })
    const wallet = await Wallet.create({ UserId: user.id })

    // Add email to 'verification_email' queue
    await verificationEmailQueue.addToQueue('send_verification_email', user)

    // let token = jwt.sign({ id: user.id }, config.secret, {
    //     expiresIn: 86400 * 60 // 60 Days
    // });

    return res.status(200).send({
      status: true,
      data: { user, accessToken: null },
      message: 'Registeration Completed',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const login = async (req, res) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  try {
    let isEmail,
      user,
      condition = {},
      email = req.body.email,
      password = req.body.password

    isEmail = Helper.isEmail(email)
    if (isEmail) {
      email = email.toLowerCase()
      condition = {
        email: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('email')),
          email
        ),
      }
      user = await User.findOne({ where: condition })
    } else {
      user = await User.findOne({ where: { username: email } })
    }

    if (!user) {
      return res.status(404).send({ status: false, message: 'User Not found.' })
    }
    if (user && user.status == 0) {
      return res.status(403).send({
        status: false,
        message: 'Your account is inactive, please contact admin for support.',
      })
    }

    const validPassword = bcrypt.compareSync(password, user.password)

    if (!validPassword) {
      return res.status(401).send({
        accessToken: null,
        message: 'Invalid Password!',
      })
    }

    const token = jwt.sign({ id: user.id }, config.secret, {
      expiresIn: config.jwtExpiration,
    })

    const refreshToken = await RefreshToken.createToken(user)

    return res.status(200).send({
      status: true,
      data: { user, accessToken: token, refreshToken },
      message: 'User Login Succesfully',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const vendorRegisterartion = async (req, res) => {
  try {
    // const vendorUsers = VendoUsers;
    const vendorUsers = [
      'gabriel2002chagas@gmail.com',
      'alberciopereira2@gmail.com',
      'tiagotoreti19@gmail.com',
      'Roselaineferrugem@gmail.com',
      'amarisen@gmail.com',
      'conesid12@gmail.com',
      'daltrokrume@hotmail.com',
      'daltrokrume@gmail.com',
      'jostoreti@gmail.com',
      'josemotta1314@gmail.com',
      'toreti973@gmail.com',
      'jtoreti@outlook.com',
      'jntoreti@outlook.com',
      'vilmarlunk@gmail.com',
      'toreti.jos@outlook.com',
      'matheusgg98@gmail.com',
      'gabriellunkes52@gmail.com',
      'Jsdelmondes@gmail.com',
      'jacvieira123@gmail.com',
      'cleciofrasseto@gmail.com',
      'aureliatnpbrasil@gmail.com',
      'cleciofrasseto2@gmail.com',
      'marciojosesilva581@gmail.com',
      'gispsicoart@gmail.com',
      'karolgermany2014@gmail.com',
      'rgautomoveis99@gmail.com',
      'solangeoliveiradosantos123@gmail.com',
      'alexcorsatto2017@gmail.com',
    ]

    const config = {
      pageSize: 100,
      pageNumber: 1,
    }

    console.log(`Total Users ${vendorUsers.length}`)

    const paginate = (rawData, { pageSize, pageNumber }) => {
      const totalPage = Math.ceil(rawData.length / pageSize)
      const paginatedData = rawData.slice(
        pageSize * (pageNumber - 1),
        pageSize * pageNumber
      )
      const nextPage = pageNumber >= totalPage ? 1 : pageNumber + 1
      console.log(`Total page ${totalPage}`)
      return { paginatedData, nextPage }
    }

    const automation = (rawData, config) => {
      let data
      console.log('Automating Users Page ', config.pageNumber)
      const { paginatedData, nextPage } = paginate(rawData, config)
      data = paginatedData
      config.pageNumber = nextPage
      setTimeout(automation, 40 * 1000, rawData, config)
      enroll(data)
    }

    const enroll = async (users) => {
      // console.log(users.length);

      users.map(async (vendo) => {
        const email = vendo.toLowerCase(), //vendo.email;
          pass = '12345678'
        const condition = {
          email: Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('email')),
            email
          ),
        }

        const isUser = await User.findOne({ where: condition })
        console.log('Registering ', !isUser)
        // return;
        if (!isUser) {
          const genID = shortid.generate()
          const userinfo = {
            username: email.split('@')[0],
            email: email,
            clishaId: `CLISHA-${genID}-${Date.now()}`,
            password: bcrypt.hashSync(pass),
          }
          console.log('Complete Registerion  for >>', userinfo.email) //return ;
          const user = await User.create(userinfo)
          const hobby = await UserHobby.create({ UserId: user.id })
          const wallet = await Wallet.create({ UserId: user.id })

          // Notification.sendEmailVerification(user);
        } else {
          const userUpdate = await User.update(
            { password: bcrypt.hashSync(pass) },
            { where: { id: isUser.id } }
          )
        }
      })

      await Promise.all(users)
    }

    automation(vendorUsers, config)

    return res.status(200).send({
      status: true,
      message: 'All Done',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

module.exports = {
  checkDuplicate,
  register,
  login,
  registerValidator,
  loginValidator,
  vendorRegisterartion,
}
