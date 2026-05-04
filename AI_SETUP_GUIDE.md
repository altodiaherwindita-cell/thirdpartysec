# AI Provider Setup Guide

This guide explains how to configure free and paid AI providers for the Third Party Security Platform.

## Quick Start (Free Options)

### Option 1: Qwen via OpenRouter (Recommended for International Users)

**Why:** Easy setup, international access, free tier available

1. Get your API key from [OpenRouter](https://openrouter.ai/)
2. Copy `.env.example` to `.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
3. Edit `backend/.env`:
   ```bash
   AI_PROVIDER=qwen
   AI_API_KEY=your-openrouter-api-key-here
   AI_MODEL=qwen/qwen-2.5-72b-instruct
   ```

### Option 2: Google Gemini (Direct API)

**Why:** Generous free tier (60 requests/minute), high quality

1. Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Configure in `backend/.env`:
   ```bash
   AI_PROVIDER=gemini_direct
   AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
   AI_API_KEY=your-google-api-key-here
   AI_MODEL=gemini-1.5-flash
   ```

### Option 3: Local Ollama (Completely Free, No Limits)

**Why:** Self-hosted, no API costs, complete privacy

1. Install Ollama from [ollama.ai](https://ollama.ai/)
2. Download a model:
   ```bash
   ollama run llama3.1
   ```
3. Configure in `backend/.env`:
   ```bash
   AI_PROVIDER=ollama
   AI_BASE_URL=http://localhost:11434/v1
   AI_API_KEY=not-needed
   AI_MODEL=llama3.1
   ```

### Option 4: Local LM Studio (Completely Free)

**Why:** Supports any model, user-friendly interface

1. Download LM Studio from [lmstudio.ai](https://lmstudio.ai/)
2. Load any model you want
3. Start the local server
4. Configure in `backend/.env`:
   ```bash
   AI_PROVIDER=lmstudio
   AI_BASE_URL=http://localhost:1234/v1
   AI_API_KEY=not-needed
   AI_MODEL=local-model
   ```

## Paid Options

### OpenAI GPT-4

```bash
AI_PROVIDER=openai
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-your-openai-key
AI_MODEL=gpt-4-turbo
```

### Direct Qwen API (Alibaba Cloud)

Only if you have access to Alibaba Cloud international region:

```bash
AI_PROVIDER=qwen_direct
AI_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
AI_API_KEY=your-dashscope-key
AI_MODEL=qwen-plus
```

## How It Works

The platform uses the OpenAI SDK with a compatibility layer that works with multiple providers:

1. **Provider Selection**: Set `AI_PROVIDER` to choose your provider
2. **Automatic Configuration**: Base URL and default models are set automatically
3. **Fallback**: If no API key is configured, the system uses rule-based analysis
4. **Flexibility**: Override any setting with `AI_BASE_URL` or `AI_MODEL`

## Testing Your Configuration

After setting up your `.env` file, test the configuration:

```bash
cd backend
npm start
```

Check the logs to confirm the AI provider is loaded correctly.

## Available Providers Summary

| Provider | Free Tier | Setup Difficulty | Best For |
|----------|-----------|------------------|----------|
| Qwen (OpenRouter) | ✅ Yes | Easy | International users |
| Gemini Direct | ✅ Yes (60/min) | Easy | High-quality responses |
| Ollama | ✅ Unlimited | Medium | Privacy, no limits |
| LM Studio | ✅ Unlimited | Medium | Custom models |
| OpenAI | ❌ Paid | Easy | Enterprise features |
| Qwen Direct | ⚠️ Regional | Medium | Alibaba Cloud users |

## Troubleshooting

### "AI not configured" warning
- Make sure `AI_API_KEY` is set in your `.env` file
- Restart the server after changing environment variables

### API connection errors
- Check your internet connection
- Verify the API key is correct
- Try a different provider if one is unavailable

### Model not found errors
- Ensure the model name matches your provider's available models
- Some providers require specific model naming formats

## Need Help?

Check the full configuration options in `backend/.env.example` for all available settings.
