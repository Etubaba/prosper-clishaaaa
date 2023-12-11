// const { models } = require(".");
const Token = require('./Token')

module.exports = (sequelize, Datatypes) => {
  const Task = sequelize.define('Task', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Datatypes.INTEGER,
    },

    adminId: {
      type: Datatypes.INTEGER,
      allowNull: false,
      // references : {
      //     model: 'admins',
      //     key: 'id'
      // }
    },

    task_code: {
      type: Datatypes.STRING,
      allowNull: false,
    },

    task_type: {
      type: Datatypes.STRING,
      // allowNull: false
    },

    points: {
      type: Datatypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    bonus_points: {
      type: Datatypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    url: {
      type: Datatypes.STRING,
    },

    website_click: {
      type: Datatypes.JSON,
    },

    google_search: {
      type: Datatypes.JSON,
    },

    journey: {
      type: Datatypes.JSON,
    },

    tokenId: {
      type: Datatypes.INTEGER,
      // defaultValue: 1,

      // references : {
      //     model: 'tokens',
      //     key: 'id'
      // }
    },

    interactionId: {
      type: Datatypes.INTEGER,
    },

    status: {
      type: Datatypes.INTEGER,
      defaultValue: 1,
    },

    days: {
      type: Datatypes.INTEGER,
      defaultValue: 1,
    },

    start_at: {
      type: Datatypes.DATE,
      // defaultValue:  DataTypes.NOW
    },

    end_at: {
      type: Datatypes.DATE,
    },

    period_start_at: {
      type: Datatypes.TIME,
      defaultValue: '00:00:00',
    },

    period_end_at: {
      type: Datatypes.TIME,
      defaultValue: '23:59:59',
    },

    weekly: {
      type: Datatypes.JSONB,
      defaultValue: [],
    },

    monthly: {
      type: Datatypes.JSONB,
      defaultValue: [],
    },

    recurring: {
      type: Datatypes.BOOLEAN,
      defaultValue: false,
    },

    archive: {
      type: Datatypes.BOOLEAN,
      defaultValue: false,
    },

    published: {
      type: Datatypes.BOOLEAN,
      defaultValue: true,
    },
  })

  Task.associate = (models) => {
    Task.belongsTo(models.Token, {
      foreignKey: 'tokenId',
      as: 'token',
    })

    Task.belongsTo(models.Interaction, {
      foreignKey: 'interactionId',
      as: 'interaction',
    })

    Task.belongsTo(models.Admin, {
      foreignKey: 'adminId',
      as: 'admin',
    })
  }

  return Task
}
// CTrim Complex logic
// condition = {
//   // Get Available task for user
//   start_at: { [Op.lte]: today },
//   end_at: { [Op.gte]: today },
//   id: { [Op.notIn]: lists },
//   // Add of this particular period
//   [Op.or] : [
//     { period_start_at : {  [Op.not] : null} },
//     {
//       [Op.and] : {
//          period_start_at: { [Op.gte]: time },
//          period_end_at: { [Op.lte]: time },
//        }
//     }
//   ],
//   // Add recurring item.
//   [Op.or] : [
//     { recurring: 1 },
//     { [Op.and] : { weekly: { [Op.contains]: [dayofTheWeek] } } },
//     { [Op.and] : { monthly: { [Op.contains]: [dayOfTheMonth] } } }
//   ],
//   // Do not add unwanted task
//   status: 1, archive: 0
// };
