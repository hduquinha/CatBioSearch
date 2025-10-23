import io
from typing import Dict, List, Tuple

from Bio import SeqIO
from Bio.Align import Alignment, PairwiseAligner
from Bio.Align import substitution_matrices

# Coordenadas aproximadas do exon29 no gene PKD1 de referência (em nucleotídeos)
EXON29_INICIO_REF = 9950
EXON29_FIM_REF = 10150

def _carregar_referencia(ref_path: str) -> str:
    with open(ref_path) as handle:
        return str(SeqIO.read(handle, "fasta").seq).upper()

def validar_sequencia(seq):
    """Valida sequências de DNA"""
    if not seq or len(seq) == 0:
        raise ValueError("Sequência vazia")
    return seq.upper()

def buscar_gene_pkd1(conteudo, ref_path: str = "ref/ref.fasta"):
    """Extrai sequência do gene PKD1 de arquivo FASTA.

    Tenta identificar o gene primeiro pelo cabeçalho. Caso não encontre,
    realiza um alinhamento rápido contra a referência para escolher o
    candidato com melhor similaridade.
    """
    try:
        fasta_io = io.StringIO("\n".join(conteudo))
        registros = list(SeqIO.parse(fasta_io, "fasta"))
        if not registros:
            return {"error": "Arquivo FASTA vazio ou inválido"}

        registros_pkd1 = [r for r in registros if "PKD1" in r.description.upper()]
        if registros_pkd1:
            selecionado = max(registros_pkd1, key=lambda r: len(r.seq))
            return {
                "cabecalho": selecionado.description,
                "sequencia": validar_sequencia(str(selecionado.seq)),
                "metadados": {
                    "metodo_identificacao": "descricao",
                    "total_registros": len(registros),
                },
            }

        referencia = _carregar_referencia(ref_path)
        aligner = PairwiseAligner()
        aligner.mode = "local"
        aligner.match_score = 2
        aligner.mismatch_score = -1
        aligner.open_gap_score = -5
        aligner.extend_gap_score = -1

        melhor_registro = None
        melhor_score = float("-inf")

        for registro in registros:
            try:
                seq = validar_sequencia(str(registro.seq))
            except ValueError:
                continue
            score = aligner.score(referencia, seq)
            if score > melhor_score:
                melhor_score = score
                melhor_registro = registro

        if melhor_registro is None:
            return {"error": "Gene PKD1 não encontrado no arquivo"}

        return {
            "cabecalho": melhor_registro.description,
            "sequencia": validar_sequencia(str(melhor_registro.seq)),
            "metadados": {
                "metodo_identificacao": "alinhamento",
                "score_identificacao": melhor_score,
                "total_registros": len(registros),
            },
        }

    except Exception as e:
        return {"error": f"Erro ao buscar gene: {str(e)}"}

def criar_matriz_dna():
    """Obtém uma matriz de substituição padrão para DNA.

    Observação: Evita APIs antigas/obsoletas criando a matriz via
    substitution_matrices.load("NUC.4.4").
    """
    try:
        return substitution_matrices.load("NUC.4.4")
    except Exception:
        # Fallback simples caso o load falhe no ambiente: usa escore match/mismatch
        # diretamente configurado no PairwiseAligner via match/mismatch_score
        return None

def calcular_identidade_por_blocos(alinhamento, referencia, sequencia):
    """Calcula a identidade (%) percorrendo os blocos alinhados.

    Evita depender de atributos potencialmente obsoletos (como target/query strings),
    usando as coordenadas em alinhamento.aligned contra as sequências originais.
    """
    matches = 0
    length = 0
    ref_blocks, query_blocks = alinhamento.aligned
    for (r0, r1), (q0, q1) in zip(ref_blocks, query_blocks):
        # Tamanho do bloco é igual em ref e query para alinhamento local sem gaps internos no bloco
        block_len = min(r1 - r0, q1 - q0)
        for i in range(block_len):
            if referencia[r0 + i] == sequencia[q0 + i]:
                matches += 1
        length += block_len
    return (matches / length) * 100 if length > 0 else 0

def _analisar_exon29(
    alinhamento: Alignment,
    referencia: str,
    sequencia_analisada: str,
) -> Tuple[str, List[Dict[str, object]], Dict[str, int]]:
    """Deriva sequência do exon29 na amostra e descreve variantes."""

    path = alinhamento.path
    if not path or len(path) < 2:
        return None, [], {
            "total_insercoes_nt": 0,
            "total_delecoes_nt": 0,
        }

    exon_seq: List[str] = []
    variantes: List[Dict[str, object]] = []
    total_ins_nt = 0
    total_del_nt = 0

    ref_pos, query_pos = path[0]
    for idx in range(len(path) - 1):
        prox_ref, prox_query = path[idx + 1]

        while ref_pos < prox_ref or query_pos < prox_query:
            dentro_exon = EXON29_INICIO_REF <= ref_pos < EXON29_FIM_REF

            if ref_pos < prox_ref and query_pos < prox_query:
                ref_base = referencia[ref_pos]
                query_base = sequencia_analisada[query_pos]
                if dentro_exon:
                    exon_seq.append(query_base)
                    if ref_base != query_base:
                        variantes.append({
                            "tipo": "substituicao",
                            "posicao_genomica": ref_pos + 1,
                            "posicao_exon": (ref_pos - EXON29_INICIO_REF) + 1,
                            "ref": ref_base,
                            "alt": query_base,
                        })
                ref_pos += 1
                query_pos += 1
            elif ref_pos < prox_ref:
                if dentro_exon:
                    variantes.append({
                        "tipo": "delecao",
                        "posicao_genomica": ref_pos + 1,
                        "posicao_exon": (ref_pos - EXON29_INICIO_REF) + 1,
                        "ref": referencia[ref_pos],
                        "alt": "-",
                        "tamanho": 1,
                    })
                    exon_seq.append("-")
                    total_del_nt += 1
                ref_pos += 1
            else:
                if dentro_exon:
                    variantes.append({
                        "tipo": "insercao",
                        "posicao_genomica": ref_pos + 1,
                        "posicao_exon": (ref_pos - EXON29_INICIO_REF) + 1,
                        "ref": "-",
                        "alt": sequencia_analisada[query_pos],
                        "tamanho": 1,
                    })
                    exon_seq.append(sequencia_analisada[query_pos])
                    total_ins_nt += 1
                query_pos += 1

    if not exon_seq:
        return None, variantes, {
            "total_insercoes_nt": total_ins_nt,
            "total_delecoes_nt": total_del_nt,
        }

    return "".join(exon_seq), variantes, {
        "total_insercoes_nt": total_ins_nt,
        "total_delecoes_nt": total_del_nt,
    }


def realizar_alinhamento_grande(sequencia, ref_path="ref/ref.fasta", progress_callback=None):
    """Executa alinhamento local com a referência completa"""
    try:
        sequencia = validar_sequencia(sequencia)
        if progress_callback:
            progress_callback(0.1, "Validando sequência...")

        referencia = _carregar_referencia(ref_path)

        aligner = PairwiseAligner()
        aligner.mode = 'local'
        matriz = criar_matriz_dna()
        if matriz is not None:
            aligner.substitution_matrix = matriz
        else:
            # Fallback: define escores simples direto no aligner
            aligner.match_score = 5
            aligner.mismatch_score = -4
        aligner.open_gap_score = -7
        aligner.extend_gap_score = -2

        if progress_callback:
            progress_callback(0.3, "Executando alinhamento completo...")

        # Materializa imediatamente todos os alinhamentos em lista para evitar comportamento
        # especial de objeto que causa ambiguidade em avaliação booleana.
        alignments = list(aligner.align(referencia, sequencia))
        total_aligns = len(alignments)

        if total_aligns == 0:
            return {
                "error": "Nenhum alinhamento significativo encontrado",
                "tamanhos": {
                    "consulta": len(sequencia),
                    "referencia": len(referencia)
                }
            }

        # Seleciona melhor alinhamento diretamente (já é lista)
        melhor = max(alignments, key=lambda x: x.score)

        exon29_amostra, variantes, info_variantes = _analisar_exon29(melhor, referencia, sequencia)
        exon29_referencia = referencia[EXON29_INICIO_REF:EXON29_FIM_REF]
        exon_len = len(exon29_referencia)
        if exon29_amostra:
            bases_validas_exon = [b for b in exon29_amostra if b not in {"-", ""}]
            cobertura = (len(bases_validas_exon) / exon_len) * 100 if exon_len > 0 else 0.0
            exon29_amostra_str = exon29_amostra
        else:
            cobertura = 0.0
            exon29_amostra_str = "Não foi possível localizar o exon29 na amostra analisada"

        if progress_callback:
            progress_callback(1.0, "Concluído")

        # Calcula identidade sem usar atributos obsoletos
        identidade = calcular_identidade_por_blocos(melhor, referencia, sequencia)

        # Deriva inícios/fins a partir dos blocos alinhados
        ref_blocks, query_blocks = melhor.aligned
        inicio_ref = int(ref_blocks[0][0]) if len(ref_blocks) > 0 else 0
        fim_ref = int(ref_blocks[-1][1]) if len(ref_blocks) > 0 else 0
        inicio_query = int(query_blocks[0][0]) if len(query_blocks) > 0 else 0
        fim_query = int(query_blocks[-1][1]) if len(query_blocks) > 0 else 0

        return {
            "sucesso": True,
            "melhor_alinhamento": {
                "score": float(melhor.score),
                "identidade": f"{identidade:.2f}%",
                "identidade_pct": float(identidade),
                "inicio_ref": inicio_ref,
                "fim_ref": fim_ref,
                "inicio_query": inicio_query,
                "fim_query": fim_query,
            },
            "tamanhos": {
                "consulta": len(sequencia),
                "referencia": len(referencia)
            },
            "exon29_amostra": exon29_amostra_str,
            "exon29_referencia": exon29_referencia,
            "variantes_exon29": variantes,
            "metricas_exon29": {
                "cobertura_pct": round(cobertura, 2),
                "total_variantes": len(variantes),
                "exon_disponivel": bool(exon29_amostra),
                **info_variantes,
            },
        }

    except Exception as e:
        return {
            "error": f"Erro no alinhamento: {str(e)}",
            "tamanhos": {
                "consulta": len(sequencia) if 'sequencia' in locals() else 0,
                "referencia": len(referencia) if 'referencia' in locals() else 0
            }
        }
