'use client'

// Export the minimal version as default for cleaner UI
export { MinimalWalletConnect as WalletConnect } from './MinimalWalletConnect'

// Keep the original complex version available as ComplexWalletConnect
import { WalletConnectButton } from './WalletConnectButton'

export function ComplexWalletConnect() {
  return <WalletConnectButton />
}