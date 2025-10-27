# Dictionaries Dialog Documentation

**Date:** October 27, 2025  
**Status:** ✅ **IMPLEMENTED**

---

## Overview

The Dictionaries Dialog replaces the simple "Rebuild" button with a comprehensive dictionary management interface. It provides granular control over individual repositories with separate pull and build operations.

## Features

### Repository Management
- **Individual Repository Control**: Manage `apertium-ido`, `apertium-epo`, and `apertium-ido-epo` separately
- **Pull Operations**: Fast git operations to fetch latest changes (5-10 seconds)
- **Build Operations**: Compilation and installation of dictionaries (2-5 minutes)
- **Status Indicators**: Visual feedback for each repository's state

### User Interface
- **Modal Dialog**: Clean, focused interface for dictionary management
- **Repository Cards**: Each repository displayed with detailed information
- **Real-time Updates**: Status changes reflected immediately
- **GitHub Integration**: Direct links to each repository

### Smart Operations
- **Update Detection**: Only show pull/build buttons when needed
- **Progress Tracking**: Real-time status updates during operations
- **Error Handling**: Clear error messages and recovery options
- **Refresh Capability**: Manual refresh to check latest status

## Repository Information Display

For each repository, the dialog shows:

### Basic Information
- **Repository Name**: e.g., `apertium-ido`
- **Label**: Human-readable name (ido, epo, bilingual)
- **GitHub Link**: Direct link to repository

### Version Information
- **Current Hash**: Currently deployed commit (first 7 characters)
- **Latest Hash**: Latest available commit from GitHub
- **Build Date**: When the repository was last built
- **Last Commit Date**: Date of the latest commit

### Status Indicators
- **Up to Date**: ✅ Repository is current (both pulled and built)
- **Needs Pull**: ⚠️ New commits available on GitHub
- **Needs Build**: 🔨 Local changes not yet built and installed

## Operations

### Pull Updates
**Purpose**: Fetch latest changes from GitHub repository  
**Duration**: 5-10 seconds  
**API Endpoint**: `POST /api/admin/pull-repo`

**Process:**
1. User clicks "Pull Updates" button
2. Frontend sends request to Cloudflare Worker
3. Worker forwards to EC2 webhook server
4. EC2 executes `docker exec ido-epo-apy /opt/apertium/pull-repo.sh <repo>`
5. Script performs `git fetch` and `git reset --hard`
6. Returns change information (commit count, hashes)
7. UI updates with new status

**Button States:**
- **Idle**: "Pull Updates" (enabled when updates available)
- **Running**: "Pulling..." (disabled, spinning icon)
- **Success**: Shows commit information
- **Error**: Shows error message

### Build & Install
**Purpose**: Compile and install dictionary changes  
**Duration**: 2-5 minutes  
**API Endpoint**: `POST /api/admin/build-repo`

**Process:**
1. User clicks "Build & Install" button
2. Frontend sends request to Cloudflare Worker
3. Worker forwards to EC2 webhook server
4. EC2 executes `docker exec ido-epo-apy /opt/apertium/build-repo.sh <repo>`
5. Script runs `./autogen.sh && ./configure && make && make install`
6. Updates system dictionary files
7. UI updates with build completion status

**Button States:**
- **Idle**: "Build & Install" (enabled when build needed)
- **Running**: "Building..." (disabled, spinning icon)
- **Success**: Shows build completion message
- **Error**: Shows build error details

## API Endpoints

### Enhanced Versions Endpoint
```typescript
GET /api/versions
Response: {
  appVersion: string,
  repos: [
    {
      label: "ido" | "epo" | "bilingual",
      owner: string,
      repo: string,
      version: string | null,
      buildDate: string | null,
      lastCommitDate: string | null,
      currentHash: string | null,
      latestHash: string | null,
      lastBuiltHash: string | null,
      needsPull: boolean,
      needsBuild: boolean,
      isUpToDate: boolean,
      githubUrl: string
    }
  ]
}
```

### Pull Repository Endpoint
```typescript
POST /api/admin/pull-repo
Body: { repo: "ido" | "epo" | "bilingual" }
Response: {
  status: "success" | "error",
  repo: string,
  changes: {
    hasChanges: boolean,
    oldHash: string,
    newHash: string,
    commitCount: number
  },
  message?: string,
  error?: string
}
```

### Build Repository Endpoint
```typescript
POST /api/admin/build-repo
Body: { repo: "ido" | "epo" | "bilingual" }
Response: {
  status: "accepted" | "error",
  repo: string,
  message: string,
  estimatedTime?: number,
  error?: string
}
```

## Backend Implementation

### Webhook Server Endpoints
The EC2 webhook server (`webhook-server.js`) handles three endpoints:

1. **`POST /pull-repo`**: Executes pull operation for specific repository
2. **`POST /build-repo`**: Executes build operation for specific repository  
3. **`POST /rebuild`**: Legacy full rebuild (maintained for compatibility)

### Shell Scripts

#### `pull-repo.sh`
```bash
#!/bin/bash
REPO=$1  # "ido", "epo", or "bilingual"

# Map to actual directories and branches
# Execute git fetch and reset --hard
# Output change information (OLD_HASH, NEW_HASH, CHANGED)
```

#### `build-repo.sh`
```bash
#!/bin/bash
REPO=$1  # "ido", "epo", or "bilingual"

# Navigate to repository directory
# Execute: make clean && ./autogen.sh && ./configure && make && make install
# Update library cache with ldconfig
```

## User Experience Flow

### Typical Workflow
1. **Open Dialog**: User clicks "Dictionaries" button
2. **View Status**: See which repositories need updates
3. **Pull Updates**: Click "Pull Updates" for repositories with new commits
4. **Review Changes**: See what changed (commit count, messages)
5. **Build Changes**: Click "Build & Install" for repositories that need building
6. **Monitor Progress**: Watch real-time status updates
7. **Completion**: All repositories show "Up to date" status

### Error Handling
- **Network Errors**: Clear messages about connectivity issues
- **Build Failures**: Detailed error logs from compilation
- **Permission Issues**: Guidance on resolving access problems
- **Recovery Options**: Retry buttons and manual refresh

## Benefits Over Previous System

### Granular Control
- **Individual Operations**: Update only what's changed
- **Faster Updates**: Pull operations complete in seconds
- **Selective Building**: Build only repositories that need it

### Better Information
- **Detailed Status**: See exactly what needs updating
- **Change Tracking**: Know what commits are being deployed
- **Build History**: Track when repositories were last built

### Improved Reliability
- **Separate Concerns**: Pull and build failures are isolated
- **Better Debugging**: Clear indication of where failures occur
- **Recovery Options**: Can retry individual operations

### Enhanced User Experience
- **Visual Feedback**: Clear status indicators and progress
- **Transparency**: Direct links to GitHub repositories
- **Efficiency**: No unnecessary operations

## Testing

### Manual Testing
1. **Open Dialog**: Verify all repositories load correctly
2. **Pull Operation**: Test pulling updates for each repository
3. **Build Operation**: Test building each repository individually
4. **Error Scenarios**: Test with network issues, build failures
5. **Status Updates**: Verify real-time status changes
6. **GitHub Links**: Confirm links open correct repositories

### API Testing
```bash
# Test pull operation
curl -X POST http://localhost:9100/pull-repo \
  -H "Content-Type: application/json" \
  -d '{"repo": "ido"}'

# Test build operation  
curl -X POST http://localhost:9100/build-repo \
  -H "Content-Type: application/json" \
  -d '{"repo": "ido"}'

# Test versions endpoint
curl http://localhost:5173/api/versions
```

## Migration from Rebuild Button

### Removed Components
- `RebuildButton.tsx` - Replaced by `DictionariesDialog.tsx`
- `UrlTranslator.tsx` - URL translation feature removed
- URL translation API endpoints and helper functions

### New Components
- `DictionariesDialog.tsx` - Main dialog component
- Enhanced API endpoints for granular operations
- New shell scripts for individual repository operations

### Maintained Compatibility
- Legacy `/api/admin/rebuild` endpoint still available
- Existing rebuild scripts still functional
- Docker container structure unchanged

## Future Enhancements

### Planned Improvements
- **Automatic Updates**: Scheduled pulls and builds
- **Build Logs**: Expandable detailed build output
- **Rollback Capability**: Revert to previous versions
- **Batch Operations**: "Update All" functionality

### Advanced Features
- **Build Notifications**: Desktop notifications for completion
- **Version History**: Track deployment history
- **Health Checks**: Verify translation quality after builds
- **Staging Environment**: Test builds before production

## Troubleshooting

### Common Issues

#### Dialog Won't Open
- Check browser console for JavaScript errors
- Verify API endpoints are accessible
- Check network connectivity

#### Pull Operations Fail
- Verify git repositories are accessible
- Check network connectivity to GitHub
- Ensure proper permissions in Docker container

#### Build Operations Fail
- Check build dependencies are installed
- Verify disk space availability
- Review build logs for compilation errors

#### Status Not Updating
- Click "Refresh" button to reload data
- Check API endpoint responses
- Verify webhook server is running

### Debug Commands
```bash
# Check container status
docker exec ido-epo-apy ls -la /opt/apertium/

# Test pull script directly
docker exec ido-epo-apy /opt/apertium/pull-repo.sh ido

# Test build script directly  
docker exec ido-epo-apy /opt/apertium/build-repo.sh ido

# Check webhook server logs
sudo tail -f /var/log/apertium-rebuild.log
```

## Documentation Updates

### Files Updated
- `README.md` - Updated features and usage instructions
- `STATUS.md` - Updated feature list and architecture
- `TODO.md` - Updated priorities and removed URL translation
- `DICTIONARIES_DIALOG.md` - This comprehensive documentation

### Files Removed
- `REBUILD_BUTTON_IMPROVEMENTS.md` - Superseded by this document
- `REBUILD_BUTTON_FIX_SUMMARY.md` - Historical, archived
- `REBUILD_TEST_PLAN.md` - Needs updating for new system

---

## Summary

The Dictionaries Dialog provides a modern, comprehensive interface for managing translation dictionaries with granular control, better information, and improved user experience. It replaces the simple rebuild button with a sophisticated system that separates pull and build operations for better efficiency and reliability.

**Status**: ✅ Fully implemented and ready for testing
**Next Steps**: Manual testing, documentation updates, deployment