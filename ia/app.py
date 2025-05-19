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

    if not data:
        return jsonify({"error": "Nenhum dado JSON fornecido."}), 400

    # Verifica se 'exon29' ou 'sequencia' está presente
    if 'exon29' in data:
        sequencia = data['exon29']
    elif 'sequencia' in data:
        sequencia = data['sequencia']
    else:
        return jsonify({"error": "JSON inválido. Esperado: {'exon29': 'SEQUENCIA'} ou {'sequencia': 'SEQUENCIA'}"}), 400

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
    app.run(host='0.0.0.0', port=6000, debug=True)
