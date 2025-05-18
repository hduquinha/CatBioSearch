from flask import Flask, request, jsonify
import joblib
from utils import extrair_features
import os

app = Flask(__name__)

# Carrega o modelo
modelo_path = "model/random_forest_model.pkl"
if not os.path.exists(modelo_path):
    raise FileNotFoundError("Modelo treinado não encontrado. Rode o train_model.py primeiro.")

modelo = joblib.load(modelo_path)

@app.route("/classificar-exon29", methods=["POST"])
def classificar():
    data = request.get_json()
    if not data or 'exon29' not in data:
        return jsonify({"error": "JSON inválido. Esperado: {'exon29': 'SEQUENCIA'}"}), 400

    sequencia = data['exon29']
    try:
        features = extrair_features(sequencia)
        pred = modelo.predict([list(features.values())])[0]
        prob = modelo.predict_proba([list(features.values())])[0].max()

        return jsonify({
            "classificacao": pred,
            "confianca": f"{prob*100:.2f}%"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
