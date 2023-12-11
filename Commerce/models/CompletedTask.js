const db = require('./index')
const Task = require('./Task')

module.exports = (sequelize, Datatypes) => {
  const CompletedTask = sequelize.define('CompletedTask', {
    userId: {
      type: Datatypes.INTEGER,
      allowNull: false,
      // references : {
      //     model: 'users',
      //     key: 'id'
      // }
    },

    taskId: {
      type: Datatypes.INTEGER,
      allowNull: false,
      // references : {
      //     model: 'tasks',
      //     key: 'id'
      // }
    },

    task_start_at: {
      type: Datatypes.DATE,
      allowNull: false,
    },

    status: {
      type: Datatypes.INTEGER,
      defaultValue: 1,
    },

    task_recurring: {
      type: Datatypes.BOOLEAN,
      defaultValue: false,
    },
  })

  CompletedTask.associate = (models) => {
    CompletedTask.belongsTo(models.Task, {
      foreignKey: 'taskId',
      as: 'task',
    })
    CompletedTask.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    })
  }

  return CompletedTask
}
