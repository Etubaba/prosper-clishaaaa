const db = require('../models')
const moment = require('moment')
const { Op, Sequelize } = require('sequelize')
const Helper = require('../middleware/helper')
const {
  getCache,
  setCacheEx,
  setCache,
  deleteKey,
} = require('../services/redis')

// Models
const User = db.models.User
const CompletedTask = db.models.CompletedTask
const Wallet = db.models.Wallet

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
    })
    const data = helper.getPagingData(ranking, page, limit, 'ranking')
    // data.myrank = myrank;

    return res.status(200).send({
      status: true,
      data: data,
      message: 'Clisha Ranking',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const clishaReportOverview = async (req, res) => {
  const is = req.admin.id

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

  // Users
  const totalNewMembers = await User.count({
    where: {
      createdAt: {
        [Op.between]: [startCurrentMonth, endCurrentMonth],
      },
    },
  })

  const totalPreviousMembers = await User.count({
    where: {
      createdAt: {
        [Op.between]: [startPreviousMonth, endPreviousMonth],
      },
    },
  })

  const memberGrowthPercentage =
    totalNewMembers && totalPreviousMembers
      ? Helper.percentageDifference(totalPreviousMembers, totalNewMembers)
      : 0
  const memberReport = {
    totalNewMembers,
    totalPreviousMembers,
    memberGrowthPercentage,
  }

  // Active Users
  const totalNewActive = await User.count({
    where: {
      email_verified_at: {
        [Op.between]: [startCurrentMonth, endCurrentMonth],
      },
    },
  })

  const totalPreviousActive = await User.count({
    where: {
      email_verified_at: {
        [Op.between]: [startPreviousMonth, endPreviousMonth],
      },
    },
  })
  const activeGrowthPercentage =
    totalNewActive && totalPreviousActive
      ? Helper.percentageDifference(totalPreviousActive, totalNewActive)
      : 0
  const activeMemberReport = {
    totalNewActive,
    totalPreviousActive,
    activeGrowthPercentage,
  }

  // Engagement
  const totalCurrentEngagement = await CompletedTask.count({
    where: {
      createdAt: { [Op.between]: [startCurrentMonth, endCurrentMonth] },
    },
  })

  const totalPreviousEngagement = await CompletedTask.count({
    where: {
      createdAt: { [Op.between]: [startPreviousMonth, endPreviousMonth] },
    },
  })

  const engagementGrowthPercentage =
    totalCurrentEngagement && totalPreviousEngagement
      ? Helper.percentageDifference(
          totalPreviousEngagement,
          totalCurrentEngagement
        )
      : 0
  const engagementMemberReport = {
    totalCurrentEngagement,
    totalPreviousEngagement,
    engagementGrowthPercentage,
  }

  const reports = {
    memberReport,
    activeMemberReport,
    engagementMemberReport,
  }
  // Cche Data
  const key = `admin_report_overview`
  const expiry = 3600 * 10
  setCacheEx(key, JSON.stringify(reports), expiry)

  return res.status(200).send({
    status: true,
    data: reports,
    message: 'Clisha Overview report',
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

const cacheDailyReport = async (req, res, next) => {
  try {
    const key = `admin_daily_report`
    const data = await getCache(key)
    // const newTaskKey = `new_task`;
    // const newTask = await getCache(newTaskKey);

    console.log('Cache Query', req.query)

    if (!data) {
      console.log('nothing to read yet...')
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

const cacheReportOverview = async (req, res, next) => {
  try {
    const key = `admin_report_overview`
    const data = await getCache(key)

    if (!data) {
      console.log('nothing to read yet...')
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

module.exports = {
  ranking,
  clishaReportOverview,
  clishaDailyReport,

  // Cache
  cacheReportOverview,
  cacheDailyReport,
}
