module.exports = (sequelize, Datatypes) => {
  const Message = sequelize.define('Message', {
    id: {
      type: Datatypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    adminId: {
      type: Datatypes.INTEGER,
      allowNull: false,
    },

    message_english: {
      type: Datatypes.TEXT,
    },

    message_french: {
      type: Datatypes.TEXT,
    },

    message_spanish: {
      type: Datatypes.TEXT,
    },

    message_deutsch: {
      type: Datatypes.TEXT,
    },

    message_portuguese: {
      type: Datatypes.TEXT,
    },

    status: {
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
  })

  Message.associate = (models) => {
    Message.belongsTo(models.Admin, {
      foreignKey: 'adminId',
      as: 'admin',
    })
  }

  return Message
}
