module.exports = (sequelize, Datatypes) => {
  const TempSubAdmins = sequelize.define('TempSubAdmins', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Datatypes.INTEGER,
    },
    firstname: {
      type: Datatypes.STRING,
      allowNull: true,
    },
    lastname: {
      type: Datatypes.STRING,
      allowNull: true,
    },
    name: {
      //company_name
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
    password: {
      type: Datatypes.STRING,
      allowNull: false,
    },
  })

  return TempSubAdmins
}
