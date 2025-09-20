# OpenAI Setup & Payment Guide

## 🔑 Getting Your OpenAI API Key

### 1. Create OpenAI Account
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up with your email or Google account
3. Verify your phone number (required for API access)

### 2. Add Payment Method
1. Go to **Billing** → **Payment methods**
2. Add a credit/debit card
3. Set usage limits to control costs:
   - **Hard limit**: $10-20 for development (prevents runaway costs)
   - **Soft limit**: $5 (gets email alerts)

### 3. Get API Key
1. Go to **API Keys** section
2. Click **"Create new secret key"**
3. Name it `dopair-premium-dev`
4. **Copy the key immediately** (you can't see it again)
5. Store it securely in your password manager



## 💰 Cost Management

### Development Costs (GPT-3.5-turbo)
- **Input**: $0.50 per 1M tokens (~750,000 words)
- **Output**: $1.50 per 1M tokens (~750,000 words)
- **Typical conversation**: ~500 tokens = $0.001
- **Daily development**: ~100 messages = $0.10
- **Monthly development**: ~$3-5

### Production Estimates
```
Conservative estimate for 100 users:
- 10 messages/day per user = 1,000 messages/day
- Cost: ~$1/day = $30/month
- Revenue at $39/user = $3,900/month
- Margin: 99%+
```

### Cost Protection
```bash
# Set hard limits in OpenAI dashboard
Hard limit: $20/month (development)
Soft limit: $10/month (get alerts)
```

## 🔒 Security Best Practices

### Local Development Security
1. **Never commit API keys** - Use `.env.local` (already in .gitignore)
2. **Use separate dev/prod keys** - Different keys for different environments
3. **Monitor usage daily** - Check OpenAI dashboard regularly
4. **Rotate keys monthly** - Good security practice

### Environment Setup
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your actual keys
# NEVER commit this file to git
```

### API Key Storage
```bash
# .env.local (local development only)
OPENAI_API_KEY=sk-your-actual-key-here

# For production, use Vercel environment variables
# Never store in code or commit to git
```

## 🚨 Emergency Safeguards

### If API Key is Compromised
1. **Immediately revoke** the key in OpenAI dashboard
2. **Create new key** with different name
3. **Update local environment** files
4. **Check usage** for any unauthorized activity
5. **Change Git commit history** if key was accidentally committed

### Usage Monitoring
- Check [OpenAI Usage Dashboard](https://platform.openai.com/usage) daily
- Set up email alerts for usage thresholds
- Monitor for unusual spikes in API calls

## 📋 Development Checklist

- [ ] OpenAI account created and verified
- [ ] Payment method added with usage limits
- [ ] API key generated and stored securely
- [ ] `.env.local` file created (not committed)
- [ ] Usage monitoring set up
- [ ] Emergency contact info saved (if team member needs to revoke keys)

## 💡 Pro Tips

1. **Start small**: Begin with $10 limit while building
2. **Monitor closely**: Check usage daily for first week
3. **Use GPT-3.5-turbo**: Much cheaper than GPT-4 for development
4. **Limit context**: Max 5 previous messages to control token usage
5. **Cache responses**: Save common responses to reduce API calls

## 🆘 Support

- **OpenAI Help**: [help.openai.com](https://help.openai.com)
- **Billing Issues**: [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
- **API Documentation**: [platform.openai.com/docs](https://platform.openai.com/docs)



⏺ For your Dopair Premium AI coaching platform, I recommend this OpenAI configuration:

  Models to Allow:

  Primary Models (Essential):
  - gpt-3.5-turbo - Your current coach model (cost-effective)
  - gpt-4o-mini - Better reasoning for complex situations
  - text-embedding-ada-002 - For semantic search/memory features
  - whisper-1 - Voice input for accessibility
  - omni-moderation-latest - Content safety (critical for mental health)

  Optional Upgrades:
  - gpt-4o - Premium tier coaching (higher quality responses)
  - tts-1 - Text-to-speech for audio responses

  Models to Block:

  Block everything else, especially:
  - All image generation models (DALL-E) - unnecessary cost
  - All o1/o3 models - too expensive for chat
  - Audio preview models - still in development
  - Instruct models - wrong format for chat

  Rate Limits (Recommended):

  gpt-3.5-turbo: 100 requests/minute, 150K tokens/minute
  gpt-4o-mini: 50 requests/minute, 50K tokens/minute
  whisper-1: 10 requests/minute
  text-embedding-ada-002: 100 requests/minute

  This setup protects against unexpected costs while enabling all core coaching features. Start
  conservative - you can always enable more models later as usage grows.
