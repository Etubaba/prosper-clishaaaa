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
    },

    task_code: {
      type: Datatypes.STRING,
      allowNull: false,
    },

    task_type: {
      type: Datatypes.STRING,
    },

    advance_type: {
      type: Datatypes.STRING,
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

    recurring: {
      type: Datatypes.BOOLEAN,
      defaultValue: false,
    },

    weekly: {
      type: Datatypes.JSONB,
      defaultValue: [],
    },

    monthly: {
      type: Datatypes.JSONB,
      defaultValue: [],
    },

    countries: {
      type: Datatypes.JSONB,
      allowNull: true,
    },

    tokenId: {
      type: Datatypes.INTEGER
    },

    interactionId: {
      type: Datatypes.INTEGER,
    },

    orderId: {
      type: Datatypes.INTEGER,
    },

    track_domain: {
      type: Datatypes.BOOLEAN, 
      defaultValue: false
    },

    // Random Click Visitor Referrer
    // Google Country_specific, 

    is_adult: {
      type: Datatypes.BOOLEAN, 
      defaultValue: false
    },

    random_click: {
      type: Datatypes.BOOLEAN, 
      defaultValue: false
    },

    visitors_referrer: {
      type: Datatypes.JSONB,
      allowNull: true,
    },
    
    // 
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


    status: {
      type: Datatypes.INTEGER,
      defaultValue: 1,
    },

    archive: {
      type: Datatypes.BOOLEAN,
      defaultValue: false,
    },

    published: {
      type: Datatypes.BOOLEAN,
      defaultValue: true,
    }
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

    Task.belongsTo(models.TaskOrder, {
      foreignKey: 'orderId',
      as: 'order',
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
