const config = require('../config/auth')
const { v4: uuidv4 } = require('uuid')

module.exports = (sequelize, DataTypes) => {
  const VerificationToken = sequelize.define('VerificationToken', {
    verifier: {
      type: DataTypes.STRING,
      defaultValue: 'register',
    },

    token: {
      type: DataTypes.STRING,
    },

    otp: {
      type: DataTypes.INTEGER,
    },

    isOtp: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    status: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    expiryDate: {
      type: DataTypes.DATE,
    },
  })

  VerificationToken.verifyExpiration = (token) => {
    return new Date(token.expiryDate).getTime() < new Date().getTime()
  }

  VerificationToken.associate = (models) => {
    VerificationToken.belongsTo(models.User)
  }

  return VerificationToken
}
