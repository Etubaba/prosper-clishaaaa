const _ = require('lodash')
const db = require('../models')

// Models
const CompletedTask = db.models.CompletedTask
const ExperiencePoint = db.models.ExperiencePoint
const Task = db.models.Task

const getUserExperiencePoints = async (req, res) => {
  try {
    const { id } = req.user

    const completedTasks = await CompletedTask.findAll({
      where: { userId: id, status: 1 },
      attributes: ['userId'],
      include: {
        model: Task,
        attributes: ['points'],
        as: 'task',
      },
      group: ['CompletedTask.id', 'task.id'],
    })

    const mappedTasks = completedTasks.map((cs) => {
      return {
        ...cs.task.dataValues,
      }
    })

    const expPoints = mappedTasks.reduce(function (acc, val) {
      return (acc += Number(val.points))
    }, 0)

    const result = expPoints

    const experienceTargets = [
      { start: 0, target: 3000, rank: 'Adstar Bronze' },
      { start: 3001, target: 6000, rank: 'Adstar Silver' },
      { start: 6001, target: 9000, rank: 'Adstar Gold' },
      { start: 10001, target: 12000, rank: 'Adstar Platinum' },
      { start: 12001, target: 15000, rank: 'Adstar Diamond' },
      { start: 15001, target: 18000, rank: 'Adstar Master' },
      { start: 18001, target: 24000, rank: 'Adstar Grandmaster' },
    ]

    // 600 >= 0 AND 600 <= 3000 --> Bronze
    const rankTarget = experienceTargets.map((eT) => {
      if (expPoints >= eT.start && expPoints <= eT.target) {
        return eT
      }
    })

    return res.status(200).send({
      status: true,
      data: { experience: result, rank: rankTarget },
      message: 'Experience points retrieved',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const getExperiencePoints = async (req, res) => {
  try {
    const { id } = req.user

    const all_experience_points = await ExperiencePoint.findAll({
      where: { userId: id },
      attributes: ['points'],
    })

    const expPoints = all_experience_points.reduce((acc, val) => {
      return (acc += val.dataValues.points)
    }, 0)

    const experienceTargets = [
      { start: 0, target: 3000, rank: 'Adstar Bronze' },
      { start: 3001, target: 6000, rank: 'Adstar Silver' },
      { start: 6001, target: 9000, rank: 'Adstar Gold' },
      { start: 10001, target: 12000, rank: 'Adstar Platinum' },
      { start: 12001, target: 15000, rank: 'Adstar Diamond' },
      { start: 15001, target: 18000, rank: 'Adstar Master' },
      { start: 18001, target: 24000, rank: 'Adstar Grandmaster' },
    ]

    // 600 >= 0 AND 600 <= 3000 --> Bronze
    const rankTarget = experienceTargets.map((eT) => {
      if (expPoints >= eT.start && expPoints <= eT.target) {
        return { ...eT, current: expPoints }
      }
      return
    })

    const currentRank = rankTarget.filter((rT) => rT !== undefined)[0]

    return res.status(200).send({
      status: true,
      data: { experience: expPoints, rank: currentRank },
      message: 'Experience points retrieved',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const addExperiencePoints = async (req, res) => {
  try {
    const { id } = req.user
    const { point_type, points } = req.body

    if (!point_type || !points) {
      return res.status(400).send({
        status: false,
        data: null,
        message: 'Point type and points are required',
      })
    }

    const payload = {
      userId: id,
      point_type,
      points,
    }

    const experience = await ExperiencePoint.create(payload)

    return res.status(200).send({
      status: true,
      data: { experience },
      message: 'Experience points added',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const updateBatchUsersExperiencePoints = async (req, res) => {
  try {
    const completedTasks = await CompletedTask.findAll({
      where: { status: 1 },
      attributes: ['userId'],
      include: {
        model: Task,
        attributes: ['points'],
        as: 'task',
      },
      group: ['CompletedTask.id', 'task.id'],
    })

    const mappedTasks = completedTasks.map((cs) => {
      return {
        userId: cs.userId,
        points: cs.task.dataValues.points,
      }
    })

    let waiting = {}
    let arr = []

    mappedTasks.forEach((d) => {
      if (waiting.hasOwnProperty(d.userId)) {
        waiting[d.userId] = waiting[d.userId] + d.points
      } else {
        waiting[d.userId] = d.points
      }
    })

    for (let prop in waiting) {
      arr.push({ userId: Number(prop), points: waiting[prop] })
    }

    arr.map(async (exp) => {
      await ExperiencePoint.create({ ...exp, point_type: 'task' })
    })

    return res.send({
      status: true,
      data: null,
      message: 'Users task exp points entry created',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

const updateExperiencePoints = async (req, res) => {
  try {
    const { id } = req.user
    const { point_type, points } = req.body

    if (!point_type || !points) {
      return res.status(400).send({
        status: false,
        data: null,
        message: 'Point type and points are required',
      })
    }

    const existing = await ExperiencePoint.findOne({
      where: { userId: id, point_type },
    })

    if (!existing) {
      let new_payload = {
        points,
        point_type,
        userId: id,
      }
      const new_exp_points = await ExperiencePoint.create(new_payload)
      return res.status(200).send({
        status: true,
        data: new_exp_points,
        message: 'Experience points added',
      })
    }

    const existing_points = await existing?.points
    let new_points = Number(existing_points) + Number(points)

    await ExperiencePoint.update(
      { points: new_points },
      { where: { userId: id, point_type } }
    )

    return res.status(200).send({
      status: true,
      message: 'Experience points updated',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

module.exports = {
  getUserExperiencePoints,
  getExperiencePoints,
  addExperiencePoints,
  updateBatchUsersExperiencePoints,
  updateExperiencePoints,
}
