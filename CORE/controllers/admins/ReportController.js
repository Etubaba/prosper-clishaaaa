const db = require('../../models')
const moment = require('moment')
const { Op } = require('sequelize')
const Helper = require('../../middleware/helper')
// Models
const User = db.models.User
const CompletedTask = db.models.CompletedTask

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

  return res.status(200).send({
    status: true,
    data: {
      memberReport,
      activeMemberReport,
      engagementMemberReport,
    },
    message: 'Clisha Overview report',
  })
}

module.exports = {
  clishaReportOverview,
}
