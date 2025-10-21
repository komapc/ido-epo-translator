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

  // Only accept POST to /rebuild
  if (req.method !== 'POST' || req.url !== '/rebuild') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  log(`Received rebuild request from ${req.socket.remoteAddress}`);

  // Verify shared secret if configured
  if (SHARED_SECRET) {
    const token = req.headers['x-rebuild-token'];
    if (token !== SHARED_SECRET) {
      log('Rebuild request rejected: invalid token');
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
  }

  // Execute rebuild
  try {
    const result = await executeRebuild();
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'accepted',
      message: 'Rebuild completed successfully',
      log: result.stdout.split('\n').slice(-20).join('\n') // Last 20 lines
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

