from flask import Flask, request, jsonify
from flask_cors import CORS
from services import buscar_gene_pkd1, realizar_alinhamento_grande
import sys
import requests  # Biblioteca para fazer requisições HTTP

app = Flask(__name__)
CORS(app)

def print_progress(progress, message=None):
    """Exibe progresso no terminal"""
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

    print("Processando arquivo...")
    gene_info = buscar_gene_pkd1(conteudo)
    if 'error' in gene_info:
        return jsonify(gene_info)

    print("\nExecutando alinhamento...")
    alinhamento_result = realizar_alinhamento_grande(
        gene_info['sequencia'],
        progress_callback=update_progress
    )
    
    gene_info['alinhamento_result'] = alinhamento_result
    print("\nProcesso concluído!")

    # Enviando o resultado para outra API
    outra_api_url = "http://localhost:6000/classificar-exon29"  # Altere conforme sua outra API
    try:
        resposta = requests.post(outra_api_url, json=gene_info)
        if resposta.status_code != 200:
            print(f"Erro ao enviar para outra API: {resposta.status_code} - {resposta.text}")
        else:
            print("Resposta enviada com sucesso para outra API.")
    except Exception as e:
        print(f"Erro ao conectar com a outra API: {e}")

    return jsonify(gene_info)

if __name__ == '__main__':
    print("Servidor de Análise Genética")
    print("Endpoint: POST /buscar-pkd1")
    app.run(host='0.0.0.0', port=5000, debug=True)
