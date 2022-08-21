'use strict'
module.exports = (sequelize, DataTypes) => {
  const AgreementListenCount = sequelize.define('AgreementListenCount', {
    agreementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: false,
      primaryKey: true
    },
    listens: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour: {
      type: DataTypes.DATE,
      allowNull: false,
      primaryKey: true
    }
  }, {})
  AgreementListenCount.associate = function (models) {
    // associations can be defined here
  }
  return AgreementListenCount
}
