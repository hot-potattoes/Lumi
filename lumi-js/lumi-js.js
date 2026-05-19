/**
 * LumiJS — Compilador Lumi portado para JavaScript + Web Component <lumi-doc>
 *
 * Uso básico (página inteira):
 *   <!DOCTYPE html>
 *   <html>
 *   <head><script src="lumi.js"></script></head>
 *   <body>
 *     <lumi-doc src="pagina.lm"></lumi-doc>
 *   </body>
 *   </html>
 *
 * O compilador segue fielmente a especificação do compilador C++ (lumic):
 *   - Meta-diretivas: @title:, @lang:, @font:, @css:
 *   - Inline: **negrito**, _itálico_, ==destaque==, ~~tachado~~,
 *             `código`, @@cite@@, ??dfn??, ^[n] (nota), [t](url)
 *   - Blocos: #–######, parágrafos, - / 1. listas, tabelas com |= tfoot,
 *             > blockquote, ``` código ```, ---, notas de rodapé [^n]:
 */

class LumiCompiler {
  constructor() {
    /** @type {Array<{id:number, content:string}>} */
    this._footnotes = [];
  }

  // ═══════════════════════════════════════════════════════════════
  //  Ponto de entrada público
  // ═══════════════════════════════════════════════════════════════

  /**
   * Compila fonte Lumi e devolve { title, lang, headElements, body }.
   * @param {string} source
   */
  compile(source) {
    this._footnotes = [];

    let lines = source.split('\n').map(l => {
      // normalizar \r\n
      return l.endsWith('\r') ? l.slice(0, -1) : l;
    });

    // ── 1. Meta-diretivas (@key: value) no topo ─────────────────
    let title        = 'Documento';
    let lang         = 'pt-BR';
    let font         = '';
    const cssLinks   = [];
    let i = 0;

    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t.startsWith('@')) break;

      const colon = t.indexOf(':');
      if (colon !== -1) {
        const key = t.slice(1, colon).trim();
        const val = t.slice(colon + 1).trim();
        if      (key === 'title') title = val;
        else if (key === 'lang')  lang  = val;
        else if (key === 'font')  font  = val;
        else if (key === 'css')   cssLinks.push(val);
      }
      i++;
    }

    // ── 2. Coletar definições de notas de rodapé ([^n]: …) ──────
    //    Podem aparecer em qualquer posição; removemos as linhas.
    lines = lines.filter(line => {
      const m = line.match(/^\s*\[\^(\d+)\]:\s*(.*)/);
      if (m) {
        this._footnotes.push({ id: parseInt(m[1], 10), content: m[2] });
        return false;
      }
      return true;
    });

    // ── 3. Processar blocos ──────────────────────────────────────
    const body = this._processBlocks(lines, i);

    // ── 4. Rodapé de notas ───────────────────────────────────────
    const footerHtml = this._generateFootnotes();

    // ── 5. Montar headElements (devolvido; não injetado aqui) ────
    let headElements = '';

    if (font) {
      const encoded = font.replace(/ /g, '+');
      headElements +=
        `<link rel="preconnect" href="https://fonts.googleapis.com">\n` +
        `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n` +
        `<link href="https://fonts.googleapis.com/css2?family=${encoded}:wght@100..900&display=swap" rel="stylesheet">\n`;
    }
    for (const href of cssLinks) {
      headElements += `<link rel="stylesheet" href="${LumiCompiler._esc(href)}">\n`;
    }

    return { title, lang, headElements, body: body + footerHtml };
  }

  // ═══════════════════════════════════════════════════════════════
  //  Blocos
  // ═══════════════════════════════════════════════════════════════

  /**
   * Máquina de estados de passagem única sobre as linhas.
   * @param {string[]} lines   todas as linhas do documento (sem @meta)
   * @param {number}   start   índice inicial (após as @meta)
   */
  _processBlocks(lines, start) {
    let html = '';

    /** @type {string[]} */
    let para      = [];
    /** @type {string[]} */
    let listItems = [];
    let orderedList = false;
    /** @type {string[]} */
    let tableRows = [];
    /** @type {string[]} */
    let bqLines   = [];

    let inCode    = false;
    let codeLang  = '';
    let codeLines = [];

    const flushPara = () => {
      if (!para.length) return;
      const text = para.map(l => l.trim()).join(' ').trim();
      para = [];
      if (text) html += `<p>${this._inline(text)}</p>\n`;
    };
    const flushList = () => {
      if (!listItems.length) return;
      const tag = orderedList ? 'ol' : 'ul';
      html += `<${tag}>\n`;
      for (const item of listItems)
        html += `  <li>${this._inline(item)}</li>\n`;
      html += `</${tag}>\n`;
      listItems = [];
    };
    const flushTable = () => {
      if (!tableRows.length) return;
      html += this._processTable(tableRows);
      tableRows = [];
    };
    const flushBq = () => {
      if (!bqLines.length) return;
      html += '<blockquote>\n';
      for (const raw of bqLines) {
        const t = raw.startsWith('> ') ? raw.slice(2) : (raw.startsWith('>') ? raw.slice(1) : raw);
        if (t.trim()) html += `  <p>${this._inline(t.trim())}</p>\n`;
      }
      html += '</blockquote>\n';
      bqLines = [];
    };
    const flushAll = () => {
      flushPara();
      flushList();
      flushTable();
      flushBq();
    };

    for (let idx = start; idx < lines.length; idx++) {
      const raw = lines[idx];
      const t   = raw.trim();

      // ── Fence de código ────────────────────────────────────────
      if (t.startsWith('```') || t.startsWith('~~~')) {
        if (!inCode) {
          flushAll();
          inCode    = true;
          codeLang  = t.slice(3).trim();
          codeLines = [];
        } else {
          const langAttr = codeLang ? ` class="language-${codeLang}"` : '';
          const codeContent = codeLines.length
            ? LumiCompiler._esc(codeLines.join('\n')) + '\n'
            : '';
          html += `<pre><code${langAttr}>${codeContent}</code></pre>\n`;
          inCode = false; codeLang = ''; codeLines = [];
        }
        continue;
      }
      if (inCode) { codeLines.push(raw); continue; }

      // ── Linha em branco ─────────────────────────────────────────
      if (!t) { flushAll(); continue; }

      // ── Título ──────────────────────────────────────────────────
      if (t[0] === '#') {
        let lvl = 0;
        while (lvl < t.length && t[lvl] === '#') lvl++;
        if (lvl <= 6 && t[lvl] === ' ') {
          flushAll();
          const text = t.slice(lvl + 1).trim();
          html += `<h${lvl}>${this._inline(text)}</h${lvl}>\n`;
          continue;
        }
      }

      // ── Regra horizontal ────────────────────────────────────────
      if (t === '---' || t === '***' || t === '___') {
        flushAll();
        html += '<hr>\n';
        continue;
      }

      // ── Blockquote ──────────────────────────────────────────────
      if (t.startsWith('>')) {
        flushPara(); flushList(); flushTable();
        bqLines.push(t);
        continue;
      } else if (bqLines.length) {
        flushBq();
      }

      // ── Lista não-ordenada (- ou *) ──────────────────────────────
      if (t.startsWith('- ') || t.startsWith('* ')) {
        flushPara(); flushTable();
        if (listItems.length && orderedList) flushList();
        orderedList = false;
        listItems.push(t.slice(2).trim());
        continue;
      }

      // ── Lista ordenada (N. ) ────────────────────────────────────
      {
        const m = t.match(/^(\d{1,3})\.\s+(.*)/);
        if (m) {
          flushPara(); flushTable();
          if (listItems.length && !orderedList) flushList();
          orderedList = true;
          listItems.push(m[2]);
          continue;
        }
      }

      // ── Linha de tabela (| ou |=) ───────────────────────────────
      if (t.startsWith('|')) {
        flushPara(); flushList();
        tableRows.push(t);
        continue;
      } else if (tableRows.length) {
        flushTable();
      }

      // ── Parágrafo ───────────────────────────────────────────────
      if (listItems.length) flushList();
      para.push(raw);
    }

    flushAll();
    return html;
  }

  // ── Tabela ────────────────────────────────────────────────────

  /** @param {string[]} rows */
  _processTable(rows) {
    const isSep = r => /^[|\-: \t]+$/.test(r) && r.includes('-') && !r.trimStart().startsWith('|=');
    const splitRow = r => {
      let s = r.trim();
      if (s.startsWith('|=')) s = s.slice(2);
      else if (s.startsWith('|')) s = s.slice(1);
      if (s.endsWith('|')) s = s.slice(0, -1);
      return s.split('|').map(c => c.trim());
    };

    let sepIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (isSep(rows[i])) { sepIdx = i; break; }
    }

    const headerRows = [], bodyRows = [], footerRows = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].trim();
      if (isSep(r)) continue;
      if (r.startsWith('|='))        footerRows.push(r);
      else if (sepIdx < 0 || i > sepIdx) bodyRows.push(r);
      else                               headerRows.push(r);
    }

    const section = (tag, rs, cellTag) => {
      if (!rs.length) return '';
      let s = `<${tag}>\n`;
      for (const r of rs) {
        s += '  <tr>\n';
        for (const c of splitRow(r))
          s += `    <${cellTag}>${this._inline(c)}</${cellTag}>\n`;
        s += '  </tr>\n';
      }
      return s + `</${tag}>\n`;
    };

    return '<table>\n'
      + section('thead', headerRows, 'th')
      + section('tbody', bodyRows,   'td')
      + section('tfoot', footerRows, 'td')
      + '</table>\n';
  }

  // ── Notas de rodapé ───────────────────────────────────────────

  _generateFootnotes() {
    if (!this._footnotes.length) return '';
    const sorted = [...this._footnotes].sort((a, b) => a.id - b.id);
    let html = '<footer>\n  <section class="footnotes">\n    <ol>\n';
    for (const fn of sorted) {
      html +=
        `      <li id="nota${fn.id}">\n` +
        `        <sup>[${fn.id}]</sup> ${this._inline(fn.content)}` +
        `<a href="#ref${fn.id}">&#x21A9; (voltar)</a>\n` +
        `      </li>\n`;
    }
    html += '    </ol>\n  </section>\n</footer>\n';
    return html;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Inline — varredura caractere a caractere
  // ═══════════════════════════════════════════════════════════════

  /**
   * Converte marcação inline em HTML.
   *
   * Ordem de prioridade dos tokens (a mais alta primeiro):
   *   **bold**  _italic_  ==mark==  ~~del~~  `code`  @@cite@@  ??dfn??
   *   ^[n] footnote ref   ![alt](url) image   [text](url) link
   *
   * O texto literal (fora de tokens) é sempre escapado com _esc().
   * Os delimitadores não-fechados são emitidos literalmente.
   *
   * @param {string} text
   * @returns {string}
   */
  _inline(text) {
    let out = '';
    let i = 0;
    const n = text.length;

    /**
     * Tenta consumir um token delimitado e emitir a tag correspondente.
     * @param {string} open      delimitador de abertura
     * @param {string} close     delimitador de fechamento
     * @param {string} openTag   tag HTML de abertura
     * @param {string} closeTag  tag HTML de fechamento
     * @param {boolean} recurse  processar inline no interior?
     * @param {boolean} escape   escapar HTML no interior?
     * @returns {boolean}
     */
    const tryWrap = (open, close, openTag, closeTag, recurse, escape) => {
      if (text.slice(i, i + open.length) !== open) return false;
      const start = i + open.length;
      const end   = text.indexOf(close, start);
      if (end === -1) return false;
      const inner = text.slice(start, end);
      out += openTag + (recurse ? this._inline(inner) : (escape ? LumiCompiler._esc(inner) : inner)) + closeTag;
      i = end + close.length;
      return true;
    };

    while (i < n) {
      // ── **negrito** ─────────────────────────────────────────────
      if (text[i] === '*' && text[i + 1] === '*') {
        if (tryWrap('**', '**', '<strong>', '</strong>', true, false)) continue;
      }

      // ── _itálico_ — apenas em não-limite de palavra ─────────────
      if (text[i] === '_') {
        const prevIsWord = i > 0 && /[\w]/.test(text[i - 1]);
        if (!prevIsWord) {
          const end = text.indexOf('_', i + 1);
          if (end !== -1) {
            const nextIsWord = end + 1 < n && /[\w]/.test(text[end + 1]);
            if (!nextIsWord) {
              out += `<em>${this._inline(text.slice(i + 1, end))}</em>`;
              i = end + 1;
              continue;
            }
          }
        }
        out += text[i++];
        continue;
      }

      // ── ==destaque== ────────────────────────────────────────────
      if (text[i] === '=' && text[i + 1] === '=') {
        if (tryWrap('==', '==', '<mark>', '</mark>', true, false)) continue;
      }

      // ── ~~tachado~~ ─────────────────────────────────────────────
      if (text[i] === '~' && text[i + 1] === '~') {
        if (tryWrap('~~', '~~', '<del>', '</del>', true, false)) continue;
      }

      // ── `código` ────────────────────────────────────────────────
      if (text[i] === '`') {
        if (tryWrap('`', '`', '<code>', '</code>', false, true)) continue;
      }

      // ── @@cite@@ ────────────────────────────────────────────────
      if (text[i] === '@' && text[i + 1] === '@') {
        if (tryWrap('@@', '@@', '<cite>', '</cite>', true, false)) continue;
      }

      // ── ??dfn?? ─────────────────────────────────────────────────
      if (text[i] === '?' && text[i + 1] === '?') {
        if (tryWrap('??', '??', '<dfn>', '</dfn>', true, false)) continue;
      }

      // ── ^[n] — referência de nota de rodapé ────────────────────
      if (text[i] === '^' && text[i + 1] === '[') {
        const end = text.indexOf(']', i + 2);
        if (end !== -1) {
          const num = text.slice(i + 2, end).trim();
          if (/^\d+$/.test(num)) {
            out += `<sup id="ref${num}"><a href="#nota${num}">[${num}]</a></sup>`;
            i = end + 1;
            continue;
          }
        }
      }

      // ── ![alt](url) — imagem ────────────────────────────────────
      if (text[i] === '!' && text[i + 1] === '[') {
        const altEnd = text.indexOf(']', i + 2);
        if (altEnd !== -1 && text[altEnd + 1] === '(') {
          const urlEnd = text.indexOf(')', altEnd + 2);
          if (urlEnd !== -1) {
            const alt = text.slice(i + 2, altEnd);
            const url = text.slice(altEnd + 2, urlEnd);
            out += `<img src="${LumiCompiler._esc(url)}" alt="${LumiCompiler._esc(alt)}">`;
            i = urlEnd + 1;
            continue;
          }
        }
        out += text[i++];
        continue;
      }

      // ── [texto](url) — link ─────────────────────────────────────
      if (text[i] === '[') {
        const tEnd = text.indexOf(']', i + 1);
        if (tEnd !== -1 && text[tEnd + 1] === '(') {
          const uEnd = text.indexOf(')', tEnd + 2);
          if (uEnd !== -1) {
            const lt  = text.slice(i + 1, tEnd);
            const url = text.slice(tEnd + 2, uEnd);
            out += `<a href="${LumiCompiler._esc(url)}">${this._inline(lt)}</a>`;
            i = uEnd + 1;
            continue;
          }
        }
        out += text[i++];
        continue;
      }

      // ── Caractere literal ────────────────────────────────────────
      // Escapa &, <, >, " para HTML seguro
      const ch = text[i++];
      if      (ch === '&') out += '&amp;';
      else if (ch === '<') out += '&lt;';
      else if (ch === '>') out += '&gt;';
      else if (ch === '"') out += '&quot;';
      else                 out += ch;
    }

    return out;
  }

  // ═══════════════════════════════════════════════════════════════
  //  Utilitários
  // ═══════════════════════════════════════════════════════════════

  static _esc(s) {
    return String(s)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Web Component <lumi-doc>
//
//  COMO USAR
//  ─────────
//  Em servidor (http/https) — carregar arquivo externo:
//
//    <script src="lumi.js" defer></script>
//    ...
//    <lumi-doc src="pagina.lm"></lumi-doc>
//
//  Em file:// (abrir HTML diretamente sem servidor) — fonte inline:
//
//    <script src="lumi.js"></script>              ← sem defer aqui
//    <script type="text/lumi" id="lumi-source">  ← fonte dentro do HTML
//      @title: Meu Doc
//      @css: styles/main.css
//
//      # Olá
//      Conteúdo **normal** aqui.
//    </script>
//    ...
//    <lumi-doc from="lumi-source"></lumi-doc>     ← referência pelo id
//
//  Por que `src` não funciona em file://
//  ──────────────────────────────────────
//  Todos os browsers modernos bloqueiam fetch() e XHR() entre arquivos locais
//  com a política de Same-Origin (CORS). Não existe workaround em JS puro —
//  a única solução sem servidor é não fazer nenhuma requisição.
//  O atributo `from` lê o texto de uma <script type="text/lumi"> já presente
//  no DOM, sem nenhum request de rede.
//
//  Atributos do elemento
//  ─────────────────────
//    src="caminho.lm"   Carrega o arquivo via fetch (http/https apenas).
//    from="id"          Lê o fonte de <script type="text/lumi" id="..."> no DOM.
//    (nenhum)           Usa o textContent do próprio <lumi-doc>.
// ─────────────────────────────────────────────────────────────────────────────

class LumiDoc extends HTMLElement {
  connectedCallback() {
    this._mount().catch(err => {
      console.error('LumiJS:', err);
      if (document.body && document.body.contains(this)) {
        this.innerHTML =
          `<p style="color:red;font-family:monospace;padding:1rem">` +
          `LumiJS erro: ${LumiCompiler._esc(err.message)}</p>`;
      }
    });
  }

  async _mount() {
    const source = await this._readSource();

    const compiler = new LumiCompiler();
    const { title, lang, headElements, body } = compiler.compile(source);

    // ── Metadados ──────────────────────────────────────────────────────────
    if (title && title !== 'Documento') document.title = title;
    if (lang) document.documentElement.lang = lang;

    // ── CSS e fontes no <head> (sem duplicar) ──────────────────────────────
    if (headElements) {
      const tpl = document.createElement('template');
      tpl.innerHTML = headElements;
      for (const node of tpl.content.childNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const href = node.getAttribute('href');
        if (href && document.head.querySelector(
          `link[href="${href.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`
        )) continue;
        document.head.appendChild(node.cloneNode(true));
      }
    }

    // ── Substituir o <body> ────────────────────────────────────────────────
    // O elemento <lumi-doc> é destruído aqui — comportamento esperado.
    document.body.innerHTML = body;
  }

  // ── Leitura da fonte (sem requests de rede em file://) ───────────────────

  /**
   * Resolve a fonte Lumi a partir de uma de três origens:
   *   1. `from="id"` → lê <script type="text/lumi" id="id"> no DOM
   *   2. `src="url"` → fetch (http/https); falha antecipada em file://
   *   3. (nenhum)    → textContent do próprio elemento
   *
   * @returns {Promise<string>}
   */
  async _readSource() {
    // ── 1. from="id" — fonte inline via <script type="text/lumi"> ──────────
    const fromId = this.getAttribute('from');
    if (fromId) {
      const el = document.getElementById(fromId);
      if (!el) throw new Error(`Elemento #${fromId} não encontrado.`);
      if (el.tagName !== 'SCRIPT' || el.type !== 'text/lumi') {
        throw new Error(
          `#${fromId} deve ser <script type="text/lumi">. ` +
          `Encontrado: <${el.tagName.toLowerCase()} type="${el.type}">.`
        );
      }
      return el.textContent;
    }

    // ── 2. src="url" — fetch (somente http/https) ──────────────────────────
    const src = this.getAttribute('src');
    if (src) {
      const url = new URL(src, document.baseURI).href;
      if (url.startsWith('file://')) {
        throw new Error(
          `src="${src}" não funciona em file:// (bloqueado por CORS). ` +
          `Use <script type="text/lumi" id="fonte"> e o atributo from="fonte". ` +
          `Veja a documentação no README.`
        );
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
      return await res.text();
    }

    // ── 3. Conteúdo inline do próprio elemento ─────────────────────────────
    return this.textContent.trim();
  }
}

if (!customElements.get('lumi-doc')) {
  customElements.define('lumi-doc', LumiDoc);
}
