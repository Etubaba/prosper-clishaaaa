const db = require('../models')
const { check, validationResult } = require('express-validator')
const { Op, Sequelize } = require('sequelize')
const helper = require('../middleware/helper')
const moment = require('moment')
// Models
const User = db.models.User
const Notification = require('../middleware/notification')
const VerificationToken = db.models.VerificationToken
const Task = db.models.Task
const Wallet = db.models.Wallet
const CompletedTask = db.models.CompletedTask

const getExperiencePoints = async (req, res) => {
  try {
    const { email, token, clishaId } = req.query

    const user = await User.findOne({
      where: { clishaId: clishaId, vendoConnectStatus: true },
    })

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'Clisha user not available!',
      })
    }

    let points = await Wallet.findAll({
      where: { UserId: user.id },
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

    points = points.find((wallet) => wallet.UserId == user.id)

    return res.status(200).send({
      status: true,
      data: { points }, //{ experience: expPoints, rank: currentRank },
      message: 'Clisha experience points retrieved',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const getUserClishaTask = async (req, res) => {
  try {
    const { email, token, clishaId } = req.query

    const today = moment()
    const START_DATE = moment(today).format('YYYY-MM-DD 00:00:00')
    const END_DATE = moment(today).format('YYYY-MM-DD 23:59:59')
    const dayOfTheMonth = today.date(),
      dayofTheWeek = today.day()

    const user = await User.findOne({
      where: { clishaId: clishaId, vendoConnectStatus: true },
    })

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'Clisha user not available!',
      })
    }

    let condition = {
        status: 1,
        archive: false,
        published: true,
      },
      nonrecuring_condition = {
        start_at: {
          [Op.and]: {
            [Op.gte]: START_DATE,
            [Op.lte]: END_DATE,
          },
        },
      }

    const tasks = await Task.count({
      where: {
        ...condition,
        ...nonrecuring_condition,
        weekly: { [Op.eq]: [] },
        monthly: { [Op.eq]: [] },
      },
    })

    const recurring = await Task.count({
      where: {
        ...condition,
        [Op.or]: [
          { weekly: { [Op.contains]: [dayofTheWeek] } },
          { monthly: { [Op.contains]: [dayOfTheMonth] } },
        ],
      },
    })

    const completedTasksCount = await CompletedTask.count({
      where: {
        userId: user.id,
        status: 1,
        createdAt: {
          [Op.and]: {
            [Op.gte]: START_DATE,
            [Op.lte]: END_DATE,
          },
        },
      },
    })

    const totalTask = tasks + recurring

    return res.status(200).send({
      status: true,
      data: {
        conpleted_task: completedTasksCount,
        total_task: totalTask,
      },
      message: 'Clisha task .....',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const getRankingSiblings = async (req, res) => {
  try {
    const { email, token, clishaId, page, size, search } = req.query

    const user = await User.findOne({
      where: { clishaId: clishaId, vendoConnectStatus: true },
    })

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'Clisha user not available!',
      })
    }

    let condition = {}
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

    let user_attribute = [
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
    ]

    let rankings = await Wallet.findAll({
      include: [
        {
          model: User,
          as: 'user',
          where: condition,
          attributes: user_attribute,
        },
      ],
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

    // Ranking index of the current user
    var len = rankings.length
    index = rankings.findIndex((wallet) => wallet.UserId == user.id)
    // Pair Index with its siblings
    var current_position = rankings[index]
    var previous_position =
      index == 0 ? null : rankings[(index + len - 1) % len]
    var next_position = index >= len ? null : rankings[(index + 1) % len]

    const siblings = { previous_position, current_position, next_position }

    return res.status(200).send({
      status: true,
      data: siblings,
      message: 'Clisha siblings ranking',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const getClishaRanking = async (req, res) => {
  try {
    const { email, token, clishaId } = req.query

    const user = await User.findOne({
      where: { clishaId: clishaId, vendoConnectStatus: true },
    })

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'Clisha user not available!',
      })
    }

    let condition = {}
    const { search } = req.query
    // const { limit, offset } = helper.getPagination(page, size)

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

    let user_attribute = [
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
    ]

    let rankings = await Wallet.findAndCountAll({
      include: [
        {
          model: User,
          as: 'user',
          where: condition,
          attributes: user_attribute,
        },
      ],
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

    let myrank = rankings.rows.find((wallet) => wallet.UserId == user.id)

    return res.status(200).send({
      status: true,
      data: { rankings, myrank },
      message: 'Clisha Ranking',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const getVendoKickback = async (req, res) => {
  try {
    const { email, token, clishaId } = req.query

    const user = await User.findOne({
      where: { clishaId: clishaId, vendoConnectStatus: true },
    })

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'Clisha user not available!',
      })
    }

    const today = moment()
    const START_PERIOD = moment(today)
      .startOf('month')
      .format('YYYY-MM-DD 00:00:00')
    const END_PERIOD = moment(today)
      .endOf('month')
      .format('YYYY-MM-DD 23:59:59')

    const dateSeries = await db.sequelize.query(
      `select (generate_series('${START_PERIOD}', '${END_PERIOD}', '1 day'::interval))::date`
    )

    const dates = dateSeries[0].map((item) => {
      return `${item.generate_series} 00:00:00+00`
    })

    let condition = {
        status: 1,
        archive: false,
        published: true,
      },
      nonrecuring_condition = {}

    let monthlyData = dates.map(async (element) => {
      let data = {}
      let date = moment(element)

      let START_DATE = date.format('YYYY-MM-DD 00:00:00'),
        END_DATE = date.format('YYYY-MM-DD 23:59:59')

      let dayOfTheMonth = date.date(),
        dayofTheWeek = date.day()
      data.date = date.format('YYYY-MM-DD')

      nonrecuring_condition = {
        start_at: {
          [Op.and]: {
            [Op.gte]: START_DATE,
            [Op.lte]: END_DATE,
          },
        },
      }

      const tasks = await Task.count({
        where: {
          ...condition,
          ...nonrecuring_condition,
          weekly: { [Op.eq]: [] },
          monthly: { [Op.eq]: [] },
        },
      })

      const recurring = await Task.count({
        where: {
          ...condition,
          [Op.or]: [
            { weekly: { [Op.contains]: [dayofTheWeek] } },
            { monthly: { [Op.contains]: [dayOfTheMonth] } },
          ],
        },
      })

      const userCompletedTasks = await CompletedTask.count({
        where: {
          userId: user.id,
          status: 1,
          createdAt: {
            [Op.and]: {
              [Op.gte]: START_DATE,
              [Op.lte]: END_DATE,
            },
          },
        },
      })

      data.createdTasks = tasks + recurring
      data.completedTasks = userCompletedTasks

      let bonusEligibility = false
      const TASKS_THRESHOLD = 10
      if (
        Number(data.createdTasks) >= TASKS_THRESHOLD &&
        Number(data.completedTasks) >= Number(data.createdTasks)
      ) {
        bonusEligibility = true
      }
      if (
        Number(data.createdTasks) < TASKS_THRESHOLD &&
        Number(data.completedTasks) === Number(data.createdTasks)
      ) {
        bonusEligibility = true
      }

      data.bonusEligibility = bonusEligibility
      return data
    })

    monthlyData = await Promise.all(monthlyData)

    const KickbackDays = () => {
      const eligibilityCount = monthlyData.filter(
        (item) => item.bonusEligibility === true
      ).length

      // if (eligibilityCount >= 25) return true
      return eligibilityCount
    }

    return res.status(200).send({
      status: true,
      data: {
        KickbackDays: KickbackDays(),
        monthlyData: monthlyData,
      },
      message: 'Vendo Kickback',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const clearVendorPoints = async (req, res) => {
  const id = req.user.id

  let year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    today = new Date()
  const lastDayOfTheMonth = new Date(year, month, 0).getDate()

  try {
    if (today.getDate !== lastDayOfTheMonth)
      return res.status(400).json({
        status: false,
        message: `Today is not the last day of the month. Try again on ${lastDayOfTheMonth}th`,
      })

    const user = await User.findOne({
      where: {
        id,
        vendoConnectStatus: true,
      },
    })

    if (!user)
      return res.status(400).json({
        status: false,
        message: 'User not connected to vendor ',
      })

    //get user wallet

    await Wallet.update({ bonus_points: 0 }, { where: { UserId: id } })

    res.status(200).json({
      status: true,
      message: 'User VQs cleared successfully.',
    })
  } catch (err) {
    res.status(500).json({
      status: false,
      message: `Error: ${err.message}`,
    })
  }
}

module.exports = {
  clearVendorPoints,
  getExperiencePoints,
  getUserClishaTask,
  getRankingSiblings,
  getClishaRanking,
  getVendoKickback,
}
