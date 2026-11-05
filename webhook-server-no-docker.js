#!/usr/bin/env node
/**
 * Webhook server for EC2 to trigger Apertium rebuilds
 * NO DOCKER VERSION - runs scripts directly on host
 * Listens on port 8081 and executes rebuild scripts directly
 */

const http = require('http');
const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');

const PORT = process.env.PORT || 8081;
const SHARED_SECRET = process.env.REBUILD_SHARED_SECRET || '';
const LOG_FILE = '/var/log/apertium-rebuild.log';
const MAX_BODY_BYTES = 10 * 1024;

// Fail closed: every endpoint (including /rebuild, which runs `make -B` on a
// 1GB box) is reachable from the internet, so never serve without a secret.
if (!SHARED_SECRET) {
    console.error('REBUILD_SHARED_SECRET is not set; refusing to start.');
    process.exit(1);
}

const tokenMatches = (token) => {
    if (typeof token !== 'string') return false;
    const a = Buffer.from(token);
    const b = Buffer.from(SHARED_SECRET);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Only one pull/build/rebuild at a time: two concurrent `make` runs OOM the
// box, and a client timeout + retry would otherwise start a second one.
let busyWith = null;

// Builds outlast Cloudflare's request timeout, so /build-repo and /rebuild answer
// 202 straight away and clients poll /operation. In memory on purpose: after a
// webhook restart this is null, which clients report as "status lost".
let lastOperation = null;
const LOG_TAIL_LINES = 30;
const logTail = (text) => (text || '').trim().split('\n').slice(-LOG_TAIL_LINES).join('\n');

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

// Execute rebuild script directly (no Docker)
const executeRebuild = () => {
    return new Promise((resolve, reject) => {
        log('Starting rebuild process...');

        const rebuild = spawn('/opt/apertium/rebuild.sh', []);

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

        const pull = spawn('/opt/apertium/pull-repo.sh', [repo]);

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

        const build = spawn('/opt/apertium/build-repo.sh', [repo]);

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

    // Accept POST for most endpoints, GET for the read-only ones
    if (req.method !== 'POST' && !(req.method === 'GET' && ['/status', '/operation'].includes(req.url))) {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    log(`Received ${req.method} ${req.url} from ${req.socket.remoteAddress}`);

    if (!tokenMatches(req.headers['x-rebuild-token'])) {
        log('Request rejected: invalid token');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
    }

    // Parse request body
    let body = '';
    let tooLarge = false;
    req.on('data', chunk => {
        if (tooLarge) return;
        body += chunk.toString();
        if (body.length > MAX_BODY_BYTES) {
            tooLarge = true;
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request body too large' }));
            req.destroy();
        }
    });

    req.on('end', async () => {
        if (tooLarge) return;

        const mutating = ['/rebuild', '/pull-repo', '/build-repo'].includes(req.url);
        if (mutating && busyWith) {
            log(`Request rejected: busy with ${busyWith}`);
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Another operation is in progress: ${busyWith}` }));
            return;
        }
        if (mutating) busyWith = req.url;
        try {
            await handleRoute(req, res, body);
        } finally {
            // Released only once the child process has exited, not when the
            // client disconnects — the build keeps running after a timeout.
            if (mutating) busyWith = null;
        }
    });
});

// Answer 202 now and resolve only when the child exits, so the busy lock in the
// caller is held for the whole build.
const runInBackground = async (res, op, repo, run) => {
    lastOperation = { op, repo, state: 'running', startedAt: new Date().toISOString() };
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'accepted', repo, message: `${op} started` }));
    try {
        const result = await run();
        lastOperation = { ...lastOperation, state: 'success', finishedAt: new Date().toISOString(), logTail: logTail(result.stdout) };
    } catch (err) {
        lastOperation = {
            ...lastOperation,
            state: 'failed',
            finishedAt: new Date().toISOString(),
            error: err.error || `Exit code ${err.code}`,
            logTail: logTail(`${err.stdout || ''}\n${err.stderr || ''}`),
        };
    }
};

const handleRoute = async (req, res, body) => {
    let requestData = {};
    try {
        requestData = JSON.parse(body);
    } catch (e) {
        // Ignore parse errors for empty body
    }

    // Route handling
    if (req.url === '/rebuild') {
        // Full rebuild
        await runInBackground(res, 'rebuild', null, executeRebuild);
    } else if (req.url === '/pull-repo') {
        // Pull specific repository
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
                repo,
                changes: result.changes,
                message: result.changes.hasChanges ?
                    `Updated: ${result.changes.commitCount} new commits` :
                    'Already up to date'
            }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'error',
                repo,
                message: 'Pull failed',
                error: err.error || 'Unknown error'
            }));
        }
    } else if (req.url === '/build-repo') {
        // Build specific repository
        const repo = requestData.repo;
        if (!repo || !['ido', 'epo', 'bilingual'].includes(repo)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid repo parameter' }));
            return;
        }

        await runInBackground(res, 'build', repo, () => executeBuild(repo));
    } else if (req.url === '/operation') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ busy: !!busyWith, operation: lastOperation }));
    } else if (req.url === '/status') {
        // Get current status of all repositories
        try {
            const repos = ['ido', 'epo', 'bilingual'];
            const repoMap = {
                'ido': '/opt/apertium/apertium-ido',
                'epo': '/opt/apertium/apertium-epo',
                'bilingual': '/opt/apertium/apertium-ido-epo'
            };

            const getRepoStatus = (repo) => {
                return new Promise((resolve) => {
                    const repoDir = repoMap[repo];
                    // Get hash, date, and commit message
                    const git = spawn('git', ['-C', repoDir, 'log', '-1', '--format=%H|%cI|%s']);
                    let output = '';

                    git.stdout.on('data', (data) => {
                        output += data.toString().trim();
                    });

                    git.on('close', (code) => {
                        if (code === 0 && output) {
                            const [hash, date, message] = output.split('|');
                            resolve({
                                repo,
                                currentHash: hash,
                                commitDate: date,
                                commitMessage: message
                            });
                        } else {
                            resolve({
                                repo,
                                currentHash: null,
                                commitDate: null,
                                commitMessage: null
                            });
                        }
                    });

                    git.on('error', () => {
                        resolve({
                            repo,
                            currentHash: null,
                            commitDate: null,
                            commitMessage: null
                        });
                    });
                });
            };

            const statuses = await Promise.all(repos.map(getRepoStatus));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                repositories: statuses
            }));
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'error',
                error: err.message || 'Unknown error'
            }));
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
};

// Start server
server.listen(PORT, '0.0.0.0', () => {
    log(`Webhook server listening on http://0.0.0.0:${PORT}`);
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
