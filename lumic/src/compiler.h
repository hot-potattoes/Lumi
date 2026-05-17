#pragma once

#include <string>
#include <vector>

// ─────────────────────────────────────────────────────────────────────────────
// Footnote  –  stores a [^n]: … definition found in the source
// ─────────────────────────────────────────────────────────────────────────────

struct Footnote {
	int         id;
	std::string content;
};

// ─────────────────────────────────────────────────────────────────────────────
// LumiCompiler
//
//   Single-pass compiler: Lumi source → HTML string.
//
//   Usage:
//	   LumiCompiler c;
//	   LumiCompiler::Options opts;
//	   opts.cssLink = "styles/main.css";          // external <link>
//	   // opts.cssInlinePath = "styles/main.css"; // or embed content
//	   std::string html = c.compile(source, opts);
// ─────────────────────────────────────────────────────────────────────────────

class LumiCompiler {
public:
	struct Options {
		// Path used in a <link rel="stylesheet" href="..."> tag.
		// CLI flag: --css <path>
		std::string cssLink;

		// Path to a CSS file whose entire content will be embedded in <style>.
		// Overrides cssLink when set.
		// CLI flag: --inline-css <path>
		std::string cssInlinePath;
	};

	// Compile Lumi source text and return a complete HTML document string.
	// Throws std::runtime_error on unrecoverable errors.
	std::string compile(const std::string& source, const Options& opts = {});

private:
	// ── Per-document state (reset on each compile() call) ──────────────────
	std::string              m_title;
	std::string              m_lang;
	std::string              m_font;
	std::vector<std::string> m_cssLinks;   // accumulated @css: directives
	std::vector<Footnote>    m_footnotes;
	Options                  m_opts;

	// ── Phases ──────────────────────────────────────────────────────────────
	void reset();
	std::vector<std::string> splitLines(const std::string& src);
	void   parseMeta(std::vector<std::string>& lines);
	std::string processBlocks(const std::vector<std::string>& lines);
	std::string generateHead();
	std::string generateFootnotes();

	// ── Inline processor ────────────────────────────────────────────────────
	std::string processInline(const std::string& text);

	// ── Block helpers ────────────────────────────────────────────────────────
	std::string flushParagraph(std::vector<std::string>& para);
	std::string processList(const std::vector<std::string>& items, bool ordered);
	std::string processTable(const std::vector<std::string>& rows);
	std::string processBlockquote(const std::vector<std::string>& lines);
	std::string processCodeBlock(const std::string& lang, const std::string& code);

	// ── Table utilities ──────────────────────────────────────────────────────
	bool isSeparatorRow(const std::string& row);
	std::vector<std::string> splitTableRow(const std::string& row);

	// ── General utilities ────────────────────────────────────────────────────
	static std::string trim(const std::string& s);
	static bool startsWith(const std::string& s, const std::string& prefix);
	static std::string escapeHtml(const std::string& s);
};
