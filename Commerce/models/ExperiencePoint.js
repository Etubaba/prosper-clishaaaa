module.exports = (sequelize, Datatypes) => {
  const ExperiencePoint = sequelize.define('ExperiencePoint', {
    id: {
      type: Datatypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    point_type: {
      type: Datatypes.STRING,
      allowNull: false,
    },
    points: {
      type: Datatypes.INTEGER,
    },
    userId: {
      type: Datatypes.INTEGER,
      allowNull: false,
    },
  })

  ExperiencePoint.associate = (models) => {
    ExperiencePoint.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    })
  }

  return ExperiencePoint
}
