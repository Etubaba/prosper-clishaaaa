
module.exports = (sequelize, Datatypes) => {
  const Token = sequelize.define('Token', {
    adminId: {
      type: Datatypes.INTEGER,
      allowNull: false,
    },

    companyId: {
      type: Datatypes.INTEGER,
      allowNull: true,
    },
   
    name: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    photo: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    duration: {
      type: Datatypes.INTEGER,
      defaultValue: 30,
    },

    description: {
      type: Datatypes.TEXT,
      allowNull: true,
    },

    category: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    bonus: {
      type: Datatypes.INTEGER,
      defaultValue: 0,
    },

    value: {
      type: Datatypes.FLOAT,
      defaultValue: 1,
    },

    used: {
      type: Datatypes.FLOAT,
      defaultValue: 0,
    },

    status: {
      type: Datatypes.INTEGER,
      defaultValue: 1,
    },

    eligibility: {
      type: Datatypes.INTEGER,
      defaultValue: 0,
    },

    icon: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    background: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    foreground: {
      type: Datatypes.STRING,
      defaultValue: "#000000",
    },

    card_colors: {
      type: Datatypes.JSON,
    },
    
    address_line: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    address_line_two: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    zip: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    city: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    country: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    vat_number: {
      type: Datatypes.STRING,
      allowNull: true,
    },

    phone_number: {
      type: Datatypes.STRING,
      allowNull: true,
    },
  });

  Token.associate = (models) => {
    Token.belongsTo(models.Admin, {
      foreignKey: "adminId",
      as: "admin",
    });
  };

  return Token;
}