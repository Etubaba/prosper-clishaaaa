const config = require('../config/db')
require('dotenv').config()
const Sequelize = require('sequelize')
const pg = require('pg')

const { types } = pg

// we must store dates in UTC
pg.defaults.parseInputDatesAsUTC = true

// fix node-pg default transformation for date types
// https://github.com/brianc/node-pg-types
// https://github.com/brianc/node-pg-types/blob/master/lib/builtins.js
types.setTypeParser(types.builtins.DATE, (str) => str)
types.setTypeParser(types.builtins.TIMESTAMP, (str) => str)
types.setTypeParser(types.builtins.TIMESTAMPTZ, (str) => str)

const productionConfig = {
  require: true,
  rejectUnauthorized: false,
};

const developmentConfig = false;

const sequelize = new Sequelize(config.database, config.user, config.password, {
  host: config.host,
  dialect: config.dialect,
  port: config.port,

  dialectOptions: {
    // ssl: process.env.NODE_ENV === "production" ? productionConfig : developmentConfig
    ssl:  productionConfig
},

  logging: false,

  //   timezone: "Africa/Lagos",

  pool: {
    max: config.pool.max,
    min: config.pool.min,
    acquire: config.pool.acquire,
    idle: config.pool.idle,
  },
})

;(async () => {
  try {
    await sequelize.authenticate()
    console.log('Connection has been established with async successfully.')
  } catch (error) {
    console.error('Unable to connect to the database:', error)
  }
})()

const db = {}
db.Sequelize = Sequelize
db.sequelize = sequelize

// Models
db.models = {}

db.models.User = require('./User')(sequelize, Sequelize.DataTypes)
db.models.RefreshToken = require('./RefreshToken')(
  sequelize,
  Sequelize.DataTypes
)
db.models.VerificationToken = require('./VerificationToken')(
  sequelize,
  Sequelize.DataTypes
)

db.models.Admin = require('./Admin')(sequelize, Sequelize.DataTypes)
db.models.UserHobby = require('./UserHobby')(sequelize, Sequelize.DataTypes)
db.models.Wallet = require('./Wallet')(sequelize, Sequelize.DataTypes)

db.models.Task = require('./Task')(sequelize, Sequelize.DataTypes)
db.models.TaskOrder = require('./TaskOrder')(sequelize, Sequelize.DataTypes)
db.models.CompletedTask = require('./CompletedTask')(
  sequelize,
  Sequelize.DataTypes
)

db.models.Token = require('./Token')(sequelize, Sequelize.DataTypes)
db.models.CompanyWallet = require('./CompanyWallet')    (
  sequelize,  Sequelize.DataTypes
);
db.models.PackagePayment = require('./PackagePayment')    (
  sequelize,  Sequelize.DataTypes
);
// db.models.TokenDistribution = require('./TokenDistribution')(
//   sequelize,
//   Sequelize.DataTypes
// )

db.models.Interaction = require('./Interaction')(sequelize, Sequelize.DataTypes)

db.models.ExperiencePoint = require('./ExperiencePoint')(
  sequelize,
  Sequelize.DataTypes
)

db.models.NotificationBoard = require('./NotificationBoard')(
  sequelize,
  Sequelize.DataTypes
)

db.models.Message = require('./Message')(sequelize, Sequelize.DataTypes)

db.models.Transaction = require('./Transaction')(
  sequelize, 
  Sequelize.DataTypes
)
// for( let key in db.models.Interaction.rawAttributes ){
//     console.log('Field: ', key); // this is name of the field
//     console.log('TypeField: ', db.models.Interaction.rawAttributes[key]); // Sequelize type of field
// }

Object.keys(db.models).forEach((key) => {
  if ('associate' in db.models[key]) {
    db.models[key].associate(db.models)
  }
})

;(async () => {
  try {
    await db.sequelize.sync({ force: false, alter: false })
    console.log('<<<<<  Syncing Commerce server to  Database >>>>>')
  } catch (error) {
    console.error('Unable to connect to the database:', error)
  }
})()

module.exports = db
