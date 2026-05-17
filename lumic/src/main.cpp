#include "compiler.h"

#include <cstring>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>

// ─────────────────────────────────────────────────────────────────────────────

static void printUsage(const char* prog) {
	std::cerr
		<< "\nUso: " << prog << " <entrada.lm> [opções]\n\n"
		<< "Opções:\n"
		<< "  -o <arquivo>           Arquivo de saída  (padrão: stdout)\n"
		<< "  --css <caminho>        Vincula CSS externo via <link rel=\"stylesheet\">\n"
		<< "  --inline-css <caminho> Incorpora o conteúdo do CSS diretamente no HTML\n"
		<< "  -h, --help             Exibe esta ajuda e sai\n\n"
		<< "Exemplos:\n"
		<< "  " << prog << " doc.lm\n"
		<< "  " << prog << " doc.lm -o doc.html\n"
		<< "  " << prog << " doc.lm -o doc.html --css styles/main.css\n"
		<< "  " << prog << " doc.lm -o doc.html --inline-css styles/main.css\n\n"
		<< "Notas:\n"
		<< "  --css e --inline-css sobrescrevem qualquer diretiva @css: no arquivo.\n"
		<< "  --inline-css e --css são mutuamente exclusivos.\n\n";
}

// ─────────────────────────────────────────────────────────────────────────────

static std::string readFile(const std::string& path) {
	std::ifstream f(path);
	if (!f.is_open())
		throw std::runtime_error("Não foi possível abrir: " + path);
	std::ostringstream ss;
	ss << f.rdbuf();
	return ss.str();
}

// ─────────────────────────────────────────────────────────────────────────────

int main(int argc, char* argv[]) {
	if (argc < 2) {
		printUsage(argv[0]);
		return 1;
	}

	std::string             inputFile;
	std::string             outputFile;
	LumiCompiler::Options   opts;
	bool                    helpRequested = false;

	for (int i = 1; i < argc; i++) {
		const std::string arg = argv[i];

		if (arg == "-h" || arg == "--help") {
			helpRequested = true;
		} else if (arg == "-o" && i + 1 < argc) {
			outputFile = argv[++i];
		} else if (arg == "--css" && i + 1 < argc) {
			opts.cssLink = argv[++i];
		} else if (arg == "--inline-css" && i + 1 < argc) {
			opts.cssInlinePath = argv[++i];
		} else if (arg[0] != '-') {
			if (!inputFile.empty()) {
				std::cerr << "Erro: mais de um arquivo de entrada fornecido.\n";
				return 1;
			}
			inputFile = arg;
		} else {
			std::cerr << "Opção desconhecida: " << arg << "\n";
			printUsage(argv[0]);
			return 1;
		}
	}

	if (helpRequested) {
		printUsage(argv[0]);
		return 0;
	}

	if (inputFile.empty()) {
		std::cerr << "Erro: nenhum arquivo de entrada fornecido.\n";
		printUsage(argv[0]);
		return 1;
	}

	if (!opts.cssLink.empty() && !opts.cssInlinePath.empty()) {
		std::cerr << "Erro: --css e --inline-css são mutuamente exclusivos.\n";
		return 1;
	}

	// ── Compile ───────────────────────────────────────────────────────────
	try {
		const std::string source = readFile(inputFile);

		LumiCompiler compiler;
		const std::string html = compiler.compile(source, opts);

		if (outputFile.empty()) {
			std::cout << html;
		} else {
			std::ofstream out(outputFile);
			if (!out.is_open())
				throw std::runtime_error("Não foi possível escrever em: " + outputFile);
			out << html;
			std::cerr << "✓ " << inputFile << "  →  " << outputFile << "\n";
		}

	} catch (const std::exception& e) {
		std::cerr << "Erro: " << e.what() << "\n";
		return 1;
	}

	return 0;
}
