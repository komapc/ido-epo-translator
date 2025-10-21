# Changelog

All notable changes to Ido-Esperanto Web Translator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Repository renamed from `vortaro` to `ido-epo-translator`
- Name clarification: this is the full Apertium-powered translator
- `vortaro` name reserved for future simple dictionary app

### Added
- GitHub Pages deployment workflow
- `build:pages` script for GitHub Pages builds

## [1.0.0] - 2025-10-21

### Added
- Initial release of Vortaro as standalone repository
- Moved from apertium-ido-epo/tools/web/ido-epo-translator-web
- Ido ↔ Esperanto text translation
- URL translation with side-by-side comparison
- Color-coded translation output (unknown words, errors, ambiguities)
- Quality score display
- Smart rebuild button with progress tracking
- Dictionary version display for apertium-ido, apertium-epo, and apertium-ido-epo
- Cloudflare Worker deployment with EC2 APy backend
- Docker-based local development environment
- Comprehensive documentation

### Changed
- Repository renamed from `ido-epo-translator-web` to `vortaro`
- Package name updated to `vortaro`
- Fresh version numbering starting at 1.0.0

[1.0.0]: https://github.com/komapc/vortaro/releases/tag/v1.0.0

