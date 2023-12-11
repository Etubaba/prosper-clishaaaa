const db = require('../models')
const { check, body, validationResult } = require('express-validator')
const helper = require('../middleware/helper')
const moment = require('moment')
const Op = db.Sequelize.Op
const _ = require('lodash')
const { lte } = require('lodash')
const { setCache } = require('../services/redis')

const { ClishaRecordQueue } = require('../services/queue')
const { getDates } = require('../utils/calender/getDates')
const {
  groupByTaskId,
  monthIndexToDateStr,
  getTargetDates,
  filterTargetMonth,
} = require('../utils/calender')
const processClishaRecord = new ClishaRecordQueue('update_clisha_record')

// Models
const Task = db.models.Task
const TaskOrder = db.models.TaskOrder
const CompanyWallet = db.models.CompanyWallet
const CompletedTask = db.models.CompletedTask
const Token = db.models.Token
const Admin = db.models.Admin
const Interaction = db.models.Interaction

const createTaskValidator = () => {
  let yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  return [
    check('points').notEmpty().withMessage('Task Point is required').isInt(),

    check('daily_clicks')
      .notEmpty()
      .withMessage('Daily Click amount is required')
      .isInt({ min: 0 })
      .withMessage('Input a valid Daily Click'),

    check('total_interactions')
      .notEmpty()
      .withMessage('Total Interactions is required')
      .isInt({ min: 0 })
      .withMessage('Input a valid interactions'),

    check('task_type')
      .notEmpty()
      .withMessage('Task ytpe is required')
      .isIn(['website_click', 'google_search', 'search_journey'])
      .withMessage('Input a valid Task Type'),

    check('url')
      .if(check('task_type').isIn(['website_click', 'google_search']))
      .notEmpty()
      .withMessage('Task URL is required')
      .isURL()
      .withMessage('Input a valid URL'),

    check('countries')
      .optional()
      .isArray()
      .withMessage('Input valid countries'),

    check('countries.*')
      .notEmpty()
      .withMessage('Input a valid country name')
      .isString({ min: 3, max: 128 }),
    check('countries.*')
      .notEmpty()
      .withMessage('Input a valid country name')
      .isString({ min: 3, max: 128 }),

    check('google_search')
      .if(check('task_type').isIn(['google_search', 'search_journey']))
      .isObject()
      .withMessage('Input valid Search task'),

    check('google_search.engine')
      .if(check('task_type').isIn(['google_search', 'search_journey']))
      .notEmpty()
      .withMessage('Seach Engine is required')
      .isString({ min: 3, max: 128 }),

    // check('google_search.title')
    //   .if(check('task_type').isIn(['google_search', 'search_journey']))
    //   .notEmpty()
    //   .withMessage('Task Title is required')
    //   .isString({ min: 3, max: 128 }),

    check('google_search.search_phrase')
      .if(check('task_type').isIn(['google_search', 'search_journey']))
      .notEmpty()
      .withMessage('Search Phrase is required')
      .isString({ min: 3, max: 128 }),

    check('journey')
      .if(check('task_type').equals('search_journey'))
      .isArray()
      .withMessage('Input valid search_journey task'),

    check('journey.*.link')
      .if(check('task_type').isIn(['search_journey']))
      .isURL()
      .withMessage('Input valid URL'),

    check('journey.*.interaction')
      .if(check('task_type').isIn(['search_journey']))
      .if(check('journey.*.link_type').equals('content'))
      .isInt(),

    check('journey.*.description')
      .if(check('task_type').isIn(['search_journey']))
      .isString({ min: 10, max: 128 }),

    check('journey.*.link_type')
      .if(check('task_type').isIn(['search_journey']))
      .notEmpty()
      .isIn(['content', 'form', 'video'])
      .withMessage('Input a valid Link Type'),

    check('period_start')
      .optional()
      // .matches("^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$")
      .matches(/(?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d)/)
      .withMessage('Input a correct time in the format of hh:mm:ss'),

    check('period_end')
      .if(body('period_start').exists())
      .matches(/(?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d)/)
      .withMessage('Input a correct time in the format of hh:mm:ss'),

    check('weekly.*')
      .isInt({ min: 0, max: 6 })
      .withMessage('Day of the week must be between Sunday to Saturday'),

    check('monthly.*')
      .isDate()
      .withMessage('Input a correct date')
      .isAfter(yesterday.toDateString())
      .withMessage('Date can not be in the past'),
  ]
}

const createCompanyTask = async (req, res) => {
  const { admin_id, company_id } = req.company
  const wallet = await CompanyWallet.findOne({
    where: { companyId: company_id },
  })

  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  // Generate Unique Code
  let {
    task_type,
    points,
    bonus_points,
    daily_clicks,
    days_duration,
    total_interactions,
    order_months,

    url,
    start,
    countries,
    track_domain,
    is_adult,
    random_click,
    visitors_referrer,

    interaction,
    google_search,
    website_click,

    weekly,
    monthly,
    published,
  } = req.body

  if (!wallet || total_interactions > wallet?.balance) {
    return res.status(400).send({
      status: false,
      message: 'Interaction Balance is not enough',
    })
  }

  const total_task = await Task.count()
  const code =
    (Math.random() + 1).toString(36).substring(6) +
    total_task.toString().padStart(4, '0') +
    (Math.random() + 1).toString(36).substring(10)
  const isToday = start ? moment().isSame(start, 'day') : false

  let task = {
    adminId: admin_id,
    tokenId: company_id,
    url: url,
    task_code: code.toUpperCase(),
    points: points,
    bonus_points: bonus_points,
    task_type: task_type.toLowerCase(),
    start_at: start && !isToday ? start : new Date().toISOString(),

    countries: countries,
    track_domain: track_domain,
    is_adult: is_adult,
    random_click: random_click,
    visitors_referrer: visitors_referrer,
    interactionId: interaction ? interaction : null,
    recurring: true,
    weekly: weekly ? weekly : [],
    monthly: monthly ? monthly : [],
    published: published,
  }

  task.advance_type = google_search?.engine ? google_search.engine : task_type

  let orderPayload = {
    points,
    interactions: total_interactions,
    interaction_balance: total_interactions,
    daily_clicks,
    days_duration,
    order_months,
  }

  if (task_type == 'website_click') task.website_click = website_click

  if (task_type == 'google_search') task.google_search = google_search

  const type_errors = validationResult(req)
  if (!type_errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: type_errors.array(),
    })
  }

  // Confirm Order
  const order = await TaskOrder.create(orderPayload)
  task.orderId = order.id
  const newTask = await Task.create(task)
  wallet.balance -= total_interactions
  wallet.save()

  return res.status(200).send({
    status: true,
    data: { task: newTask },
    message: 'Task created succesfully',
  })
}

const createCampaignTask = async (req, res) => {
  const admin_id = req.query.admin_id || req?.company?.admin_id
  const company_id = req.query.company_id || req?.company?.company_id

  try {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: errors.array(),
      })
    }

    // Generate Unique Code
    let {
      task_type,
      points,
      bonus_points,
      daily_clicks,
      total_interactions,
      url,
      start,
      countries,
      track_domain,
      is_adult,
      random_click,
      visitors_referrer,
      interaction,
      google_search,
      journey,
      details,
      weekly,
      monthly,
      published,
      advance_type,
    } = req.body

    const wallet = await CompanyWallet.findOne({
      where: { companyId: company_id },
    })

    if (!wallet || total_interactions > wallet?.balance) {
      return res.status(400).send({
        status: false,
        message: 'Balance not enough',
      })
    }

    const total_task = await Task.count()
    const code =
      (Math.random() + 1).toString(36).substring(6) +
      total_task.toString().padStart(4, '0') +
      (Math.random() + 1).toString(36).substring(10)
    const isToday = start ? moment().isSame(start, 'day') : false

    let task = {
      adminId: admin_id,
      tokenId: company_id,
      url: url,
      task_code: code.toUpperCase(),
      points: points,
      bonus_points: bonus_points,
      task_type: task_type.toLowerCase(),
      start_at: start && !isToday ? start : new Date().toISOString(),
      advance_type,
      countries: countries,
      track_domain: track_domain,
      is_adult: is_adult,
      random_click: random_click,
      visitors_referrer: visitors_referrer,
      interactionId: interaction ? interaction : null,
      recurring: true,
      weekly: weekly ? weekly : [],
      monthly: monthly ? monthly : [],
      published: published ? published : true,
      campaign_details: details,
      google_search: google_search,
      journey: journey,
    }

    let orderPayload = {
      points,
      interactions: total_interactions,
      interaction_balance: total_interactions,
      daily_clicks,
    }

    // Confirm Order
    const order = await TaskOrder.create(orderPayload)
    task.orderId = order.id
    const newTask = await Task.create(task)
    wallet.balance -= total_interactions
    wallet.save()

    // task.end_at = moment(task.start_at).add(hours, 'hours')
    // const newTaskKey = `new_task`
    // setCache(newTaskKey, Date.now())
    // await processClishaRecord.addToQueue('start_clisha_record_update', {})

    return res.status(200).send({
      status: true,
      data: { task: newTask },
      message: 'Campaign Task created succesfully',
    })
  } catch (err) {
    res.status(500).json({ status: false, message: `Error: ${err}` })
  }
}

const companyTaskList = async (req, res) => {
  const { admin_id, company_id } = req.company
  const { date, search, task_type, size, page, status } = req.query

  let condition = {}
  let paginatedResult
  var period = date ? moment(date) : moment()
  const pagination = helper.pagination(page)
  let { limit, offset } = helper.getPagination(page, size)

  if (size == 'all' || size == -1) {
    limit = null
    offset = null
  }
  // console.log('Limiy', offset, limit, pagination.order);

  if (search) {
    condition = {
      [Op.or]: [
        { task_code: { [Op.like]: '%' + search + '%' } },
        { task_type: { [Op.like]: '%' + search + '%' } },
      ],
    }
  }

  if (task_type) {
    condition['task_type'] = task_type
  }

  condition['archive'] = false
  condition['tokenId'] = company_id

  //filter by status
  if (status) {
    if (status === 'play') {
      condition['published'] = true
      condition['status'] = 1
    } else if (status === 'pause') {
      condition['published'] = false
      condition['status'] = 1
    } else if (status === 'end') {
      condition['published'] = false
      condition['status'] = 0
    }
  }

  const tasks = await Task.findAndCountAll({
    where: {
      ...condition,
    },
    include: [
      { model: Token, as: 'token' },
      { model: Interaction, as: 'interaction' },
      { model: TaskOrder, as: 'order' },
      { model: Admin, as: 'admin' },
    ],
    limit: limit,
    offset: offset,
    order: pagination.order,
  })

  tasks.rows.map((task) => {
    let order = task.order
    if (order) {
      const percentage = (order.used / order.interactions) * 100
      const success_percentage = (order.today_clicks / order.daily_clicks) * 100
      order.setDataValue('code', task.id.toString().padStart(7, '0'))
      order.setDataValue('status_percentage', percentage)
      order.setDataValue('success_percentage', success_percentage)
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
    // message: 'Tasks List',
  })
}

const updateClishaTask = async (req, res) => {
  const { admin_id, company_id } = req.company
  const { id } = req.params
  let { status, published } = req.body

  // const update_payload = {
  //  status,
  //  published
  // }
  const update_payload = {
    ...req.body,
  }

  const tokenUpdate = await Task.update(update_payload, {
    where: {
      id: id,
      tokenId: company_id,
    },
  })

  // const newTaskKey = `new_task`
  // setCache(newTaskKey, Date.now())
  // await processClishaRecord.addToQueue('start_clisha_record_update', {})

  return res.status(200).send({
    status: true,
    data: { tokenUpdate },
    message: 'Task successfully updated',
  })
}

const updateCompletedTasks = async (req, res) => {
  try {
    const completedTasks = await CompletedTask.findAll({
      include: {
        model: Task,
        as: 'task',
        attributes: ['start_at'],
      },
    })

    const data = completedTasks.forEach(async (completedTask) => {
      const ct = _.pick(
        completedTask.dataValues,
        'id',
        'userId',
        'taskId',
        'task'
      )
      const t = _.pick(ct.task.dataValues, 'start_at')
      const _data = { ...ct, task: t }

      const updates = await CompletedTask.update(
        { task_start_at: _data.task.start_at },
        {
          where: {
            id: _data?.id,
          },
        }
      )
    })

    return res.send({
      status: true,
      data: data,
      message: 'Completed Tasks updated succesfully',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

const deleteTask = async (req, res) => {
  const taskId = req.params.taskId
  // Check if task has been completed
  const isCompleted = await CompletedTask.findOne({ where: { taskId } })

  // If completed, archive the task
  if (isCompleted && isCompleted.dataValues) {
    await Task.update({ archive: true, status: 0 }, { where: { id: taskId } })

    // const newTaskKey = `new_task`
    // setCache(newTaskKey, Date.now())
    // await processClishaRecord.addToQueue('start_clisha_record_update', {})

    return res.send({
      status: true,
      data: null,
      message: 'Task deleted succesfully',
    })
  }

  // If not completed, delete task completely
  await Task.destroy({ where: { id: taskId } })

  // const newTaskKey = `new_task`
  // setCache(newTaskKey, Date.now())
  // await processClishaRecord.addToQueue('start_clisha_record_update', {})

  return res.send({
    status: true,
    data: null,
    message: 'Task deleted succesfully',
  })
}

const getTasksMonthlyCount = async (req, res) => {
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

    // var dates = [moment({...START_PERIOD})];

    // while(END_PERIOD.date() != START_PERIOD.date()){
    //   START_PERIOD.add(1, 'day');
    //   dates.push( moment({ ...START_PERIOD }) );
    // }

    // console.log(dates);
    // return;

    let condition = {
        status: 1,
        archive: false,
        published: true,
      },
      nonrecuring_condition = {}

    let monthlyData = dates.map(async (element) => {
      let data = {}
      let date = moment(element)

      let START_DATE = date.format('YYYY-MM-DD 00:00:00')
      let END_DATE = date.format('YYYY-MM-DD 23:59:59')

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

      data.createdTasks = tasks + recurring
      data.completedTasks = completedTasksCount
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

      if (Number(data.createdTasks) > Number(data.completedTasks)) {
        bonusEligibility = false
      }

      data.bonusEligibility = bonusEligibility
      return data
    })

    // for (const element of dates) {
    //   // console.log(element);
    //   monthlyData.push(data);
    // }

    monthlyData = await Promise.all(monthlyData)

    const isEligible = () => {
      const eligibilityCount = monthlyData.filter(
        (item) => item.bonusEligibility === true
      ).length

      if (eligibilityCount >= 28) return true
      return false
    }

    return res.status(200).send({
      status: true,
      data: {
        bonusEligibility: isEligible(),
        monthlyData: monthlyData,
      },
      message: 'Bonus eligibility fetched succesfully',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

const calenderTask = async (req, res) => {
  const { month, year, admin_id } = req.query

  const monthStr = moment.months(Number(month))
  try {
    const tasks = await Task.findAndCountAll({
      where: {
        adminId: Number(admin_id),
      },
      include: [
        { model: Token, as: 'token' },
        { model: Interaction, as: 'interaction' },
        { model: TaskOrder, as: 'order' },
        { model: Admin, as: 'admin' },
      ],
    })
    const { rows } = tasks

    const desiredTasksByYear = rows.filter(
      (item) => new Date(item.start_at).getFullYear() === Number(year)
    )

    const calender = [] //result as arr of datestring
    for (let i = 0; i < desiredTasksByYear.length; i++) {
      const taskMonthObj = desiredTasksByYear[i].order.order_months

      const finalObj = {
        company_id: desiredTasksByYear[i].token.companyId,
        adminId: desiredTasksByYear[i].adminId,
        taskId: desiredTasksByYear[i].id,
        advance_type: desiredTasksByYear[i].advance_type,
      }

      if (
        desiredTasksByYear[i].weekly.length === 0 &&
        desiredTasksByYear[i].monthly.length === 0
      ) {
        for (let j = 0; j < taskMonthObj.length; j++) {
          if (taskMonthObj[j].month === monthStr) {
            const days = taskMonthObj[j].days

            const dateArr = getDates(desiredTasksByYear[i].start_at, days) //params start date and running days

            const updatedfinalObj = {
              ...finalObj,
              recurring: false,
              mode: 'normal',
              calenderData: dateArr,
            }
            calender.push(updatedfinalObj)
          }
        }
      } else {
        const monthArr = desiredTasksByYear[i].monthly
        const weeklyArr = desiredTasksByYear[i].weekly

        if (weeklyArr.length !== 0) {
          const givenStartDate = desiredTasksByYear[i].start_at.split(' ') //date is represented with ' ' between
          const startDate = givenStartDate[0]

          console.log(taskMonthObj)

          for (let j = 0; j < taskMonthObj.length; j++) {
            const monthIndex = moment().month(taskMonthObj[j].month).format('M')

            const targetDate = new Date(`${year}-${Number(monthIndex)}-1`)
            targetDate.setHours(targetDate.getHours() + 1)

            const weeklyCalenderDates = getTargetDates(
              weeklyArr,
              targetDate,
              startDate
            )

            const targetYear = targetDate.getFullYear()
            const targetMonth = targetDate.getMonth()
            const calenderData = filterTargetMonth(
              targetYear,
              targetMonth,
              weeklyCalenderDates
            )

            const updatedFinalObj = {
              ...finalObj,
              recurring: true,
              mode: 'weekly',
              calenderData,
            }
            calender.push(updatedFinalObj)
          }
        } else if (monthArr.length !== 0) {
          for (let j = 0; j < monthArr.length; j++) {
            const date = new Date(monthArr[j])

            //convert to string e.g 'septemper'
            const strMonth = date.toLocaleString('default', { month: 'long' })

            const dateArr = []
            for (let k = 0; k < taskMonthObj.length; k++) {
              if (strMonth === taskMonthObj[k].month) {
                dateArr.push(date)

                const updatedFinalObj = {
                  ...finalObj,
                  recurring: true,
                  mode: 'monthly',
                  calenderData: dateArr.filter(
                    (x) => new Date(x).getMonth() == +month
                  ),
                }
                calender.push(updatedFinalObj)
              }
            }
          }
        }
      }
    }

    //format calender array to remove duplicates

    const fixedCalender = groupByTaskId(calender)

    res.status(200).json({
      status: true,
      calender: fixedCalender,
    })
  } catch (err) {
    return res.status(500).json({ message: `Error: ${err}` })
  }
}

const allUserCalenderTask = async (req, res) => {
  const { admin_id } = req.company

  const year = new Date().getFullYear()
  // const monthStr = moment.months(Number(month))
  try {
    const tasks = await Task.findAndCountAll({
      where: {
        adminId: Number(admin_id),
      },
      include: [
        { model: Token, as: 'token' },
        { model: Interaction, as: 'interaction' },
        { model: TaskOrder, as: 'order' },
        { model: Admin, as: 'admin' },
      ],
    })
    const { rows: allTasks } = tasks

    const calender = [] //result as arr of datestring
    for (let i = 0; i < allTasks.length; i++) {
      const taskMonthObj = allTasks[i].order.order_months

      const finalObj = {
        taskId: allTasks[i].id,
      }

      if (allTasks[i].weekly.length === 0 && allTasks[i].monthly.length === 0) {
        for (let j = 0; j < taskMonthObj.length; j++) {
          // if (taskMonthObj[j].month === monthStr) {
          const days = taskMonthObj[j].days

          const dateArr = getDates(allTasks[i].start_at, days) //params start date and running days

          const updatedfinalObj = {
            ...finalObj,

            calenderData: dateArr,
          }
          calender.push(updatedfinalObj)
          // }
        }
      } else {
        const monthArr = allTasks[i].monthly
        const weeklyArr = allTasks[i].weekly

        if (weeklyArr.length !== 0) {
          const givenStartDate = allTasks[i].start_at.split(' ') //date is represented with ' ' between
          const startDate = givenStartDate[0]

          for (let j = 0; j < taskMonthObj.length; j++) {
            const monthIndex = moment().month(taskMonthObj[j].month).format('M')

            const targetDate = new Date(`${year}-${Number(monthIndex)}-1`)
            targetDate.setHours(targetDate.getHours() + 1)

            const weeklyCalenderDates = getTargetDates(
              weeklyArr,
              targetDate,
              startDate
            )

            const updatedFinalObj = {
              ...finalObj,

              calenderData: weeklyCalenderDates,
            }
            calender.push(updatedFinalObj)
          }
        } else if (monthArr.length !== 0) {
          for (let j = 0; j < monthArr.length; j++) {
            const date = new Date(monthArr[j])

            //convert to string e.g 'septemper'
            const strMonth = date.toLocaleString('default', { month: 'long' })

            const dateArr = []
            for (let k = 0; k < taskMonthObj.length; k++) {
              if (strMonth === taskMonthObj[k].month) {
                dateArr.push(date)

                const updatedFinalObj = {
                  ...finalObj,

                  calenderData: dateArr,
                }
                calender.push(updatedFinalObj)
              }
            }
          }
        }
      }
    }

    //format calender array to remove duplicates

    const fixedCalender = groupByTaskId(calender)

    // make everything in a single array
    const calendarData = fixedCalender.map((item) => item.calenderData)

    const result = [].concat(...calendarData)

    res.status(200).json({
      status: true,
      calender: result,
    })
  } catch (err) {
    return res.status(500).json({ message: `Error: ${err}` })
  }
}
module.exports = {
  createTaskValidator,
  createCompanyTask,
  createCampaignTask,
  companyTaskList,
  getTasksMonthlyCount,
  allUserCalenderTask,
  updateCompletedTasks,
  updateClishaTask,
  deleteTask,
  calenderTask,
}
