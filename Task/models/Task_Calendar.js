const Sequelize = require('sequelize')

module.exports = (sequelize, Datatypes) => {
  const Task_Calendar = sequelize.define('Task_Calendar', {
    calendarId: {
      type: Datatypes.UUID,
      allowNull: false,
      defaultValue: Sequelize.UUIDV4(),
    },
    taskId: {
      type: Datatypes.STRING,
    },
    task_start_at: {
      type: Datatypes.DATE,
    },
  })

  return Task_Calendar
}
