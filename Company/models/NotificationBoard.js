module.exports = (sequelize, Datatypes) => {
  const NotificationBoard = sequelize.define('NotificationBoard', {
    id: {
      type: Datatypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    userId: {
      type: Datatypes.INTEGER,
      allowNull: false,
    },

    boardId: {
      type: Datatypes.INTEGER,
    },

    seen: {
      type: Datatypes.BOOLEAN,
      defaultValue: false,
    },

    view_count: {
      type: Datatypes.INTEGER,
      defaultValue: 0,
    },

    message: {
      type: Datatypes.STRING,
    },

    message_deutsch: {
      type: Datatypes.STRING,
    },

    view_at: {
      type: Datatypes.DATE,
    },
  })

  NotificationBoard.associate = (models) => {
    NotificationBoard.belongsTo(models.Message, {
      foreignKey: 'boardId',
      as: 'banner',
    })
  }

  return NotificationBoard
}
