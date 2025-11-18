from flask import Flask, request, jsonify
from flask_cors import CORS
from services import buscar_gene_pkd1, realizar_alinhamento_grande
import sys
import requests
import os
import json
import time
import numbers
import math

app = Flask(__name__)
CORS(
    app,
    supports_credentials=True,
    resources={r"/*": {"origins": "http://localhost:5173"}}
)

# Rotas básicas de status / saúde para evitar 404 no root e permitir monitoramento
@app.route('/', methods=['GET'])
def raiz():
    return jsonify({
        "status": "ok",
        "service": "back-end-fasta",
        "endpoints": [
            "/buscar-pkd1 (POST multipart: arquivo)",
            "/dados-analise (GET)",
            "/health (GET)"
        ]
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

# Variável global para armazenar o último resultado da análise
ultimo_resultado_analise = {}


def _to_serializable(value):
    """Converte recursivamente valores para tipos compatíveis com JSON."""
    if isinstance(value, dict):
        return {str(k): _to_serializable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_serializable(v) for v in value]
    if isinstance(value, numbers.Number):
        coerced = value.item() if hasattr(value, "item") else value
        if isinstance(coerced, float) and math.isnan(coerced):
            return None
        return coerced
    if isinstance(value, (str, bool)) or value is None:
        return value
    # Fallback para tipos não suportados diretamente
    return str(value)

def sanitize_sequence(seq: str, max_len: int = 400):
    if not seq:
        return "(sequência vazia)"
    seq = seq.strip().upper()
    if len(seq) <= max_len:
        return seq
    return seq[:max_len] + f"... (total {len(seq)} nt)"

def generate_llm_summary(dados: dict) -> str:
    """Gera um resumo textual usando Gemini (quando habilitado).

    Requisitos:
      - ENABLE_LLM=true
      - GEMINI_API_KEY definido
    Fallback: retorna texto padrão se não configurado ou em erro.
    """
    if os.getenv("ENABLE_LLM", "false").lower() != "true":
        return "Resumo LLM desativado (ENABLE_LLM != true)."

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "Resumo LLM indisponível: GEMINI_API_KEY não configurada."

    # Monta prompt estruturado
    identidade = dados.get("identidade") or "N/D"
    score = dados.get("score") or "N/D"
    classificacao = dados.get("classificacao") or "N/D"
    confianca = dados.get("confianca") or "N/D"
    exon_seq = sanitize_sequence(dados.get("exon29_amostra"))

    prompt = f"""
Você é um assistente especializado em genética veterinária.
Gere um relatório clínico interpretativo em português claro sobre o gene PKD1 (exon29) para felinos.
Inclua seções: 1) Visão Geral, 2) Interpretação do Alinhamento, 3) Classificação do Modelo, 4) Risco / Implicações, 5) Próximos Passos Recomendados.
Use bullets quando apropriado. Evite prometer diagnóstico definitivo.

Dados:
- Identidade do alinhamento: {identidade}
- Score bruto do alinhamento: {score}
- Classificação do modelo (interno): {classificacao}
- Confiança do modelo: {confianca}
- Trecho exon29 analisado (parcial/truncado se grande): {exon_seq}

Produza texto objetivo (máx ~450 palavras), mantendo tom profissional e acessível a veterinário.
""".strip()

    # Endpoint básico Gemini generative (v1beta) - model gemini-pro (ajustável)
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {"parts": [{"text": prompt}]}
        ]
    }

    try:
        start = time.time()
        resp = requests.post(f"{url}?key={api_key}", headers=headers, data=json.dumps(payload), timeout=25)
        dur = time.time() - start
        if resp.status_code != 200:
            return f"Falha ao gerar resumo LLM (HTTP {resp.status_code}) em {dur:.1f}s"
        data = resp.json()
        # Estrutura típica: data['candidates'][0]['content']['parts'][0]['text']
        candidates = data.get('candidates') or []
        if not candidates:
            return "Resposta LLM vazia ou sem candidatos."
        parts = candidates[0].get('content', {}).get('parts') or []
        if not parts:
            return "Resposta LLM sem partes de texto."
        texto = parts[0].get('text', '').strip()
        return texto or "Resposta LLM vazia."
    except Exception as e:
        return f"Erro ao contatar LLM: {e}"  # Fallback amigável

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
    global ultimo_resultado_analise

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

    # Se houve erro no alinhamento, retorna com 422 (processamento)
    if isinstance(alinhamento_result, dict) and 'error' in alinhamento_result:
        return jsonify(alinhamento_result), 422

    gene_info['alinhamento_result'] = alinhamento_result
    print("\n✅ Processo concluído!")

    # Exibe no terminal: exon29 e similaridade (se disponível)
    print("\n🧬 Sequência extraída do exon29:", flush=True)
    print(alinhamento_result.get('exon29_amostra', 'N/D'), flush=True)

    melhor = alinhamento_result.get('melhor_alinhamento', {})
    metricas_exon = alinhamento_result.get('metricas_exon29', {})
    variantes_detectadas = alinhamento_result.get('variantes_exon29', [])
    if 'score' in melhor:
        print(f"\n📏 Similaridade do alinhamento: {melhor['score']:.2f}")
    if metricas_exon:
        print(f"📊 Cobertura estimada do exon29: {metricas_exon.get('cobertura_pct', 'N/D')}%")
        print(f"🧪 Variantes detectadas no exon29: {metricas_exon.get('total_variantes', 0)}")
        for variante in variantes_detectadas[:5]:
            print(f"   • {variante['tipo']} @ exon {variante.get('posicao_exon', 'N/D')} ({variante.get('ref')}→{variante.get('alt')})")
        if len(variantes_detectadas) > 5:
            print(f"   • ... +{len(variantes_detectadas) - 5} variantes")

    # Disponibiliza dados para /dados-analise imediatamente após alinhamento
    try:
        global ultimo_resultado_analise
        ultimo_resultado_analise = {
            "identidade": melhor.get("identidade"),
            "identidade_pct": melhor.get("identidade_pct"),
            "score": melhor.get("score"),
            "classificacao": None,
            "confianca": None,
            "confianca_float": None,
            "variantes_exon29": variantes_detectadas,
            "metricas_exon29": metricas_exon,
            "exon29_amostra": alinhamento_result.get("exon29_amostra"),
            "exon29_referencia": alinhamento_result.get("exon29_referencia"),
            "gene_metadados": gene_info.get("metadados"),
        }
        ultimo_resultado_analise = _to_serializable(ultimo_resultado_analise)
    except Exception:
        pass

    # Envia o exon29 para a IA (classificador interno)
    ia_host = os.getenv("IA_HOST", "ia")  # usar nome do serviço no docker compose
    outra_api_url = f"http://{ia_host}:6000/classificar-exon29"
    try:
        payload_serializado = _to_serializable(alinhamento_result)
        response = requests.post(
            outra_api_url,
            json={"alinhamento_result": payload_serializado}
        )
        if response.status_code != 200:
            print(f"\n❌ Erro ao enviar para a IA: {response.status_code} - {response.text}")
            try:
                ultimo_resultado_analise.update({
                    "erro_ia": {
                        "status": response.status_code,
                        "detalhe": response.text[:600],
                    }
                })
                ultimo_resultado_analise = _to_serializable(ultimo_resultado_analise)
            except Exception:
                pass
        else:
            resultado_ia = response.json()
            print("\n🤖 Resposta da IA:")
            print(f"📌 Classificação: {resultado_ia['classificacao']}")
            print(f"📊 Confiança: {resultado_ia['confianca']}")
            gene_info["classificacao_ia"] = resultado_ia

            # Salva as informações importantes para a nova rota
            try:
                ultimo_resultado_analise.update({
                    "classificacao": resultado_ia.get("classificacao"),
                    "confianca": resultado_ia.get("confianca"),
                    "confianca_float": resultado_ia.get("confianca_float"),
                    "erro_ia": None,
                })
                ultimo_resultado_analise = _to_serializable(ultimo_resultado_analise)
            except Exception:
                pass

    except Exception as e:
        print(f"\n❌ Erro ao conectar com a IA: {e}")
        try:
            ultimo_resultado_analise.update({
                "erro_ia": str(e),
            })
            ultimo_resultado_analise = _to_serializable(ultimo_resultado_analise)
        except Exception:
            pass

    # Geração de resumo LLM (opcional)
    try:
        contexto_llm = {
            "identidade": ultimo_resultado_analise.get("identidade"),
            "identidade_pct": ultimo_resultado_analise.get("identidade_pct"),
            "score": ultimo_resultado_analise.get("score"),
            "classificacao": ultimo_resultado_analise.get("classificacao"),
            "confianca": ultimo_resultado_analise.get("confianca"),
            "exon29_amostra": alinhamento_result.get('exon29_amostra'),
            "variantes_exon29": variantes_detectadas,
            "metricas_exon29": metricas_exon,
        }
        resumo_texto = generate_llm_summary(contexto_llm)
        ultimo_resultado_analise["relatorio_texto"] = resumo_texto
        gene_info["relatorio_texto"] = resumo_texto
    except Exception as e:
        ultimo_resultado_analise["relatorio_texto"] = f"Falha ao gerar resumo: {e}"
        gene_info["relatorio_texto"] = ultimo_resultado_analise["relatorio_texto"]

    ultimo_resultado_analise = _to_serializable(ultimo_resultado_analise)
    gene_info = _to_serializable(gene_info)
    return jsonify(gene_info)

@app.route('/dados-analise', methods=['GET'])
def dados_analise():
    if not ultimo_resultado_analise:
        return jsonify({"error": "Nenhuma análise foi realizada ainda"}), 404
    return jsonify(_to_serializable(ultimo_resultado_analise))

@app.route('/resumo-analise', methods=['GET'])
def resumo_analise():
    if not ultimo_resultado_analise:
        return jsonify({"error": "Nenhuma análise foi realizada ainda"}), 404
    texto = ultimo_resultado_analise.get("relatorio_texto")
    if not texto:
        return jsonify({"status": "pendente", "hint": "Execute /buscar-pkd1 primeiro"})
    return jsonify({"relatorio_texto": texto})

if __name__ == '__main__':
    print("🧬 Servidor de Análise Genética rodando em http://localhost:5000/buscar-pkd1")
    app.run(host='0.0.0.0', port=5000, debug=True)
