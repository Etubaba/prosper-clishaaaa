const db = require('../models')
const { check, body, validationResult } = require('express-validator')
const helper = require('../middleware/helper')
const { Op } = require('sequelize')
const moment = require('moment')
// Models
const Message = db.models.Message
const NotificationBoard = db.models.NotificationBoard
const Admin = db.models.Admin

const createMessageValidator = () => {
  let yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return [
    check('message_english')
      .notEmpty()
      .withMessage('Message is required')
      .isString({ min: 5, max: 30 }),

    check('start_date')
      .isDate()
      .withMessage('Input a correct date')
      .isAfter(yesterday.toDateString())
      .withMessage('Date can not be in the past'),

    check('end_date')
      .isDate()
      .withMessage('Input a correct date')
      // .isBefore('start_date')
      .withMessage('Date can not be before start date'),

    check('time')
      .matches(/(?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d)/)
      .withMessage('Input a correct time in the format of hh:mm'),

    // check('duration')
    //         .notEmpty().withMessage('Message duration is required')
    //         .isInt()
  ]
}

const createMesssageBoard = async (req, res) => {
  const admin = req.admin.id
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  try {
    const {
      start_date,
      time,
      end_date,
      message_english,
      message_french,
      message_portuguese,
      message_deutsch,
    } = req.body

    const start_at = moment(start_date + ' ' + time, 'YYYY-MM-DD HH:mm')
    const end_at = moment(end_date + ' ' + time, 'YYYY-MM-DD HH:mm')
    // const end_at = moment(start_at).add(duration, "hours");

    const payload = {
      adminId: admin,
      start_at: start_at,
      end_at: end_at,
      message_english: message_english,
      message_french: message_french,
      message_portuguese: message_portuguese,
      message_deutsch: message_deutsch,
    }

    const MessageBoard = await Message.create(payload)

    return res.status(200).send({
      status: true,
      data: { messages: MessageBoard },
      message: 'New Message created succesfully',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const messageBoardList = async (req, res) => {
  var id = req.admin.id,
    size = req.query.size,
    token = req.query.token,
    search = req.query.search,
    page = req.query.page || 1,
    filters = {}

  const pagination = helper.pagination(page)
  const { limit, offset } = helper.getPagination(page, size)
  try {
    if (search) {
      filters = {
        [Op.or]: [
          // { name: { [Op.like]: '%' + search + '%' } },
          // { description: { [Op.like]: '%' + search + '%' } },
          {
            message_english: Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('message_english')),
              'LIKE',
              '%' + search + '%'
            ),
          },
        ],
      }
    }

    let messages = await Message.findAndCountAll({
      where: filters,
      include: [{ model: Admin, as: 'admin' }],

      limit,
      offset,
      order: pagination.order,
    })

    const paginatedResult = helper.getPagingData(
      messages,
      page,
      limit,
      'messages'
    )

    return res.status(200).send({
      status: true,
      data: paginatedResult,
      message: 'Messages List',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const updateMessageBoard = async (req, res) => {
  try {
    const { id } = req.params
    const {
      start_date,
      status,
      time,
      end_date,
      message_english,
      message_french,
      message_portuguese,
      message_deutsch,
    } = req.body

    var start_at, end_at
    if (start_date)
      start_at = moment(start_date + ' ' + time, 'YYYY-MM-DD HH:mm')
    if (end_date) end_at = moment(end_date + ' ' + time, 'YYYY-MM-DD HH:mm')

    const payload = {
      start_at: start_at,
      end_at: end_at,
      status: status,
      message_english: message_english,
      message_french: message_french,
      message_portuguese: message_portuguese,
      message_deutsch: message_deutsch,
    }

    await Message.update(payload, { where: { id: id } })

    return res.status(200).send({
      status: true,
      message: 'Message Board updated succesfully',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const deleteMessageBoard = async (req, res) => {
  try {
    const { id } = req.params

    // If not completed, delete task completely
    await NotificationBoard.destroy({ where: { boardId: id } })
    await Message.destroy({ where: { id: id } })
    return res.send({
      status: true,
      data: null,
      message: 'Task deleted succesfully',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

module.exports = {
  createMesssageBoard,
  createMessageValidator,
  messageBoardList,
  updateMessageBoard,
  deleteMessageBoard,
}
