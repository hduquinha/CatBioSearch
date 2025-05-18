from Bio import SeqIO
from Bio.Align import PairwiseAligner
from Bio.Align import substitution_matrices

# Coordenadas aproximadas do exon29 no gene PKD1 de referência (em nucleotídeos)
EXON29_INICIO_REF = 9950
EXON29_FIM_REF = 10150

def validar_sequencia(seq):
    """Valida sequências de DNA"""
    if not seq or len(seq) == 0:
        raise ValueError("Sequência vazia")
    return seq.upper()

def buscar_gene_pkd1(conteudo):
    """Extrai sequência do gene PKD1 de arquivo FASTA"""
    try:
        cabecalho = ''
        sequencias = []
        gene_encontrado = False

        for linha in conteudo:
            linha = linha.strip()
            if linha.startswith('>'):
                if gene_encontrado:
                    break
                if 'PKD1' in linha.upper():
                    cabecalho = linha
                    gene_encontrado = True
            elif gene_encontrado:
                sequencias.append(linha)

        if not gene_encontrado:
            return {"error": "Gene PKD1 não encontrado no arquivo"}

        sequencia = ''.join(sequencias)
        return {
            'cabecalho': cabecalho,
            'sequencia': validar_sequencia(sequencia)
        }

    except Exception as e:
        return {"error": f"Erro ao buscar gene: {str(e)}"}

def criar_matriz_dna():
    """Cria matriz de substituição para DNA"""
    matriz = substitution_matrices.Array('ACGT', dims=2)
    for i, a in enumerate('ACGT'):
        for j, b in enumerate('ACGT'):
            matriz[i, j] = 5 if a == b else -4
    return matriz

def calcular_identidade(alinhamento):
    """Calcula porcentagem de identidade"""
    matches = length = 0
    for ref, query in zip(alinhamento.target, alinhamento.query):
        if ref != '-' and query != '-':
            length += 1
            if ref == query:
                matches += 1
    return (matches / length) * 100 if length > 0 else 0

def extrair_exon29_da_amostra(alinhamento, referencia, sequencia_analisada):
    """Extrai a sequência da amostra que se alinha ao exon29 da referência"""
    ref_blocks = alinhamento.aligned[0]  # blocos na referência
    query_blocks = alinhamento.aligned[1]  # blocos na amostra

    # Percorre os blocos alinhados procurando interseção com exon29
    for (ref_start, ref_end), (query_start, query_end) in zip(ref_blocks, query_blocks):
        if ref_start <= EXON29_INICIO_REF < ref_end or ref_start < EXON29_FIM_REF <= ref_end or (
            EXON29_INICIO_REF <= ref_start and ref_end <= EXON29_FIM_REF
        ):
            # Calcula os limites do trecho correspondente na query
            exon_inicio_query = query_start + (EXON29_INICIO_REF - ref_start) if ref_start < EXON29_INICIO_REF else query_start
            exon_fim_query = query_start + (EXON29_FIM_REF - ref_start) if ref_start < EXON29_FIM_REF else query_end

            # Garante que os índices não extrapolem os limites da sequência analisada
            exon_inicio_query = max(0, exon_inicio_query)
            exon_fim_query = min(len(sequencia_analisada), exon_fim_query)

            return sequencia_analisada[exon_inicio_query:exon_fim_query]

    return "Não foi possível localizar o exon29 na amostra analisada"


def realizar_alinhamento_grande(sequencia, ref_path="ref/ref.fasta", progress_callback=None):
    """Executa alinhamento local com a referência completa"""
    try:
        sequencia = validar_sequencia(sequencia)
        if progress_callback:
            progress_callback(0.1, "Validando sequência...")

        with open(ref_path) as handle:
            referencia = str(SeqIO.read(handle, "fasta").seq).upper()

        aligner = PairwiseAligner()
        aligner.mode = 'local'
        aligner.substitution_matrix = criar_matriz_dna()
        aligner.open_gap_score = -7
        aligner.extend_gap_score = -2

        if progress_callback:
            progress_callback(0.3, "Executando alinhamento completo...")

        alignments = aligner.align(referencia, sequencia)

        if not alignments:
            return {
                "error": "Nenhum alinhamento significativo encontrado",
                "tamanhos": {
                    "consulta": len(sequencia),
                    "referencia": len(referencia)
                }
            }

        melhor = max(alignments, key=lambda x: x.score)

        exon29_amostra = extrair_exon29_da_amostra(melhor, referencia, sequencia)

        if progress_callback:
            progress_callback(1.0, "Concluído")

        return {
            "sucesso": True,
            "melhor_alinhamento": {
                "score": float(melhor.score),
                "identidade": f"{calcular_identidade(melhor):.2f}%",
                "inicio_ref": int(melhor.path[0][0]),
                "fim_ref": int(melhor.path[-1][0]),
                "inicio_query": int(melhor.path[0][1]),
                "fim_query": int(melhor.path[-1][1])
            },
            "tamanhos": {
                "consulta": len(sequencia),
                "referencia": len(referencia)
            },
            "exon29_amostra": exon29_amostra
        }

    except Exception as e:
        return {
            "error": f"Erro no alinhamento: {str(e)}",
            "tamanhos": {
                "consulta": len(sequencia) if 'sequencia' in locals() else 0,
                "referencia": len(referencia) if 'referencia' in locals() else 0
            }
        }
