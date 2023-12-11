const User = require('./User')

module.exports = (sequelize, Datatypes) => {
  const UserHobby = sequelize.define('UserHobby', {
    // userId: {
    //     type: Datatypes.INTEGER,
    //     allowNull: false,
    //     // references : {
    //     //     model: 'users',
    //     //     key: 'id'
    //     // }
    // },

    favourite_movie: {
      type: Datatypes.STRING,
    },

    game: {
      type: Datatypes.STRING,
    },

    place: {
      type: Datatypes.STRING,
    },

    singer: {
      type: Datatypes.STRING,
    },

    brand: {
      type: Datatypes.STRING,
    },

    player: {
      type: Datatypes.STRING,
    },

    food: {
      type: Datatypes.STRING,
    },

    day: {
      type: Datatypes.STRING,
    },
  })

  UserHobby.associate = (models) => {
    UserHobby.belongsTo(models.User)
  }
  // User.hasOne(models.tasks, {foreignKey: 'task_id', as: 'task'});
  return UserHobby
}
