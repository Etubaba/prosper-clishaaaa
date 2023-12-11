// const { models } = require(".");

module.exports = (sequelize, Datatypes) => {

  const Questionnaire = sequelize.define('Questionnaire', {
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

    categoryId: {
      type: Datatypes.INTEGER,
    },

    question: {
      type: Datatypes.STRING,
      allowNull: false,
    },

    options: {
      type: Datatypes.JSON,
    }
  })

  Questionnaire.associate = (models) => {
    
  }

  return Questionnaire;
}