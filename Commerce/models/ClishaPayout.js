const User = require('./User')

module.exports = (sequelize, Datatypes) => {
  const ClishaPayout = sequelize.define('ClishaPayout', {
    id: {
      type: Datatypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: Datatypes.STRING,
      allowNull: false,
      // unique: true
    },

    email: {
      type: Datatypes.STRING,
    },

    amount: {
      type: Datatypes.INTEGER,
      defaultValue: 0,
    },

    clientamount: {
      type: Datatypes.INTEGER,
    },

    currency: {
      type: Datatypes.STRING,
    },

    status: {
      type: Datatypes.INTEGER,
      // defaultValue: 1
    },
  })

  // ClishaPayout.associate = (models) => {
  //     ClishaPayout.belongsTo(models.Admin, {
  //       foreignKey: "adminId",
  //       as: "admin",
  //     });
  // };

  return ClishaPayout
}
