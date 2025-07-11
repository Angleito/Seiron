# WalletConnect Setup Guide

This guide will help you configure WalletConnect for the Seiron project.

## Why WalletConnect?

WalletConnect provides enhanced wallet compatibility and user experience by:
- Supporting 300+ wallet applications
- Providing QR code scanning for mobile wallets
- Offering better cross-platform compatibility
- Enabling secure wallet connections

## Quick Setup

### Option 1: Automated Setup (Recommended)

Run the setup script to automatically configure WalletConnect:

```bash
npm run setup:walletconnect
```

The script will:
1. Prompt you for your WalletConnect Project ID
2. Validate the input
3. Update your `.env` file automatically
4. Provide next steps

### Option 2: Manual Setup

1. **Create a WalletConnect Project**
   - Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
   - Sign up or log in
   - Create a new project
   - Copy your Project ID

2. **Update Environment Variables**
   - Open your `.env` file
   - Set `VITE_WALLETCONNECT_PROJECT_ID` to your Project ID:
   ```env
   VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

3. **Restart Development Server**
   ```bash
   npm run dev
   ```

## Configuration Details

### Environment Variables

```env
# WalletConnect Project ID (optional, for better wallet support)
# Get your project ID from https://cloud.walletconnect.com/
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### Supported Wallets on Sei Network

The following wallets are supported on Sei Network (chain ID: 1329):
- ✅ **MetaMask** (Recommended)
- ✅ **WalletConnect compatible wallets**
- ✅ **Browser-injected wallets**
- ❌ **Coinbase Smart Wallet** (Not supported on Sei Network)

### Automatic Exclusions

The system automatically excludes incompatible wallets:
- Coinbase Smart Wallet (doesn't support custom chains like Sei Network)
- Other wallets that don't support chain ID 1329

## Troubleshooting

### Common Issues

1. **"WalletConnect Core is already initialized" Warning**
   - This is normal in development mode due to React.StrictMode
   - The warning is automatically filtered out
   - No action required

2. **"Coinbase Smart Wallet: 1329 not supported" Error**
   - This is expected - Coinbase Smart Wallet doesn't support Sei Network
   - The error is automatically filtered out
   - Use MetaMask or WalletConnect instead

3. **"VITE_WALLETCONNECT_PROJECT_ID not found" Warning**
   - Set your Project ID in the `.env` file
   - Run `npm run setup:walletconnect` for help

### Validation

To check if WalletConnect is properly configured:

1. **Check Browser Console**
   - Look for "WalletConnect configuration" logs
   - Verify "Configuration valid: true"

2. **Test Wallet Connection**
   - Try connecting a wallet in your app
   - Check for QR code display for WalletConnect

## Development Notes

### Singleton Pattern

The WalletConnect manager uses a singleton pattern to prevent multiple initializations:
- Only one instance is created per session
- Handles React.StrictMode double mounting
- Provides proper cleanup on hot reload

### Error Handling

The system includes comprehensive error handling:
- Graceful fallback when WalletConnect is not configured
- Automatic filtering of known wallet warnings
- User-friendly error messages

### Performance

- WalletConnect is lazily initialized
- Only loads when needed
- Minimal impact on app startup

## Production Deployment

### Vercel Deployment

For Vercel deployments, set the environment variable in your dashboard:

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add `VITE_WALLETCONNECT_PROJECT_ID` with your Project ID
4. Redeploy your application

### Other Platforms

Ensure `VITE_WALLETCONNECT_PROJECT_ID` is set in your production environment variables.

## Support

If you encounter issues:

1. **Check the Console**: Look for error messages in the browser console
2. **Verify Configuration**: Ensure your Project ID is correct
3. **Test Locally**: Try the setup on a fresh local environment
4. **Check Documentation**: Review [WalletConnect docs](https://docs.walletconnect.com/)

## Advanced Configuration

### Custom Wallet Metadata

The system automatically configures wallet metadata:

```typescript
metadata: {
  name: 'Seiron',
  description: 'Seiron Dragon - DeFi Portfolio Management',
  url: 'https://seiron.vercel.app',
  icons: ['https://seiron.vercel.app/favicon.ico'],
}
```

### Chain-Specific Configuration

WalletConnect is configured specifically for Sei Network:
- Chain ID: 1329
- RPC URL: https://evm-rpc.sei-apis.com
- Block Explorer: https://seitrace.com

## Security Notes

- Keep your Project ID secure but note it's client-side visible
- Project IDs are not sensitive secrets (they're meant to be public)
- The Project ID is used for analytics and connection routing
- No private keys or sensitive data are exposed

---

**Need help?** Run `npm run setup:walletconnect` for interactive setup assistance.