const db = require('../../models')
const { check, body, validationResult } = require('express-validator')
const helper = require('../../middleware/helper')
const multer = require('multer')
const path = require('path')
const fs = require('fs-extra')
const { Op } = require('sequelize')

const config = require('../../config/mail')
// Models
const Token = db.models.Token
const CompletedTask = db.models.CompletedTask
const Admin = db.models.Admin

const createTokenValidator = () => {
  return [
    check('name')
      .notEmpty()
      .withMessage('Company Name is required')
      .isString({ min: 3, max: 20 }),

    check('eligibility').isBoolean(),

    check('description')
      .notEmpty()
      .withMessage('Company Description is required')
      .isString({ min: 10, max: 128 }),
  ]
}

const tokenList = async (req, res) => {
  var id = req.admin.id,
    size = req.query.size,
    search = req.query.search,
    page = req.query.page || 1,
    filters = {}

  const pagination = helper.pagination(page)
  const { limit, offset } = helper.getPagination(page, size)

  if (search) {
    filters = {
      [Op.or]: [
        { name: { [Op.like]: '%' + search + '%' } },
        { description: { [Op.like]: '%' + search + '%' } },
      ],
    }
  }

  let tokens = await Token.findAndCountAll({
    where: filters,
    include: [{ model: Admin, as: 'admin' }],

    limit,
    offset,
    order: pagination.order,
  })

  tokens.rows.map((token) => {
    // let photo_url = token.photo
    //   ? `${config.api}/assets/company/${token.photo}`
    //   : "";
    // token.setDataValue("photo_url", photo_url);
    // let icon_url = token.icon
    //   ? `${config.api}/assets/company/${token.icon}`
    //   : "";
    // token.setDataValue("icon_url", icon_url);
  })
  const paginatedResult = helper.getPagingData(tokens, page, limit, 'tokens')

  return res.status(200).send({
    status: true,
    data: paginatedResult,
    message: 'Token List',
  })
}

const createToken = async (req, res) => {
  let bonus
  const admin = req.admin.id
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).send({
      status: false,
      errors: errors.array(),
    })
  }

  const isEligible = req.body.eligibility

  if (isEligible) {
    bonus = parseInt(process.env.VQ_BONUS)
  } else {
    bonus = 0
  }

  try {
    const isNamed = await Token.findOne({ where: { name: req.body.name } })
    if (isNamed) {
      let error = {},
        errors = []
      error = {
        msg: 'Token Name is already in use!',
        param: 'name',
        location: 'body',
      }
      errors.push(error)

      return res.status(400).send({
        status: false,
        errors: errors,
      })
    }

    const token = {
      adminId: admin,
      name: req.body.name,
      description: req.body.description,
      // bonus,
      value: req.body.value,
      background: req.body.background,
      foreground: req.body.foreground ? req.body.foreground : '#000000',
      eligibility: isEligible ? 1 : 0,
    }

    const newToken = await Token.create(token)

    return res.status(200).send({
      status: true,
      data: { token: newToken },
      message: 'Token created succesfully',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const updateToken = async (req, res) => {
  try {
    const admin = req.admin.id,
      id = req.params.id
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
      return res.status(400).send({
        status: false,
        errors: errors.array(),
      })
    }

    const isNamed = await Token.findOne({
      where: { name: req.body.name, id: { [Op.not]: id } },
    })

    if (isNamed) {
      let error = {},
        errors = []
        error = {
          msg: 'Token Name is already in use!',
          param: 'name',
          location: 'body',
        }
      errors.push(error)
      return res.status(400).send({
        status: false,
        errors: errors,
      })
    }

    const isEligible = req.body.eligibility

    if (isEligible) {
      bonus = parseInt(process.env.VQ_BONUS)
    } else {
      bonus = 0
    }

    let updateToken = {
      adminId: admin,
      name: req.body.name,
      description: req.body.description,
      value: req.body.value,
      // bonus,
      background: req.body.background,
      foreground: req.body.foreground,
      eligibility: isEligible ? 1 : 0,
    }

    const token = await Token.update(updateToken, { where: { id: id } })

    return res.status(201).send({
      status: true,
      message: 'Token updated succesfully',
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const updateTokenPhoto = async (req, res) => {
  let maxSize = 1 * 1000 * 1000,
    id = req.params.id
  try {
    var uploadTokenPhoto = multer({
      storage: helper.s3BucketStorage,
      limits: { fileSize: maxSize },
      fileFilter: function (req, file, cb) {
        let filetypes = /jpeg|jpg|png/
        let mimetype = filetypes.test(file.mimetype)

        let extname = filetypes.test(
          path.extname(file.originalname).toLowerCase()
        )

        if (mimetype && extname) {
          return cb(null, true)
        }

        cb(
          'Error: File upload only supports the ' +
            'following filetypes - ' +
            filetypes,
          false
        )
      },
    }).single('photo')

    uploadTokenPhoto(req, res, async (err) => {
      if (err) {
        return res.status(400).send({
          status: false,
          message: err,
        })
      } else {
        const token = await Token.findOne({ where: { id: id } })
        // let path = `./assets/company/${token.photo}`;
        // if (token.photo && fs.existsSync(path)) fs.unlinkSync(path);

        const profile_update = await Token.update(
          { photo: req.file.location },
          { where: { id: id } }
        )
        return res.send({
          status: true,
          message: 'Company Token Updated succesfully',
        })
      }
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

const updateTokenIcon = async (req, res) => {
  let maxSize = 1 * 1000 * 1000,
    id = req.params.id
  try {
    var uploadTokenIcon = multer({
      storage: helper.s3BucketStorage,
      limits: { fileSize: maxSize },
      fileFilter: function (req, file, cb) {
        let filetypes = /jpeg|jpg|png/
        let mimetype = filetypes.test(file.mimetype)

        let extname = filetypes.test(
          path.extname(file.originalname).toLowerCase()
        )

        if (mimetype && extname) {
          return cb(null, true)
        }

        cb(
          'Error: File upload only supports the ' +
            'following filetypes - ' +
            filetypes,
          false
        )
      },
    }).single('icon')

    uploadTokenIcon(req, res, async (err) => {
      if (err) {
        return res.status(400).send({
          status: false,
          message: err,
        })
      } else {
        const token = await Token.findOne({ where: { id: id } })
        // let path = `./assets/company/${token.icon}`;
        // if (token.icon && fs.existsSync(path)) fs.unlinkSync(path);

        await Token.update({ icon: req.file.location }, { where: { id: id } })

        return res.send({
          status: true,
          message: 'Company Token Updated succesfully',
        })
      }
    })
  } catch (err) {
    return res.status(500).send({ status: false, message: err })
  }
}

module.exports = {
  createTokenValidator,
  tokenList,
  createToken,
  updateToken,
  updateTokenPhoto,
  updateTokenIcon,
}
