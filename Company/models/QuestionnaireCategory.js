// const { models } = require(".");

module.exports = (sequelize, Datatypes) => {

  const QuestionnaireCategory = sequelize.define('QuestionnaireCategory', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Datatypes.INTEGER,
    },

    adminId: {
      type: Datatypes.INTEGER,
      allowNull: false,
    },
    
    name: {
      type: Datatypes.STRING,
      allowNull: false,
    },

    status: {
      type: Datatypes.INTEGER,
      defaultValue: 1,
    }
  })

  QuestionnaireCategory.associate = (models) => {
    
  }

  return QuestionnaireCategory
}