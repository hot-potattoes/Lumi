<p align="center">
  <img src="assets/social-card.png" alt="LUMI — Lightweight Unified Markup Interface" width="640">
</p>


> **Escreva menos, faça mais.**  
> Uma linguagem de marcação leve que compila para HTML.

---

## Índice

1. [O que é Lumi?](#o-que-é-lumi)
2. [Instalação](#instalação)
   - [LumiC (CLI)](#lumic-cli)
   - [LumiJS (Navegador)](#lumijs-navegador)
3. [Início Rápido](#início-rápido)
   - [Via linha de comando](#via-linha-de-comando)
   - [Via navegador](#via-navegador)
4. [Referência da Linguagem](#referência-da-linguagem)
   - [Diretivas Meta](#diretivas-meta-)
   - [Títulos](#títulos)
   - [Parágrafos](#parágrafos)
   - [Ênfases Inline](#ênfases-inline)
   - [Listas](#listas)
   - [Tabelas](#tabelas)
   - [Citações em Bloco](#citações-em-bloco)
   - [Blocos de Código](#blocos-de-código)
   - [Notas de Rodapé](#notas-de-rodapé)
   - [Regra Horizontal](#regra-horizontal)
   - [Links](#links)
5. [Uso da Ferramenta (CLI)](#uso-da-ferramenta-cli)
6. [LumiJS — Compilador para Navegador](#lumijs--compilador-para-navegador)
7. [Guia do Desenvolvedor](#guia-do-desenvolvedor)

---

## O que é Lumi?

Lumi (`.lm`) é uma linguagem de marcação de texto simples, projetada para ser
**fácil de ler e escrever** em qualquer editor de texto. Um arquivo `.lm` é
compilado em um documento HTML completo, seja via ferramenta de linha de comando
(`lumic`) ou diretamente no navegador (`LumiJS`).

**Comparação rápida:**

```
<!-- HTML original (lorem-ipsum.html) -->
<p>
  Lorem ipsum <strong>NEGRITO</strong> e
  <em>itálico</em> com <mark>destaque</mark>.
  Nota<sup id="ref1"><a href="#nota1">[1]</a></sup>.
</p>
```

```
# Lumi equivalente
Lorem ipsum **NEGRITO** e _itálico_ com ==destaque==. Nota^[1].
```

Lumi não substitui HTML — ela **gera** HTML. Você ainda usa as mesmas folhas
de estilo CSS, fontes e estrutura que já conhece.

---

## Instalação

### LumiC (CLI)

#### Requisitos

- Compilador C++17 (`g++` ≥ 7 ou `clang++` ≥ 5)
- `make`

#### Compilar o lumic

```bash
git clone https://github.com/hot-potattoes/Lumi
cd Lumi/lumic
make
```

O executável `lumic` será criado no diretório `lumic/`.

#### Instalação global (opcional)

```bash
sudo make install     # copia lumic para /usr/local/bin
```

### LumiJS (Navegador)

Nenhuma instalação é necessária. Basta incluir o script na página HTML:

```html
<script src="https://cdn.jsdelivr.net/gh/hot-potattoes/Lumi@main/lumi-js/lumi-js.js"></script>
```

Ou baixe o arquivo `lumi-js/lumi-js.js` do repositório e referencie localmente.

---

## Início Rápido

### Via linha de comando

Crie `meu-doc.lm`:

```
@title: Meu Primeiro Documento
@lang: pt-BR
@font: Roboto
@css: styles/main.css

# Olá, Lumi!

Este é meu **primeiro** documento em Lumi.
_Simples_, rápido e limpo.

- Item um
- Item dois
- Item três
```

Compile:

```bash
./lumic meu-doc.lm -o meu-doc.html
```

Abra `meu-doc.html` no navegador. Pronto.

### Via navegador

Crie `index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="lumi-js/lumi-js.js"></script>
</head>
<body>
  <lumi-doc src="meu-doc.lm"></lumi-doc>
</body>
</html>
```

Abra `index.html` no navegador. O documento Lumi será compilado e renderizado
automaticamente, sem necessidade de pré-compilação.

---

## Referência da Linguagem

### Diretivas Meta (`@`)

As diretivas meta ficam no **início do arquivo**, antes de qualquer conteúdo.
Cada diretiva ocupa uma linha no formato `@chave: valor`.

| Diretiva          | Descrição                                        | Padrão       |
|-------------------|--------------------------------------------------|--------------|
| `@title: Texto`   | Define o `<title>` do documento                  | `Documento`  |
| `@lang: código`   | Define o atributo `lang` do `<html>`             | `pt-BR`      |
| `@font: Nome`     | Carrega a fonte do Google Fonts                  | *(nenhuma)*  |
| `@css: caminho`   | Adiciona um `<link rel="stylesheet">` (repetível)| *(nenhuma)*  |

**Exemplo:**

```
@title: Relatório Trimestral
@lang: pt-BR
@font: Roboto
@css: styles/reset.css
@css: styles/main.css
```

Múltiplas diretivas `@css:` geram múltiplos `<link>` na mesma ordem.

---

### Títulos

Prefixe com `#` (um a seis) seguido de um espaço.

```
# Título H1
## Título H2
### Título H3
#### Título H4
##### Título H5
###### Título H6
```

---

### Parágrafos

Linhas consecutivas não-vazias e sem prefixo especial formam um parágrafo.
Uma **linha em branco** separa parágrafos.

```
Este é o primeiro parágrafo. Pode ocupar
várias linhas — elas serão unidas.

Este é o segundo parágrafo.
```

Gera:

```html
<p>Este é o primeiro parágrafo. Pode ocupar várias linhas — elas serão unidas.</p>
<p>Este é o segundo parágrafo.</p>
```

---

### Ênfases Inline

Todos os elementos inline podem ser **aninhados**.

| Sintaxe Lumi        | HTML gerado               | Uso                          |
|---------------------|---------------------------|------------------------------|
| `**texto**`         | `<strong>texto</strong>`  | Negrito / importância        |
| `_texto_`           | `<em>texto</em>`          | Itálico / ênfase             |
| `==texto==`         | `<mark>texto</mark>`      | Destaque / marcador          |
| `~~texto~~`         | `<del>texto</del>`        | Tachado / removido           |
| `` `código` ``      | `<code>código</code>`     | Código inline                |
| `@@título@@`        | `<cite>título</cite>`     | Título de obra / citação     |
| `??termo??`         | `<dfn>termo</dfn>`        | Definição de termo técnico   |

**Exemplos:**

```
O campo **obrigatório** é o _nome do usuário_.

Use ==atenção especial== neste trecho.

O método ~~antigo~~ foi substituído.

Execute `npm install` antes de continuar.

Leia @@O Senhor dos Anéis@@ para referência.

O ??hash?? é uma função de mapeamento.
```

#### Aninhamento

```
**_negrito e itálico_**         → <strong><em>negrito e itálico</em></strong>
**texto com ==destaque==**      → <strong>texto com <mark>destaque</mark></strong>
_texto com `código`_            → <em>texto com <code>código</code></em>
```

#### Observação sobre `_` em nomes compostos

O `_` para itálico só é reconhecido quando **não está no interior de uma
palavra**. Portanto, `snake_case` ou `__init__` não são afetados.

---

### Listas

#### Não Ordenada

Prefixe cada item com `- ` ou `* `:

```
- Maecenas congue
- Ligula ac quam
- Convallis pretium
```

Gera `<ul>` com `<li>` para cada item. O CSS do projeto já cuida do estilo.

#### Ordenada

Prefixe com `1. `, `2. `, etc.:

```
1. Primeiro passo
2. Segundo passo
3. Terceiro passo
```

Gera `<ol>` com `<li>`. Os números no Lumi são apenas indicativos — o HTML
renderiza a sequência correta de qualquer forma.

#### Ênfase dentro de itens

```
- Item com **negrito** e _itálico_
- Item com ==destaque==
```

---

### Tabelas

```
| Cabeçalho 1 | Cabeçalho 2 |
|-------------|-------------|
| Dado A      | 10          |
| Dado B      | 20          |
|= **Total**  | **30**      |
```

**Regras:**

| Sintaxe                    | Função                                |
|----------------------------|---------------------------------------|
| Primeira(s) linha(s) antes de `|---|` | `<thead>` com `<th>` |
| Linha `|---|---|`          | Separador (não aparece no HTML)       |
| Linhas após o separador    | `<tbody>` com `<td>`                  |
| Linha começando com `\|=`  | `<tfoot>` com `<td>` (rodapé)         |

O separador pode usar `:` para indicar alinhamento (suporte visual no editor,
ignorado pelo compilador):

```
| Esquerda | Centro  | Direita |
|:---------|:-------:|--------:|
| A        | B       | C       |
```

---

### Citações em Bloco

Prefixe linhas com `> `:

```
> Esta é uma citação importante.
> Pode ter múltiplas linhas.
```

Gera:

```html
<blockquote>
  <p>Esta é uma citação importante.</p>
  <p>Pode ter múltiplas linhas.</p>
</blockquote>
```

Ênfases inline funcionam normalmente dentro do bloco:

```
> Segundo **Dijkstra**, _a recursão é elegante_.
```

---

### Blocos de Código

Cerque o código com três crases. Opcionalmente, informe a linguagem logo após
as crases de abertura (para syntax highlighting com bibliotecas como Prism.js):

````
```python
def hello(name: str) -> str:
    return f"Olá, {name}!"
```
````

Gera:

```html
<pre><code class="language-python">def hello(name: str) -> str:
    return f"Olá, {name}!"
</code></pre>
```

Todo o conteúdo do bloco é tratado como texto literal (sem processamento inline).
Caracteres especiais de HTML (`<`, `>`, `&`) são escapados automaticamente.

---

### Notas de Rodapé

O sistema de notas usa dois componentes: a **referência** inline e a
**definição** em qualquer lugar do documento (por convenção, no final).

#### Referência inline

```
Donec a diam^[1] lectus.
```

Gera:

```html
Donec a diam<sup id="ref1"><a href="#nota1">[1]</a></sup> lectus.
```

#### Definição

```
[^1]: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
```

As definições são coletadas e emitidas automaticamente em um bloco `<footer>`
no final do documento, ordenadas por número. Cada nota inclui um link de
retorno (↩) para a referência original.

**Exemplo completo:**

```
O experimento^[1] mostrou resultados surpreendentes^[2].

[^1]: Realizado em condições controladas de laboratório.
[^2]: Ver tabela de resultados na seção 3.
```

---

### Regra Horizontal

Qualquer linha contendo apenas `---`, `***` ou `___` gera um `<hr>`:

```
---
```

---

### Links

```
[Texto do link](https://exemplo.com)
```

Gera:

```html
<a href="https://exemplo.com">Texto do link</a>
```

Ênfases inline funcionam dentro do texto do link:

```
[Visite o **site oficial**](https://exemplo.com)
```

---

## Uso da Ferramenta (CLI)

```
lumic <entrada.lm> [opções]
```

### Opções

| Flag                      | Descrição                                                   |
|---------------------------|-------------------------------------------------------------|
| `-o <arquivo>`            | Arquivo de saída. Sem esta flag, escreve na saída padrão.   |
| `--css <caminho>`         | Substitui/acrescenta um `<link>` externo para o CSS.         |
| `--inline-css <caminho>`  | Lê o arquivo CSS e emite o conteúdo em uma tag `<style>`.   |
| `-h`, `--help`            | Exibe a ajuda e sai.                                        |

`--css` e `--inline-css` são **mutuamente exclusivos**. Ambos **sobrescrevem**
quaisquer diretivas `@css:` presentes no arquivo fonte.

### Exemplos

```bash
# Compilar para stdout
lumic doc.lm

# Compilar para arquivo
lumic doc.lm -o doc.html

# Usar CSS externo (link no <head>)
lumic doc.lm -o doc.html --css styles/main.css

# Embutir CSS no próprio HTML (documento portátil, sem dependências)
lumic doc.lm -o doc.html --inline-css styles/main.css

# Compilar todos os exemplos
make examples
```

### Saída de erro

Erros são escritos em `stderr`. O código de saída é `0` em caso de sucesso e
`1` em caso de erro.

---

## LumiJS — Compilador para Navegador

LumiJS é a implementação JavaScript do compilador Lumi, localizada no diretório
`lumi-js/` do repositório. Permite renderizar documentos `.lm` diretamente no
navegador, sem etapa de pré-compilação, através do Web Component `<lumi-doc>`.

### Uso básico

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="lumi-js/lumi-js.js"></script>
</head>
<body>
  <lumi-doc src="documento.lm"></lumi-doc>
</body>
</html>
```

O elemento `<lumi-doc>` carrega o arquivo `.lm`, compila para HTML e renderiza
no lugar do conteúdo da página.

### Conteúdo inline

Também é possível escrever Lumi diretamente dentro da tag:

```html
<lumi-doc>
@title: Documento Inline

# Título
Conteúdo **Lumi** dentro do HTML.
</lumi-doc>
```

### Uso programático

O compilador pode ser usado diretamente via JavaScript:

```javascript
const compiler = new LumiCompiler();
const { title, lang, headElements, body } = compiler.compile(`
@title: Teste
# Olá
Isso é um **teste**.
`);

console.log(body);
// <h1>Olá</h1>
// <p>Isso é um <strong>teste</strong>.</p>
```

### Meta-diretivas no navegador

As diretivas `@title` e `@lang` atualizam a página automaticamente.
`@font` e `@css` injetam os recursos no `<head>` do documento.

### Diferenças entre LumiC e LumiJS

| Característica       | LumiC (C++)              | LumiJS (JavaScript)       |
|----------------------|--------------------------|---------------------------|
| Localização          | `lumic/src/`             | `lumi-js/`                |
| Ambiente             | Linha de comando         | Navegador                 |
| Pré-compilação       | Necessária               | Não necessária            |
| Saída                | Arquivo `.html`          | DOM renderizado           |
| Dependências         | C++17                    | Nenhuma                   |
| Sintaxe suportada    | Completa                 | Completa                  |

Para documentação detalhada, consulte o [README do LumiJS](lumi-js/README.md).

---

## Guia do Desenvolvedor

### Visão Geral da Arquitetura

```
Lumi/
├── lumic/                  Compilador C++ (CLI)
│   └── src/
│       ├── compiler.h      Interface pública da classe LumiCompiler
│       ├── compiler.cpp    Implementação do compilador
│       └── main.cpp        Ponto de entrada e parsing da CLI
├── lumi-js/                Compilador JavaScript (Navegador)
│   ├── lumi-js.js          Compilador + Web Component
│   └── README.md           Documentação do LumiJS
├── styles/                 Folhas de estilo
├── examples/               Documentos de exemplo
└── assets/                 Imagens e recursos
```

### Pipeline de Compilação (LumiC)

```
Fonte .lm
    │
    ▼
splitLines()        Divide o texto em linhas (normaliza \r\n)
    │
    ▼
parseMeta()         Consome diretivas @key: value do início do arquivo
    │               Preenche: m_title, m_lang, m_font, m_cssLinks
    ▼
processBlocks()     Máquina de estados que itera linha a linha
    │               Produz HTML dos elementos de bloco
    │               Chama processInline() para cada linha de texto
    │               Acumula m_footnotes
    ▼
generateHead()      Gera <!doctype html>, <head>, <body>
    │               Aplica Google Fonts, links CSS ou CSS inline
    ▼
generateFootnotes() Gera <footer> com <section class="footnotes">
    │               (apenas se houver notas definidas)
    ▼
HTML completo
```

### A Máquina de Estados de Blocos (`processBlocks`)

O parser é de **passagem única** (single-pass), linha a linha. Ele mantém
buffers para o bloco corrente:

```cpp
std::vector<std::string> para;       // linhas do parágrafo atual
std::vector<std::string> listItems;  // itens da lista atual
std::vector<std::string> tableRows;  // linhas da tabela atual
std::vector<std::string> bqLines;    // linhas do blockquote atual
bool inCodeBlock;                    // dentro de ``` ... ```
```

Quando uma linha não pertence ao bloco corrente (ex.: um título após um
parágrafo), o buffer é **descarregado** (`flushParagraph`, `processList`,
etc.) antes de começar o novo bloco.

**Prioridade de reconhecimento de padrões** (em ordem):

1. Fence de código (` ``` ` ou `~~~`)
2. Definição de nota de rodapé (`[^n]:`)
3. Linha em branco → descarrega tudo
4. Título (`#` a `######`)
5. Regra horizontal (`---`, `***`, `___`)
6. Quebra de linha forçada (`<br>`)
7. Bloco de citação (`>`)
8. Item de lista não-ordenada (`- ` ou `* `)
9. Item de lista ordenada (`N. `)
10. Linha de tabela (`|`)
11. Linha de parágrafo (padrão)

### O Processador Inline (`processInline`)

Varre o texto caractere a caractere. Para cada token de abertura, busca o
token de fechamento. Se encontrado, emite a tag HTML e avança o cursor; caso
contrário, emite o caractere literalmente.

A função é **recursiva**: o conteúdo interno de `**`, `_`, `==`, etc. passa
novamente por `processInline`, permitindo aninhamento.

```
"**_negrito e itálico_**"
        │
        └─ detecta **
               └─ extrai "_negrito e itálico_"
                      └─ chama processInline recursivamente
                             └─ detecta _
                                    └─ emite <em>negrito e itálico</em>
               └─ emite <strong><em>negrito e itálico</em></strong>
```

### Pipeline de Compilação (LumiJS)

O LumiJS segue a mesma lógica do LumiC, adaptada para JavaScript:

```
Fonte .lm (string ou arquivo)
    │
    ▼
LumiCompiler.compile()
    │  Separa linhas, extrai notas de rodapé
    │  Processa meta-diretivas (@title, @lang, @font, @css)
    │  Agrupa linhas em blocos (parágrafo, lista, tabela, etc.)
    │  Processa cada bloco → HTML
    │  Processa marcação inline (negrito, itálico, links, etc.)
    │  Gera notas de rodapé
    ▼
Objeto { title, lang, headElements, body }
    │
    ▼
LumiDoc (Web Component)
    │  Aplica title e lang ao documento
    │  Injeta fontes e CSS no <head>
    │  Renderiza body no DOM
    ▼
Página renderizada
```

### Adicionando um Novo Elemento Inline (LumiC)

1. Escolha os delimitadores de abertura e fechamento (ex.: `%%text%%`).
2. Em `compiler.cpp`, dentro do loop `while (i < n)` em `processInline()`,
   adicione a verificação usando o helper `tryWrap`:

```cpp
// %%sublinhado%%
if (i + 1 < n && text[i] == '%' && text[i+1] == '%') {
    if (tryWrap("%%", "%%", "<u>", "</u>", true, false)) continue;
}
```

Os parâmetros de `tryWrap`:
- `open`       : delimitador de abertura
- `close`      : delimitador de fechamento
- `openTag`    : tag HTML de abertura
- `closeTag`   : tag HTML de fechamento
- `recurse`    : `true` para processar inline dentro do conteúdo
- `htmlEscape` : `true` para escapar `<`, `>`, `&` (use em `<code>`)

3. Documente o novo elemento na seção "Ênfases Inline" deste README.

### Adicionando um Novo Elemento de Bloco (LumiC)

1. Defina o prefixo de linha que identifica o bloco (ex.: `!! ` para avisos).
2. Em `processBlocks()`, adicione a detecção **antes** da regra de parágrafo
   (no final do loop), respeitando a prioridade:

```cpp
// ── Aviso  !! texto ──────────────────────────────────────────────
if (startsWith(t, "!! ")) {
    flushAll();
    html += "<aside class=\"warning\">" +
            processInline(trim(t.substr(3))) +
            "</aside>\n";
    continue;
}
```

Para blocos multilinhas (como listas ou tabelas), adicione um buffer e uma
função `processXxx(buffer)` seguindo o padrão dos existentes.

3. Adicione uma entrada na tabela de referência e um exemplo neste README.

### Adicionando uma Nova Diretiva Meta (LumiC)

Em `parseMeta()`, dentro do bloco `if (colon != std::string::npos)`:

```cpp
else if (key == "author") m_author = val;
```

Depois use `m_author` em `generateHead()` para emitir, por exemplo:

```cpp
h += "  <meta name=\"author\" content=\"" + escapeHtml(m_author) + "\">\n";
```

### Estrutura de Dados (LumiC)

```
LumiCompiler
├── Options
│   ├── cssLink         string   caminho para <link>
│   └── cssInlinePath   string   caminho para <style> inline
│
├── Estado por documento (reset a cada compile())
│   ├── m_title         string
│   ├── m_lang          string
│   ├── m_font          string
│   ├── m_cssLinks      vector<string>
│   └── m_footnotes     vector<Footnote{id, content}>
│
└── Métodos principais
    ├── compile()           ponto de entrada público
    ├── parseMeta()         fase 1: diretivas @
    ├── processBlocks()     fase 2: blocos (chama processInline)
    ├── generateHead()      fase 3: <head>
    └── generateFootnotes() fase 4: <footer>
```

### Compilação e Testes

```bash
# Build do LumiC
cd lumic
make

# Converter o exemplo incluído
./lumic examples/lorem-ipsum.lm -o examples/lorem-ipsum.html \
    --css ../styles/main.css

# Verificar saída
cat examples/lorem-ipsum.html

# Limpar artefatos
make clean
```

---

## Licença

MIT — veja `LICENSE` para detalhes.
