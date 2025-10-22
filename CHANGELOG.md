# Changelog

All notable changes to Ido-Esperanto Web Translator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Fixed rebuild button mechanism after repository rename from `vortaro` to `ido-epo-translator`
- Updated `apy-server/Dockerfile` to include git repositories and rebuild scripts for local development
- Corrected broken GitHub URL in `rebuild-self-updating.sh`
- Fixed docker-compose.yml volume mounts to point to correct paths
- Added build tools and apertium-all-dev to Docker image for rebuild capability

### Changed
- Docker setup now supports rebuild functionality both locally and in production
- Updated apy-server/README.md with comprehensive documentation of deployment modes
- Clarified difference between development and production Docker setups
- Volume mounts in docker-compose.yml are now optional and commented out by default

### Removed
- Remove unused CI workflows (APy to App Runner/EC2/Fly.io, Firebase, GitHub Pages)

### Changed (Repository)
- Repository renamed from `vortaro` to `ido-epo-translator`
- Name clarification: this is the full Apertium-powered translator
- `vortaro` name reserved for future simple dictionary app

### Added
- `build:pages` script for GitHub Pages builds (now deprecated after Cloudflare adoption)

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

[1.0.0]: https://github.com/komapc/ido-epo-translator/releases/tag/v1.0.0

