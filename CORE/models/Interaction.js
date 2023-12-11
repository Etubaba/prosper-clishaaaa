module.exports = (sequelize, Datatypes) => {
  const Interaction = sequelize.define('Interaction', {
    adminId: {
      type: Datatypes.INTEGER,
      allowNull: false,
      // references : {
      //     model: 'admins',
      //     key: 'id'
      // }
    },

    tokenId: {
      type: Datatypes.INTEGER,
      allowNull: false,
      // defaultValue: 1
    },

    interaction_type: {
      type: Datatypes.STRING,
      allowNull: false,
    },

    name: {
      type: Datatypes.STRING,
      // unique: true,
      // allowNull: false,
    },

    question: {
      type: Datatypes.STRING,
    },

    duration: {
      type: Datatypes.INTEGER,
      defaultValue: 30,
    },

    description: {
      type: Datatypes.TEXT,
    },

    url: {
      type: Datatypes.STRING,
    },
    
    option1: {
      type: Datatypes.STRING,
    },

    option2: {
      type: Datatypes.STRING,
    },

    option3: {
      type: Datatypes.STRING,
    },

    option4: {
      type: Datatypes.STRING,
    },

    option5: {
      type: Datatypes.STRING,
    },

    answer: {
      type: Datatypes.STRING,
    },
  })

  Interaction.associate = (models) => {
    Interaction.belongsTo(models.Token, {
      foreignKey: 'tokenId',
      as: 'token',
    })

    Interaction.belongsTo(models.Admin, {
      foreignKey: 'adminId',
      as: 'admin',
    })
  }

  return Interaction
}
