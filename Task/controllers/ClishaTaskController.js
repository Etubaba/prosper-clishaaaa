const db = require('../models')
const _ = require('lodash')
const { check, validationResult } = require('express-validator')
const { Op, Sequelize } = require('sequelize')
const helper = require('../middleware/helper')
const config = require('../config/mail')
const moment = require('moment')

// Models
const User = db.models.User
const Task = db.models.Task
const Token = db.models.Token
const CompletedTask = db.models.CompletedTask
const Interaction = db.models.Interaction

const getExtensionTaskDetails = async (req, res) =>  {
  let id = req.params.id,
    code = req.query.code,
    today = new Date().toISOString()

  try {
    let task = await Task.findOne({
      where: {
        // start_at: { [Op.lte]: today },
        // end_at: { [Op.gte]: today },
        task_code: id,
        status: 1,
        archive: false,
      },
      include: [
        { model: Token, as: 'token' },
        { model: Interaction, as: 'interaction' },
      ],
    })

    // Confirm if task is available and security code is valid
    if (task && helper.extentionCode.includes(code)) {
      if (task.task_type == 'journey' || task.task_type == 'search_journey') {
        // console.log(task.journey);
        // task.journey = JSON.parse(task.journey);

        if (task.journey.length) {
          await Promise.all(
            task.journey.map(async function (step) {
              if (step.link_type == 'content' && step.interaction) {
                step.step_interaction = await Interaction.findOne({
                  where: { id: step.interaction },
                })
                return step
              }
            })
          )
        }
      }

      return res.status(200).send({
        status: true,
        data: task,
        message: 'Task retrieved',
      })
    } else {
      return res.status(404).send({
        status: false,
        message: 'Task is not found',
      })
    }
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const tokenList = async (req, res) => {
  let size = req.query.size,
    page = req.query.page || 1

  try {
  const pagination = helper.pagination(page, 'used')
  const { limit, offset } = helper.getPagination(page, size)

  let tokens = await Token.findAndCountAll({
    limit,
    offset,
    order: pagination.order,
  })

  tokens.rows.map((token) => {
    let photo_url = token.photo
      ? `${config.api}/assets/company/${token.photo}`
      : ''
    token.setDataValue('photo_url', photo_url)

    let icon_url = token.icon
      ? `${config.api}/assets/company/${token.icon}`
      : ''
    token.setDataValue('icon_url', icon_url)
  })

  const paginatedResult = helper.getPagingData(tokens, page, limit, 'tokens')

  return res.status(200).send({
    status: true,
    data: paginatedResult,
    message: 'Token List',
  })
  } catch (err) {
    return res.status(500).send({ status: false, message: err });
  }
}

const getUserTokenPoints = async (req, res) => {
  try {
    const { id } = req.user

    const completedTasks = await CompletedTask.findAll({
      where: { userId: id, status: 1 },
      attributes: ['userId'],
      include: {
        model: Task,
        attributes: [
          'tokenId',
          [db.Sequelize.fn('SUM', db.Sequelize.col('points')), 'totalPoints'],
        ],
        as: 'task',
        include: {
          model: Token,
          attributes: ['name', 'photo', 'icon', 'background'],
          as: 'token',
        },
        group: ['task.token.id'],
      },
      group: ['CompletedTask.id', 'task.id', 'task.token.id'],
    })

    const mappedValue = completedTasks.map((cs) => {
      return {
        ...cs.task.dataValues,
      }
    })

    const cs = mappedValue.reduce(function (acc, val) {
      var o = acc
        .filter(function (obj) {
          return obj.tokenId == val.tokenId
        })
        .pop() || {
        tokenId: val.tokenId,
        tokenName: val.token.name,
        tokenPhoto: val.token.photo,
        tokenIcon: val.token.icon,
        tokenBackground: val.token.background,
        totalPoints: 0,
      }

      o.totalPoints = Number(o.totalPoints) + Number(val.totalPoints)

      acc.push(o)
      return acc
    }, [])

    const dataArr = cs.map((item) => {
      return [item.tokenId, item]
    })

    const maparr = new Map(dataArr) // create key value pair from array of array

    const result = [...maparr.values()]

    return res.status(200).send({
      status: true,
      data: result,
      message: 'Tokens retrieved',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const getDailyTopTenUsers = async (req, res) => {
  try {
    const { date } = req.query
    const today = date ? moment(date) : moment()
    // const timeDate = new Date(date).toISOString();
    // const today = timeDate.split("T")[0];
    let { rows, count } = []

    const CompletedThreshold = 30,
          dayOfTheMonth = moment(today).date(),
          dayofTheWeek = moment(today).day()

    const condition = {
      status: 1,
      published: true,
      archive: false,
    }

    const START_DATE = moment(today).format('YYYY-MM-DD 00:00:00'),
      END_DATE = moment(today).format('YYYY-MM-DD 23:59:59+00')
    // start_at: moment(today).format("YYYY-MM-DD 00:00:00")
    const tasks = await Task.findAndCountAll({
      where: {
        ...condition,
        start_at: {
          [db.Sequelize.Op.gte]: START_DATE,
          [db.Sequelize.Op.lte]: END_DATE,
        },
        weekly: { [Op.eq]: [] },
        monthly: { [Op.eq]: [] },
      },
      attributes: ['id'],
    })

    const recurring = await Task.findAndCountAll({
      where: {
        ...condition,
        [Op.or]: [
          { weekly: { [Op.contains]: [dayofTheWeek] } },
          { monthly: { [Op.contains]: [dayOfTheMonth] } },
        ],
      },
      attributes: ['id'],
    })

    count = tasks.count + recurring.count
    rows = tasks.rows.concat(recurring.rows)

    const result = rows.map(async (task) => {
      const taskId = task.dataValues.id

      return await CompletedTask.findAll({
        // limit: 10,
        where: {
          taskId,
          status: 1,
          createdAt: {
            [Op.and]: {
              [Op.gte]: START_DATE,
              [Op.lte]: END_DATE,
            },
          },
        },
        attributes: ['taskId', 'userId'],
        order: [['createdAt', 'desc']],
        include: {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'photo', 'firstname', 'lastname'],
        },
      })
    })

    const response = await Promise.all(result)
    // console.log(response.flat());

    const grouped = _.groupBy(response.flat(), 'userId')
    // const occ = findOcc(response.flat(), "taskId");

    const check = Object.keys(grouped).map((key) => {
      const occ = helper.findOcc(grouped[key], 'userId')
      return occ
    })

    // console.log('ID ', check);

    const filtered = check
      .flat()
      .filter((topUser) => {
        console.log(
          Math.round((Number(topUser.occurrence) / Number(count)) * 100)
        )
        return (
          Math.round((Number(topUser.occurrence) / Number(count)) * 100) >=
          CompletedThreshold
        )
      })
      .map((res) => res.data.user)

    return res.status(200).send({
      status: true,
      data: {
        totalTasks: count,
        response: filtered,
      },
      message: 'Top ten users list updated',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const getLatestTopUsers = async (req, res) => {
  try {
    const { date } = req.query
    const today = moment()
    // const timeDate = new Date(date).toISOString();
    // const today = timeDate.split("T")[0];date ? moment(date) :
    let { rows, count } = []

    const dayOfTheMonth = moment(today).date(),
      dayofTheWeek = moment(today).day()

    const condition = {
      status: 1,
      archive: false,
      published: true,
    }

    const START_DATE = moment()
        .subtract(24, 'hours')
        .utc()
        .format('YYYY-MM-DD HH:mm:ss'),
      END_DATE = moment().format('YYYY-MM-DD HH:mm:ss')

    // console.log(START_DATE, END_DATE);

    const tasks = await Task.findAndCountAll({
      where: {
        ...condition,
        start_at: {
          [db.Sequelize.Op.gte]: START_DATE,
          [db.Sequelize.Op.lte]: END_DATE,
        },
        weekly: { [Op.eq]: [] },
        monthly: { [Op.eq]: [] },
      },
      attributes: ['id'],
    })

    const recurring = await Task.findAndCountAll({
      where: {
        ...condition,
        [Op.or]: [
          { weekly: { [Op.contains]: [dayofTheWeek] } },
          { monthly: { [Op.contains]: [dayOfTheMonth] } },
        ],
      },
      attributes: ['id'],
    })

    count = tasks.count + recurring.count
    rows = tasks.rows.concat(recurring.rows)

    const result = await CompletedTask.findAll({
      // limit: 10,
      where: {
        status: 1,
        createdAt: {
          [Op.gte]: START_DATE,
          [Op.lte]: END_DATE,
        },
      },
      attributes: ['taskId', 'userId'],
      order: [['createdAt', 'desc']],
      include: {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'photo', 'firstname', 'lastname'],
      },
    })

    const users = [],
      occurence = new Set()

    for (const res of result) {
      if (occurence.length >= 10) break
      let available = occurence.has(res.userId)
      if (!available) users.push(res.user)
      occurence.add(res.userId)
    }

    return res.status(200).send({
      status: true,
      data: {
        totalTasks: count,
        response: users,
      },
      message: 'Latest top ten user\'s list updated',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}
 
const getDailyTopTokens = async (req, res) => {
  try {
    const day = req.query.date || new Date().toISOString().split('T')[0]
    const today = moment(day).format('YYYY-MM-DD')
    const pastDate = moment().subtract(30, 'days').format('YYYY-MM-DD')
    const dayOfTheMonth = moment(today).date(),
      dayofTheWeek = moment(today).day()

    // Calculate active users
    const activeUsers = await CompletedTask.count({
      where: {
        createdAt: { [Op.between]: [pastDate, today] },
      },
      attributes: [
        [Sequelize.fn('DISTINCT', Sequelize.col('userId')), 'userId'],
      ],
      group: ['userId'],
    })

    const totalUsers = activeUsers.length //await User.count({});

    const START_DATE = moment(today).format('YYYY-MM-DD 00:00:00+00'),
      END_DATE = moment(today).format('YYYY-MM-DD 23:59:59+00')

    const condition = {
      status: 1,
      archive: false,
      published: true,
    }

    const tasks = await Task.findAll({
      where: {
        ...condition,
        start_at: {
          [db.Sequelize.Op.gte]: START_DATE,
          [db.Sequelize.Op.lte]: END_DATE,
        },
        weekly: { [Op.eq]: [] },
        monthly: { [Op.eq]: [] },
      },
      attributes: ['id', 'tokenId'],
    })

    const recurring = await Task.findAll({
      where: {
        ...condition,
        [Op.or]: [
          { weekly: { [Op.contains]: [dayofTheWeek] } },
          { monthly: { [Op.contains]: [dayOfTheMonth] } },
        ],
      },
      attributes: ['id', 'tokenId'],
    })

    const dailyTask = tasks.concat(recurring)

    let result = dailyTask.map(async (task) => {
      const taskId = task.dataValues.id
      let completed = await CompletedTask.count({
        where: {
          taskId,
          status: 1,
          createdAt: {
            [Op.and]: {
              [Op.gte]: START_DATE,
              [Op.lte]: END_DATE,
            },
          },
        },
      })
      task.setDataValue('completed', completed)
      return task
    })

    result = await Promise.all(result)

    const tokenGrouped = _.groupBy(result, 'tokenId')
    // console.log(tokenGrouped);

    let tokens = []

    for (let index = 0; index < Object.keys(tokenGrouped).length; index++) {
      const tasks = Object.values(tokenGrouped)[index]
      const id = Object.keys(tokenGrouped)[index]
      let token = await Token.findOne({ where: { id: id } })

      token.setDataValue('created', tasks.length)
      let completed = tasks.reduce(function (acc, val) {
        return (acc += Number(val.dataValues.completed))
      }, 0)

      let percentage = (completed / (totalUsers * tasks.length)) * 100
      percentage = percentage > 100 ? 100 : Math.ceil(percentage)
      token.setDataValue('percentage', percentage)
      tokens.push(token)
    }

    tokens = _.sortBy(tokens, function (token) {
      return -token.dataValues.percentage
    })

    tokens = tokens.slice(0, 5)

    return res.status(200).send({
      status: true,
      activeUsers: totalUsers,
      data: tokens,
      message: 'Clisha Daily Top Tokens',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

module.exports = {
  tokenList,
  getExtensionTaskDetails,
  getUserTokenPoints,
  getDailyTopTenUsers,
  getLatestTopUsers,
  getDailyTopTokens,
}
