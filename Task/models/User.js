const db = require('./index')

module.exports = (sequelize, Datatypes) => {
  const User = sequelize.define(
    'User',
    {
      username: {
        type: Datatypes.STRING,
        allowNull: false,
        // unique: true,
      },

      email: {
        type: Datatypes.STRING,
        allowNull: false,
        // unique: true,
        validate: {
          isEmail: { msg: 'Must be a valid email address' },
        },
      },

      firstname: {
        type: Datatypes.STRING,
      },

      lastname: {
        type: Datatypes.STRING,
      },

      phone: {
        type: Datatypes.STRING,
        // unique: true
      },

      roleId: {
        type: Datatypes.INTEGER,
        defaultValue: 2,
      },

      gender: {
        type: Datatypes.STRING,
      },

      photo: {
        type: Datatypes.STRING,
      },

      birth_date: {
        type: Datatypes.DATE,
      },

      birth_place: {
        type: Datatypes.STRING,
      },

      hometown: {
        type: Datatypes.STRING,
      },

      address: {
        type: Datatypes.TEXT,
      },

      postcode: {
        type: Datatypes.STRING,
      },

      email_verified_at: {
        type: Datatypes.DATE,
      },

      password: {
        type: Datatypes.STRING,
        allowNull: false,
      },

      country: {
        type: Datatypes.STRING,
      },

      region: {
        type: Datatypes.STRING,
      },

      language: {
        type: Datatypes.STRING,
      },

      developer: {
        type: Datatypes.BOOLEAN,
        default: false,
      },

      referralId: {
        type: Datatypes.INTEGER,
      },

      status: {
        type: Datatypes.INTEGER,
        defaultValue: 1,
      },

      clishaId: {
        type: Datatypes.STRING,
      },

      vendoConnectStatus: {
        type: Datatypes.BOOLEAN,
        default: false,
      },

      vendoEmail: {
        type: Datatypes.STRING,
      },
    },
    {
      // indexes: [{
      //     fields: ['email'],
      //     unique: true,
      //   }]
    }
  )

  User.associate = (models) => {
    User.hasOne(models.UserHobby)
    User.hasOne(models.Wallet)
    User.hasOne(models.RefreshToken)
  }

  return User
}
