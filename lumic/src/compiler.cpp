#include "compiler.h"

#include <algorithm>
#include <cctype>
#include <fstream>
#include <sstream>
#include <stdexcept>

// ═════════════════════════════════════════════════════════════════════════════
//  Static helpers
// ═════════════════════════════════════════════════════════════════════════════

std::string LumiCompiler::trim(const std::string& s) {
    size_t b = s.find_first_not_of(" \t\r\n");
    if (b == std::string::npos) return "";
    size_t e = s.find_last_not_of(" \t\r\n");
    return s.substr(b, e - b + 1);
}

bool LumiCompiler::startsWith(const std::string& s, const std::string& prefix) {
    return s.size() >= prefix.size() &&
           s.compare(0, prefix.size(), prefix) == 0;
}

std::string LumiCompiler::escapeHtml(const std::string& s) {
    std::string out;
    out.reserve(s.size() + 16);
    for (unsigned char c : s) {
        switch (c) {
            case '&': out += "&amp;";  break;
            case '<': out += "&lt;";   break;
            case '>': out += "&gt;";   break;
            case '"': out += "&quot;"; break;
            default:  out += static_cast<char>(c);
        }
    }
    return out;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Reset
// ═════════════════════════════════════════════════════════════════════════════

void LumiCompiler::reset() {
    m_title = "Documento";
    m_lang  = "pt-BR";
    m_font  = "";
    m_cssLinks.clear();
    m_footnotes.clear();
}

// ═════════════════════════════════════════════════════════════════════════════
//  splitLines
// ═════════════════════════════════════════════════════════════════════════════

std::vector<std::string> LumiCompiler::splitLines(const std::string& src) {
    std::vector<std::string> lines;
    std::istringstream ss(src);
    std::string line;
    while (std::getline(ss, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        lines.push_back(std::move(line));
    }
    return lines;
}

// ═════════════════════════════════════════════════════════════════════════════
//  parseMeta  –  consumes leading @key: value lines
// ═════════════════════════════════════════════════════════════════════════════

void LumiCompiler::parseMeta(std::vector<std::string>& lines) {
    size_t consumed = 0;
    for (size_t i = 0; i < lines.size(); i++) {
        std::string t = trim(lines[i]);
        if (t.empty()) { consumed = i + 1; continue; }
        if (!startsWith(t, "@")) break;

        size_t colon = t.find(':');
        if (colon != std::string::npos) {
            std::string key = trim(t.substr(1, colon - 1));
            std::string val = trim(t.substr(colon + 1));

            if      (key == "title") m_title = val;
            else if (key == "lang")  m_lang  = val;
            else if (key == "font")  m_font  = val;
            else if (key == "css")   m_cssLinks.push_back(val);
        }
        consumed = i + 1;
    }
    lines.erase(lines.begin(),
                lines.begin() + static_cast<std::ptrdiff_t>(consumed));
}

// ═════════════════════════════════════════════════════════════════════════════
//  processInline
//
//  Supported tokens (in priority order):
//    **text**   → <strong>
//    _text_     → <em>          (only at non-word boundaries)
//    ==text==   → <mark>
//    ~~text~~   → <del>
//    `text`     → <code>
//    @@text@@   → <cite>
//    ??term??   → <dfn>
//    ^[n]       → <sup> footnote ref
//    [t](url)   → <a>
// ═════════════════════════════════════════════════════════════════════════════

std::string LumiCompiler::processInline(const std::string& text) {
    std::string out;
    out.reserve(text.size() * 2);
    size_t i = 0;
    const size_t n = text.size();

    // Helper: find closing token and emit wrapped HTML
    // Returns true and advances i if found, false otherwise.
    auto tryWrap = [&](const std::string& open,
                       const std::string& close,
                       const std::string& openTag,
                       const std::string& closeTag,
                       bool recurse,
                       bool htmlEscape) -> bool {
        if (!startsWith(text.substr(i), open)) return false;
        size_t start = i + open.size();
        size_t end   = text.find(close, start);
        if (end == std::string::npos) return false;
        std::string inner = text.substr(start, end - start);
        out += openTag;
        out += recurse ? processInline(inner) : (htmlEscape ? escapeHtml(inner) : inner);
        out += closeTag;
        i = end + close.size();
        return true;
    };

    while (i < n) {
        // ── **bold** ──────────────────────────────────────────────────────
        if (i + 1 < n && text[i] == '*' && text[i+1] == '*') {
            if (tryWrap("**", "**", "<strong>", "</strong>", true, false)) continue;
        }

        // ── _italic_  (only at non-word boundaries) ───────────────────────
        if (text[i] == '_') {
            bool prevWord = (i > 0 &&
                (std::isalnum(static_cast<unsigned char>(text[i-1])) || text[i-1] == '_'));
            if (!prevWord) {
                size_t end = text.find('_', i + 1);
                if (end != std::string::npos) {
                    bool nextWord = (end + 1 < n &&
                        std::isalnum(static_cast<unsigned char>(text[end+1])));
                    if (!nextWord) {
                        out += "<em>" + processInline(text.substr(i+1, end-i-1)) + "</em>";
                        i = end + 1;
                        continue;
                    }
                }
            }
        }

        // ── ==highlight== ─────────────────────────────────────────────────
        if (i + 1 < n && text[i] == '=' && text[i+1] == '=') {
            if (tryWrap("==", "==", "<mark>", "</mark>", true, false)) continue;
        }

        // ── ~~strikethrough~~ ─────────────────────────────────────────────
        if (i + 1 < n && text[i] == '~' && text[i+1] == '~') {
            if (tryWrap("~~", "~~", "<del>", "</del>", true, false)) continue;
        }

        // ── `inline code` ─────────────────────────────────────────────────
        if (text[i] == '`') {
            if (tryWrap("`", "`", "<code>", "</code>", false, true)) continue;
        }

        // ── @@cite@@ ──────────────────────────────────────────────────────
        if (i + 1 < n && text[i] == '@' && text[i+1] == '@') {
            if (tryWrap("@@", "@@", "<cite>", "</cite>", true, false)) continue;
        }

        // ── ??dfn?? ───────────────────────────────────────────────────────
        if (i + 1 < n && text[i] == '?' && text[i+1] == '?') {
            if (tryWrap("??", "??", "<dfn>", "</dfn>", true, false)) continue;
        }

        // ── ^[n]  footnote superscript ────────────────────────────────────
        if (text[i] == '^' && i+1 < n && text[i+1] == '[') {
            size_t end = text.find(']', i + 2);
            if (end != std::string::npos) {
                std::string num = trim(text.substr(i+2, end-i-2));
                out += "<sup id=\"ref" + num + "\"><a href=\"#nota" + num
                     + "\">[" + num + "]</a></sup>";
                i = end + 1;
                continue;
            }
        }

        // ── [link text](url) ──────────────────────────────────────────────
        if (text[i] == '[') {
            size_t tEnd = text.find(']', i + 1);
            if (tEnd != std::string::npos && tEnd+1 < n && text[tEnd+1] == '(') {
                size_t uEnd = text.find(')', tEnd + 2);
                if (uEnd != std::string::npos) {
                    std::string lt  = text.substr(i+1, tEnd-i-1);
                    std::string url = text.substr(tEnd+2, uEnd-tEnd-2);
                    out += "<a href=\"" + url + "\">" + processInline(lt) + "</a>";
                    i = uEnd + 1;
                    continue;
                }
            }
        }

        out += text[i++];
    }
    return out;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Table helpers
// ═════════════════════════════════════════════════════════════════════════════

bool LumiCompiler::isSeparatorRow(const std::string& rawRow) {
    std::string t = trim(rawRow);
    if (t.empty() || t[0] != '|') return false;
    if (startsWith(t, "|="))      return false; // footer row, not separator
    if (t.find("---") == std::string::npos) return false;
    for (char c : t) {
        if (c != '|' && c != '-' && c != ':' && c != ' ' && c != '\t')
            return false;
    }
    return true;
}

std::vector<std::string> LumiCompiler::splitTableRow(const std::string& rawRow) {
    std::string row = trim(rawRow);
    if (startsWith(row, "|=")) row = row.substr(2);      // strip |= prefix
    else if (!row.empty() && row[0] == '|') row = row.substr(1);
    if (!row.empty() && row.back() == '|') row.pop_back(); // strip trailing |

    std::vector<std::string> cells;
    std::istringstream ss(row);
    std::string cell;
    while (std::getline(ss, cell, '|'))
        cells.push_back(trim(cell));
    return cells;
}

std::string LumiCompiler::processTable(const std::vector<std::string>& rows) {
    // Detect separator row that splits header from body
    int sepIdx = -1;
    for (int i = 0; i < static_cast<int>(rows.size()); i++) {
        if (isSeparatorRow(rows[i])) { sepIdx = i; break; }
    }

    std::vector<std::string> headerRows, bodyRows, footerRows;
    for (int i = 0; i < static_cast<int>(rows.size()); i++) {
        std::string t = trim(rows[i]);
        if (isSeparatorRow(t))      continue;
        if (startsWith(t, "|="))    footerRows.push_back(t);
        else if (sepIdx < 0 || i > sepIdx) bodyRows.push_back(t);
        else                               headerRows.push_back(t);
    }

    std::string html = "<table>\n";

    auto emitSection = [&](const std::string& sectionTag,
                           const std::vector<std::string>& rs,
                           const std::string& cellTag) {
        if (rs.empty()) return;
        html += "<" + sectionTag + ">\n";
        for (const auto& r : rs) {
            auto cells = splitTableRow(r);
            html += "  <tr>\n";
            for (const auto& c : cells)
                html += "    <" + cellTag + ">" + processInline(c)
                      + "</" + cellTag + ">\n";
            html += "  </tr>\n";
        }
        html += "</" + sectionTag + ">\n";
    };

    emitSection("thead", headerRows, "th");
    emitSection("tbody", bodyRows,   "td");
    emitSection("tfoot", footerRows, "td");

    html += "</table>\n";
    return html;
}

// ═════════════════════════════════════════════════════════════════════════════
//  Block helpers
// ═════════════════════════════════════════════════════════════════════════════

std::string LumiCompiler::flushParagraph(std::vector<std::string>& para) {
    if (para.empty()) return "";
    std::string combined;
    for (size_t i = 0; i < para.size(); i++) {
        if (i) combined += ' ';
        combined += trim(para[i]);
    }
    para.clear();
    combined = trim(combined);
    if (combined.empty()) return "";
    return "<p>" + processInline(combined) + "</p>\n";
}

std::string LumiCompiler::processList(const std::vector<std::string>& items, bool ordered) {
    const std::string tag = ordered ? "ol" : "ul";
    std::string html = "<" + tag + ">\n";
    for (const auto& item : items)
        html += "  <li>" + processInline(item) + "</li>\n";
    html += "</" + tag + ">\n";
    return html;
}

std::string LumiCompiler::processBlockquote(const std::vector<std::string>& bqLines) {
    std::string html = "<blockquote>\n";
    for (const auto& raw : bqLines) {
        std::string t = trim(raw);
        if (!t.empty() && t[0] == '>') t = trim(t.substr(1));
        if (!t.empty())
            html += "  <p>" + processInline(t) + "</p>\n";
    }
    html += "</blockquote>\n";
    return html;
}

std::string LumiCompiler::processCodeBlock(const std::string& lang, const std::string& code) {
    std::string langAttr = lang.empty()
        ? "" : " class=\"language-" + lang + "\"";
    return "<pre><code" + langAttr + ">" + escapeHtml(code) + "</code></pre>\n";
}

// ═════════════════════════════════════════════════════════════════════════════
//  processBlocks  –  main block-level state machine
// ═════════════════════════════════════════════════════════════════════════════

std::string LumiCompiler::processBlocks(const std::vector<std::string>& lines) {
    std::string html;

    std::vector<std::string> para;        // paragraph lines being accumulated
    std::vector<std::string> listItems;   // list items being accumulated
    std::vector<std::string> tableRows;   // table rows being accumulated
    std::vector<std::string> bqLines;     // blockquote lines being accumulated
    bool orderedList = false;

    bool        inCodeBlock  = false;
    std::string codeLang;
    std::string codeContent;

    // Flush all pending blocks to html
    auto flushAll = [&]() {
        html += flushParagraph(para);
        if (!listItems.empty()) {
            html += processList(listItems, orderedList);
            listItems.clear();
        }
        if (!tableRows.empty()) {
            html += processTable(tableRows);
            tableRows.clear();
        }
        if (!bqLines.empty()) {
            html += processBlockquote(bqLines);
            bqLines.clear();
        }
    };

    for (size_t idx = 0; idx < lines.size(); idx++) {
        const std::string& raw = lines[idx];
        std::string t = trim(raw);

        // ── Code-fence (``` or ~~~) ───────────────────────────────────────
        if (startsWith(t, "```") || startsWith(t, "~~~")) {
            if (!inCodeBlock) {
                flushAll();
                inCodeBlock  = true;
                codeLang     = trim(t.substr(3));
                codeContent.clear();
            } else {
                html += processCodeBlock(codeLang, codeContent);
                inCodeBlock = false;
                codeLang.clear();
                codeContent.clear();
            }
            continue;
        }
        if (inCodeBlock) {
            codeContent += raw + "\n";
            continue;
        }

        // ── Footnote definition  [^n]: text ──────────────────────────────
        if (startsWith(t, "[^")) {
            size_t close = t.find(']');
            if (close != std::string::npos &&
                close + 1 < t.size() && t[close+1] == ':') {
                flushAll();
                int         id      = std::stoi(t.substr(2, close - 2));
                std::string content = trim(t.substr(close + 2));
                m_footnotes.push_back({id, content});
                continue;
            }
        }

        // ── Blank line ────────────────────────────────────────────────────
        if (t.empty()) {
            flushAll();
            continue;
        }

        // ── Headings  # … ###### ─────────────────────────────────────────
        if (t[0] == '#') {
            size_t lvl = 0;
            while (lvl < t.size() && t[lvl] == '#') lvl++;
            if (lvl <= 6 && lvl < t.size() && t[lvl] == ' ') {
                flushAll();
                std::string text = trim(t.substr(lvl + 1));
                std::string ls = std::to_string(lvl);
                html += "<h" + ls + ">" + processInline(text) + "</h" + ls + ">\n";
                continue;
            }
        }

        // ── Horizontal rule  ---  ***  ___ ───────────────────────────────
        if (t == "---" || t == "***" || t == "___") {
            flushAll();
            html += "<hr>\n";
            continue;
        }

        // ── Forced line-break  <br> ───────────────────────────────────────
        if (t == "<br>" || t == "\\n") {
            html += flushParagraph(para);
            html += "<br>\n";
            continue;
        }

        // ── Blockquote  > … ───────────────────────────────────────────────
        if (!t.empty() && t[0] == '>') {
            html += flushParagraph(para);
            if (!listItems.empty()) {
                html += processList(listItems, orderedList);
                listItems.clear();
            }
            if (!tableRows.empty()) {
                html += processTable(tableRows);
                tableRows.clear();
            }
            bqLines.push_back(t);
            continue;
        } else if (!bqLines.empty()) {
            html += processBlockquote(bqLines);
            bqLines.clear();
        }

        // ── Unordered list  -  or  * ──────────────────────────────────────
        if ((startsWith(t, "- ") || startsWith(t, "* "))) {
            html += flushParagraph(para);
            if (!tableRows.empty()) {
                html += processTable(tableRows);
                tableRows.clear();
            }
            // Switch list type if needed
            if (!listItems.empty() && orderedList) {
                html += processList(listItems, true);
                listItems.clear();
            }
            orderedList = false;
            listItems.push_back(trim(t.substr(2)));
            continue;
        }

        // ── Ordered list  1.  2.  … ───────────────────────────────────────
        {
            size_t dot = t.find(". ");
            if (dot != std::string::npos && dot > 0 && dot <= 3) {
                bool allDigits = true;
                for (size_t k = 0; k < dot; k++)
                    if (!std::isdigit(static_cast<unsigned char>(t[k])))
                        { allDigits = false; break; }
                if (allDigits) {
                    html += flushParagraph(para);
                    if (!tableRows.empty()) {
                        html += processTable(tableRows);
                        tableRows.clear();
                    }
                    if (!listItems.empty() && !orderedList) {
                        html += processList(listItems, false);
                        listItems.clear();
                    }
                    orderedList = true;
                    listItems.push_back(trim(t.substr(dot + 2)));
                    continue;
                }
            }
        }

        // ── Table row  |…  or  |=… ───────────────────────────────────────
        if (!t.empty() && t[0] == '|') {
            html += flushParagraph(para);
            if (!listItems.empty()) {
                html += processList(listItems, orderedList);
                listItems.clear();
            }
            tableRows.push_back(t);
            continue;
        } else if (!tableRows.empty()) {
            html += processTable(tableRows);
            tableRows.clear();
        }

        // ── Paragraph line ────────────────────────────────────────────────
        if (!listItems.empty()) {
            html += processList(listItems, orderedList);
            listItems.clear();
        }
        para.push_back(raw);
    }

    flushAll();
    return html;
}

// ═════════════════════════════════════════════════════════════════════════════
//  generateHead
// ═════════════════════════════════════════════════════════════════════════════

std::string LumiCompiler::generateHead() {
    std::string h;
    h += "<!doctype html>\n";
    h += "<html lang=\"" + m_lang + "\">\n";
    h += "<head>\n";
    h += "  <meta charset=\"UTF-8\">\n";
    h += "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n";
    h += "  <title>" + escapeHtml(m_title) + "</title>\n";

    // Google Fonts
    if (!m_font.empty()) {
        std::string encoded = m_font;
        std::replace(encoded.begin(), encoded.end(), ' ', '+');
        h += "  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n";
        h += "  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n";
        h += "  <link href=\"https://fonts.googleapis.com/css2?family=" + encoded
           + ":wght@100..900&display=swap\" rel=\"stylesheet\">\n";
    }

    if (!m_opts.cssInlinePath.empty()) {
        // Embed CSS content
        std::ifstream f(m_opts.cssInlinePath);
        if (!f.is_open())
            throw std::runtime_error("Não foi possível abrir CSS: " + m_opts.cssInlinePath);
        std::ostringstream ss;
        ss << f.rdbuf();
        h += "  <style>\n" + ss.str() + "\n  </style>\n";
    } else {
        // External CSS links: CLI flag overrides @css meta directives
        const std::vector<std::string>& cssRefs =
            m_opts.cssLink.empty() ? m_cssLinks
                                   : std::vector<std::string>{m_opts.cssLink};
        for (const auto& ref : cssRefs)
            h += "  <link rel=\"stylesheet\" href=\"" + ref + "\">\n";
    }

    h += "</head>\n";
    h += "<body>\n";
    return h;
}

// ═════════════════════════════════════════════════════════════════════════════
//  generateFootnotes
// ═════════════════════════════════════════════════════════════════════════════

std::string LumiCompiler::generateFootnotes() {
    if (m_footnotes.empty()) return "";

    std::sort(m_footnotes.begin(), m_footnotes.end(),
              [](const Footnote& a, const Footnote& b){ return a.id < b.id; });

    std::string html;
    html += "<footer>\n";
    html += "  <section class=\"footnotes\">\n";
    html += "    <ol>\n";
    for (const auto& fn : m_footnotes) {
        std::string id = std::to_string(fn.id);
        html += "      <li id=\"nota" + id + "\">\n";
        html += "        <sup>[" + id + "]</sup> ";
        html += processInline(fn.content);
        html += "<a href=\"#ref" + id + "\">&#x21A9; (voltar)</a>\n";
        html += "      </li>\n";
    }
    html += "    </ol>\n";
    html += "  </section>\n";
    html += "</footer>\n";
    return html;
}

// ═════════════════════════════════════════════════════════════════════════════
//  compile  –  public entry point
// ═════════════════════════════════════════════════════════════════════════════

std::string LumiCompiler::compile(const std::string& source, const Options& opts) {
    reset();
    m_opts = opts;

    auto lines = splitLines(source);
    parseMeta(lines);

    std::string body      = processBlocks(lines);
    std::string footnotes = generateFootnotes();
    std::string head      = generateHead();

    return head + body + footnotes + "</body>\n</html>\n";
}
