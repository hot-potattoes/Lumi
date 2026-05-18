/**
 * LumiJS - Compilador Lumi portado para JavaScript + Web Component <lumi-doc>
 * 
 * Uso básico (página inteira):
 *   <!DOCTYPE html>
 *   <html>
 *   <head><script src="lumi-js.js"></script></head>
 *   <body>
 *     <lumi-doc src="pagina.lm"></lumi-doc>
 *   </body>
 *   </html>
 * 
 * O compilador suporta a sintaxe original do Lumi (títulos, listas, tabelas,
 * citações, código, notas de rodapé, links, imagens, etc.) e as meta-diretivas
 * @title, @lang, @font, @css.
 */

class LumiCompiler {
  constructor() {
    this.footnotes = new Map();
  }

  /**
   * Compila código fonte Lumi para um objeto { title, lang, headElements, body }.
   */
  compile(source) {
    this.footnotes.clear();
    let lines = source.split('\n');

    // 1. Extrair notas de rodapé (definições)
    lines = lines.filter(line => {
      const match = line.match(/^\s*\[\^(\d+)\]:\s*(.*)/);
      if (match) {
        this.footnotes.set(parseInt(match[1]), match[2]);
        return false;
      }
      return true;
    });

    // 2. Processar meta-diretivas (@title, @lang, @font, @css)
    let i = 0;
    let title = '';
    let lang = '';
    let headElements = '';
    while (i < lines.length && lines[i].startsWith('@')) {
      const line = lines[i];
      if (line.startsWith('@title ')) {
        title = line.substring(7).trim();
      } else if (line.startsWith('@lang ')) {
        lang = line.substring(6).trim();
      } else if (line.startsWith('@font ')) {
        const font = line.substring(6).trim();
        headElements += `<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=${encodeURIComponent(font)}">\n`;
      } else if (line.startsWith('@css ')) {
        const cssUrl = line.substring(5).trim();
        headElements += `<link rel="stylesheet" href="${this.escapeHtml(cssUrl)}">\n`;
      }
      i++;
    }

    // 3. Agrupar linhas em blocos
    const blocks = [];
    while (i < lines.length) {
      if (lines[i].trim() === '') {
        i++;
        continue;
      }

      // Bloco de código
      if (lines[i].trim().startsWith('```')) {
        const codeBlock = this.extractCodeBlock(lines, i);
        blocks.push(codeBlock.block);
        i = codeBlock.nextIndex;
        continue;
      }

      const blockType = this.getBlockType(lines[i]);

      // Títulos e linhas horizontais são blocos de uma linha
      if (blockType === 'heading' || blockType === 'horizontalrule') {
        blocks.push({ type: blockType, lines: [lines[i]] });
        i++;
        continue;
      }

      // Blocos multilinha: parágrafo, lista, tabela, citação
      const start = i;
      while (i < lines.length && lines[i].trim() !== '') {
        if (this.getBlockType(lines[i]) !== blockType) break;
        i++;
      }
      blocks.push({ type: blockType, lines: lines.slice(start, i) });
    }

    // 4. Gerar HTML do corpo
    let body = '';
    for (const block of blocks) {
      body += this.processBlock(block);
    }

    // 5. Adicionar notas de rodapé
    if (this.footnotes.size > 0) {
      body += '<hr>\n<ol>\n';
      for (const [n, text] of this.footnotes) {
        const processedText = this.processInline(text);
        body += `<li id="fn-${n}">${processedText} <a href="#fnref-${n}">↩</a></li>\n`;
      }
      body += '</ol>\n';
    }

    return { title, lang, headElements, body };
  }

  /** Determina o tipo de bloco com base na primeira linha */
  getBlockType(line) {
    if (/^#{1,6}\s/.test(line)) return 'heading';
    if (/^\- /.test(line)) return 'unorderedlist';
    if (/^\d+\.\s/.test(line)) return 'orderedlist';
    if (/\|/.test(line)) return 'table';
    if (/^>\s/.test(line)) return 'blockquote';
    if (/^(\-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return 'horizontalrule';
    return 'paragraph';
  }

  /** Extrai um bloco de código a partir da linha de abertura */
  extractCodeBlock(lines, startIndex) {
    let i = startIndex;
    const firstLine = lines[i].trim();
    let language = '';
    const match = firstLine.match(/^```(\S*)/);
    if (match) language = match[1];
    i++; // pula abertura ```

    const codeLines = [];
    while (i < lines.length) {
      if (lines[i].trim() === '```') {
        i++; // pula fechamento ```
        break;
      }
      codeLines.push(lines[i]);
      i++;
    }

    const codeContent = codeLines.map(l => this.escapeHtml(l)).join('\n');
    const className = language ? ` class="language-${language}"` : '';
    const html = `<pre><code${className}>${codeContent}</code></pre>\n`;

    return { block: { type: 'code', html }, nextIndex: i };
  }

  /** Renderiza um bloco para HTML */
  processBlock(block) {
    switch (block.type) {
      case 'paragraph': {
        const text = block.lines.map(l => l.trim()).join(' ');
        return `<p>${this.processInline(text)}</p>\n`;
      }
      case 'heading': {
        const level = (block.lines[0].match(/^(#+)/) || [''])[0].length;
        const text = block.lines[0].substring(level).trim();
        return `<h${level}>${this.processInline(text)}</h${level}>\n`;
      }
      case 'unorderedlist': {
        let html = '<ul>\n';
        for (const line of block.lines) {
          const content = line.substring(2);
          html += `<li>${this.processInline(content)}</li>\n`;
        }
        html += '</ul>\n';
        return html;
      }
      case 'orderedlist': {
        let html = '<ol>\n';
        for (const line of block.lines) {
          const content = line.replace(/^\d+\.\s/, '');
          html += `<li>${this.processInline(content)}</li>\n`;
        }
        html += '</ol>\n';
        return html;
      }
      case 'table': {
        const rows = block.lines;
        if (rows.length === 0) return '';
        let html = '<table>\n<thead><tr>';
        const headerCells = rows[0].split('|').filter(c => c.trim() !== '').map(c => c.trim());
        for (const cell of headerCells) {
          html += `<th>${this.processInline(cell)}</th>`;
        }
        html += '</tr></thead>\n<tbody>\n';
        let dataStart = 1;
        // Pular linha separadora (ex.: |---|---|)
        if (rows.length > 1 && /^[\|\-:\s]+$/.test(rows[1])) {
          dataStart = 2;
        }
        for (let i = dataStart; i < rows.length; i++) {
          const cells = rows[i].split('|').filter(c => c.trim() !== '').map(c => c.trim());
          html += '<tr>';
          for (const cell of cells) {
            html += `<td>${this.processInline(cell)}</td>`;
          }
          html += '</tr>\n';
        }
        html += '</tbody></table>\n';
        return html;
      }
      case 'blockquote': {
        const content = block.lines.map(l => l.substring(2).trim()).join(' ');
        return `<blockquote>${this.processInline(content)}</blockquote>\n`;
      }
      case 'horizontalrule':
        return '<hr>\n';
      case 'code':
        return block.html;
      default:
        return '';
    }
  }

  /**
   * Processa marcação inline (negrito, itálico, código, links, imagens, notas).
   * A abordagem reproduz fielmente o parser original do Lumi, escapando HTML
   * apenas no texto literal e permitindo aninhamento de estilos.
   */
  processInline(text) {
    let result = '';
    let i = 0;
    const len = text.length;

    while (i < len) {
      const remaining = text.substring(i);
      const markers = ['**', '*', '==', '~~', '`', '![', '[', ']', '[^'];
      let earliestIndex = -1;
      let earliestMarker = '';

      for (const marker of markers) {
        const idx = remaining.indexOf(marker);
        if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) {
          earliestIndex = idx;
          earliestMarker = marker;
        }
      }

      if (earliestIndex === -1) {
        // Nenhum marcador encontrado, escapar o restante
        result += this.escapeHtml(remaining);
        break;
      } else {
        // Escapar texto antes do marcador
        if (earliestIndex > 0) {
          result += this.escapeHtml(remaining.substring(0, earliestIndex));
        }
        i += earliestIndex; // posicionar no início do marcador

        // Processar de acordo com o marcador encontrado
        if (earliestMarker === '**') {
          const closing = text.indexOf('**', i + 2);
          if (closing !== -1) {
            const inner = text.substring(i + 2, closing);
            result += `<strong>${this.processInline(inner)}</strong>`;
            i = closing + 2;
          } else {
            result += '**';
            i += 2;
          }
        } else if (earliestMarker === '*') {
          const closing = text.indexOf('*', i + 1);
          if (closing !== -1) {
            const inner = text.substring(i + 1, closing);
            result += `<em>${this.processInline(inner)}</em>`;
            i = closing + 1;
          } else {
            result += '*';
            i += 1;
          }
        } else if (earliestMarker === '==') {
          const closing = text.indexOf('==', i + 2);
          if (closing !== -1) {
            const inner = text.substring(i + 2, closing);
            result += `<mark>${this.processInline(inner)}</mark>`;
            i = closing + 2;
          } else {
            result += '==';
            i += 2;
          }
        } else if (earliestMarker === '~~') {
          const closing = text.indexOf('~~', i + 2);
          if (closing !== -1) {
            const inner = text.substring(i + 2, closing);
            result += `<del>${this.processInline(inner)}</del>`;
            i = closing + 2;
          } else {
            result += '~~';
            i += 2;
          }
        } else if (earliestMarker === '`') {
          const closing = text.indexOf('`', i + 1);
          if (closing !== -1) {
            const inner = text.substring(i + 1, closing);
            result += `<code>${this.escapeHtml(inner)}</code>`;
            i = closing + 1;
          } else {
            result += '`';
            i += 1;
          }
        } else if (earliestMarker === '![') {
          const closeAlt = text.indexOf(']', i + 2);
          if (closeAlt !== -1 && text[closeAlt + 1] === '(') {
            const closeUrl = text.indexOf(')', closeAlt + 2);
            if (closeUrl !== -1) {
              const alt = text.substring(i + 2, closeAlt);
              const url = text.substring(closeAlt + 2, closeUrl);
              result += `<img src="${this.escapeHtml(url)}" alt="${this.escapeHtml(alt)}">`;
              i = closeUrl + 1;
            } else {
              result += '!['; i += 2;
            }
          } else {
            result += '!['; i += 2;
          }
        } else if (earliestMarker === '[') {
          const closeBracket = text.indexOf(']', i + 1);
          if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
            const closeParen = text.indexOf(')', closeBracket + 2);
            if (closeParen !== -1) {
              const linkText = text.substring(i + 1, closeBracket);
              const url = text.substring(closeBracket + 2, closeParen);
              result += `<a href="${this.escapeHtml(url)}">${this.processInline(linkText)}</a>`;
              i = closeParen + 1;
            } else {
              result += '['; i += 1;
            }
          } else {
            result += '['; i += 1;
          }
        } else if (earliestMarker === '[^') {
          const closeBracket = text.indexOf(']', i + 2);
          if (closeBracket !== -1 && /^\d+$/.test(text.substring(i + 2, closeBracket))) {
            const n = text.substring(i + 2, closeBracket);
            result += `<sup id="fnref-${n}"><a href="#fn-${n}">${n}</a></sup>`;
            i = closeBracket + 1;
          } else {
            result += '[^'; i += 2;
          }
        } else if (earliestMarker === ']') {
          result += ']'; i += 1;
        }
      }
    }
    return result;
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// --------------------- Web Component ---------------------
class LumiDoc extends HTMLElement {
  async connectedCallback() {
    const src = this.getAttribute('src');
    let source;

    try {
      source = src
        ? await fetch(src).then(r => r.text())
        : this.textContent;
    } catch (err) {
      console.error('LumiJS: falha ao carregar documento', err);
      this.innerHTML = '<p>Erro ao carregar o documento Lumi.</p>';
      return;
    }

    const compiler = new LumiCompiler();
    const { title, lang, headElements, body } = compiler.compile(source);

    // Aplicar meta-dados ao documento existente
    if (title) document.title = title;
    if (lang) document.documentElement.lang = lang;

    // Adicionar fontes e CSS ao <head> (sem remover scripts/estilos já presentes)
    const temp = document.createElement('div');
    temp.innerHTML = headElements;
    while (temp.firstChild) {
      document.head.appendChild(temp.firstChild);
    }

    // Substituir o conteúdo do <body> pelo HTML compilado
    // (o próprio <lumi-doc> desaparece, dando lugar ao documento final)
    document.body.innerHTML = body;
  }
}

// Registrar o elemento customizado (executa apenas uma vez)
if (!customElements.get('lumi-doc')) {
  customElements.define('lumi-doc', LumiDoc);
}
