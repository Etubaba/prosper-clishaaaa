
module.exports = (sequelize, Datatypes) => {
  const CompanyWallet = sequelize.define('CompanyWallet', {
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

    paypal_plan_id: {
      type: Datatypes.JSON,
    },

    paypal_plan: {
      type: Datatypes.JSON,
    },

    paypal_links: {
      type: Datatypes.JSON,
    },
    
    balance: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    used: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    bonus_points: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    }
  });

  CompanyWallet.associate = (models) => {
    CompanyWallet.belongsTo(models.Token, {
      foreignKey: 'companyId',
      as: 'company',
    })
  }
  
  return CompanyWallet
}
