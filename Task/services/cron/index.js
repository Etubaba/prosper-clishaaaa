const db = require('../../models')
const _ = require('lodash')
const { Op, Sequelize } = require('sequelize')
const moment = require('moment')

// Models
const User = db.models.User
const Task = db.models.Task
const CompletedTask = db.models.CompletedTask
const ClishaRecord = db.models.ClishaRecord

const openingDailyClishaRecord = async () => {
  const today = moment()
  const pastDate = moment().subtract(30, 'days').format('YYYY-MM-DD')

  const START_PERIOD = moment(today)
      .startOf('month')
      .format('YYYY-MM-DD 00:00:00'),
    END_PERIOD = moment(today).endOf('month').format('YYYY-MM-DD 23:59:59+00')

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

  dates.map(async (element) => {
    let date = moment(element)

    let START_DATE = date.format('YYYY-MM-DD 00:00:00')
    let END_DATE = date.format('YYYY-MM-DD 23:59:59')

    let dayOfTheMonth = date.date(),
      dayofTheWeek = date.day()

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

    const total_task = tasks + recurring

    const active_users = await CompletedTask.count({
      where: {
        createdAt: { [Op.between]: [pastDate, today] },
      },
    })

    const [clishaRecord, created] = await ClishaRecord.findOrCreate({
      where: {
        date: date.format('YYYY-MM-DD 00:00:00+00'),
      },
    })

    clishaRecord.created_task = tasks
    clishaRecord.total_recurring = recurring
    clishaRecord.total_task = total_task
    clishaRecord.active_users = active_users
    clishaRecord.save()
    console.log('Clisha Record', created)
  })

  // await ClishaRecord.destroy({ where: {} })

  return true
}

const closingDailyClishaRecord = async () => {
  const today = moment()

  const START_PERIOD = moment(today)
      .startOf('month')
      .format('YYYY-MM-DD 00:00:00'),
    END_PERIOD = moment(today).endOf('month').format('YYYY-MM-DD 23:59:59+00')

  const dateSeries = await db.sequelize.query(
    `select (generate_series('${START_PERIOD}', '${END_PERIOD}', '1 day'::interval))::date`
  )

  const dates = dateSeries[0].map((item) => {
    return `${item.generate_series} 00:00:00+00`
  })

  dates.map(async (element) => {
    let date = moment(element)

    let START_DATE = date.format('YYYY-MM-DD 00:00:00'),
      END_DATE = date.format('YYYY-MM-DD 23:59:59')

    const dailyRecord = await ClishaRecord.findOne({
      where: {
        date: date.format('YYYY-MM-DD 00:00:00+00'),
      },
    })

    if (dailyRecord) {
      const completed_task = await CompletedTask.count({
        where: {
          status: 1,
          createdAt: {
            [Op.and]: {
              [Op.gte]: START_DATE,
              [Op.lte]: END_DATE,
            },
          },
        },
      })

      // Assuming 70% of our current active users are active today
      const active_users = dailyRecord.active_users * 0.7
      const engagement = completed_task
        ? (completed_task / (active_users * dailyRecord.total_task)) * 100
        : 0

      dailyRecord.completed_task = completed_task
      dailyRecord.engagement = engagement
      dailyRecord.save()
      console.log(
        `Clisha Record for the day ${START_DATE} has been completed succesfully`
      )
    }
  })
}

module.exports = {
  openingDailyClishaRecord,
  closingDailyClishaRecord,
}
