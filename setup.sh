#!/usr/bin/env bash
#
# CortezIA Island — Setup Automatizado
# ====================================
#
# Faz tudo:
#   1. Verifica/instala dependências (Node, pnpm, Rust, Tauri CLI, libs Linux)
#   2. Instala dependências do frontend
#   3. Gera ícone padrão da bandeja
#   4. Verifica build
#
# Uso:
#   chmod +x setup.sh
#   ./setup.sh            # setup completo
#   ./setup.sh --dev      # só dev, pula verificação de build
#   ./setup.sh --check    # só verifica dependências
#
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

MODE="${1:-full}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
HAS_ERROR=0

log()       { echo -e "${BLUE}[cortezia]${NC} $*"; }
success()   { echo -e "${GREEN}[✓]${NC} $*"; }
warn()      { echo -e "${YELLOW}[!]${NC} $*"; }
error()     { echo -e "${RED}[✗]${NC} $*"; HAS_ERROR=1; }
header()    { echo -e "\n${BOLD}━━━ $* ━━━${NC}"; }

# ─── Detecção de SO ───────────────────────────────────────────────────────────

detect_os() {
    case "$(uname -s)" in
        Linux*)  OS="linux";;
        MINGW*|MSYS*|CYGWIN*) OS="windows";;
        *)       OS="unknown";;
    esac
}

# ─── Verificação de binários ──────────────────────────────────────────────────

check_cmd() {
    local name="$1"
    local check="${2:-$1}"
    local install_hint="${3:-}"

    if command -v "$check" &>/dev/null; then
        local ver
        ver=$("$check" --version 2>&1 | head -1 || echo "ok")
        success "$name — $ver"
        return 0
    else
        error "$name não encontrado"
        [ -n "$install_hint" ] && echo -e "       ${YELLOW}→ $install_hint${NC}"
        return 1
    fi
}

check_version() {
    local name="$1"
    local cmd="$2"
    local min="$3"
    local version
    version=$($cmd --version 2>&1 | grep -oP '\d+\.\d+' | head -1 || echo "0.0")

    if [ "$(printf '%s\n' "$min" "$version" | sort -V | head -1)" = "$min" ]; then
        success "$name $version (>= $min)"
        return 0
    else
        error "$name $version (mínimo $min)"
        return 1
    fi
}

# ─── Instalação Linux ─────────────────────────────────────────────────────────

install_linux_deps() {
    header "Dependências Linux (GTK + WebKit)"

    if command -v apt &>/dev/null; then
        log "Detectado: apt (Ubuntu/Debian)"
        local pkgs=(
            libwebkit2gtk-4.1-dev
            libgtk-3-dev
            libayatana-appindicator3-dev
            librsvg2-dev
            libssl-dev
            libjavascriptcoregtk-4.1-dev
            libsoup-3.0-dev
            build-essential
            curl
            wget
        )

        local missing=()
        for pkg in "${pkgs[@]}"; do
            dpkg -s "$pkg" &>/dev/null || missing+=("$pkg")
        done

        if [ ${#missing[@]} -gt 0 ]; then
            warn "Pacotes faltando: ${missing[*]}"
            log "Executando: sudo apt install -y ${missing[*]}"
            sudo apt update -qq
            sudo apt install -y "${missing[@]}"
            success "Pacotes instalados"
        else
            success "Todos os pacotes já instalados"
        fi
    elif command -v dnf &>/dev/null; then
        log "Detectado: dnf (Fedora)"
        sudo dnf install -y \
            webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel \
            librsvg2-devel openssl-devel libsoup3-devel
    elif command -v pacman &>/dev/null; then
        log "Detectado: pacman (Arch)"
        sudo pacman -S --needed \
            webkit2gtk-4.1 gtk3 libappindicator-gtk3 librsvg
    else
        warn "Gerenciador de pacotes não detectado. Instale manualmente:"
        echo "       libwebkit2gtk-4.1-dev libgtk-3-dev libappindicator3-dev librsvg2-dev"
    fi
}

# ─── Instalação Rust ──────────────────────────────────────────────────────────

install_rust() {
    if command -v rustc &>/dev/null; then
        check_version "rustc" "rustc" "1.80" && return
    fi

    header "Instalando Rust"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
    # shellcheck disable=SC1090,SC1091
    source "$HOME/.cargo/env"

    # Garante toolchain estável
    rustup default stable
    rustup update
    success "Rust instalado: $(rustc --version)"
}

# ─── Instalação Tauri CLI ─────────────────────────────────────────────────────

install_tauri_cli() {
    if command -v cargo-tauri &>/dev/null; then
        success "Tauri CLI — $(cargo tauri --version)"
        return
    fi

    log "Instalando Tauri CLI..."
    cargo install tauri-cli --version "^2"
    success "Tauri CLI instalado"
}

# ─── Geração de ícone ─────────────────────────────────────────────────────────

generate_icon() {
    local icon_dir="$PROJECT_DIR/src-tauri/icons"
    local icon_file="$icon_dir/icon.png"

    if [ -f "$icon_file" ]; then
        success "Ícone já existe: icons/icon.png"
        return
    fi

    header "Gerando ícone da bandeja"

    python3 -c "
import struct, zlib

def chunk(ct, data):
    c = ct + data
    crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    return struct.pack('>I', len(data)) + c + crc

w, h = 32, 32
ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
raw = b''
for y in range(h):
    raw += b'\x00'
    for x in range(w):
        cx, cy, r = w//2, h//2, min(w, h)//2 - 1
        d = ((x-cx)**2 + (y-cy)**2) ** 0.5
        if d <= r:
            raw += bytes([0x0a, 0x84, 0xff, 255])
        elif d <= r + 1:
            raw += bytes([0x0a, 0x84, 0xff, 180])
        else:
            raw += bytes([0, 0, 0, 0])
idat = chunk(b'IDAT', zlib.compress(raw))
iend = chunk(b'IEND', b'')
png = b'\x89PNG\r\n\x1a\n' + ihdr + idat + iend
with open('$icon_file', 'wb') as f: f.write(png)
with open('$icon_dir/32x32.png', 'wb') as f: f.write(png)
print('ok')
" 2>/dev/null && success "Ícone 32x32 gerado" || warn "Python3 não disponível — crie manualmente src-tauri/icons/icon.png (32x32 PNG)"
}

# ─── Instalação Frontend ──────────────────────────────────────────────────────

install_frontend() {
    header "Instalando dependências frontend"

    cd "$PROJECT_DIR"

    pnpm approve-builds esbuild 2>/dev/null || true
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    success "Frontend instalado"
}

# ─── Verificação de build ─────────────────────────────────────────────────────

verify_build() {
    header "Verificando build"

    cd "$PROJECT_DIR"

    log "Compilando frontend..."
    pnpm build || {
        error "Build do frontend falhou"
        return 1
    }
    success "Frontend compilado"

    log "Verificando compilação Rust (cargo check)..."
    cargo check --manifest-path src-tauri/Cargo.toml 2>&1 | tail -3 || {
        error "Cargo check falhou — verifique as dependências Rust"
        return 1
    }
    success "Rust compila sem erros"
}

# ─── Main ──────────────────────────────────────────────────────────────────────

main() {
    echo -e "${BOLD}"
    echo "  ╔═══════════════════════════════════╗"
    echo "  ║   CortezIA Island — Setup        ║"
    echo "  ╚═══════════════════════════════════╝"
    echo -e "${NC}"

    detect_os

    # Sempre verifica
    header "Verificando dependências"
    check_cmd "node"   "node"   "Instale: https://nodejs.org ou asdf install nodejs"
    check_cmd "pnpm"   "pnpm"   "Instale: npm install -g pnpm"
    check_cmd "rustc"  "rustc"  "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"

    if [ "$MODE" = "--check" ]; then
        echo ""
        [ $HAS_ERROR -eq 0 ] && success "Todas dependências OK" || error "Algumas dependências faltando"
        exit $HAS_ERROR
    fi

    # Instala Rust se faltar
    install_rust
    install_tauri_cli

    # Dependências de SO
    [ "$OS" = "linux" ] && install_linux_deps

    # Frontend
    install_frontend

    # Ícone
    generate_icon

    # Verificação final
    [ "$MODE" != "--dev" ] && verify_build

    # Resumo
    echo ""
    echo -e "${BOLD}${GREEN}╔═══════════════════════════════════╗${NC}"
    echo -e "${BOLD}${GREEN}║   Setup concluído com sucesso!    ║${NC}"
    echo -e "${BOLD}${GREEN}╚═══════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BOLD}Para iniciar em dev:${NC}"
    echo -e "    ${GREEN}pnpm tauri dev${NC}"
    echo ""
    echo -e "  ${BOLD}Para build de produção:${NC}"
    echo -e "    ${GREEN}pnpm tauri build${NC}"
    echo ""
    echo -e "  ${BOLD}Para testar o hook:${NC}"
    echo -e "    ${GREEN}node scripts/ai-hook.js${NC}"
    echo ""
}

main
