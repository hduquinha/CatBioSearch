import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

def extrair_features(sequencia):
    """Extrai features simples de uma sequência de DNA"""
    bases = ['A', 'C', 'G', 'T']
    features = {}
    sequencia = sequencia.upper()

    for base in bases:
        features[f'freq_{base}'] = sequencia.count(base) / len(sequencia)

    features['len'] = len(sequencia)
    return features

# Carregando os dados
df = pd.read_csv("model/pkd1_exon29_variants.csv")  # Ex: colunas ['exon29', 'label']

# Extraindo features
X = df['sequence'].apply(extrair_features).apply(pd.Series)
y = df['label']

# Dividindo e treinando
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

# Avaliação
y_pred = clf.predict(X_test)
print(classification_report(y_test, y_pred))

# Salvando o modelo
joblib.dump(clf, "model/random_forest_model.pkl")
print("Modelo treinado e salvo com sucesso.")
