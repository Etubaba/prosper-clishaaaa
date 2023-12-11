
module.exports = (sequelize, Datatypes) => {
  const PackagePayment = sequelize.define('PackagePayment', {
    id: {
      type: Datatypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    companyId: {
      type: Datatypes.INTEGER,
      allowNull: false,
    },

    txn_id: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    package_name: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    payment_method: {
      type: Datatypes.STRING,
    },

    currency: {
      type: Datatypes.STRING,
    },

    amount: {
      type: Datatypes.INTEGER,
    },

    interactions: {
      type: Datatypes.INTEGER,
    },

    vat: {
      type: Datatypes.INTEGER,
    },

    status: {
      type: Datatypes.INTEGER,
      // defaultValue: 1
    },

    details: {
      type: Datatypes.JSON,
    },
  });

  PackagePayment.associate = (models) => {
    PackagePayment.belongsTo(models.Token, {
      foreignKey: 'companyId',
      as: 'company',
    })
  }
  
  return PackagePayment
}
