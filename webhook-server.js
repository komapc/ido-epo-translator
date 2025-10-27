#!/usr/bin/env node
/**
 * Simple webhook server for EC2 to trigger Apertium rebuilds
 * Listens on port 9100 and executes the rebuild script in Docker
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const PORT = process.env.PORT || 9100;
const SHARED_SECRET = process.env.REBUILD_SHARED_SECRET || '';
const LOG_FILE = '/var/log/apertium-rebuild.log';

// Log helper
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  console.log(logLine.trim());
  try {
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (err) {
    console.error('Failed to write to log file:', err.message);
  }
};

// Execute rebuild script in Docker container
const executeRebuild = () => {
  return new Promise((resolve, reject) => {
    log('Starting rebuild process...');

    const rebuild = spawn('docker', [
      'exec',
      'ido-epo-apy',
      '/opt/apertium/rebuild.sh'
    ]);

    let stdout = '';
    let stderr = '';

    rebuild.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      log(`STDOUT: ${output.trim()}`);
    });

    rebuild.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      log(`STDERR: ${output.trim()}`);
    });

    rebuild.on('close', (code) => {
      if (code === 0) {
        log('Rebuild completed successfully');
        resolve({ success: true, stdout, stderr });
      } else {
        log(`Rebuild failed with code ${code}`);
        reject({ success: false, code, stdout, stderr });
      }
    });

    rebuild.on('error', (err) => {
      log(`Failed to start rebuild: ${err.message}`);
      reject({ success: false, error: err.message });
    });
  });
};

// Execute pull operation for a specific repository
const executePull = (repo) => {
  return new Promise((resolve, reject) => {
    log(`Starting pull for repository: ${repo}`);

    const pull = spawn('docker', [
      'exec',
      'ido-epo-apy',
      '/opt/apertium/pull-repo.sh',
      repo
    ]);

    let stdout = '';
    let stderr = '';

    pull.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      log(`PULL ${repo} STDOUT: ${output.trim()}`);
    });

    pull.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      log(`PULL ${repo} STDERR: ${output.trim()}`);
    });

    pull.on('close', (code) => {
      if (code === 0) {
        log(`Pull completed successfully for ${repo}`);
        // Parse output for change information
        const hasChanges = stdout.includes('CHANGED=true');
        const oldHashMatch = stdout.match(/OLD_HASH=([a-f0-9]+)/);
        const newHashMatch = stdout.match(/NEW_HASH=([a-f0-9]+)/);

        resolve({
          success: true,
          stdout,
          stderr,
          changes: {
            hasChanges,
            oldHash: oldHashMatch ? oldHashMatch[1] : null,
            newHash: newHashMatch ? newHashMatch[1] : null,
            commitCount: hasChanges ? 1 : 0 // Simplified for now
          }
        });
      } else {
        log(`Pull failed for ${repo} with code ${code}`);
        reject({ success: false, code, stdout, stderr });
      }
    });

    pull.on('error', (err) => {
      log(`Failed to start pull for ${repo}: ${err.message}`);
      reject({ success: false, error: err.message });
    });
  });
};

// Execute build operation for a specific repository
const executeBuild = (repo) => {
  return new Promise((resolve, reject) => {
    log(`Starting build for repository: ${repo}`);

    const build = spawn('docker', [
      'exec',
      'ido-epo-apy',
      '/opt/apertium/build-repo.sh',
      repo
    ]);

    let stdout = '';
    let stderr = '';

    build.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      log(`BUILD ${repo} STDOUT: ${output.trim()}`);
    });

    build.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      log(`BUILD ${repo} STDERR: ${output.trim()}`);
    });

    build.on('close', (code) => {
      if (code === 0) {
        log(`Build completed successfully for ${repo}`);
        resolve({ success: true, stdout, stderr });
      } else {
        log(`Build failed for ${repo} with code ${code}`);
        reject({ success: false, code, stdout, stderr });
      }
    });

    build.on('error', (err) => {
      log(`Failed to start build for ${repo}: ${err.message}`);
      reject({ success: false, error: err.message });
    });
  });
};

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Rebuild-Token');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Parse request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const requestData = JSON.parse(body || '{}');

      // Verify shared secret if configured
      if (SHARED_SECRET) {
        const token = req.headers['x-rebuild-token'];
        if (token !== SHARED_SECRET) {
          log('Request rejected: invalid token');
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }
      }

      log(`Received ${req.url} request from ${req.socket.remoteAddress}`);

      // Handle different endpoints
      if (req.url === '/pull-repo') {
        const repo = requestData.repo;
        if (!repo || !['ido', 'epo', 'bilingual'].includes(repo)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid repo parameter' }));
          return;
        }

        try {
          const result = await executePull(repo);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'success',
            message: `Repository ${repo} pulled successfully`,
            changes: result.changes,
            log: result.stdout.split('\n').slice(-10).join('\n')
          }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'error',
            message: `Pull failed for ${repo}`,
            error: err.error || 'Unknown error',
            log: (err.stderr || err.stdout || '').split('\n').slice(-10).join('\n')
          }));
        }
      } else if (req.url === '/build-repo') {
        const repo = requestData.repo;
        if (!repo || !['ido', 'epo', 'bilingual'].includes(repo)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid repo parameter' }));
          return;
        }

        try {
          const result = await executeBuild(repo);
          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'accepted',
            message: `Repository ${repo} built successfully`,
            log: result.stdout.split('\n').slice(-20).join('\n')
          }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'error',
            message: `Build failed for ${repo}`,
            error: err.error || 'Unknown error',
            log: (err.stderr || err.stdout || '').split('\n').slice(-20).join('\n')
          }));
        }
      } else if (req.url === '/rebuild') {
        // Keep existing full rebuild functionality
        try {
          const result = await executeRebuild();
          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'accepted',
            message: 'Rebuild completed successfully',
            log: result.stdout.split('\n').slice(-20).join('\n')
          }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'error',
            message: 'Rebuild failed',
            error: err.error || 'Unknown error',
            log: (err.stderr || err.stdout || '').split('\n').slice(-20).join('\n')
          }));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (parseError) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    }
  });
});

// Start server
server.listen(PORT, '127.0.0.1', () => {
  log(`Webhook server listening on http://127.0.0.1:${PORT}`);
  log(`Shared secret ${SHARED_SECRET ? 'enabled' : 'disabled'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    log('Server closed');
    process.exit(0);
  });
});

