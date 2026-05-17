# ──────────────────────────────────────────────────────────────────────────────
#  Lumi Compiler  ·  Makefile
# ──────────────────────────────────────────────────────────────────────────────

CXX      ?= g++
CXXFLAGS  = -std=c++17 -Wall -Wextra -Wpedantic -O2
TARGET    = lumic
SRCDIR    = src
SRCS      = $(SRCDIR)/main.cpp $(SRCDIR)/compiler.cpp
OBJS      = $(SRCS:.cpp=.o)
HEADER    = $(SRCDIR)/compiler.h

.PHONY: all clean install examples

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(CXXFLAGS) -o $@ $^
	@echo "✓ Compilado: $(TARGET)"

$(SRCDIR)/%.o: $(SRCDIR)/%.cpp $(HEADER)
	$(CXX) $(CXXFLAGS) -c -o $@ $<

# ── Convenience targets ───────────────────────────────────────────────────────

# Build and convert all .lm files in examples/
examples: $(TARGET)
	@for f in examples/*.lm; do \
	    out="$${f%.lm}.html"; \
	    ./$(TARGET) "$$f" -o "$$out" && echo "  $$f → $$out"; \
	done

# Install to /usr/local/bin (requires sudo)
install: $(TARGET)
	install -m 755 $(TARGET) /usr/local/bin/$(TARGET)
	@echo "✓ Instalado em /usr/local/bin/$(TARGET)"

clean:
	rm -f $(OBJS) $(TARGET)
	@echo "✓ Limpo"
