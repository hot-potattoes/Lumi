# LumiJS

Compilador Lumi nativo para navegador. Renderiza documentos `.lm` diretamente no HTML, sem etapa de pré-compilação.

LumiJS é a implementação JavaScript do compilador da linguagem de marcação [Lumi](https://github.com/hot-potattoes/Lumi), localizada em `lumi-js/` no repositório principal. Empacotado como um Web Component `<lumi-doc>`, pode ser usado em qualquer página HTML.

## Funcionalidades

- Sem build step: basta incluir o script e usar a tag `<lumi-doc>`
- Carregamento externo via `src="arquivo.lm"`
- Suporte a meta-diretivas: `@title`, `@lang`, `@font`, `@css`
- Sintaxe completa: títulos, parágrafos, listas, tabelas, citações, código, imagens, links e notas de rodapé
- Zero dependências: JavaScript puro, funciona em qualquer navegador moderno
- Seguro: escape automático de HTML para prevenir XSS

## Instalação

### Download direto

Inclua o arquivo `lumi-js.js` no seu HTML:

```html
<script src="caminho/para/lumi-js/lumi-js.js"></script>
```

### CDN

```html
<script src="https://cdn.jsdelivr.net/gh/hot-potattoes/Lumi@main/lumi-js/lumi-js.js"></script>
```

## Uso rápido

### 1. Crie um documento Lumi

`index.lm`
```
@title Meu Primeiro Documento
@lang pt-BR
@font Roboto

# Ola, Lumi!
Este e um paragrafo com **negrito**, *italico* e `codigo`.

## Lista de tarefas
- Aprender Lumi
- Criar documentos incriveis
- Compartilhar com amigos

## Links e imagens
Visite o [site do Lumi](https://github.com/hot-potattoes/Lumi).

## Notas de rodape
Lumi e uma linguagem de marcacao leve[^1].

[^1]: Criada para ser simples e produtiva.
```

### 2. Crie a pagina HTML

`index.html`
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="lumi-js/lumi-js.js"></script>
</head>
<body>
  <lumi-doc src="index.lm"></lumi-doc>
</body>
</html>
```

### 3. Abra no navegador

Pronto. O documento sera compilado e renderizado automaticamente.

## Uso avancado

### Conteudo inline

Tambem e possivel escrever o conteudo Lumi diretamente dentro da tag:

```html
<lumi-doc>
@title Documento Inline

# Titulo
Este conteudo esta **dentro** do HTML.
</lumi-doc>
```

### Multiplos documentos

Use varios `<lumi-doc>` na mesma pagina. Cada um substitui o body ao ser carregado, util para SPAs ou navegacao entre paginas:

```html
<lumi-doc src="pagina1.lm"></lumi-doc>
```

### Estilizacao personalizada

Adicione CSS a pagina ou use a diretiva `@css` no documento Lumi:

```
@css estilo.css
@font Open+Sans

# Documento estilizado
```

## Referencia da sintaxe

### Meta-diretivas

| Diretiva | Descricao | Exemplo |
|----------|-----------|---------|
| `@title` | Define o titulo da pagina | `@title Meu Site` |
| `@lang` | Define o idioma (atributo `lang`) | `@lang pt-BR` |
| `@font` | Importa fonte do Google Fonts | `@font Roboto` |
| `@css` | Vincula arquivo CSS externo | `@css tema.css` |

### Blocos

| Elemento | Sintaxe |
|----------|---------|
| Titulos | `# H1` a `###### H6` |
| Paragrafo | Texto simples (linhas consecutivas) |
| Lista nao ordenada | `- Item` |
| Lista ordenada | `1. Item` |
| Tabela | `\| Cabecalho \|` + `\| Dado \|` |
| Citacao | `> Texto citado` |
| Codigo | \`\`\` linguagem ... \`\`\` |
| Linha horizontal | `---` ou `***` |

### Formatacao inline

| Estilo | Sintaxe |
|--------|---------|
| Negrito | `**texto**` |
| Italico | `*texto*` |
| Destaque | `==texto==` |
| Riscado | `~~texto~~` |
| Codigo | `` `codigo` `` |
| Link | `[texto](url)` |
| Imagem | `![alt](url)` |
| Nota de rodape | `[^1]` (definicao: `[^1]: texto`) |

## Desenvolvimento

### Estrutura do projeto

O diretorio `lumi-js/` contem:

- `lumi-js.js` — Compilador Lumi em JavaScript + Web Component `<lumi-doc>`
- `README.md` — Esta documentacao

O arquivo `lumi-js.js` possui duas partes principais:

1. **`LumiCompiler`** — Classe que implementa o compilador Lumi
   - `compile(source)` retorna `{ title, lang, headElements, body }`
   - `processInline(text)` converte marcacao inline para HTML
   - `processBlock(block)` renderiza blocos (paragrafos, listas, etc.)

2. **`LumiDoc`** — Web Component `<lumi-doc>`
   - Carrega documento via `src` ou le conteudo inline
   - Aplica meta-dados ao documento principal
   - Renderiza o HTML compilado no `<body>`

### API do compilador

O compilador pode ser usado programaticamente:

```javascript
const compiler = new LumiCompiler();
const { title, lang, headElements, body } = compiler.compile(`
@title Teste
# Ola
Isso e um **teste**.
`);

console.log(body);
// <h1>Ola</h1>
// <p>Isso e um <strong>teste</strong>.</p>
```

## Comparacao com o LumiC original

| Caracteristica | LumiC (C++) | LumiJS (JavaScript) |
|----------------|-------------|---------------------|
| Localizacao | `lumic/src/` | `lumi-js/` |
| Ambiente | Linha de comando | Navegador |
| Pre-compilacao | Necessaria | Nao necessaria |
| Saida | Arquivo `.html` | DOM renderizado |
| Dependencias | C++17 | Nenhuma |
| Funcionalidades | Todas | Todas (port completo) |

## Compatibilidade

Funciona em todos os navegadores que suportam Custom Elements v1 e Fetch API:

- Chrome 54+
- Firefox 63+
- Safari 10.1+
- Edge 79+

## Licenca

MIT. Veja o arquivo [LICENSE](../LICENSE) na raiz do repositorio Lumi.

## Contribuindo

Contribuicoes sao bem-vindas. O LumiJS faz parte do ecossistema Lumi. Para sugerir melhorias ou reportar bugs:

1. Abra uma issue no [repositorio Lumi](https://github.com/hot-potattoes/Lumi/issues)
2. Envie um pull request com sua contribuicao
3. Siga o estilo de codigo do projeto (JavaScript moderno, sem dependencias)

---

Para mais informacoes sobre a linguagem Lumi, consulte o [README principal](https://github.com/hot-potattoes/Lumi).
