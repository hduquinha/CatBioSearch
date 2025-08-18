# 🧬 CatBioSearch - Back-end FASTA (Service de Análise Genética)

Este módulo do **CatBioSearch** é responsável pelas operações bioinformáticas envolvendo o **gene PKD1** em gatos da raça Persa.
Seu objetivo principal é:

* 📂 Processar arquivos FASTA enviados pelas clínicas
* 🧪 Localizar automaticamente o **gene PKD1**
* 🔬 Realizar alinhamento da sequência recebida com a sequência de referência
* 🧬 Extrair e retornar a sequência do **exon29** para posterior análise de mutações

---

## 📌 Visão Geral

O serviço é construído sobre a biblioteca **Biopython** e implementa as funções necessárias para:

1. **Ler arquivos FASTA**
2. **Identificar o gene PKD1** dentro da sequência recebida
3. **Alinhar a sequência recebida** com a sequência de referência armazenada
4. **Extrair o exon29** para análises adicionais (ex: IA de classificação de mutações)

---

## ⚙️ Requisitos

* [Python 3.10+](https://www.python.org/)
* [Biopython](https://biopython.org/)

Instale as dependências com:

```bash
pip install -r requirements.txt
```

---

# 📡 Documentação das Funções do Service

---

## 🔎 Função: `localizar_pkd1(fasta_file)`

**Descrição:**
Recebe um arquivo FASTA e identifica o **gene PKD1** na sequência.

### Parâmetros

* `fasta_file` → Caminho do arquivo FASTA enviado.

### Retorno

```json
{
  "gene": "PKD1",
  "sequencia": "ATGCTAGCTAGCTGACT..."
}
```

---

## 🔬 Função: `alinhar_com_referencia(seq_entrada, seq_referencia)`

**Descrição:**
Realiza o alinhamento da sequência enviada (`seq_entrada`) com a sequência de referência (`seq_referencia`) do gene PKD1 usando **PairwiseAligner** do Biopython.

### Parâmetros

* `seq_entrada` → Sequência recebida do arquivo FASTA.
* `seq_referencia` → Sequência de referência do gene PKD1.

### Retorno

```json
{
  "score": 0.95,
  "alinhamento": "ATGCTAGC---TAGCTGACT..."
}
```

---

## 🧬 Função: `extrair_exon29(seq_alinhada)`

**Descrição:**
Localiza e extrai a região correspondente ao **exon29** do gene PKD1.
Esse trecho é crítico para análises de mutações.

### Parâmetros

* `seq_alinhada` → Sequência alinhada com a referência PKD1.

### Retorno

```json
{
  "exon29": "ATGCTAGCTAGCTGACT..."
}
```

---

# 🧪 Fluxo de Funcionamento

1. 📂 **Recebimento do arquivo FASTA**
2. 🔎 `localizar_pkd1()` → Localiza a região do gene PKD1
3. 🔬 `alinhar_com_referencia()` → Compara a sequência com a referência
4. 🧬 `extrair_exon29()` → Isola o exon29 para análise
5. 📊 Retorna os dados: gene localizado, score do alinhamento e sequência do exon29

---

# 📂 Exemplo Completo de Requisição → Resposta

### Entrada

```json
{
  "fasta": "ATGCTAGCTAGCTGACT..."
}
```

### Saída

```json
{
  "gene": "PKD1",
  "exon29": "ATGCTAGCTAGCTGACT...",
  "score": 0.94
}
```

---

# 📈 Possíveis Aplicações

* Integração com modelos de IA para prever mutações no exon29
* Armazenamento de resultados em banco de dados para relatórios
* Visualização de scores de alinhamento e probabilidades de mutação em dashboards

---

# 📝 Observações Técnicas

* O serviço aceita arquivos FASTA com **genes completos ou fragmentos cortados**
* O alinhamento é **semi-global**, permitindo identificar o exon29 mesmo se estiver em posições diferentes na sequência enviada
* Os scores retornados pelo alinhamento indicam **percentual de similaridade** com a referência

---

# 📜 Licença

Este módulo faz parte do projeto **CatBioSearch** e está sob a licença **MIT**.
Uso livre para fins acadêmicos, de pesquisa e desenvolvimento.

---

# 💡 Resumo do Service

Este service tem como foco **processar arquivos FASTA de gatos Persa** para:

* Localizar o **gene PKD1**
* Alinhar a sequência recebida com a referência oficial
* Extrair a região do **exon29** para análises genéticas
* Retornar **score de alinhamento** e **sequência do exon29**

Ele é o núcleo de análise genética do **CatBioSearch**, permitindo que o front-end ou outras ferramentas consumam os dados para geração de relatórios ou classificação de mutações.

---

# 🧩 Fluxo Visual (ASCII)

```
FASTA enviado
      |
      v
localizar_pkd1() → encontra PKD1
      |
      v
alinhar_com_referencia() → score e alinhamento
      |
      v
extrair_exon29() → sequência do exon29
      |
      v
retorno final JSON → {gene, exon29, score}
```

---

# 📌 Como Usar

1. Prepare um arquivo FASTA da amostra do gato
2. Chame `localizar_pkd1(fasta_file)` para identificar o gene
3. Alinhe com `alinhar_com_referencia(seq_entrada, seq_referencia)`
4. Extraia o exon29 com `extrair_exon29(seq_alinhada)`
5. Utilize o JSON retornado para análises ou integração com IA

---

# 🔧 Dicas de Implementação

* Mantenha a sequência de referência PKD1 atualizada na pasta de referência
* Certifique-se de que os arquivos FASTA estejam no formato correto
* Use ambientes virtuais para evitar conflitos de dependência Python
* O serviço é modular: você pode chamar cada função individualmente ou criar pipelines automáticos
