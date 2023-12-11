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
    role: {
      type: Datatypes.STRING,
      defaultValue: 'company',
      allowNull: false,
    },
    email_verified_at: {
      type: Datatypes.DATE,
    },
    password: {
      type: Datatypes.STRING,
      allowNull: false,
    },

    // manager: {
    //   type: Datatypes.BOOLEAN,
    //   defaultValue: false,
    //   allowNull: false,
    // },
  })

  return Admin
}
