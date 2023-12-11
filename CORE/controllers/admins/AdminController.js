const db = require('../../models')
var jwt = require('jsonwebtoken')
const { Op, Sequelize } = require('sequelize')
const config = require('../../config/auth')
var bcrypt = require('bcryptjs')
const helper = require('../../middleware/helper')
// Models
const Admin = db.models.Admin
const User = db.models.User
const UserHobby = db.models.UserHobby
const Wallet = db.models.Wallet
const Task = db.models.Task
const CompletedTask = db.models.CompletedTask

const createBaseAdmin = async (req, res) => {
  const admin = {
    name: 'Daniel - Clisha',
    email: 'admin@expectoo.dev',
    role: 'superadmin',
    password: bcrypt.hashSync('Clisha_@dm!N'),
  }

  const clisha = {
    name: 'Martins - Clisha',
    email: 'clisha@expectoo.dev',
    role: 'superadmin',
    password: bcrypt.hashSync('M@rt!el_Clisha'),
  }

  const newAdmin = await Admin.create(clisha)

  return res.send({
    status: true,
    data: newAdmin,
    message: 'Admins Created',
  })
}

const authenticate = async (req, res) => {
  try {
    let email = req.body.email,
      password = req.body.password

    let admin = await Admin.findOne({ where: { email: email } })

    if (!admin) {
      return res
        .status(404)
        .send({ status: false, message: 'Admin Not found.' })
    }

    var validPassword = bcrypt.compareSync(password, admin.password)

    if (!validPassword) {
      return res.status(401).send({
        status: false,
        accessToken: null,
        message: 'Invalid Password!',
      })
    }

    var token = jwt.sign({ id: admin.id }, config.admin_secret, {
      expiresIn: 86400 * 60, // 60 Days
    })

    return res.status(200).send({
      status: true,
      data: { admin, accessToken: token },
      message: 'Admin Login Succesfully',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

const admins_list = (req, res) => {
  const admin = req.admin.id

  return res.send({
    status: true,
    admin,
    message: 'Admins Information',
  })
}

const create_admin = (req, res) => {
  console.log('Creating  User Details')

  return res.send({
    status: true,
  })
}

const clishaUsersList = async (req, res) => {
  console.log('Users List ')
  var id = req.admin.id,
    condition = {}

  let { search, status, size, page, referer, active } = req.query

  const pagination = helper.pagination(page, 'updatedAt')
  const { limit, offset } = helper.getPagination(page, size)

  if (search) {
    search = search.toLowerCase()
    condition = {
      // [Op.or]: [
      //    { firstname: { [Op.like]: '%' + search + '%' } },
      //    { lastname: { [Op.like]: '%' + search + '%' } },
      //    { username: { [Op.like]: '%' + search + '%' } },
      //    { email: { [Op.like]: '%' + search + '%' } }
      // ]
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
  //Fiter by user status
  if (status) {
    if (status == 'active') {
      condition['email_verified_at'] = {
        [Op.ne]: null,
      }
    }
    if (status == 'inactive') {
      condition['email_verified_at'] = {
        [Op.eq]: null,
      }
    }
  }

  // Filter by refererals
  if (referer) {
    if (referer == 'refered') {
      condition['referralId'] = {
        [Op.ne]: null,
      }
    }
    if (referer == 'no_referer') {
      condition['referralId'] = {
        [Op.eq]: null,
      }
    }
  }

  // User status
  if (active == 0) {
    condition['status'] = 0
  } else {
    condition['status'] = 1
  }

  // console.log(status, condition);

  let users = await User.findAndCountAll({
    where: condition,

    attributes: {
      exclude: ['password'],
    },

    limit,
    offset,
    // raw: true,
    order: pagination.order,
  })

  const response = users.rows.map(async (user) => {
    const referedBy = await User.findOne({
      where: { id: user.referralId },
      attributes: [
        'id',
        'username',
        'photo',
        'firstname',
        'lastname',
        'email',
        'referralId',
        'status',
        'clishaId',
        'createdAt',
      ],
    })
    const totalTeam = await User.count({ where: { referralId: user.id } })
    user.setDataValue('referedBy', referedBy)
    user.setDataValue('totalTeam', totalTeam)
  })

  await Promise.all(response)

  const paginatedResult = helper.getPagingData(users, page, limit, 'users')

  return res.send({
    status: true,
    data: paginatedResult,
    message: 'Clisha Users',
  })
}

const clishaUsersTeam = async (req, res) => {
  console.log('Users Team List ')
  var id = req.admin.id,
    condition = {}

  let { search, status, size, page } = req.query

  const pagination = helper.pagination(page, 'updatedAt')
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

  if (status) {
    if (status == 'refered') {
      condition['referralId'] = {
        [Op.ne]: null,
      }
    }
    if (status == 'no_refer') {
      condition['referralId'] = {
        [Op.eq]: null,
      }
    }
  }
  // console.log(status, condition);

  const users = await User.findAndCountAll({
    where: condition,

    attributes: {
      exclude: ['password'],
    },

    limit,
    offset,
    // raw: true,
    order: pagination.order,
  })

  const rankings = await Wallet.findAll({
    attributes: {
      exclude: ['createdAt', 'updatedAt'],
      include: [
        [
          Sequelize.literal('(RANK() OVER (ORDER BY total_points DESC))'),
          'position',
        ],
      ],
    },
    order: [['total_points', 'DESC']],
  })

  const teams = users.rows.map(async (user) => {
    const referrals = await User.findAndCountAll({
      where: { referralId: user.id },
      attributes: [
        'id',
        'username',
        'photo',
        'firstname',
        'lastname',
        'email',
        'referralId',
        'clishaId',
        'createdAt',
      ],
    })

    referrals.rows.map((ref) => {
      const rank = rankings.find((wallet) => wallet.UserId == user.id)
      ref.setDataValue('rank', rank)
    })

    user.setDataValue('team', referrals)
  })

  await Promise.all(teams)

  const paginatedResult = helper.getPagingData(users, page, limit, 'users')

  return res.send({
    status: true,
    data: paginatedResult,
    message: 'Clisha Users',
  })
}

const clishaUserInfo = async (req, res) => {
  const admin = req.admin.id,
    id = req.params.id,
    pagination = helper.pagination(1)

  try {
    const user = await User.findOne({
      where: { id: id },
      attributes: {
        exclude: ['password', 'createdAt', 'updatedAt'],
      },
      include: [UserHobby],
    })

    if (!user) {
      return res.status(404).send({
        status: false,
        message: 'User not found',
      })
    }

    let rank = await Wallet.findAll({
      // where:  { UserId: id },
      attributes: {
        exclude: ['createdAt', 'updatedAt'],
        include: [
          [
            Sequelize.literal('(RANK() OVER (ORDER BY total_points DESC))'),
            'position',
          ],
        ],
      },
      order: [['total_points', 'DESC']],
    })

    let myrank = rank.find((wallet) => wallet.UserId == id)

    const referedBy = await User.findOne({
      where: { id: user.referralId },
      attributes: [
        'id',
        'username',
        'photo',
        'firstname',
        'lastname',
        'email',
        'referralId',
        'clishaId',
        'createdAt',
      ],
    })

    const team = await User.findAndCountAll({
      where: { referralId: user.id },
      attributes: [
        'id',
        'username',
        'photo',
        'firstname',
        'lastname',
        'email',
        'referralId',
        'clishaId',
        'createdAt',
      ],
    })

    team.rows.map((ref) => {
      const points = rank.find((wallet) => wallet.UserId == user.id)
      ref.setDataValue('rank', points)
    })

    const completed_tasks = await CompletedTask.findAll({
      where: { userId: parseInt(id) },
      attributes: {
        exclude: ['task_recurring', 'updatedAt'],
      },
      include: [
        {
          model: Task,
          as: 'task',
          attributes: ['task_code', 'task_type', 'points', 'bonus_points'],
        },
      ],
      order: pagination.order,
    })

    return res.status(200).send({
      status: true,
      data: { user, referedBy, rank: myrank, team, completed_tasks },
      message: 'User Information',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

const clishaUpdateUser = async (req, res) => {
  try {
    const admin = req.admin.id,
      id = req.params.id
    let {
      email,
      password,
      language,
      developer,
      country,
      region,
      username,
      status,
      vendo_connection,
    } = req.body

    const payload = {
      email,
      username,
      password: password ? bcrypt.hashSync(password) : password,
      developer,
      country,
      region,
      language,
      status,
      vendoConnectStatus: vendo_connection,
    }

    const userUpdate = await User.update(payload, { where: { id: id } })

    return res.status(200).send({
      status: true,
      data: { userUpdate },
      message: 'User successfully updated',
    })
  } catch (error) {
    return res.status(500).send({ status: false, message: error })
  }
}

module.exports = {
  authenticate,
  admins_list,
  create_admin,
  clishaUsersList,
  createBaseAdmin,
  clishaUpdateUser,
  clishaUserInfo,
  clishaUsersTeam,
}
