const db = require('../../models')
const { check, body, validationResult } = require('express-validator')
const helper = require('../../middleware/helper')
const moment = require('moment')
const Op = db.Sequelize.Op
const _ = require('lodash')
const { lte } = require('lodash')

// Models
const Task = db.models.Task
const CompletedTask = db.models.CompletedTask
const Token = db.models.Token
const Admin = db.models.Admin
const Interaction = db.models.Interaction

const createTaskValidator = () => {
  let yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  return [
    check('points').notEmpty().withMessage('Task Point is required').isInt(),

    check('start')
      .isDate()
      .withMessage('Input a correct date')
      .isAfter(yesterday.toDateString())
      .withMessage('Date can not be in the past'),

    check('task_type')
      .notEmpty()
      .withMessage('Task ytpe is required')
      .isIn(['website_click', 'google_search', 'journey', 'search_journey'])
      .withMessage('Input a valid Task Type'),

    check('url')
      .if(check('task_type').isIn(['website_click', 'google_search']))
      .notEmpty()
      .withMessage('Task URL is required')
      .isURL()
      .withMessage('Input valid URL'),

    check('google_search')
      // .if(check("task_type").equals("google_search"))
      .if(check('task_type').isIn(['google_search', 'search_journey']))
      .isObject()
      .withMessage('Input valid  Google Search task'),

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
      .if(check('task_type').equals('journey'))
      .isArray()
      .withMessage('Input valid Journey task'),

    check('journey.*.link')
      // .if(check("task_type").equals("journey"))
      .if(check('task_type').isIn(['journey', 'search_journey']))
      .isURL()
      .withMessage('Input valid URL'),

    check('journey.*.interaction')
      .if(check('task_type').isIn(['journey', 'search_journey']))
      .if(check('journey.*.link_type').equals('content'))
      .isInt(),

    check('journey.*.description')
      .if(check('task_type').isIn(['journey', 'search_journey']))
      .isString({ min: 10, max: 128 }),

    check('journey.*.link_type')
      .if(check('task_type').isIn(['journey', 'search_journey']))
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
      .optional()
      .isInt({ min: 0, max: 6 })
      .withMessage('Day of the week must be between Sunday to Saturday'),

    check('monthly.*')
      .optional()
      .isInt({ min: 1, max: 31 })
      .withMessage('Select proper day of the month'),
  ]
}

const createTask = async (req, res) => {
  try {
    const admin = req.admin.id
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
      start,
      bonus_points,
      token,
      url,
      hours,
      interaction,
      google_search,
      journey,
      website_click,
      period_start,
      period_end,
      weekly,
      monthly,
      recurring,
    } = req.body

    ;(task_type = task_type.toLowerCase()), (total_task = await Task.count())
    const code =
      (Math.random() + 1).toString(36).substring(6) +
      total_task.toString().padStart(4, '0') +
      (Math.random() + 1).toString(36).substring(10)

    let isToday = start ? moment().isSame(start, 'day') : false
    let task = {
      adminId: admin,
      task_code: code.toUpperCase(),
      points: points,
      bonus_points: bonus_points,
      start_at: start && !isToday ? start : new Date().toISOString(),

      task_type: task_type,
      tokenId: token ? token : 1,
      interactionId: interaction ? interaction : null,
      period_start_at: period_start ? period_start : '00:00:00',
      period_end_at: period_end ? period_end : '23:59:59',
      recurring: recurring ? recurring : false,
      weekly: weekly ? weekly : [],
      monthly: monthly ? monthly : [],
    }

    if (task_type == 'website_click') {
      task.website_click = website_click
    }

    if (task_type == 'website_click' || task_type == 'google_search') {
      task.url = url
    }
    if (task_type == 'google_search' || task_type == 'search_journey') {
      task.google_search = JSON.stringify(google_search)
      task.published = false
    }
    if (task_type == 'journey' || task_type == 'search_journey') {
      task.journey = journey
      task.published = false
    }

    const type_errors = validationResult(req)

    if (!type_errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: type_errors.array(),
      })
    }

    task.end_at = moment(task.start_at).add(hours, 'hours')

    const newTask = await Task.create(task)

    return res.status(200).send({
      status: true,
      data: { task: newTask },
      message: 'Task created succesfully',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const taskList = async (req, res) => {
  try {
    var id = req.admin.id,
      nonrecuring_condition = {},
      condition = {}

    const { date, search, company, size, page } = req.query
    var period = date ? moment(date) : moment()
    const pagination = helper.pagination(page)
    const { limit, offset } = helper.getPagination(page, size)

    var today = period.format('YYYY-MM-DD'),
      time = period.format('HH:mm:ss'),
      dayOfTheMonth = period.date(),
      dayofTheWeek = period.day()

    const START_DATE = moment(period).format('YYYY-MM-DD 00:00:00+00'),
      END_DATE = moment(period).format('YYYY-MM-DD 23:59:59+00')

    // console.log('Admin',today, START_DATE, END_DATE);

    if (search) {
      condition = {
        [Op.or]: [
          { task_code: { [Op.like]: '%' + search + '%' } },
          { task_type: { [Op.like]: '%' + search + '%' } },
        ],
      }
    }

    if (company) {
      condition['tokenId'] = company
    }

    nonrecuring_condition['start_at'] = {
      [Op.gte]: START_DATE,
      [Op.lte]: END_DATE,
    }

    if (date) {
      // condition["start_at"] = { [Op.lte]: START_DATE };
      // condition["end_at"] = { [Op.gte]: END_DATE };
    }

    condition['archive'] = false

    const tasks = await Task.findAndCountAll({
      where: {
        ...condition,
        ...nonrecuring_condition,
        weekly: { [Op.eq]: [] },
        monthly: { [Op.eq]: [] },
      },
      include: [
        { model: Token, as: 'token' },
        { model: Interaction, as: 'interaction' },
        { model: Admin, as: 'admin' },
      ],

      limit,
      offset,
      order: pagination.order,
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
        { model: Admin, as: 'admin' },
      ],

      limit,
      offset,
      order: pagination.order,
    })

    // console.log('TAsk Count ', tasks.count,recurring.count );
    tasks.count += recurring.count
    tasks.rows = tasks.rows.concat(recurring.rows)
    tasks.rows = _.sortBy(tasks.rows, function (task) {
      return -task.id
    })
    const paginatedResult = helper.getPagingData(tasks, page, limit, 'tasks')

    return res.status(200).send({
      status: true,
      data: paginatedResult,
      message: 'Tasks List',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const updateClishaTask = async (req, res) => {
  const admin = req.admin.id,
    id = req.params.id,
    today = new Date().toISOString(),
    { status, published } = req.body

  try {
    const update_payload = {
      ...req.body,
    }

    const tokenUpdate = await Task.update(update_payload, {
      where: {
        id: id,
        // end_at: { [Op.gte]: today },
      },
    })
    return res.status(200).send({
      status: true,
      data: { tokenUpdate },
      message: 'Task successfully updated',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
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
  try {
    const taskId = req.params.taskId
    // Check if task has been completed
    const isCompleted = await CompletedTask.findOne({ where: { taskId } })

    // If completed, archive the task
    if (isCompleted && isCompleted.dataValues) {
      await Task.update({ archive: true, status: 0 }, { where: { id: taskId } })
      return res.send({
        status: true,
        data: null,
        message: 'Task deleted succesfully',
      })
    }

    // If not completed, delete task completely
    await Task.destroy({ where: { id: taskId } })
    return res.send({
      status: true,
      data: null,
      message: 'Task deleted succesfully',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
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

const getTasksMonthlyCountOLd = async (req, res) => {
  try {
    const { id } = req.user
    const { start_date, end_date } = req.query
    const START_DATE = moment(start_date).format('YYYY-MM-DD 00:00:00')
    const END_DATE = moment(end_date).format('YYYY-MM-DD 23:59:59')

    const dateSeries = await db.sequelize.query(
      `select (generate_series('${START_DATE}', '${END_DATE}', '1 day'::interval))::date`
    )
    const dates = dateSeries[0].map((item) => {
      return {
        date: `${item.generate_series} 00:00:00+00`,
      }
    })

    const tasksCount = await Task.findAll({
      where: {
        start_at: {
          [Op.and]: {
            [Op.gte]: START_DATE,
            [Op.lte]: END_DATE,
          },
        },
      },
      attributes: [
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'createdTasks'],
        [
          db.Sequelize.fn('DATE_TRUNC', 'day', db.Sequelize.col('start_at')),
          'startTime',
        ],
      ],
      group: [
        db.Sequelize.fn('DATE_TRUNC', 'day', db.Sequelize.col('start_at')),
      ],
      order: [
        [
          db.Sequelize.fn('DATE_TRUNC', 'day', db.Sequelize.col('start_at')),
          'ASC',
        ],
      ],
    })

    const completedTasksCount = await CompletedTask.findAll({
      where: {
        userId: id,
        task_start_at: {
          [Op.and]: {
            [Op.gte]: START_DATE,
            [Op.lte]: END_DATE,
          },
        },
      },
      attributes: [
        [
          db.Sequelize.fn('COUNT', db.Sequelize.col('userId')),
          'completedTasks',
        ],
        [
          db.Sequelize.fn(
            'DATE_TRUNC',
            'day',
            db.Sequelize.col('task_start_at')
          ),
          'taskStartTime',
        ],
      ],
      group: [
        db.Sequelize.fn('DATE_TRUNC', 'day', db.Sequelize.col('task_start_at')),
      ],
    })

    if (tasksCount.length === 0) {
      return res.status(404).send({
        status: true,
        data: null,
        message: 'No tasks were scheduled for this day',
      })
    }

    let data = await mergeArrayObjects(tasksCount, completedTasksCount)

    let bonusEligibility = false
    const TASKS_THRESHOLD = 10

    if (tasksCount && completedTasksCount) {
      data = data.map((item, i) => {
        if (
          Number(item.createdTasks) >= TASKS_THRESHOLD &&
          Number(item.completedTasks) >= Number(item.createdTasks)
        ) {
          bonusEligibility = true
        }
        if (
          Number(item.createdTasks) < TASKS_THRESHOLD &&
          Number(item.completedTasks) === Number(item.createdTasks)
        ) {
          bonusEligibility = true
        }

        if (Number(item.createdTasks) > Number(item.completedTasks)) {
          bonusEligibility = false
        }

        return {
          // userId: item.userId,
          date: item.taskStartTime, // TODO
          createdTasks: Number(item.createdTasks),
          completedTasks: Number(item.completedTasks),
          bonusEligibility,
          //   completedTime: item.completedTime,
        }
      })
    }

    const mergedMonthly = _.merge(_.keyBy(dates, 'date'), _.keyBy(data, 'date'))
    const values = _.values(mergedMonthly)

    const isEligible = () => {
      const eligibilityCount = data.filter(
        (item) => item.bonusEligibility === true
      ).length

      if (eligibilityCount >= 28) return true
      return false
    }

    let temp = []
    tasksCount.forEach((tc) => {
      const TC = tc.dataValues
      return values.forEach((v) => {
        if (
          moment(new Date(TC.startTime), 'MM-DD-YYYY').date() ===
          moment(new Date(v.date), 'MM-DD-YYYY').date()
        ) {
          const output = Object.assign({}, TC, v)
          temp.push(output)
          return temp
        }
      })
    })

    const this_ = _.merge(_.keyBy(dates, 'date'), _.keyBy(temp, 'date'))
    const values_ = _.values(this_).map((v) => {
      return {
        ...v,
        createdTasks: v.createdTasks ? Number(v.createdTasks) : 0,
      }
    })

    return res.status(200).send({
      status: true,
      data: {
        bonusEligibility: isEligible(),
        monthlyData: values,
        // monthlyData: values_,
        // tasksCount: tasksCount,
        // completedTasksCount: completedTasksCount,
      },
      message: 'Bonus eligibility fetched succesfully',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

const mergeArrayObjects = async (arr1, arr2) => {
  const first = arr1.map((item) => {
    return item.dataValues
  })
  const second = arr2.map((item) => {
    return item.dataValues
  })
  return mergeArrays(first, second)
}

const mergeArrays = (arr1, arr2) => {
  let temp = []
  for (let i = 0; i < arr1.length; i++) {
    for (let j = 0; j < arr2.length; j++) {
      if (
        moment(new Date(arr1[i].startTime), 'MM-DD-YYYY').date() ===
        moment(
          new Date(arr2[j].taskStartTime || arr2[j].date),
          'MM-DD-YYYY'
        ).date()
      ) {
        const output = Object.assign({}, arr1[i], arr2[j])
        temp.push(output)
      }
    }
  }
  return temp
}

module.exports = {
  createTask,
  createTaskValidator,
  taskList,
  getTasksMonthlyCount,
  updateCompletedTasks,
  updateClishaTask,
  deleteTask,
}

// [
//   db.Sequelize.fn(
//     "DATE_FORMAT",
//     db.Sequelize.col("task_start_at"),
//     "%Y-%m-%d"
//   ),
//   "taskStartTime",
// ],
