#!/usr/bin/env bash
# Install system dependencies for Better Shot X development.
#
# Usage: ./scripts/install-deps.sh [distro]
# Where distro is one of: ubuntu, debian, fedora, arch, manjaro, opensuse
# If omitted, auto-detect from /etc/os-release.

set -euo pipefail

detect_distro() {
  if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    case "${ID:-}${VERSION_ID:-}" in
      ubuntu*|pop*|mint*|elementary*|zorin*) echo "ubuntu" ;;
      debian*) echo "debian" ;;
      fedora*) echo "fedora" ;;
      arch*) echo "arch" ;;
      manjaro*) echo "manjaro" ;;
      opensuse*|sles*) echo "opensuse" ;;
      *) echo "unknown" ;;
    esac
  else
    echo "unknown"
  fi
}

DISTRO="${1:-$(detect_distro)}"

echo "Detected distro: ${DISTRO}"

case "${DISTRO}" in
  ubuntu|debian|pop|mint)
    if [[ "${DISTRO}" == "debian" ]]; then
      # Debian needs the apt source for webkit2gtk-4.1
      :
    fi
    sudo apt-get update
    sudo apt-get install -y \
      libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
      librsvg2-dev libavutil-dev libavformat-dev libavcodec-dev \
      libavfilter-dev libavdevice-dev libswscale-dev libswresample-dev \
      libleptonica-dev libtesseract-dev libclang-dev clang \
      pkg-config build-essential patchelf
    ;;
  fedora)
    sudo dnf install -y \
      webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel \
      librsvg2-devel ffmpeg-free-devel tesseract-devel leptonica-devel \
      clang-devel pkg-config patchelf
    ;;
  arch|manjaro)
    sudo pacman -Syu --noconfirm
    sudo pacman -S --noconfirm \
      webkit2gtk-4.1 gtk3 libappindicator-gtk3 librsvg2 \
      ffmpeg tesseract leptonica clang pkgconf base-devel patchelf
    ;;
  opensuse)
    sudo zypper refresh
    sudo zypper install -y \
      webkit2gtk4.1-devel gtk3-devel libappindicator3-devel \
      librsvg2-devel ffmpeg-devel tesseract-devel leptonica-devel \
      clang-devel pkg-config patchelf
    ;;
  *)
    echo "Unsupported distro: ${DISTRO}"
    echo "Please install manually: webkit2gtk-4.1, gtk3, libappindicator, librsvg2,"
    echo "ffmpeg, tesseract, leptonica, clang, pkg-config, build-essential, patchelf."
    exit 1
    ;;
esac

echo ""
echo "System dependencies installed. Verify with:"
echo "  cargo check --workspace"
