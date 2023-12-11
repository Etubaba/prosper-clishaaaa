const db = require('../models')
const { check, body, validationResult } = require('express-validator')
const helper = require('../middleware/helper')
const { Op } = require('sequelize')

// Models
const Interaction = db.models.Interaction
const Token = db.models.Token
const Admin = db.models.Admin

const createInteractionValidator = () => {
  return [
    check('type')
      .notEmpty()
      .withMessage('Interaction type is required')
      .isIn(['multichoice', 'timer']),

    check('name')
      .notEmpty()
      .withMessage('Interaction Name is required')
      .isString({ min: 5, max: 30 }),

    check('token').notEmpty().withMessage('Company Token is required').isInt(),

    check('duration')
      .if(check('type').equals('timer'))
      .notEmpty()
      .withMessage('Duration is required')
      .isInt({ min: 30, max: 1800 })
      .withMessage(
        'Enter a valid duration in seconds. Duration must be between 30 seconds to 30 minutes'
      ),

    check('question')
      .if(check('type').equals('multichoice'))
      .notEmpty()
      .withMessage('Question is required')
      .isString({ min: 3, max: 128 }),

    check('option1')
      .if(check('type').equals('multichoice'))
      .notEmpty()
      .withMessage('Option 1 is required')
      .isString({ min: 2, max: 20 }),

    check('option2')
      .if(check('type').equals('multichoice'))
      .notEmpty()
      .withMessage('Option 2 is required')
      .isString({ min: 2, max: 20 }),

    check('answer')
      .if(check('type').equals('multichoice'))
      .notEmpty()
      .withMessage('Answer is required')
      .isIn(['option1', 'option2', 'option3', 'opttion4', 'option5'])
      .withMessage('Answer must be between Option 1 to Option 5'),
  ]
}

const createInteraction = async (req, res) => {
  try {
    const admin = req.admin.id
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: errors.array(),
      })
    }

    const interaction_type = req.body.type.toLowerCase()
    let isNamed = await Interaction.findOne({ where: { name: req.body.name } })

    if (isNamed) {
      let error = {},
        errors = []
      if (isNamed)
        error = {
          msg: 'Interaction Name is already in use!',
          param: 'name',
          location: 'body',
        }
      errors.push(error)

      return res.status(400).send({
        status: false,
        errors: errors,
      })
    }

    let interaction = {
      adminId: admin,
      tokenId: req.body.token,
      name: req.body.name,
      description: req.body.description,
      interaction_type: interaction_type,
    }

    if (interaction_type == 'timer') {
      interaction.duration = req.body.duration
    } else if (interaction_type == 'multichoice') {
      interaction.question = req.body.question
      interaction.option1 = req.body.option1
      interaction.option2 = req.body.option2
      interaction.option3 = req.body.option3
      interaction.option4 = req.body.option4
      interaction.option5 = req.body.option5
      interaction.answer = req.body.answer
    }

    const newInteraction = await Interaction.create(interaction)

    return res.status(200).send({
      status: true,
      data: { interaction: newInteraction },
      message: 'Interaction created succesfully',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const updateInteraction = async (req, res) => {
  const admin = req.admin.id,
    id = req.params.id
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  try {
    const interaction_type = req.body.type.toLowerCase()
    let isNamed = await Interaction.findOne({
      where: { name: req.body.name, id: { [Op.not]: id } },
    })

    if (isNamed) {
      let error = {},
        errors = []
      if (isNamed)
        error = {
          msg: 'Interaction Name is already in use!',
          param: 'name',
          location: 'body',
        }
      errors.push(error)

      return res.status(400).send({
        status: false,
        errors: errors,
      })
    }

    const interaction = {
      adminId: admin,
      name: req.body.name,
      description: req.body.description,
      tokenId: req.body.token,
      interaction_type: interaction_type,
    }

    if (interaction_type == 'timer') {
      interaction.duration = req.body.duration
    } else if (interaction_type == 'multichoice') {
      interaction.question = req.body.question
      interaction.option1 = req.body.option1
      interaction.option2 = req.body.option2
      interaction.option3 = req.body.option3
      interaction.option4 = req.body.option4
      interaction.option5 = req.body.option5
      interaction.answer = req.body.answer
    }

    const newInteraction = await Interaction.update(interaction, {
      where: { id: id },
    })

    return res.status(200).send({
      status: true,
      message: 'Interaction updated succesfully',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const interactionList = async (req, res) => {
  var id = req.admin.id,
    size = req.query.size,
    company = req.query.company,
    token = req.query.token,
    search = req.query.search,
    page = req.query.page || 1,
    filters = {}

  const pagination = helper.pagination(page)
  const { limit, offset } = helper.getPagination(page, size)
  try {
    if (search) {
      filters = {
        [Op.or]: [
          // { name: { [Op.like]: '%' + search + '%' } },
          // { description: { [Op.like]: '%' + search + '%' } },
          {
            name: Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('name')),
              'LIKE',
              '%' + search + '%'
            ),
          },
          {
            description: Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('description')),
              'LIKE',
              '%' + search + '%'
            ),
          },
        ],
      }
    }

    if (company) {
      filters['tokenId'] = company
    }

    let interactions = await Interaction.findAndCountAll({
      // where: { tokenId: (token) ? token : 1 },
      where: filters,
      include: [
        { model: Token, as: 'token' },
        { model: Admin, as: 'admin' },
      ],

      limit,
      offset,
      order: pagination.order,
    })

    const paginatedResult = helper.getPagingData(
      interactions,
      page,
      limit,
      'interactions'
    )

    return res.status(200).send({
      status: true,
      data: paginatedResult,
      message: 'Interaction List',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

module.exports = {
  createInteraction,
  createInteractionValidator,
  interactionList,
  updateInteraction,
}
