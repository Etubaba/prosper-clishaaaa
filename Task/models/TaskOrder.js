module.exports = (sequelize, Datatypes) => {
  const TaskOrder = sequelize.define('TaskOrder', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Datatypes.INTEGER,
    },

    points: {
      type: Datatypes.INTEGER,
      defaultValue: 0,
    },

    daily_clicks: {
      type: Datatypes.INTEGER,
      defaultValue: 0,
    },
    
    today_clicks: {
      type: Datatypes.INTEGER,
      defaultValue: 0,
    },

    days_duration: {
      type: Datatypes.INTEGER,
    },

    interactions: {
      type: Datatypes.INTEGER,
      defaultValue: 0,
    },

    interaction_balance: {
      type: Datatypes.INTEGER,
      defaultValue: 0,
    },

    used: {
      type: Datatypes.INTEGER,
      defaultValue: 0,
    },

    order_months: {
      type: Datatypes.JSON,
      allowNull: true,
      defaultValue: [],
    },

    status: {
      type: Datatypes.INTEGER,
      defaultValue: 1,
    }
  });

  return TaskOrder
}