const db = require('../../models')
const _ = require('lodash')
const { check, validationResult } = require('express-validator')
const { Op, Sequelize } = require('sequelize')
const helper = require('../../middleware/helper')
const multer = require('multer')
const path = require('path')
const fs = require('fs-extra')
const config = require('../../config/mail')
const bcrypt = require('bcryptjs')
const moment = require('moment')
const axios = require('axios')

// Models
const User = db.models.User
const Task = db.models.Task
const Token = db.models.Token
const CompletedTask = db.models.CompletedTask
const UserHobby = db.models.UserHobby
const Wallet = db.models.Wallet
const Interaction = db.models.Interaction
const ExperiencePoint = db.models.ExperiencePoint
const Message = db.models.Message
const NotificationBoard = db.models.NotificationBoard

// VENDO_SERVER
const VENDO_SERVER = process.env.VENDO_SERVER

const profile = async (req, res) => {
  try {
    let id = req.user.id
    const pagination = helper.pagination(1)
    // ?Get User information
    const user = await User.findOne({
      where: { id: id },
      attributes: {
        exclude: ['password', 'createdAt', 'updatedAt'],
      },
      include: [UserHobby],
    })
    // let photo_url = null; //`${config.api}/assets/profile/${user.photo}`;
    // User system details
    const region = user.region ?? 'Europe/Berlin'
    const date = moment().tz(region)

    const today = date.format('YYYY-MM-DD'),
      time = date.format('HH:mm')
    const timezone = { today, time }
    // Ranking
    let rank = await Wallet.findAll({
      // where:  { UserId: id },
      attributes: {
        exclude: ['createdAt', 'updatedAt'],
        include: [
          [
            Sequelize.literal('(RANK() OVER (ORDER BY total_points DESC))'),
            'position',
          ],
        ],
      },
      order: [['total_points', 'DESC']],
    })

    rank = rank.find((wallet) => wallet.UserId == id)

    // Task HistoryOka
    let completed_tasks = await CompletedTask.findAll({
        where: {
          userId: parseInt(id)
        },
        attributes: {
          exclude: ['createdAt', 'updatedAt'],
        },
        include: [{ model: Task, as: 'task' }],
        order: pagination.order,
      }),
      lists = []

    completed_tasks.forEach((task) => {
      lists.push(task.taskId)
    })

    let tasks = await Task.findAll({
      where: { id: lists },

      include: [{ model: Token, as: 'token' }],
      order: pagination.order,
    })

    for (let key = 0; key < tasks.length; key++) {
      const task = tasks[key]
      const completed = completed_tasks[key]

      task.setDataValue('status', completed.status)

      if (completed.status) {
        task.setDataValue(
          'description',
          `Website was visited and you earned ${task.points} points`
        )
      } else {
        task.setDataValue(
          'description',
          `Website was visited and the task task was not completed`
        )
      }
    }

    const data = { user, timezone, rank, completed: tasks }
    
    return res.status(200).send({
      status: true,
      data: data,
      message: 'User Profile Information',
    });

  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const teams = async (req, res) => {
  const { id } = req.user

  try {
    let referrals = await User.findAndCountAll({
      where: { referralId: id },
      attributes: [
        'id',
        'username',
        'photo',
        'firstname',
        'lastname',
        'email',
        'referralId',
        'clishaId',
        'vendoConnectStatus',
        'vendoEmail',
        'createdAt',
      ],
    })

    const rankings = await Wallet.findAll({
      // where:  { UserId: user.id },
      attributes: {
        exclude: ['createdAt', 'updatedAt'],
        include: [
          [
            Sequelize.literal('(RANK() OVER (ORDER BY total_points DESC))'),
            'position',
          ],
        ],
      },
      order: [['total_points', 'DESC']],
    })

    referrals.rows.map((user) => {
      let points = rankings.find((wallet) => wallet.UserId == user.id)
      // console.log(user.id, points.dataValues);
      user.setDataValue('rank', points)
    })

    return res.status(200).send({
      status: true,
      data: referrals,
      message: 'User Refferals Information',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const clishaBoardMessages = async (req, res) => {
  try {
    const { id } = req.user
    const user = await User.findOne({
      where: { id: id },
      attributes: {
        exclude: ['password', 'createdAt', 'updatedAt'],
      },
    })
    const notifications = await NotificationBoard.findAll({
      where: {
        userId: id,
      },
      attributes: ['boardId'],
    })

    const lists = notifications.map((x) => x.boardId)
    // Message Board
    const region = user.region ?? 'Europe/Berlin'
    const today = moment().tz(region).format('YYYY-MM-DD HH:mm:ss')

    const banners = await Message.findAll({
      where: {
        id: { [Op.notIn]: lists },
        start_at: { [Op.lte]: today },
        end_at: { [Op.gte]: today },
        status: 1,
      },
      order: [['createdAt', 'desc']],
    })

    return res.status(200).send({
      status: true,
      data: { banners },
      message: 'User Board Messages',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const activateBoardMessage = async (req, res) => {
  try {
    const { id } = req.params
    const user = req.user.id

    const [notification, created] = await NotificationBoard.findOrCreate({
      where: {
        userId: user,
        boardId: id,
      },
    })

    notification.seen = true
    notification.view_count += 1
    notification.save()

    return res.status(200).send({
      status: true,
      data: { notification },
      message: 'Notification viewed',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const notifications = async (req, res) => {
  try {
    const id = req.user.id

    const { size, page } = req.query
    let currentPage = page || 1
    const pagination = helper.pagination(currentPage)
    const { limit, offset } = helper.getPagination(currentPage, size)

    const notifications = await NotificationBoard.findAndCountAll({
      where: { userId: id },
      include: [
        {
          model: Message,
          as: 'banner',
          attributes: [
            'message_english',
            'message_french',
            'message_deutsch',
            'message_portuguese',
          ],
        },
      ],

      limit,
      offset,
      order: pagination.order,
    })

    const paginatedResult = helper.getPagingData(
      notifications,
      page,
      limit,
      'notifications'
    )

    return res.status(200).send({
      status: true,
      data: paginatedResult,
      message: 'User Notifications',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const profile_update_validator = () => {
  return [
    check('firstname').isLength({ min: 3, max: 20 }),
    check('lastname').isLength({ min: 3, max: 20 }),
    check('phone').isLength({ max: 15 }),
    check('birth_date').isDate().withMessage('Input a correct date'),
    //   check('phone').isLength({ max: 15 })
  ]
}

const profile_update = async (req, res) => {
  let id = req.user.id

  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  try {
    const updatedUser = {
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      phone: req.body.phone,
      gender: req.body.gender,
      birth_date: req.body.birth_date,
      country: req.body.country,
      language: req.body.language,
      region: req.body.region,
    }
    // console.log(updatedUser, '<<>>', req.body);
    const user = await User.update(updatedUser, { where: { id: id } })

    return res.send({
      status: true,
      data: user,
      message: 'Profile updated succesfully',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const profile_photo = async (req, res) => {
  let maxSize = 4 * 1000 * 1000,
    id = req.user.id
  // try {
  const uploadProfile = multer({
    storage: helper.s3BucketStorage,
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

  uploadProfile(req, res, async (err) => {
    if (err) {
      return res.status(400).send({
        status: true,
        message: err,
      })
    } else {
      try {
        const user = await User.findOne({ where: { id: id } })
        // let path = `./assets/profile/${user.photo}`
        // if(user.photo && fs.existsSync(path)) fs.unlinkSync(path);

        const profile_update = await User.update(
          { photo: req.file.location },
          { where: { id: id } }
        )
        return res.send({
          status: true,
          message: 'Profile Picture updated succesfully',
        })
      } catch (err) {
        return res.status(500).send({ status: false, message: err })
      }
    }
  })
}

const updateUsername = async (req, res) => {
  try {
    let id = req.user.id
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: errors.array(),
      })
    }

    const { username } = req.body

    const isUsername = await User.findOne({ where: { username: username } })

    if (isUsername) {
      return res.status(400).send({
        status: false,
        message: 'Username is already in use!',
      })
    } else {
      const profile = await User.update(
        { username: username },
        { where: { id: id } }
      )

      return res.send({
        status: true,
        message: 'Username updated succesfully',
      })
    }
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const usernameValidator = () => {
  return [
    check('username')
      .escape()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3, max: 25 })
      .withMessage('Username must be between 3 and 25 characters')
      .matches(/^[A-Za-z0-9 .,'!&]+$/)
      .withMessage('Username cannot contain special characters'),
  ]
}

const passwordValidator = () => {
  return [
    check('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),

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

const updatePassword = async (req, res) => {
  try {
    let id = req.user.id
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: errors.array(),
      })
    }

    const { password, currentPassword } = req.body
    const user = await User.findOne({ where: { id: id } })
    const validPassword = await bcrypt.compare(currentPassword, user.password)

    if (!validPassword) {
      return res.status(400).send({
        status: false,
        message: 'Invalid Password!',
      })
    }

    const profile = await User.update(
      { password: bcrypt.hashSync(password) },
      { where: { id: id } }
    )

    return res.send({
      status: true,
      message: 'Password updated succesfully',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const getUserVendoPackage = async (req, res) => {
  try {
    console.log('Fetching vendo package...')
    const id = req?.user.id

    const user = await User.findOne({
      where: { id: id },
      attributes: {
        exclude: ['password', 'createdAt', 'updatedAt'],
      },
    })

    const clishaId = user?.clishaId

    const { data } = await axios.get(
      `${VENDO_SERVER}/user-vqs-package-for-clisha/${clishaId}`
    )

    if (!data.status) {
      return res.status(400).json({
        status: false,
        message: data.error,
        data: null,
      })
    }

    const ratio = [0.1, 0.2, 0.5, 1]
    const packages = data?.packages
    const package_level = data?.package_level
    const vq_ratio = ratio[packages.indexOf(package_level)]

    const packageInfo = {
      ...data,
      vqRatio: vq_ratio * 100,
    }

    return res.status(200).send({
      status: true,
      data: packageInfo,
      message: 'Vendo package information',
    });
    
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

module.exports = {
  profile,
  teams,
  notifications,
  profile_update,
  clishaBoardMessages,
  activateBoardMessage,
  profile_photo,
  profile_update_validator,

  usernameValidator,
  updateUsername,
  passwordValidator,
  updatePassword,

  getUserVendoPackage,
}
