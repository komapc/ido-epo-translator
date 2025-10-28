#!/bin/bash
# Add /status endpoint to webhook server

echo "=== Adding /status endpoint ==="

# Create a script on EC2 that adds the endpoint
ssh ec2-translator 'cat > /tmp/add-status.js << '\''ENDSCRIPT'\''
const fs = require('\''fs'\'');

const statusEndpoint = `        } else if (req.url === '\''/status'\'') {
            // Get current status of all repositories
            try {
                const repos = ['\''ido'\'', '\''epo'\'', '\''bilingual'\''];
                const repoMap = {
                    '\''ido'\'': '\''/opt/apertium/apertium-ido'\'',
                    '\''epo'\'': '\''/opt/apertium/apertium-epo'\'',
                    '\''bilingual'\'': '\''/opt/apertium/apertium-ido-epo'\''
                };
                
                const getRepoStatus = (repo) => {
                    return new Promise((resolve) => {
                        const repoDir = repoMap[repo];
                        // Get hash, date, and commit message
                        const git = spawn('\''git'\'', ['\''-C'\'', repoDir, '\''log'\'', '\''-1'\'', '\''--format=%H|%cI|%s'\'']);
                        let output = '\'''\'';
                        
                        git.stdout.on('\''data'\'', (data) => {
                            output += data.toString().trim();
                        });
                        
                        git.on('\''close'\'', (code) => {
                            if (code === 0 && output) {
                                const [hash, date, message] = output.split('\''|'\'');
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
                        
                        git.on('\''error'\'', () => {
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
                
                res.writeHead(200, { '\''Content-Type'\'': '\''application/json'\'' });
                res.end(JSON.stringify({
                    status: '\''ok'\'',
                    repositories: statuses
                }));
            } catch (err) {
                res.writeHead(500, { '\''Content-Type'\'': '\''application/json'\'' });
                res.end(JSON.stringify({
                    status: '\''error'\'',
                    error: err.message || '\''Unknown error'\''
                }));
            }`;

// Read the file
let content = fs.readFileSync('\''/opt/webhook-server.js'\'', '\''utf8'\'');

// Find the last "} else {" and insert before it
const lastElse = content.lastIndexOf('\''        } else {'\'');
if (lastElse !== -1) {
    content = content.slice(0, lastElse) + statusEndpoint + '\''\\n'\'' + content.slice(lastElse);
    fs.writeFileSync('\''/tmp/webhook-server-new.js'\'', content);
    console.log('\''Status endpoint added'\'');
} else {
    console.error('\''Could not find insertion point'\'');
    process.exit(1);
}
ENDSCRIPT
'

# Run the script on EC2
echo "Adding status endpoint..."
ssh ec2-translator "node /tmp/add-status.js && sudo cp /opt/webhook-server.js /opt/webhook-server.js.backup && sudo mv /tmp/webhook-server-new.js /opt/webhook-server.js && sudo systemctl restart webhook-server"

sleep 3

echo ""
echo "Testing /status endpoint..."
curl -s "http://ec2-52-211-137-158.eu-west-1.compute.amazonaws.com:8081/status"

echo ""
echo "=== Done ==="
