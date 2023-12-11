const User = require('./User')

module.exports = (sequelize, Datatypes) => {
  const TokenDistribution = sequelize.define('TokenDistribution', {
    tokenId: {
      type: Datatypes.INTEGER,
      allowNull: false,
    },

    bonus: {
      type: Datatypes.INTEGER,
      defaultValue: 0,
    },

    website_click: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    google_search: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    user_journey: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    search_journey: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    ticktok: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    facebook: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    youtube: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    linkedin: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    others: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },
  })

  return TokenDistribution
}
