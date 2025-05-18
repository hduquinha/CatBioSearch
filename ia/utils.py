def extrair_features(sequencia):
    """Extrai features da sequência exon29"""
    bases = ['A', 'C', 'G', 'T']
    sequencia = sequencia.upper()
    features = {}

    for base in bases:
        features[f'freq_{base}'] = sequencia.count(base) / len(sequencia) if len(sequencia) > 0 else 0

    features['len'] = len(sequencia)
    return features
