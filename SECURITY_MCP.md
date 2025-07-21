# MCP Security Best Practices

## API Key Management

### ✅ Secure Configuration

1. **Never commit API keys to version control**
   - API keys are stored in `.env` file only
   - `.env` is in `.gitignore` and will never be committed
   - `.env.example` contains only placeholder values

2. **Environment Variable Usage**
   ```bash
   # Correct - Use .env file
   HIVE_INTELLIGENCE_API_KEY=your_actual_api_key
   
   # Wrong - Never hardcode in source files
   const API_KEY = "dev_2f4c0b23e5fb8a9d039e8620b4f52cdc"; // DON'T DO THIS
   ```

3. **Server Configuration**
   - All MCP servers read API keys from environment variables
   - Servers warn if API keys are not configured
   - No fallback to hardcoded values

## Setting Up Securely

1. **Create .env file** (already in .gitignore)
   ```bash
   cp backend/.env.example .env
   ```

2. **Add your API keys to .env**
   ```bash
   # Edit .env file
   HIVE_INTELLIGENCE_API_KEY=your_actual_api_key_here
   ```

3. **Verify security**
   ```bash
   # Check that .env is not tracked
   git status
   # .env should NOT appear in the list
   ```

## Production Security

1. **Use environment variables in production**
   - Never store keys in Docker images
   - Use secrets management (AWS Secrets Manager, Vault, etc.)
   - Rotate API keys regularly

2. **Docker Security**
   ```bash
   # Pass secrets at runtime, not build time
   docker run -e HIVE_INTELLIGENCE_API_KEY=$HIVE_INTELLIGENCE_API_KEY ...
   ```

3. **Access Control**
   - Limit API key permissions to minimum required
   - Use different keys for dev/staging/production
   - Monitor API key usage

## Verification Checklist

- [ ] `.env` file exists and contains real API keys
- [ ] `.env` is NOT tracked by git
- [ ] No API keys in source code
- [ ] Server logs don't expose full API keys
- [ ] Docker images don't contain API keys

## If API Key is Exposed

1. **Immediately revoke the exposed key**
2. **Generate a new API key**
3. **Update .env file with new key**
4. **Audit logs for unauthorized usage**
5. **Review code for other potential exposures**

Remember: API keys are like passwords - keep them secret, keep them safe!