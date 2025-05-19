from flask import Flask, request, jsonify
from flask_cors import CORS
from services import buscar_gene_pkd1, realizar_alinhamento_grande
import sys
import requests

app = Flask(__name__)
CORS(app)

def print_progress(progress, message=None):
    bar_length = 40
    block = int(round(bar_length * progress))
    text = f"\r[{'#' * block}{'-' * (bar_length - block)}] {progress:.1%}"
    if message:
        text += f" | {message}"
    sys.stdout.write(text)
    sys.stdout.flush()

@app.route('/buscar-pkd1', methods=['POST'])
def buscar_pkd1():
    if 'arquivo' not in request.files:
        return jsonify({"error": "Nenhum arquivo foi enviado"}), 400

    arquivo = request.files['arquivo']
    conteudo = arquivo.stream.read().decode('utf-8').splitlines()

    def update_progress(progress, message):
        print_progress(progress, message)

    print("📁 Processando arquivo...")
    gene_info = buscar_gene_pkd1(conteudo)
    if 'error' in gene_info:
        return jsonify(gene_info)

    print("\n🔬 Executando alinhamento...")
    alinhamento_result = realizar_alinhamento_grande(
        gene_info['sequencia'],
        progress_callback=update_progress
    )

    gene_info['alinhamento_result'] = alinhamento_result
    print("\n✅ Processo concluído!")

    # Exibe no terminal: exon29 e similaridade
    print("\n🧬 Sequência extraída do exon29:")
    print(alinhamento_result['exon29_amostra'])


    if 'score' in alinhamento_result:
        print(f"\n📏 Similaridade do alinhamento: {alinhamento_result['score']:.2f}%")

    # Envia o exon29 para a IA
    outra_api_url = "http://localhost:6000/classificar-exon29"
    try:
        response = requests.post(outra_api_url, json={"alinhamento_result": {"exon29_amostra": alinhamento_result['exon29_amostra']}}
)
        if response.status_code != 200:
            print(f"\n❌ Erro ao enviar para a IA: {response.status_code} - {response.text}")
        else:
            resultado_ia = response.json()
            print("\n🤖 Resposta da IA:")
            print(f"📌 Classificação: {resultado_ia['classificacao']}")
            print(f"📊 Confiança: {resultado_ia['confianca']}")
            gene_info["classificacao_ia"] = resultado_ia
    except Exception as e:
        print(f"\n❌ Erro ao conectar com a IA: {e}")

    return jsonify(gene_info)

if __name__ == '__main__':
    print("🧬 Servidor de Análise Genética rodando em http://localhost:5000/buscar-pkd1")
    app.run(host='0.0.0.0', port=5000, debug=True)
