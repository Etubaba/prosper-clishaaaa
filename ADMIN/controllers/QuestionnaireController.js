const db = require('../models')
const { check, body, validationResult } = require('express-validator')
const helper = require('../middleware/helper')
const { Op } = require('sequelize')

// Models
const Questionnaire = db.models.Questionnaire
const Category = db.models.QuestionnaireCategory

// Questionare Category 
const questionnaireCategoryList = async (req, res) => {
  var id = req.admin.id,
    { size, page} = req.query;

  try {

    let categories = await Category.findAndCountAll({
      // limit,
      // offset,
      // order: pagination.order,
    })


    return res.status(200).send({
      status: true, 
      data: categories,
      message: 'Questionnaire category list',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const  createQuestionnaireCategory = async (req, res) => {
  try {
    const admin = req.admin
    const { name } = req.body

    if (!name) {
      return res.status(400).send({
        status: false,
        data: null,
        message: 'Category name is required',
      })
    }

    const payload = {
      adminId: admin.id,
      name
    }

    const category = await Category.create(payload);

    return res.status(200).send({
      status: true,
      data: category,
      message: 'Questionnaire category created succesfully',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

// Questionnnaire
const questionnaireList = async (req, res) => {
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

    let interactions = await Questionnaire.findAndCountAll({
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

const createQuestionnaireValidator = () => {
  return [
    check('name')
      .notEmpty()
      .withMessage('Interaction Name is required')
      .isString({ min: 5, max: 30 }),

  ]
}

const createQuestionnaire = async (req, res) => {
  // try {
    const admin = req.admin;

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: errors.array(),
      })
    }

    const { category, question, options } = req.body;

    const payload = {
      adminId: admin.id,
      categoryId: category,
      question,
      options
    }

    const questionnaire = await Questionnaire.cretae(payload)

    return res.status(200).send({
      status: true,
      data: questionnaire,
      message: 'Questionnaire created succesfully',
    })
  // } catch (err) {
  //   return res.status(500).send({ status: false, message: err })
  // }
}

const updateQuestionnaire = async (req, res) => {
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
    let isNamed = await Questionnaire.findOne({
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

    const payload = {
      adminId: admin,
      name: req.body.name,
      description: req.body.description,
      tokenId: req.body.token,
      interaction_type: interaction_type,
    }

    const newInteraction = await Questionnaire.update(payload, {
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



module.exports = {
  questionnaireCategoryList,
  createQuestionnaireCategory,


  createQuestionnaire,
  createQuestionnaireValidator,
  questionnaireList,
  updateQuestionnaire,
}
