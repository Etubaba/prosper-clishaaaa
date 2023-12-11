const _ = require('lodash')
const moment = require('moment')
const db = require('../../models')
const { Op, Sequelize } = require('sequelize')
const helper = require('../../middleware/helper')
const config = require('../../config/mail')
const Notification = require('../../middleware/notification')
const { check, validationResult, body } = require('express-validator')
// Models
const User = db.models.User
const Wallet = db.models.Wallet
// const Task = db.models.Task;
// const Interaction = db.models.Interaction;
// const CompletedTask = db.models.CompletedTask;
// const Token = db.models.Token;

const ranking = async (req, res) => {
  try {
    let size = req.query.size,
      search = req.query.search,
      condition = {},
      page = req.query.page || 1

    const { limit, offset } = helper.getPagination(page, size)

    if (search) {
      search = search.toLowerCase()
      condition = {
        [Op.or]: [
          {
            firstname: Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('firstname')),
              'LIKE',
              '%' + search + '%'
            ),
          },
          {
            lastname: Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('lastname')),
              'LIKE',
              '%' + search + '%'
            ),
          },
          {
            username: Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('username')),
              'LIKE',
              '%' + search + '%'
            ),
          },
          {
            email: Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('email')),
              'LIKE',
              '%' + search + '%'
            ),
          },
        ],
      }
    }

    let ranking = await Wallet.findAndCountAll({
      where: {
        total_points: { [Op.gt]: 0 },
      },
      include: [{ model: User, as: 'user', where: condition }],
      attributes: {
        exclude: ['createdAt', 'updatedAt'],
        include: [
          [
            Sequelize.literal('(RANK() OVER (ORDER BY total_points DESC))'),
            'position',
          ],
        ],
        // include: [[Sequelize.fn('COUNT', Sequelize.col('user.id')), 'rank']]
      },
      limit,
      offset,
      order: [['total_points', 'DESC']],
    })

    ranking.rows.map((rank) => {
      rank.setDataValue(
        'photo_url',
        `${config.api}/assets/profile/${rank.user.photo}`
      )
    });
    
    const data = helper.getPagingData(ranking, page, limit, 'ranking')
   

    return res.status(200).send({
      status: true,
      data: data,
      message: 'Clisha Ranking',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const contactValidator = () => {
  return [
    check('email').isEmail().withMessage('Input a valid Email'),

    check('subject')
      .isLength({ min: 3, max: 50 })
      .notEmpty()
      .withMessage('Subject is required'),

    check('message')
      .isLength({ min: 3, max: 500 })
      .notEmpty()
      .withMessage('Message is required'),
  ]
}

const contactClisha = async (req, res) => {
  try {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: errors.array(),
      })
    }

    const { subject, message, email } = req.body
    const id = req.user.id

    // if(id){
    //   const user = await User.findOne({ where: { id: id } });
    //   email = user.email;
    // }

    await Notification.sendClishaFeedback(email, subject, message)

    return res.status(200).send({
      status: true,
      message: 'Feedback has been sent',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

module.exports = {
  ranking,
  contactValidator,
  contactClisha,
}
