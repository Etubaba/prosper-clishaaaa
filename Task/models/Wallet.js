const User = require('./User')

module.exports = (sequelize, Datatypes) => {
  const Wallet = sequelize.define('Wallet', {
    UserId: {
      type: Datatypes.INTEGER,
      allowNull: false,
      // references : {
      //     model: 'users',
      //     key: 'id'
      // }
    },

    balance: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    earned_amount: {
      type: Datatypes.DOUBLE,
      defaultValue: 0,
    },

    bonus_points: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    total_points: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    rankId: {
      type: Datatypes.INTEGER,
    },

    rankName: {
      type: Datatypes.STRING,
      defaultValue: 'Adstar Bronze',
    },
  })

  Wallet.associate = (models) => {
    Wallet.belongsTo(models.User, {
      foreignKey: 'UserId',
      as: 'user',
    })
  }
  // User.hasOne(models.tasks, {foreignKey: 'task_id', as: 'task'});
  return Wallet
}
