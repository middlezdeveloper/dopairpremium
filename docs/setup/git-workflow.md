# Git Workflow & Security Guidelines
## Safe Development & Deployment Practices

---

## 🏗️ Branch Strategy

### Main Branches
```
main (production-ready)
├── develop (integration branch)
├── feature/ai-coach (current work)
├── feature/stripe-integration
└── hotfix/critical-fixes
```

### Development Workflow
```bash
# Always work on feature branches
git checkout -b feature/your-feature-name

# Commit frequently with descriptive messages
git add .
git commit -m "Add OpenAI integration with safety protocols"

# Push to your feature branch
git push origin feature/your-feature-name
```

---

## 🔒 Security-First Commits

### Pre-Commit Checklist
```bash
# 1. Check for secrets BEFORE committing
git diff --cached | grep -i "sk-\|pk_\|key\|secret\|password"

# 2. Verify .env.local is NOT staged
git status | grep -v ".env.local"

# 3. Review all changes
git diff --cached
```

### Safe Commit Messages
```bash
# ✅ Good commits
git commit -m "Add AI coach prompt builder with persona selection"
git commit -m "Implement conversation management system"
git commit -m "Add crisis detection and safety protocols"

# ❌ Dangerous commits (never do this)
git commit -m "Add OpenAI key sk-abc123..." # NEVER commit keys
git commit -m "Quick fix" # Too vague
git commit -m "WIP" # Unclear what's included
```

---

## 🚀 Deployment Strategy

### Environment Separation
```
Development  → feature branches → .env.local
Staging      → develop branch   → Vercel preview
Production   → main branch      → Vercel production
```

### Deployment Flow
```bash
# 1. Development (Local)
- Work on feature/ai-coach branch
- Use .env.local with dev API keys
- Test thoroughly locally
- Never push .env.local

# 2. Staging (Vercel Preview)
- Merge to develop branch
- Vercel auto-deploys preview
- Uses staging environment variables
- Test with real but limited API keys

# 3. Production (Vercel Production)
- Merge develop → main ONLY when ready
- Manual approval required
- Uses production API keys
- Monitor closely after deployment
```

---

## 🛡️ Secret Management

### Local Development
```bash
# .env.local (NEVER commit this file)
OPENAI_API_KEY=sk-dev-key-here
STRIPE_SECRET_KEY=sk_test_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_key_here
```

### Production (Vercel Dashboard)
```bash
# Set in Vercel dashboard → Settings → Environment Variables
OPENAI_API_KEY=sk-prod-key-here
STRIPE_SECRET_KEY=sk_live_key_here
STRIPE_WEBHOOK_SECRET=whsec_prod_secret_here
```

### Emergency: If Secrets Are Committed
```bash
# 1. Immediately revoke all compromised keys
# 2. Remove from Git history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.local' \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push (dangerous - coordinate with team)
git push origin --force --all

# 4. Generate new keys and update environments
```

---

## 👥 Collaboration Guidelines

### For Daniel (Repository Owner)
```bash
# Review all pull requests before merging
# Check for security issues in code review
# Control production deployments
# Monitor API usage after deployments

# Protect main branch (GitHub settings)
- Require pull request reviews
- Require status checks
- Restrict pushes to main
- Require signed commits (optional)
```

### For Claude Code (AI Assistant)
```bash
# Always work on feature branches
# Include security checks in all commits
# Provide clear commit messages
# Never include secrets in any commits
# Document all changes thoroughly

# Commit format for AI-generated code
git commit -m "$(cat <<'EOF'
[Feature] Add AI coach conversation system

- Implement OpenAI integration with safety protocols
- Add persona-based response generation
- Include crisis detection and intervention
- Secure API key management

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

## 📋 Code Review Checklist

### Security Review
- [ ] No API keys or secrets in code
- [ ] `.env.local` not committed
- [ ] Proper environment variable usage
- [ ] Input validation on all endpoints
- [ ] Authentication checks in place

### Functionality Review
- [ ] Code matches requirements
- [ ] Error handling implemented
- [ ] Tests pass (when applicable)
- [ ] Performance considerations addressed
- [ ] Documentation updated

### AI Safety Review (for AI Coach)
- [ ] Crisis detection working
- [ ] Appropriate therapeutic boundaries
- [ ] No harmful advice possible
- [ ] Rate limiting implemented
- [ ] Usage monitoring in place

---

## 🚨 Incident Response

### If API Key is Exposed
1. **Immediate**: Revoke key in OpenAI/Stripe dashboard
2. **Clean Git**: Remove from history if committed
3. **New Keys**: Generate new keys for all environments
4. **Monitor**: Check for unauthorized usage
5. **Notify**: Alert team members if applicable

### If Production Issues Occur
1. **Assess**: Determine severity and impact
2. **Rollback**: Revert to last known good commit
3. **Hotfix**: Create hotfix branch for urgent fixes
4. **Test**: Thoroughly test hotfix
5. **Deploy**: Fast-track through review process

---

## 🎯 Development Phases

### Phase 1: Local Development (Current)
```bash
# Safe local-only development
- Feature branches only
- .env.local for secrets
- No production API calls
- Frequent commits with good messages
```

### Phase 2: Staging Deployment
```bash
# When AI coach is ready for testing
git checkout develop
git merge feature/ai-coach
git push origin develop
# → Triggers Vercel preview deployment
```

### Phase 3: Production Release
```bash
# Only when thoroughly tested
git checkout main
git merge develop
git push origin main
# → Triggers production deployment
# → Monitor closely for issues
```

---

## 💡 Best Practices Summary

1. **Never commit secrets** - Use environment variables
2. **Work on feature branches** - Keep main branch clean
3. **Review before merging** - Catch issues early
4. **Test thoroughly** - Especially API integrations
5. **Monitor usage** - Watch for cost spikes
6. **Document everything** - Clear commit messages
7. **Plan rollback strategy** - Always have an exit plan
8. **Communicate changes** - Keep team informed

This workflow ensures we can build rapidly while maintaining security and never accidentally exposing sensitive information or deploying untested code to production.