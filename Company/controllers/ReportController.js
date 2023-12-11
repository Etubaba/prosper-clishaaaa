const db = require('../models')
const moment = require('moment')
const _ = require('lodash')
const { Op, Sequelize } = require('sequelize')
const helper = require('../middleware/helper')
const {
  getCache,
  setCacheEx,
  setCache,
  deleteKey,
} = require('../services/redis')

// Models
const User = db.models.User
const CompletedTask = db.models.CompletedTask
const Task = db.models.Task
const Token = db.models.Token
const TaskOrder = db.models.TaskOrder

const companyTaskSummary = async (req, res) => {
  const { admin_id, company_id } = req.company
  const { date, search, task_type, size, page } = req.query

  let condition = {}
  let paginatedResult

  const pagination = helper.pagination(page)
  let { limit, offset } = helper.getPagination(page, size)

  if (size == 'all' || size == -1) {
    limit = null
    offset = null
  }

  if (task_type) {
    condition['task_type'] = task_type
  }

  condition['tokenId'] = company_id

  console.log(condition)
  const tasks = await CompletedTask.findAndCountAll({
    include: [
      {
        model: User,
        as: 'user',
      },
      {
        model: Task,
        as: 'task',
        where: {
          ...condition,
        },
        include: [
          {
            model: Token,
            attributes: ['name', 'photo', 'icon', 'background'],
            as: 'token',
          },
          {
            model: TaskOrder,
            as: 'order',
          },
        ],
      },
    ],
    limit: limit,
    offset: offset,
    order: pagination.order,
  })

  tasks.rows.map((task) => {
    let order = task.order
    if (order) {
      order.setDataValue('code', task.id.toString().padStart(7, '0'))
    }
  })

  if (size == 'all' || size == -1) {
    paginatedResult = tasks
  } else {
    paginatedResult = helper.getPagingData(tasks, page, limit, 'tasks')
  }

  return res.status(200).send({
    status: true,
    data: paginatedResult,
  })
}

const taskSummary = async (req, res) => {
  const { admin_id, company_id } = req.company

  const { date, search, task_type, size, page } = req.query
  const { id } = req.params

  let condition = {}
  let paginatedResult

  const pagination = helper.pagination(page)
  let { limit, offset } = helper.getPagination(page, size)

  if (size == 'all' || size == -1) {
    limit = null
    offset = null
  }

  // if(task_type){
  //   condition['task_type'] = task_type
  // }

  condition['tokenId'] = company_id

  const tasks = await CompletedTask.findAndCountAll({
    //taskId: id,
    where: {
      taskId: id,
    },
    include: [
      {
        model: User,
        as: 'user',
      },
      {
        model: Task,
        as: 'task',
        where: {
          ...condition,
        },
        include: [
          {
            model: Token,
            attributes: ['name', 'photo', 'icon', 'background'],
            as: 'token',
          },
          {
            model: TaskOrder,
            as: 'order',
          },
        ],
      },
    ],
    limit: limit,
    offset: offset,
    order: pagination.order,
  })

  tasks.rows.map((task) => {
    let order = task.task.order
    if (order) {
      order.setDataValue('code', task.id.toString().padStart(7, '0'))
    }
  })

  if (size == 'all' || size == -1) {
    paginatedResult = tasks
  } else {
    paginatedResult = helper.getPagingData(tasks, page, limit, 'tasks')
  }

  return res.status(200).send({
    status: true,
    data: paginatedResult,
  })
}

const companyReportOverview = async (req, res) => {
  const { admin_id, company_id } = req.company

  // Date Params
  const startCurrentMonth = moment().startOf('month').format('YYYY-MM-DD')
  const endCurrentMonth = moment().endOf('month').format('YYYY-MM-DD')
  const startPreviousMonth = moment()
    .subtract(1, 'month')
    .startOf('month')
    .format('YYYY-MM-DD')

  const endPreviousMonth = moment()
    .subtract(1, 'month')
    .endOf('month')
    .format('YYYY-MM-DD')

  const activeTask = await Task.findAll({
    where: {
      tokenId: company_id,
      archive: false,
      status: 1,

      // weekly:  {
      //   [Op.or]: {
      //     [Op.contains]: [dayofTheWeek],
      //     [Op.eq]: [],
      //   },
      // },

      // monthly:  {
      //   [Op.or]: {
      //     [Op.contains]: [today],
      //     [Op.eq]: [],
      //   },
      // },
    },

    attributes: [
      'id',
      'task_code',
      'task_type',
      'advance_type',
      'orderId',
      'tokenId',
    ],

    include: [
      {
        model: TaskOrder,
        as: 'order',
        where: {
          interaction_balance: {
            [Op.gte]: 0,
          },
          daily_clicks: {
            [Op.gt]: db.sequelize.col('today_clicks'),
          },
        },
      },
    ],
  })

  // Utility function
  const task_interactions = (task) => {
    return task.order?.interactions
  }
  const task_used = (task) => {
    return task.order?.used
  }
  const task_clicks = (task) => {
    return task.order?.today_clicks
  }
  const sum = (prev, next) => {
    return prev + next
  }

  const today = {
    activeTask: activeTask.length,
    interactions: activeTask.map(task_interactions).reduce(sum, 0),
  }

  const currentOverview = await Task.findAll({
    where: {
      tokenId: company_id,
      createdAt: {
        [Op.between]: [startCurrentMonth, endCurrentMonth],
      },
    },
    attributes: [
      'id',
      'task_code',
      'task_type',
      'advance_type',
      'orderId',
      'tokenId',
    ],
    include: [
      {
        model: TaskOrder,
        as: 'order',
      },
    ],
    // group: ['Task.id'], // Group by the Task's primary key
  })

  const pastOverview = await Task.findAll({
    where: {
      tokenId: company_id,
      createdAt: {
        [Op.between]: [startPreviousMonth, endPreviousMonth],
      },
    },
    attributes: [
      'id',
      'task_code',
      'task_type',
      'advance_type',
      'orderId',
      'tokenId',
    ],
    include: [
      {
        model: TaskOrder,
        as: 'order',
      },
    ],
    // group: ['Task.id'], // Group by the Task's primary key
  })

  const result = _.groupBy(currentOverview, 'advance_type')
  const pastresult = _.groupBy(pastOverview, 'advance_type')

  const overview = Object.keys(result).map((key) => {
    const tasks = Object.values(result[key])
    const pastTasks = pastresult[key] ? Object.values(pastresult[key]) : null

    const interactions = tasks.map(task_used).reduce(sum, 0)
    const clicks = tasks.map(task_clicks).reduce(sum, 0)

    return {
      current: { interactions, clicks },
      past: {
        interactions: pastTasks ? pastTasks.map(task_used).reduce(sum) : 0,
        clicks: pastTasks ? pastTasks.map(task_clicks).reduce(sum) : 0,
      },
    }
  })

  const report = []
  const view = []

  Object.keys(result).forEach((key, index) => {
    const current = overview[index].current
    const past = overview[index].past
    const percentage = helper.percentageDifference(past.clicks, current.clicks)

    const data = { [key]: { ...current, percentage } }
    // console.log(Object.values(data)[0]  )
    report.push(data)
  })

  return res.status(200).send({
    status: true,
    data: { today, report },
    message: 'Company Task Overview Report',
  })
}

const clishaDailyReport = async (req, res) => {
  const id = req.admin.id
  const total = 7
  const days = []
  const today = moment().format('YYYY-MM-DD')
  const pastDate = moment().subtract(30, 'days').format('YYYY-MM-DD')
  // Calculate active users
  const activeUsers = await CompletedTask.count({
    where: {
      createdAt: { [Op.between]: [pastDate, today] },
    },
    attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('userId')), 'userId']],
    group: ['userId'],
  })

  for (let i = 0; i < total; i++) {
    const day = moment().subtract(i, 'day').format('YYYY-MM-DD')
    days.push(day)
  }

  let members = [],
    active_members = [],
    engagement = []
  const period = days.reverse()

  const response = period.map(async (day, i, row) => {
    const START_DAY = moment(day).startOf('day')
    const END_DAY = moment(day).endOf('day')

    const total_members = await User.count({
      where: {
        createdAt: {
          [Op.between]: [START_DAY, END_DAY],
        },
      },
    })

    const total_active_members = await User.count({
      where: {
        email_verified_at: {
          [Op.between]: [START_DAY, END_DAY],
        },
      },
    })

    var total_engagement = await CompletedTask.count({
      where: {
        createdAt: {
          [Op.between]: [START_DAY, END_DAY],
        },
      },
    })

    total_engagement = total_engagement / activeUsers.length

    return { total_members, total_active_members, total_engagement }
    // return  { [day]:  {members, active_members, engagement}  }
  })

  let report = await Promise.all(response)

  report = report.map((data, i) => {
    const day = period[i]
    members.push({ date: day, count: data.total_members })
    active_members.push({ date: day, count: data.total_active_members })
    engagement.push({ date: day, count: data.total_engagement })
  })

  const reports = { members, active_members, engagement }
  // Cche Data
  const key = `admin_daily_report`
  const expiry = 3600 * 10
  setCacheEx(key, JSON.stringify(reports), expiry)

  return res.status(200).send({
    status: true,
    data: reports,
    message: 'Clisha Overview report',
  })
}

module.exports = {
  taskSummary,
  companyTaskSummary,

  companyReportOverview,
  clishaDailyReport,
}
