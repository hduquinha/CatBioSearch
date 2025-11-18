const { Sequelize } = require("sequelize");
const startDb = require("../db/database");
const initRelatorioModel = require("./Relatorio");

let RelatorioInsight;

const initRelatorioInsightModel = async () => {
  if (RelatorioInsight) return RelatorioInsight;

  const db = await startDb();
  const Relatorio = await initRelatorioModel();

  RelatorioInsight = db.define("RelatorioInsights", {
    RelatorioId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: Relatorio.getTableName(),
        key: "id",
      },
      onDelete: "CASCADE",
    },
    sections_json: {
      type: Sequelize.TEXT("long"),
      allowNull: false,
    },
    insights_json: {
      type: Sequelize.TEXT("long"),
      allowNull: false,
    },
    possiveis_doencas: {
      type: Sequelize.TEXT("long"),
      allowNull: true,
    },
    modelo: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    fonte_dados: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    gerado_em: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  });

  await RelatorioInsight.sync();
  Relatorio.hasOne(RelatorioInsight, { foreignKey: "RelatorioId" });
  RelatorioInsight.belongsTo(Relatorio, { foreignKey: "RelatorioId" });

  return RelatorioInsight;
};

module.exports = initRelatorioInsightModel;
