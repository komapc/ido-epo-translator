#!/bin/bash
# Add /status endpoint to webhook server to report current git hashes

echo "=== Adding /status endpoint to webhook server ==="
echo ""

# Create the status endpoint code
cat > /tmp/status-endpoint.js << 'EOF'
        } else if (req.url === '/status') {
            // Get current status of all repositories
            try {
                const { spawn } = require('child_process');
                const repos = ['ido', 'epo', 'bilingual'];
                const repoMap = {
                    'ido': '/opt/apertium/apertium-ido',
                    'epo': '/opt/apertium/apertium-epo',
                    'bilingual': '/opt/apertium/apertium-ido-epo'
                };
                
                const getRepoStatus = (repo) => {
                    return new Promise((resolve) => {
                        const repoDir = repoMap[repo];
                        const git = spawn('git', ['-C', repoDir, 'rev-parse', 'HEAD']);
                        let hash = '';
                        
                        git.stdout.on('data', (data) => {
                            hash += data.toString().trim();
                        });
                        
                        git.on('close', (code) => {
                            if (code === 0) {
                                resolve({ repo, currentHash: hash });
                            } else {
                                resolve({ repo, currentHash: null });
                            }
                        });
                        
                        git.on('error', () => {
                            resolve({ repo, currentHash: null });
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
EOF

# SSH to EC2 and add the endpoint
echo "1. Backing up webhook server..."
ssh ec2-translator "sudo cp /opt/webhook-server.js /opt/webhook-server.js.backup-$(date +%Y%m%d-%H%M%S)"

echo ""
echo "2. Adding /status endpoint..."
# Find the line before the final 'else' and insert the new endpoint
ssh ec2-translator "sudo sed -i '/} else {$/i\\        } else if (req.url === \x27/status\x27) {\n            try {\n                const repos = [\x27ido\x27, \x27epo\x27, \x27bilingual\x27];\n                const repoMap = {\n                    \x27ido\x27: \x27/opt/apertium/apertium-ido\x27,\n                    \x27epo\x27: \x27/opt/apertium/apertium-epo\x27,\n                    \x27bilingual\x27: \x27/opt/apertium/apertium-ido-epo\x27\n                };\n                \n                const getRepoStatus = (repo) => {\n                    return new Promise((resolve) => {\n                        const repoDir = repoMap[repo];\n                        const git = spawn(\x27git\x27, [\x27-C\x27, repoDir, \x27rev-parse\x27, \x27HEAD\x27]);\n                        let hash = \x27\x27;\n                        \n                        git.stdout.on(\x27data\x27, (data) => {\n                            hash += data.toString().trim();\n                        });\n                        \n                        git.on(\x27close\x27, (code) => {\n                            if (code === 0) {\n                                resolve({ repo, currentHash: hash });\n                            } else {\n                                resolve({ repo, currentHash: null });\n                            }\n                        });\n                        \n                        git.on(\x27error\x27, () => {\n                            resolve({ repo, currentHash: null });\n                        });\n                    });\n                };\n                \n                const statuses = await Promise.all(repos.map(getRepoStatus));\n                \n                res.writeHead(200, { \x27Content-Type\x27: \x27application/json\x27 });\n                res.end(JSON.stringify({\n                    status: \x27ok\x27,\n                    repositories: statuses\n                }));\n            } catch (err) {\n                res.writeHead(500, { \x27Content-Type\x27: \x27application/json\x27 });\n                res.end(JSON.stringify({\n                    status: \x27error\x27,\n                    error: err.message || \x27Unknown error\x27\n                }));\n            }' /opt/webhook-server.js"

echo ""
echo "3. Restarting webhook server..."
ssh ec2-translator "sudo systemctl restart webhook-server"
sleep 3

echo ""
echo "4. Testing /status endpoint..."
curl -s "http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:8081/status" | python3 -m json.tool || echo "Failed to get status"

echo ""
echo "=== Status endpoint added ==="
