const User = require('./User')

module.exports = (sequelize, Datatypes) => {
  const Transaction = sequelize.define('Transaction', {
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

    adminId: {
      type: Datatypes.INTEGER
    },

    trx_id: {
      type: Datatypes.STRING,
      allowNull: false,
    },

    payment_method: {
      type: Datatypes.STRING,
    },

    wallet_address: {
      type: Datatypes.STRING,
    },

    currency: {
      type: Datatypes.STRING,
    },

    amount: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    points: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    status: {
      type: Datatypes.INTEGER,
      defaultValue: 1, // 0. Cancel, 1. Pending 2. Approved 3. Success 4. Failed
    },

    details: {
      type: Datatypes.STRING,
    },
  })

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
    });
  };

  return Transaction
}
