const db = require('../models')
const _ = require('lodash')
const { check, validationResult } = require('express-validator')
const { Op, Sequelize } = require('sequelize')
const helper = require('../middleware/helper')
const moment = require('moment')

const {
  getCache,
  setCacheEx,
  setCache,
  deleteKey,
} = require('../services/redis')

const { TaskQueue } = require('../services/queue')
const { appEnvironment } = require('../config/enviroment')
const processCalendarRefresh = new TaskQueue('refresh_user_calendar')
const processVQBonus = new TaskQueue('add_vqbonus_to_vendo')

// Models
const User = db.models.User
const Task = db.models.Task
const TaskOrder = db.models.TaskOrder
const Token = db.models.Token
const CompletedTask = db.models.CompletedTask
const Wallet = db.models.Wallet
const Interaction = db.models.Interaction
const ExperiencePoint = db.models.ExperiencePoint

const generateExtensionURL = (user, task, code) => {
  let type = task.advance_type
  let language = 'en'
  let url = null

  if (type.includes('google')) {
    url = `https://www.google.com?tk=${task.task_code}&cd=${code}`

    console.log(task, code, 'this is where it fails')
  }

  if (type == 'youtube') {
    url = `https://www.youtube.com?tk=${task.task_code}&cd=${code}`
  }

  if (type == 'tiktok') {
    url = `https://www.tiktok.com?tk=${task.task_code}&cd=${code}`
  }
  //for campaign
  if (type == 'campaign') {
    url = `https://www.google.com?tk=${task.task_code}&cd=${code}`
  }

  return url
}

const getUserAvailableTask = async (req, res) => {
  try {
    let id = req.user.id
    const user = await User.findOne({ where: { id: id } })
    let { period, type, size, page, publish } = req.query
    publish = publish == 0 ? false : true

    const region = user.region ?? 'Europe/Berlin',
      gender = user.gender,
      country = user.country,
      birth_date = user.birth_date

    const user_age = moment().diff(birth_date, 'years')
    const is_user_adult = user_age >= 18 ? true : false

    var date = period ? moment(period) : moment()
    if (!period) date = moment(date).tz(region)

    const START_DATE = date.format('YYYY-MM-DD 00:00:00+00')
    var today = date.format('YYYY-MM-DD'),
      time = date.format('HH:mm:ss'),
      dayOfTheMonth = date.date(),
      dayofTheWeek = date.day()

    console.log(is_user_adult, time, region, today, dayOfTheMonth, dayofTheWeek)

    const pagination = helper.pagination(page)
    const { limit, offset } = helper.getPagination(page, size)

    const completed_task = await CompletedTask.findAll({
        where: {
          userId: parseInt(id),
          [Op.or]: {
            task_recurring: false,
            createdAt: {
              [Op.gte]: moment(today).format('YYYY-MM-DD 00:00:00+00'),
              [Op.lte]: moment(today).format('YYYY-MM-DD 23:59:59+00'),
            },
          },
        },
        attributes: ['taskId', 'createdAt'],
      }),
      clisha_types = [
        'website_click',
        'google_search',
        'journey',
        'search_journey',
        'campaign',
      ]

    let condition = {},
      nonrecuring_condition = {},
      lists = []

    completed_task.forEach((task) => {
      lists.push(task.taskId)
    })

    condition = {
      // Remove completed task
      id: { [Op.notIn]: lists },
      // Add n this particular period
      [Op.and]: {
        period_start_at: { [Op.lte]: time },
        period_end_at: { [Op.gte]: time },
      },
      // Do not add unwanted task
      status: 1,
      archive: false,
      published: publish,
    }

    if (period) {
      condition['start_at'] = {
        [Op.gte]: START_DATE,
        [Op.lte]: END_DATE,
      }
    }

    if (clisha_types.includes(type)) {
      condition['task_type'] = type
    }

    const tasks = await Task.findAndCountAll({
      where: {
        ...condition,

        [Op.or]: [{ is_adult: is_user_adult }, { is_adult: false }],

        // countries:  {
        //   [Op.or]: {
        //     [Op.contains]: [country],
        //     [Op.eq]: [],
        //   },
        // },

        weekly: {
          [Op.or]: {
            [Op.contains]: [dayofTheWeek],
            [Op.eq]: [],
          },
        },

        monthly: {
          [Op.or]: {
            [Op.contains]: [today],
            [Op.eq]: [],
          },
        },
      },

      include: [
        { model: Token, as: 'token' },
        { model: Interaction, as: 'interaction' },
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
      limit,
      offset,
      order: pagination.order,
    })
    // console.log('TAsk Count ', tasks.count,recurring.count );

    const index = Math.floor(Math.random() * helper.extentionCode.length)
    const extensionCode = helper.extentionCode[index]

    tasks.rows.map((task) => {
      let period = moment(task.period_end_at, 'HH:mm:ss').fromNow()
      const extension = generateExtensionURL(user, task, extensionCode)
      task.setDataValue('end_in', period)
      task.setDataValue('extensionUrl', extension)

      task.setDataValue(
        'description',
        `Please click on the button and visit the website. Stay and interact on the website until the counter goes down to receive your points.`
      )

      task.setDataValue(
        'isActivatable',
        task.token.value >= task.points ? true : false
      )
    })

    let paginatedResult = helper.getPagingData(tasks, page, limit, 'tasks')

    paginatedResult.extensionCode = extensionCode

    // Cache Available task$
    const key = `${user.id}_available_task`
    const newTaskKey = `new_task`
    const userReadNewTaskKey = `${user.id}_new_task`
    // Data expiry at the end of the day with moment
    const expiry = 3600 * 10
    setCacheEx(key, JSON.stringify(paginatedResult), expiry)

    // Get new task
    const timeOfNewTask = await getCache(newTaskKey)
    if (timeOfNewTask) {
      // Set new task as "READ"
      setCache(userReadNewTaskKey, timeOfNewTask)
    }

    return res.status(200).send({
      status: true,
      data: paginatedResult,
      message: 'Available Tasks',
    })
  } catch (err) {
    console.log(err)
    return res.status(500).send({ status: false, message: err })
  }
}

const completeTaskValidator = () => {
  return [
    check('task').notEmpty().withMessage('Task Completed is required'),
    check('status').notEmpty().withMessage('Task Status is required').isInt(),
  ]
}

const completeClishaTask = async (req, res) => {
  try {
    let user = req.user,
      today = new Date().toISOString(),
      { task, status } = req.body
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: errors.array(),
      })
    }

    // Confirm Task Availability
    let clishaTask = await Task.findOne({
      where: {
        status: 1,
        id: task,
      },
      include: [
        { model: Token, as: 'token' },
        { model: Interaction, as: 'interaction' },
        { model: TaskOrder, as: 'order' },
      ],
    })

    if (!clishaTask) {
      return res.status(400).send({
        status: false,
        message: 'Task is not available',
      })
    }

    const condition = {
      taskId: parseInt(task),
      [Op.or]: {
        task_recurring: false,
        createdAt: {
          [Op.gte]: moment(today).format('YYYY-MM-DD 00:00:00'),
          [Op.lte]: moment(today).format('YYYY-MM-DD 23:59:59+00'),
        },
      },
    }

    const isCompleted = await CompletedTask.count({
        where: {
          userId: parseInt(user.id),
          ...condition,
        },
      }),
      completedToday = await CompletedTask.count({
        where: { ...condition },
      })

    if (isCompleted) {
      return res.status(400).send({
        status: false,
        message: 'Task already completed',
      })
    } else {
      // Handle expired task
      let taskToken = clishaTask.token,
        companyOrder = clishaTask.order
      if (
        companyOrder.today_clicks >= companyOrder.daily_clicks ||
        companyOrder.interaction_balance == 0
      ) {
        return res.status(400).send({
          status: false,
          message: 'Task is not available. Cannot be completed at the moment',
        })
      }

      // Haandling Failed Task
      if (status == 0) {
        let failed = {
          task_start_at: clishaTask.start_at,
          taskId: parseInt(task),
          userId: parseInt(user.id),
          status: 0,
        }

        let failed_task = await CompletedTask.create(failed)

        return res.status(400).send({
          status: true,
          data: failed_task,
          message: 'Task has been registered',
        })
      }

      // Handle Completed Task
      if (status == 1) {
        console.log('Processing Completed Task...')

        // await Token.findOne({ id : clishaTask.tokenId })clishaTask.token
        // Create completed Task payload
        let completed = {
          taskId: parseInt(task),
          userId: parseInt(user.id),
          task_start_at: clishaTask.start_at,
          task_recurring: clishaTask.recurring,
          status: 1,
        }

        let NEW_COMPLETED_TASK = await CompletedTask.create(completed)
        //  Point Distrbution to user and company wallet
        let wallet = await Wallet.findOne({ where: { UserId: user.id } })

        const CLISHA_DOLLAR_CONVERTER = 20

        if (companyOrder) {
          if (clishaTask.interaction_b) {
            if (appEnvironment === 'live') {
              if (clishaTask.id > 829) {
                companyOrder.interaction_balance -= clishaTask.points
                companyOrder.used += clishaTask.points
                companyOrder.today_clicks = completedToday + 1
                await companyOrder.save()
              } else {
                // Task Created By Super Admin(Old Ways)
                taskToken.value -= clishaTask.points
                taskToken.used += clishaTask.points
                await taskToken.save()
              }
            } else {
              companyOrder.interaction_balance -= clishaTask.points
              companyOrder.used += clishaTask.points
              companyOrder.today_clicks = completedToday + 1
              await companyOrder.save()
            }

            current_point = wallet.total_points + clishaTask.points
            wallet.balance = wallet.balance + clishaTask.points * 1
            wallet.total_points = current_point
            wallet.rankName = helper.setRankName(current_point)
            await wallet.save()
          } else {
            // Task Created with DIY (Do it yourself)
            companyOrder.interaction_balance -= clishaTask.points
            companyOrder.used += clishaTask.points
            companyOrder.today_clicks = completedToday + 1
            await companyOrder.save()

            let current_point = wallet.total_points + clishaTask.points
            // let earned =  Math.round(clishaTask.points / CLISHA_DOLLAR_CONVERTER * 100) / 100
            let point = wallet.earned_amount ? wallet.earned_amount : 0
            let earned = parseFloat(
              clishaTask.points / CLISHA_DOLLAR_CONVERTER
            ).toFixed(2)
            console.log('Order Point Total', point, earned, +point + +earned)

            wallet.earned_amount = parseFloat(point) + parseFloat(earned)
            wallet.total_points += clishaTask.points
            wallet.rankName = helper.setRankName(current_point)
            await wallet.save()
          }
        } else {
          // Task Created By Super Admin(Old Ways)
          taskToken.value -= clishaTask.points
          taskToken.used += clishaTask.points
          await taskToken.save()

          current_point = wallet.total_points + clishaTask.points
          wallet.balance = wallet.balance + clishaTask.points * 1
          wallet.total_points = current_point
          wallet.rankName = helper.setRankName(current_point)
          await wallet.save()
        }

        // Get User Experience Points
        const existing = await ExperiencePoint.findOne({
          where: {
            userId: user.id,
            point_type: 'task',
          },
        })

        // Assign Experience point
        if (!existing) {
          let new_payload = {
            points: clishaTask.points,
            point_type: 'task',
            userId: user.id,
          }
          await ExperiencePoint.create(new_payload)
        } else {
          const existing_points = await existing?.points
          let new_points = Number(existing_points) + Number(clishaTask.points)

          await ExperiencePoint.update(
            { points: new_points },
            { where: { userId: user.id, point_type: 'task' } }
          )
        }

        //Reload Calendar Cache
        const calendar_key = `${user.id}_calendar_task`
        await deleteKey(calendar_key)
        await processCalendarRefresh.addToQueue('start_calendar_refresh', user)

        // Add VQ Points to Wallet
        let profile = await User.findOne({ where: { id: user.id } })
        if (profile.vendoConnectStatus) {
          //wallet.bonus_points += ;
          await processVQBonus.addToQueue(
            'process_vqbonus_from_vendo_package',
            { user: profile, points: clishaTask.bonus_points }
          )
        }
        return res.status(200).send({
          status: true,
          data: { task: NEW_COMPLETED_TASK, wallet },
          message: 'Task has been registered',
        })
      }
    }
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const getDailyTask = async (req, res) => {
  try {
    let id = req.user.id,
      { date } = req.query

    date = date ? moment(date) : moment()

    const dayOfTheMonth = moment(date).date()
    dayofTheWeek = moment(date).day()

    const lists = [],
      completed = await CompletedTask.findAll({
        where: {
          userId: parseInt(id),
          [Op.or]: {
            task_recurring: false,
            createdAt: {
              [Op.gte]: moment(date).format('YYYY-MM-DD 00:00:00+00'),
              [Op.lte]: moment(date).format('YYYY-MM-DD 23:59:59+00'),
            },
          },
        },
        attributes: ['taskId', 'createdAt'],
      })

    completed.forEach((task) => {
      lists.push(task.taskId)
    })

    const condition = {
      status: 1,
      archive: false,
      published: true,
    }

    const tasks = await Task.findAndCountAll({
      where: {
        id: { [Op.notIn]: lists },
        start_at: {
          [Op.gte]: moment(date).format('YYYY-MM-DD 00:00:00+00'),
          [Op.lte]: moment(date).format('YYYY-MM-DD 23:59:59+00'),
        },
        ...condition,
      },

      include: [
        { model: Token, as: 'token' },
        { model: Interaction, as: 'interaction' },
      ],
    })

    const recurring = await Task.findAndCountAll({
      where: {
        ...condition,
        [Op.or]: [
          { weekly: { [Op.contains]: [dayofTheWeek] } },
          { monthly: { [Op.contains]: [dayOfTheMonth] } },
        ],
      },
      include: [
        { model: Token, as: 'token' },
        { model: Interaction, as: 'interaction' },
      ],
    })

    const completedTasks = await CompletedTask.findAndCountAll({
      where: {
        userId: id,
        status: 1,
        createdAt: {
          [Op.and]: {
            [Op.gte]: moment(date).format('YYYY-MM-DD 00:00:00+00'),
            [Op.lte]: moment(date).format('YYYY-MM-DD 23:59:59+00'),
          },
        },
      },
      include: [{ model: Task, as: 'task' }],
    })

    tasks.count += recurring.count
    tasks.rows = tasks.rows.concat(recurring.rows)
    tasks.rows = _.sortBy(tasks.rows, function (task) {
      return -task.id
    })

    return res.status(200).send({
      status: true,
      data: { tasks, completed: completedTasks },
      message: 'Daily Task List',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

const getUserBonusPoints = async (req, res) => {
  try {
    const { id } = req.user

    const completedTasks = await CompletedTask.findAll({
      where: { userId: id, status: 1 },
      attributes: ['userId'],
      include: {
        model: Task,
        attributes: ['id', 'bonus_points'],
        as: 'task',
        group: ['task.id'],
        // attributes: ["tokenId", "bonus_points"],
        // include: {
        //   model: Token,
        //   attributes: ["name", "photo", "bonus"],
        //   as: "token",
        // },
        // group: ["task.token.id"],
      },
      group: ['CompletedTask.id', 'task.id'],
      // group: ["CompletedTask.id", "task.id", "task.token.id"],
    })

    const mappedTasks = completedTasks.map((cs) => {
      return {
        ...cs.task.dataValues,
      }
    })

    // const mappedTokens = mappedTasks.map((mt) => {
    //   return mt.token.dataValues;
    // });

    const bonusPoints = mappedTasks.reduce((acc, val) => {
      return (acc += Number(val.bonus_points))
    }, 0)

    const result = bonusPoints

    return res.status(200).send({
      status: true,
      data: { totalBonusPoints: result },
      message: 'VQ bonus points retrieved',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const getTasksMonthlyCalendar = async (req, res) => {
  try {
    const user = req.user
    const { start_date, end_date } = req.query
    const START_PERIOD = moment(start_date).format('YYYY-MM-DD 00:00:00')
    const END_PERIOD = moment(end_date).format('YYYY-MM-DD 23:59:59')

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
      // console.log(date, START_DATE, END_DATE)

      nonrecuring_condition = {
        start_at: {
          [Op.and]: {
            [Op.gte]: START_DATE,
            [Op.lte]: END_DATE,
          },
        },
      }

      // const clishaRecord = await ClishaRecord.findOne({
      //   where: { date: START_DATE },
      // });

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
      data.startTime = date

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

    const isEligible = () => {
      const eligibilityCount = monthlyData.filter(
        (item) => item.bonusEligibility === true
      ).length

      if (eligibilityCount >= 28) return true
      return false
    }

    // Cache User Calendar
    const key = `${user.id}_calendar_task`
    const newTaskKey = `new_task`
    const userReadNewTaskKey = `${user.id}_new_task`
    // Data expiry at the end of the day with moment
    const expiry = 3600 * 10
    const data = {
      bonusEligibility: isEligible(),
      monthlyData: monthlyData,
    }

    setCacheEx(key, JSON.stringify(data), expiry)
    // Get new task
    const timeOfNewTask = await getCache(newTaskKey)
    if (timeOfNewTask) {
      // Set new task as "READ"
      setCache(userReadNewTaskKey, timeOfNewTask)
    }

    return res.status(200).send({
      status: true,
      data: data,
      message: 'Bonus eligibility fetched succesfully',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

const checkAvailableTaskCache = async (req, res, next) => {
  try {
    const user = req.user
    const key = `${user.id}_available_task`
    const newTaskKey = `new_task`
    const userReadNewTaskKey = `${user.id}_new_task`

    const newTask = await getCache(newTaskKey)
    const userReadNewTask = await getCache(userReadNewTaskKey)
    const data = await getCache(key)

    if (!data) {
      console.log('nothing to read yet...')
      next()
    } else if (data && newTask && !userReadNewTask) {
      next()
    } else if (
      data &&
      newTask &&
      userReadNewTask &&
      newTask !== userReadNewTask
    ) {
      next()
    } else {
      console.log('reading data from cache...')
      return res.status(200).send({
        status: true,
        data: JSON.parse(data),
        message: 'Available Tasks',
      })
    }
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

const checkUserCalendarCache = async (req, res, next) => {
  try {
    const user = req.user
    const key = `${user.id}_calendar_task`
    const newTaskKey = `new_task`
    const userReadNewTaskKey = `${user.id}_new_task`

    console.log(
      `Current Keys are available task ${key}   New Task ${newTaskKey} Read New Task ${userReadNewTaskKey}  `
    )

    const newTask = await getCache(newTaskKey)
    const userReadNewTask = await getCache(userReadNewTaskKey)
    const data = await getCache(key)

    if (!data) {
      console.log('nothing to read yet...')
      next()
    } else if (data && newTask && !userReadNewTask) {
      next()
    } else if (
      data &&
      newTask &&
      userReadNewTask &&
      newTask !== userReadNewTask
    ) {
      next()
    } else {
      console.log('reading data from cache...')
      return res.status(200).send({
        status: true,
        data: JSON.parse(data),
        message: 'Available Tasks',
      })
    }
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

const reloadUserCalendar = async (req, res, next) => {
  try {
    const user = req.user
    const key = `${user.id}_calendar_task`
    const calendar_key = `${user.id}_calendar_task`
    console.log('Calendar key to be deleted', calendar_key)
    await deleteKey(calendar_key)
    await processCalendarRefresh.addToQueue('start_calendar_refresh', user)

    next()
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

const testNewFeed = async (req, res, next) => {
  const k = {
    model: TaskOrder,
    as: 'order',
    where: {
      interaction_balance: {
        [Op.gte]: 0,
      },
      daily_clicks: {
        [Op.gte]: 0,
      },
    },
  }
}

module.exports = {
  getUserAvailableTask,
  checkAvailableTaskCache,
  getTasksMonthlyCalendar,
  checkUserCalendarCache,
  reloadUserCalendar,

  completeClishaTask,
  completeTaskValidator,
  getDailyTask,
  getUserBonusPoints,
}
