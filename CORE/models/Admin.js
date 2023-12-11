module.exports = (sequelize, Datatypes) => {
  const Admin = sequelize.define('Admin', {
    firstname: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    lastname: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    name: {
      type: Datatypes.STRING,
      allowNull: false,
    },

    email: {
      type: Datatypes.STRING,
      allowNull: false,
      // unique: true,
      validate: {
        isEmail: { msg: 'Must be a valid email address' },
      },
    },

    phone: {
      type: Datatypes.STRING,
    },

    tokenId: {
      type: Datatypes.INTEGER,
    },

    role: {
      type: Datatypes.STRING,
      allowNull: false,
      defaultValue: 'admin',
    },

    email_verified_at: {
      type: Datatypes.DATE,
    },

    password: {
      type: Datatypes.STRING,
      allowNull: false,
    },
  })

  return Admin
}
