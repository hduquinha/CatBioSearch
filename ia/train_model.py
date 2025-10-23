import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

from utils import extrair_features, load_exon29_reference


def preparar_dados(df: pd.DataFrame, referencia: str) -> pd.DataFrame:
    features_lista = [extrair_features(seq, referencia=referencia) for seq in df["sequence"]]
    return pd.DataFrame(features_lista)


def main():
    df = pd.read_csv("model/pkd1_exon29_variants.csv")
    referencia = load_exon29_reference()

    X = preparar_dados(df, referencia)
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(n_estimators=250, random_state=42, max_depth=None)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    print(classification_report(y_test, y_pred))

    joblib.dump(clf, "model/random_forest_model.pkl")
    print("Modelo treinado e salvo com sucesso.")


if __name__ == "__main__":
    main()
