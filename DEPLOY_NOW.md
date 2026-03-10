# Deploy to EC2 - Quick Guide

## Option 1: One Command (Recommended)

From your local machine, run:

```bash
cd ~/apertium-dev/projects/translator
./deploy-to-ec2-remote.sh
```

**Note:** Update the SSH key path in the script if needed:
```bash
SSH_KEY=~/.ssh/your-actual-key.pem ./deploy-to-ec2-remote.sh
```

---

## Option 2: Manual SSH

```bash
# 1. SSH to EC2
ssh -i ~/.ssh/your-key.pem ubuntu@ec2-52-211-137-158.eu-west-1.compute.amazonaws.com

# 2. Run these commands on EC2:
cd ~/ido-epo-translator
git pull origin main
cd apy-server
docker cp pull-repo.sh ido-epo-apy:/opt/apertium/pull-repo.sh
docker cp build-repo.sh ido-epo-apy:/opt/apertium/build-repo.sh
docker exec ido-epo-apy chmod +x /opt/apertium/pull-repo.sh
docker exec ido-epo-apy chmod +x /opt/apertium/build-repo.sh
sudo systemctl restart webhook-server

# 3. Test
docker exec ido-epo-apy /opt/apertium/pull-repo.sh ido
```

---

## After Deployment

Test the web UI:
1. Open https://ido-epo-translator.pages.dev
2. Click "Dictionaries" button
3. Try "Pull Updates" for a repository
4. Try "Build & Install" for a repository

---

## That's it! 🎉

The dictionaries dialog will be fully functional after these commands complete.
