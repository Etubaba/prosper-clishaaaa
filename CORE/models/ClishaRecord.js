module.exports = (sequelize, Datatypes) => {
  const ClishaRecord = sequelize.define('ClishaRecord', {
    id: {
      type: Datatypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    date: {
      type: Datatypes.DATE,
      allownull: false,
    },

    created_task: {
      type: Datatypes.INTEGER,
      default: 0,
    },

    total_recurring: {
      type: Datatypes.INTEGER,
      default: 0,
    },

    total_task: {
      type: Datatypes.INTEGER,
      default: 0,
    },

    completed_task: {
      type: Datatypes.INTEGER,
      default: 0,
    },

    active_users: {
      type: Datatypes.INTEGER,
      default: 0,
    },

    engagement: {
      type: Datatypes.DOUBLE,
      default: 0,
    },
  })

  return ClishaRecord
}
