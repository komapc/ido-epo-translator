# Changelog

All notable changes to Ido-Esperanto Web Translator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Dictionaries Dialog**: Comprehensive dictionary management interface
  - Individual repository control for ido, epo, and bilingual dictionaries
  - Separate "Pull Updates" and "Build & Install" operations
  - Real-time status updates and progress indicators
  - GitHub integration with direct repository links
  - Smart update detection (only show actions when needed)
- **New API Endpoints**: 
  - `POST /api/admin/pull-repo` for git pull operations
  - `POST /api/admin/build-repo` for compilation and installation
- **Enhanced Version API**: Extended `/api/versions` with build status and update indicators
- **New Shell Scripts**: `pull-repo.sh` and `build-repo.sh` for granular operations

### Changed
- **Replaced Rebuild Button**: Simple rebuild button replaced with comprehensive dictionaries dialog
- **Enhanced Webhook Server**: Added support for individual repository operations
- **Improved User Experience**: Better visibility into dictionary status and update process
- **Updated Documentation**: Comprehensive documentation for new dictionary management system

### Removed
- **URL Translation Feature**: Removed webpage translation functionality
  - Deleted `UrlTranslator.tsx` component
  - Removed `/api/translate-url` endpoint
  - Removed URL translation helper functions
- **Old Rebuild Button**: Replaced `RebuildButton.tsx` with `DictionariesDialog.tsx`
### Fixed
- Fixed Dockerfile deployment failure by removing non-existent apt packages (apertium-ido, apertium-ido-epo)
- Updated Dockerfile to clone from komapc/apertium-ido instead of non-existent apertium/apertium-ido
- Added build-from-source for apertium-ido and apertium-ido-epo to ensure latest versions with fixes

- Fixed number recognition in Ido morphological analysis - numbers now properly categorized as numerals instead of nouns

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

