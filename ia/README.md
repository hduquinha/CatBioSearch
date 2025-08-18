# 🧠 CatBioSearch - IA (Random Forest)

Este módulo do **CatBioSearch** é responsável por analisar sequências do **exon29 do gene PKD1** e prever a presença de mutações utilizando **Random Forest**.

Ele serve como complemento do back-end FASTA, permitindo que as sequências extraídas sejam classificadas automaticamente.

---

## 📌 Visão Geral

O módulo de IA possui duas funcionalidades principais:

1. **Treinamento do modelo Random Forest**

   * Recebe dados históricos de sequências e mutações conhecidas
   * Treina o modelo para identificar padrões genéticos associados à **policistose renal (PKD)**

2. **Execução do modelo**

   * Recebe uma sequência de exon29 em JSON
   * Retorna a probabilidade da presença de mutação
   * Pode ser integrado diretamente ao front-end ou ao pipeline de análise de FASTA

---

## ⚙️ Requisitos

* [Python 3.10+](https://www.python.org/)
* [scikit-learn](https://scikit-learn.org/)
* [pandas](https://pandas.pydata.org/)
* [numpy](https://numpy.org/)

Instale as dependências com:

```bash
pip install -r requirements.txt
```

---

# 📡 Endpoints / Requisições

## 1️⃣ Treinamento do modelo

**POST** `/ia/train`

### Requisição

```json
{
  "dataset": "caminho/para/dataset.csv",
  "target": "mutacao",
  "features": ["feature1", "feature2", "feature3"]
}
```

### Resposta

```json
{
  "message": "Modelo Random Forest treinado com sucesso",
  "accuracy": 0.92,
  "model_path": "models/random_forest.pkl"
}
```

---

## 2️⃣ Execução / Predição do modelo

**POST** `/ia/predict`

### Requisição

```json
{
  "exon29": "ATGCTAGCTAGCTGACT..."
}
```

### Resposta

```json
{
  "prediction": "mutacao_presente",
  "probability": 0.87
}
```

---

# 🧩 Fluxo de Funcionamento

1. Sequência de exon29 enviada via API
2. Caso seja treinamento, dados históricos são utilizados para treinar o modelo (`/ia/train`)
3. Caso seja predição, sequência é analisada pelo modelo treinado (`/ia/predict`)
4. Resultado retorna **classe prevista** e **probabilidade de mutação**

---

# 📌 Observações

* Os modelos treinados são salvos na pasta `models/`
* É recomendável treinar o modelo periodicamente com novos dados para manter a acurácia
* Suporta integração direta com o service de FASTA para análise automatizada de novas amostras

---

# 📜 Licença

Este módulo faz parte do projeto **CatBioSearch** e está sob a licença **MIT**.
Uso livre para fins acadêmicos, de pesquisa e desenvolvimento.
