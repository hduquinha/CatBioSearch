from flask import Flask, request, jsonify
import joblib
from utils import extrair_features
import os
import pandas as pd

app = Flask(__name__)

# Caminho do modelo salvo
modelo_path = "model/random_forest_model.pkl"
if not os.path.exists(modelo_path):
    raise FileNotFoundError("Modelo treinado não encontrado. Rode o train_model.py primeiro.")

modelo = joblib.load(modelo_path)

@app.route("/classificar-exon29", methods=["POST"])
def classificar():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Nenhum dado JSON fornecido."}), 400

    try:
        sequencia = data["alinhamento_result"]["exon29_amostra"]
    except KeyError:
        return jsonify({
        "error": "JSON inválido. Esperado: {'alinhamento_result': {'exon29_amostra': 'SEQUENCIA'}}"
    }), 400


    try:
        print("\n📥 Sequência recebida para classificação:")
        print(sequencia)

        features = extrair_features(sequencia)
        features_df = pd.DataFrame([features])
        pred = modelo.predict(features_df)[0]
        prob = modelo.predict_proba(features_df)[0].max()

        resultado = {
            "classificacao": int(pred),
            "confianca": f"{float(prob)*100:.2f}%"
        }

        print("\n✅ Resultado da classificação:")
        print(f"📌 Classificação: {resultado['classificacao']}")
        print(f"📊 Confiança: {resultado['confianca']}")

        return jsonify(resultado)

    except Exception as e:
        print(f"\n❌ Erro ao classificar: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("Servidor IA rodando em http://localhost:6000/classificar-exon29")
    app.run(host='0.0.0.0', port=6000, debug=True)
