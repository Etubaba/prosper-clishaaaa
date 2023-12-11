const db = require('../../models')
const moment = require('moment')
const { Op } = require('sequelize')

const { setCacheEx } = require('../redis')

// Models
const User = db.models.User
const Task = db.models.Task
const CompletedTask = db.models.CompletedTask
const ClishaRecord = db.models.ClishaRecord
const Wallet = db.models.Wallet

exports.getUserCalendar = async (user) => {
  console.log('Refreshing Task in Background')
  const today = moment()
  const START_PERIOD = moment(today)
    .startOf('month')
    .format('YYYY-MM-DD 00:00:00')
  const END_PERIOD = moment(today).endOf('month').format('YYYY-MM-DD 23:59:59')

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

    //   const clishaRecord = await ClishaRecord.findOne({
    //     where: {  date: START_DATE  }
    //   });

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

    if (eligibilityCount >= 25) return true
    return false
  }

  let wallet = await Wallet.findOne({ where: { UserId: user.id } })
  wallet.bonus_eligibility = isEligible()
  await wallet.save()

  // Cache User Calendar
  const key = `${user.id}_calendar_task`
  // Data expiry at the end of the day with moment
  const expiry = 3600 * 10
  const data = {
    bonusEligibility: isEligible(),
    monthlyData: monthlyData,
  }
  setCacheEx(key, JSON.stringify(data), expiry)
  return true
}
