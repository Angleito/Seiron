import { Server, Socket } from 'socket.io';
import * as TE from 'fp-ts/TaskEither';

export interface PortfolioUpdate {
  type: 'position_update' | 'balance_change' | 'transaction_complete' | 'error';
  data: any;
  timestamp: string;
}

export class SocketService {
  private io: Server;
  private userSockets: Map<string, Socket[]> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Add user socket connection
   */
  public addUserSocket(walletAddress: string, socket: Socket): void {
    const userSockets = this.userSockets.get(walletAddress) || [];
    userSockets.push(socket);
    this.userSockets.set(walletAddress, userSockets);
    
    console.log(`Added socket for user ${walletAddress}. Total: ${userSockets.length}`);
  }

  /**
   * Remove user socket connection
   */
  public removeUserSocket(socket: Socket): void {
    for (const [walletAddress, sockets] of this.userSockets.entries()) {
      const index = sockets.findIndex(s => s.id === socket.id);
      if (index !== -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          this.userSockets.delete(walletAddress);
        } else {
          this.userSockets.set(walletAddress, sockets);
        }
        console.log(`Removed socket for user ${walletAddress}`);
        break;
      }
    }
  }

  /**
   * Send portfolio update to specific user
   */
  public sendPortfolioUpdate = (
    walletAddress: string, 
    update: PortfolioUpdate
  ): TE.TaskEither<Error, void> =>
    TE.tryCatch(
      async () => {
        const userSockets = this.userSockets.get(walletAddress);
        if (!userSockets || userSockets.length === 0) {
          throw new Error(`No active sockets for user ${walletAddress}`);
        }

        const updateWithTimestamp = {
          ...update,
          timestamp: new Date().toISOString()
        };

        userSockets.forEach(socket => {
          socket.emit('portfolio_update', updateWithTimestamp);
        });

        console.log(`Sent portfolio update to ${userSockets.length} sockets for ${walletAddress}`);
      },
      (error) => new Error(`Failed to send portfolio update: ${error}`)
    );

  /**
   * Send chat response to specific user
   */
  public sendChatResponse = (
    walletAddress: string,
    response: any
  ): TE.TaskEither<Error, void> =>
    TE.tryCatch(
      async () => {
        const userSockets = this.userSockets.get(walletAddress);
        if (!userSockets || userSockets.length === 0) {
          throw new Error(`No active sockets for user ${walletAddress}`);
        }

        userSockets.forEach(socket => {
          socket.emit('chat_response', response);
        });
      },
      (error) => new Error(`Failed to send chat response: ${error}`)
    );

  /**
   * Broadcast system message to all connected users
   */
  public broadcastSystemMessage = (message: string): TE.TaskEither<Error, void> =>
    TE.tryCatch(
      async () => {
        this.io.emit('system_message', {
          message,
          timestamp: new Date().toISOString()
        });
      },
      (error) => new Error(`Failed to broadcast system message: ${error}`)
    );

  /**
   * Send transaction status update
   */
  public sendTransactionUpdate = (
    walletAddress: string,
    txHash: string,
    status: 'pending' | 'confirmed' | 'failed',
    details?: any
  ): TE.TaskEither<Error, void> =>
    this.sendPortfolioUpdate(walletAddress, {
      type: 'transaction_complete',
      data: {
        txHash,
        status,
        details,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  /**
   * Send error notification to user
   */
  public sendError = (
    walletAddress: string,
    error: string,
    context?: any
  ): TE.TaskEither<Error, void> =>
    this.sendPortfolioUpdate(walletAddress, {
      type: 'error',
      data: {
        error,
        context,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get user socket count
   */
  public getUserSocketCount(walletAddress: string): number {
    return this.userSockets.get(walletAddress)?.length || 0;
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(walletAddress: string): boolean {
    return this.getUserSocketCount(walletAddress) > 0;
  }
}