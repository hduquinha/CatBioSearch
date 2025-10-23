from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from Bio.Align import Alignment, PairwiseAligner

TRANSITIONS = {("A", "G"), ("G", "A"), ("C", "T"), ("T", "C")}


def _normalizar_sequencia(seq: Optional[str]) -> str:
    if not seq:
        return ""
    return "".join(seq.upper().split())


def load_exon29_reference(path: str = "model/pkd1_exon29_reference.fasta") -> str:
    ref_path = Path(path)
    if not ref_path.exists():
        raise FileNotFoundError(f"Arquivo de referência não encontrado em {ref_path}")
    return _normalizar_sequencia(ref_path.read_text())


def _alinhar_para_variantes(referencia: str, sequencia: str) -> Tuple[List[Dict[str, object]], float, Dict[str, int]]:
    aligner = PairwiseAligner()
    aligner.mode = "global"
    aligner.match_score = 2
    aligner.mismatch_score = -1
    aligner.open_gap_score = -2
    aligner.extend_gap_score = -0.5

    alignment: Alignment = aligner.align(referencia, sequencia)[0]
    path = alignment.path
    if not path or len(path) < 2:
        return [], 0.0, {"total_insercoes_nt": 0, "total_delecoes_nt": 0}

    variantes: List[Dict[str, object]] = []
    total_ins_nt = 0
    total_del_nt = 0
    matches = 0
    comparacoes = 0

    ref_pos, query_pos = path[0]
    for idx in range(len(path) - 1):
        prox_ref, prox_query = path[idx + 1]

        while ref_pos < prox_ref or query_pos < prox_query:
            if ref_pos < prox_ref and query_pos < prox_query:
                ref_base = referencia[ref_pos]
                query_base = sequencia[query_pos]
                comparacoes += 1
                if ref_base == query_base:
                    matches += 1
                else:
                    variantes.append({
                        "tipo": "substituicao",
                        "posicao_exon": ref_pos + 1,
                        "ref": ref_base,
                        "alt": query_base,
                    })
                ref_pos += 1
                query_pos += 1
            elif ref_pos < prox_ref:
                variantes.append({
                    "tipo": "delecao",
                    "posicao_exon": ref_pos + 1,
                    "ref": referencia[ref_pos],
                    "alt": "-",
                    "tamanho": 1,
                })
                total_del_nt += 1
                ref_pos += 1
            else:
                variantes.append({
                    "tipo": "insercao",
                    "posicao_exon": max(ref_pos, 0) + 1,
                    "ref": "-",
                    "alt": sequencia[query_pos],
                    "tamanho": 1,
                })
                total_ins_nt += 1
                query_pos += 1

    identidade = (matches / comparacoes) * 100 if comparacoes > 0 else 0.0
    return variantes, identidade, {
        "total_insercoes_nt": total_ins_nt,
        "total_delecoes_nt": total_del_nt,
    }


def _contabilizar_variantes(variantes: Iterable[Dict[str, object]]) -> Dict[str, float]:
    mismatch_count = 0
    transitions = 0
    transversions = 0
    insertion_count = 0
    deletion_count = 0
    ins_nt = 0
    del_nt = 0

    for variante in variantes or []:
        tipo = str(variante.get("tipo", "")).lower()
        tamanho = int(variante.get("tamanho", 1))
        if tipo == "substituicao":
            mismatch_count += 1
            ref_base = str(variante.get("ref", "")).upper()
            alt_base = str(variante.get("alt", "")).upper()
            if (ref_base, alt_base) in TRANSITIONS:
                transitions += 1
            elif ref_base in "ACGT" and alt_base in "ACGT":
                transversions += 1
        elif tipo == "insercao":
            insertion_count += 1
            ins_nt += max(1, tamanho)
        elif tipo == "delecao":
            deletion_count += 1
            del_nt += max(1, tamanho)

    return {
        "mismatch_count": mismatch_count,
        "transitions": transitions,
        "transversions": transversions,
        "insertion_count": insertion_count,
        "deletion_count": deletion_count,
        "ins_nt": ins_nt,
        "del_nt": del_nt,
    }


def extrair_features(
    sequencia: Optional[str],
    *,
    referencia: Optional[str] = None,
    variantes: Optional[List[Dict[str, object]]] = None,
    identidade: Optional[float] = None,
    metricas: Optional[Dict[str, object]] = None,
) -> Dict[str, float]:
    """Extrai features estruturadas para o classificador."""

    seq_normalizada = _normalizar_sequencia(sequencia)
    referencia_norm = _normalizar_sequencia(referencia)

    bases_validas = [b for b in seq_normalizada if b in "ACGT"]
    len_nt = len(bases_validas)

    features: Dict[str, float] = {
        "len_nt": float(len_nt),
    }

    for base in "ACGT":
        features[f"freq_{base}"] = (seq_normalizada.count(base) / len_nt) if len_nt else 0.0

    gc = seq_normalizada.count("G") + seq_normalizada.count("C")
    features["gc_content"] = (gc / len_nt) if len_nt else 0.0
    features["at_content"] = 1.0 - features["gc_content"] if len_nt else 0.0

    referencia_len = len(referencia_norm) if referencia_norm else len_nt
    analise_variantes = None

    if variantes is None and referencia_norm:
        variantes, identidade_calculada, info = _alinhar_para_variantes(referencia_norm, seq_normalizada)
        identidade = identidade or identidade_calculada
        analise_variantes = info
    elif referencia_norm:
        analise_variantes = {
            "total_insercoes_nt": 0,
            "total_delecoes_nt": 0,
        }

    estatisticas = _contabilizar_variantes(variantes or [])
    ins_nt = estatisticas["ins_nt"]
    del_nt = estatisticas["del_nt"]

    if analise_variantes is not None:
        ins_nt = analise_variantes.get("total_insercoes_nt", ins_nt)
        del_nt = analise_variantes.get("total_delecoes_nt", del_nt)

    total_gaps = ins_nt + del_nt
    mismatch_count = estatisticas["mismatch_count"]

    features.update({
        "identity_pct": float(identidade) if identidade is not None else 0.0,
        "mismatch_count": float(mismatch_count),
        "mismatch_density": (mismatch_count / referencia_len) if referencia_len else 0.0,
        "transition_ratio": (estatisticas["transitions"] / mismatch_count) if mismatch_count else 0.0,
        "transversion_ratio": (estatisticas["transversions"] / mismatch_count) if mismatch_count else 0.0,
        "insertion_count": float(estatisticas["insertion_count"]),
        "deletion_count": float(estatisticas["deletion_count"]),
        "gap_density": (total_gaps / referencia_len) if referencia_len else 0.0,
        "frameshift_flag": 1.0 if ((ins_nt - del_nt) % 3) else 0.0,
        "coverage_pct": float(metricas.get("cobertura_pct", 0.0)) if metricas else ((len_nt / referencia_len) * 100 if referencia_len else 0.0),
        "length_delta": float(len_nt - referencia_len),
        "is_length_deviation": 1.0 if referencia_len and len_nt != referencia_len else 0.0,
        "transitions": float(estatisticas["transitions"]),
        "transversions": float(estatisticas["transversions"]),
    })

    return features
