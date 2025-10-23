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

    alinhamento_result = data.get("alinhamento_result")
    if not isinstance(alinhamento_result, dict):
        return jsonify({
            "error": "JSON inválido. Esperado chave 'alinhamento_result' com objeto."
        }), 400

    sequencia = alinhamento_result.get("exon29_amostra")
    if not sequencia or "Não foi possível" in sequencia:
        return jsonify({
            "error": "Exon29 indisponível na amostra. Não foi possível classificar."
        }), 422

    referencia = alinhamento_result.get("exon29_referencia")
    variantes = alinhamento_result.get("variantes_exon29", [])
    metricas = alinhamento_result.get("metricas_exon29", {})

    identidade_pct = None
    melhor = alinhamento_result.get("melhor_alinhamento", {})
    if isinstance(melhor, dict):
        identidade_pct = melhor.get("identidade_pct")
        if identidade_pct is None:
            identidade_str = melhor.get("identidade")
            if isinstance(identidade_str, str) and identidade_str.endswith("%"):
                try:
                    identidade_pct = float(identidade_str.strip(" %"))
                except ValueError:
                    identidade_pct = None

    try:
        print("\n📥 Sequência recebida para classificação:")
        print(sequencia)

        features = extrair_features(
            sequencia,
            referencia=referencia,
            variantes=variantes,
            identidade=identidade_pct,
            metricas=metricas,
        )
        features_df = pd.DataFrame([features])
        pred = modelo.predict(features_df)[0]
        prob = modelo.predict_proba(features_df)[0].max()

        resultado = {
            "classificacao": int(pred),
            "confianca": f"{float(prob)*100:.2f}%",
            "confianca_float": float(prob),
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
