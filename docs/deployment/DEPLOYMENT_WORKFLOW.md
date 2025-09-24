# 🚀 DEPLOYMENT WORKFLOW - NEVER LOSE WORK AGAIN

## 🚨 CRITICAL RULES

1. **NEVER commit directly to `main` or `production`**
2. **NEVER deploy directly to live without testing**
3. **ALWAYS work in feature branches**
4. **ALWAYS test in preview channels first**

## 📋 WORKFLOW STEPS

### 1. Start New Work
```bash
git checkout production
git pull origin production
git checkout -b feature/your-feature-name
```

### 2. Make Changes
- Work on your feature branch
- Auto-backup hook will save state before each commit

### 3. Test Locally
```bash
npm run dev
# Test thoroughly at http://localhost:3001
```

### 4. Deploy to Preview
```bash
npm run build
firebase hosting:channel:deploy preview
# Test at: https://dopair--preview-4l0kumuz.web.app
```

### 5. Deploy to Staging (Optional)
```bash
firebase hosting:channel:deploy staging
# Test at: https://dopair--staging-iiuo7q17.web.app
```

### 6. Create Pull Request
```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
# Create PR on GitHub: production ← feature/your-feature-name
```

### 7. Deploy to Production (After PR Approval)
```bash
git checkout production
git pull origin production
npm run build
firebase deploy --only hosting
```

## 🔄 BACKUP LOCATIONS

- **Auto-backups**: `.git/backups/backup_YYYYMMDD_HHMMSS/`
- **Git history**: All commits preserved
- **Preview channels**: Working versions always available

## 🆘 EMERGENCY RECOVERY

If production gets broken:

1. **Check backups**:
   ```bash
   ls -la .git/backups/
   ```

2. **Restore from backup**:
   ```bash
   cp -r .git/backups/backup_YYYYMMDD_HHMMSS/* .
   ```

3. **Deploy fixed version**:
   ```bash
   firebase hosting:channel:deploy preview  # Test first
   firebase deploy --only hosting           # Then live
   ```

## 📱 CHANNEL URLS

- **Preview**: https://dopair--preview-4l0kumuz.web.app
- **Staging**: https://dopair--staging-iiuo7q17.web.app
- **Production**: https://dopair.app

## ✅ CHECKLIST BEFORE LIVE DEPLOY

- [ ] Feature branch tested locally
- [ ] Preview channel tested and working
- [ ] PR reviewed and approved
- [ ] Current production backed up
- [ ] Ready to rollback if needed

---

**Remember**: The goal is to NEVER lose working code again. When in doubt, test in preview first!