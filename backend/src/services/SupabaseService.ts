import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { createServiceLogger } from './LoggingService';

const logger = createServiceLogger('SupabaseService');

/**
 * Message record structure for Supabase
 */
export interface MessageRecord {
  id?: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  crypto_context?: {
    portfolio_data?: any;
    price_data?: any;
    wallet_info?: any;
    transaction_context?: any;
    [key: string]: any;
  };
  metadata?: {
    [key: string]: any;
  };
  token_usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  created_at?: string;
}

/**
 * Database message with full fields
 */
export interface DatabaseMessage extends MessageRecord {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Configuration interface for Supabase
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

/**
 * Service for managing Supabase operations with functional programming patterns
 */
export class SupabaseService {
  private client: SupabaseClient;
  private serviceClient?: SupabaseClient;

  constructor(config: SupabaseConfig) {
    // Create client with anon key for normal operations
    this.client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    // Create service client for admin operations if service role key is provided
    if (config.serviceRoleKey) {
      this.serviceClient = createClient(config.url, config.serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }

    logger.info('Supabase service initialized', {
      url: config.url,
      hasServiceRoleKey: !!config.serviceRoleKey,
    });
  }

  /**
   * Create a new message record
   */
  createMessage = (message: Omit<MessageRecord, 'id' | 'created_at'>): TE.TaskEither<Error, DatabaseMessage> =>
    pipe(
      TE.tryCatch(
        async () => {
          logger.debug('Creating message record', {
            sessionId: message.session_id,
            userId: message.user_id,
            role: message.role,
            contentLength: message.content.length,
            hasCryptoContext: !!message.crypto_context,
          });

          const { data, error } = await this.client
            .from('messages')
            .insert([{
              session_id: message.session_id,
              user_id: message.user_id,
              role: message.role,
              content: message.content,
              crypto_context: message.crypto_context || {},
              metadata: message.metadata || {},
              token_usage: message.token_usage || {},
            }])
            .select()
            .single();

          if (error) {
            logger.error('Failed to create message record', {
              error: error.message,
              code: error.code,
              sessionId: message.session_id,
              userId: message.user_id,
            });
            throw new Error(`Failed to create message: ${error.message}`);
          }

          logger.debug('Message record created successfully', {
            messageId: data.id,
            sessionId: message.session_id,
            userId: message.user_id,
          });

          return data as DatabaseMessage;
        },
        (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Error creating message record', {
            error: errorMessage,
            sessionId: message.session_id,
            userId: message.user_id,
          });
          return new Error(`Supabase create message error: ${errorMessage}`);
        }
      )
    );

  /**
   * Get messages for a session
   */
  getMessagesBySession = (sessionId: string, limit: number = 50): TE.TaskEither<Error, DatabaseMessage[]> =>
    pipe(
      TE.tryCatch(
        async () => {
          logger.debug('Retrieving messages by session', {
            sessionId,
            limit,
          });

          const { data, error } = await this.client
            .from('messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })
            .limit(limit);

          if (error) {
            logger.error('Failed to retrieve messages by session', {
              error: error.message,
              code: error.code,
              sessionId,
            });
            throw new Error(`Failed to get messages: ${error.message}`);
          }

          logger.debug('Messages retrieved successfully', {
            sessionId,
            messageCount: data?.length || 0,
          });

          return (data || []) as DatabaseMessage[];
        },
        (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Error retrieving messages by session', {
            error: errorMessage,
            sessionId,
          });
          return new Error(`Supabase get messages error: ${errorMessage}`);
        }
      )
    );

  /**
   * Get or create user by wallet address
   */
  getOrCreateUser = (walletAddress: string, username?: string): TE.TaskEither<Error, { id: string; wallet_address: string }> =>
    pipe(
      TE.tryCatch(
        async () => {
          logger.debug('Getting or creating user', { walletAddress, username });

          // Try to get existing user first
          const { data: existingUser, error: getUserError } = await this.client
            .from('users')
            .select('id, wallet_address')
            .eq('wallet_address', walletAddress)
            .single();

          if (existingUser && !getUserError) {
            logger.debug('User already exists', { userId: existingUser.id, walletAddress });
            return existingUser;
          }

          // If user doesn't exist, create new one
          const { data: newUser, error: createError } = await this.client
            .from('users')
            .insert([{
              wallet_address: walletAddress,
              username: username || null,
            }])
            .select('id, wallet_address')
            .single();

          if (createError) {
            logger.error('Failed to create user', {
              error: createError.message,
              code: createError.code,
              walletAddress,
            });
            throw new Error(`Failed to create user: ${createError.message}`);
          }

          logger.debug('User created successfully', { userId: newUser.id, walletAddress });
          return newUser;
        },
        (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Error getting or creating user', { error: errorMessage, walletAddress });
          return new Error(`Supabase get/create user error: ${errorMessage}`);
        }
      )
    );

  /**
   * Get or create chat session
   */
  getOrCreateSession = (userId: string, sessionName?: string): TE.TaskEither<Error, { id: string; user_id: string }> =>
    pipe(
      TE.tryCatch(
        async () => {
          logger.debug('Getting or creating session', { userId, sessionName });

          // If no session name provided, get the most recent active session
          if (!sessionName) {
            const { data: activeSession, error: getActiveError } = await this.client
              .from('chat_sessions')
              .select('id, user_id')
              .eq('user_id', userId)
              .eq('is_active', true)
              .order('updated_at', { ascending: false })
              .limit(1)
              .single();

            if (activeSession && !getActiveError) {
              logger.debug('Found active session', { sessionId: activeSession.id, userId });
              return activeSession;
            }
          }

          // Create new session
          const defaultSessionName = sessionName || `Chat ${new Date().toISOString().split('T')[0]}`;
          const { data: newSession, error: createError } = await this.client
            .from('chat_sessions')
            .insert([{
              user_id: userId,
              session_name: defaultSessionName,
              is_active: true,
            }])
            .select('id, user_id')
            .single();

          if (createError) {
            logger.error('Failed to create session', {
              error: createError.message,
              code: createError.code,
              userId,
            });
            throw new Error(`Failed to create session: ${createError.message}`);
          }

          logger.debug('Session created successfully', { sessionId: newSession.id, userId });
          return newSession;
        },
        (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Error getting or creating session', { error: errorMessage, userId });
          return new Error(`Supabase get/create session error: ${errorMessage}`);
        }
      )
    );

  /**
   * Get messages for a wallet address
   */
  getMessagesByWallet = (walletAddress: string, limit: number = 100): TE.TaskEither<Error, DatabaseMessage[]> =>
    pipe(
      TE.tryCatch(
        async () => {
          logger.debug('Retrieving messages by wallet', {
            walletAddress,
            limit,
          });

          const { data, error } = await this.client
            .from('messages')
            .select(`
              *,
              chat_sessions!inner(user_id),
              users!inner(wallet_address)
            `)
            .eq('users.wallet_address', walletAddress)
            .order('created_at', { ascending: false })
            .limit(limit);

          if (error) {
            logger.error('Failed to retrieve messages by wallet', {
              error: error.message,
              code: error.code,
              walletAddress,
            });
            throw new Error(`Failed to get messages: ${error.message}`);
          }

          logger.debug('Messages retrieved successfully', {
            walletAddress,
            messageCount: data?.length || 0,
          });

          return (data || []) as DatabaseMessage[];
        },
        (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Error retrieving messages by wallet', {
            error: errorMessage,
            walletAddress,
          });
          return new Error(`Supabase get messages error: ${errorMessage}`);
        }
      )
    );

  /**
   * Update crypto context for a message
   */
  updateMessageCryptoContext = (messageId: string, cryptoContext: any): TE.TaskEither<Error, DatabaseMessage> =>
    pipe(
      TE.tryCatch(
        async () => {
          logger.debug('Updating message crypto context', {
            messageId,
            hasCryptoContext: !!cryptoContext,
          });

          const { data, error } = await this.client
            .from('messages')
            .update({ crypto_context: cryptoContext })
            .eq('id', messageId)
            .select()
            .single();

          if (error) {
            logger.error('Failed to update message crypto context', {
              error: error.message,
              code: error.code,
              messageId,
            });
            throw new Error(`Failed to update message: ${error.message}`);
          }

          logger.debug('Message crypto context updated successfully', {
            messageId,
          });

          return data as DatabaseMessage;
        },
        (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Error updating message crypto context', {
            error: errorMessage,
            messageId,
          });
          return new Error(`Supabase update message error: ${errorMessage}`);
        }
      )
    );

  /**
   * Delete messages for a session (for conversation cleanup)
   */
  deleteMessagesBySession = (sessionId: string): TE.TaskEither<Error, number> =>
    pipe(
      TE.tryCatch(
        async () => {
          logger.debug('Deleting messages by session', {
            sessionId,
          });

          const { data, error } = await this.client
            .from('messages')
            .delete()
            .eq('session_id', sessionId)
            .select('id');

          if (error) {
            logger.error('Failed to delete messages by session', {
              error: error.message,
              code: error.code,
              sessionId,
            });
            throw new Error(`Failed to delete messages: ${error.message}`);
          }

          const deletedCount = data?.length || 0;
          logger.info('Messages deleted successfully', {
            sessionId,
            deletedCount,
          });

          return deletedCount;
        },
        (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Error deleting messages by session', {
            error: errorMessage,
            sessionId,
          });
          return new Error(`Supabase delete messages error: ${errorMessage}`);
        }
      )
    );

  /**
   * Get conversation history with pagination
   */
  getConversationHistory = (
    walletAddress: string,
    page: number = 1,
    pageSize: number = 20
  ): TE.TaskEither<Error, { messages: DatabaseMessage[]; totalCount: number; hasMore: boolean }> =>
    pipe(
      TE.tryCatch(
        async () => {
          const offset = (page - 1) * pageSize;

          logger.debug('Retrieving conversation history', {
            walletAddress,
            page,
            pageSize,
            offset,
          });

          // Get total count
          const { count, error: countError } = await this.client
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('wallet_address', walletAddress);

          if (countError) {
            throw new Error(`Failed to get message count: ${countError.message}`);
          }

          // Get paginated messages
          const { data, error } = await this.client
            .from('messages')
            .select('*')
            .eq('wallet_address', walletAddress)
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

          if (error) {
            logger.error('Failed to retrieve conversation history', {
              error: error.message,
              code: error.code,
              walletAddress,
              page,
            });
            throw new Error(`Failed to get conversation history: ${error.message}`);
          }

          const totalCount = count || 0;
          const hasMore = offset + pageSize < totalCount;

          logger.debug('Conversation history retrieved successfully', {
            walletAddress,
            page,
            messageCount: data?.length || 0,
            totalCount,
            hasMore,
          });

          return {
            messages: (data || []) as DatabaseMessage[],
            totalCount,
            hasMore,
          };
        },
        (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Error retrieving conversation history', {
            error: errorMessage,
            walletAddress,
            page,
          });
          return new Error(`Supabase get conversation history error: ${errorMessage}`);
        }
      )
    );

  /**
   * Health check for Supabase connection
   */
  healthCheck = (): TE.TaskEither<Error, boolean> =>
    pipe(
      TE.tryCatch(
        async () => {
          const { data, error } = await this.client
            .from('messages')
            .select('count(*)', { count: 'exact', head: true })
            .limit(1);

          if (error) {
            throw new Error(`Health check failed: ${error.message}`);
          }

          logger.debug('Supabase health check passed');
          return true;
        },
        (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Supabase health check failed', { error: errorMessage });
          return new Error(`Supabase health check error: ${errorMessage}`);
        }
      )
    );
}

/**
 * Create and configure Supabase service instance
 */
export const createSupabaseService = (config: SupabaseConfig): E.Either<Error, SupabaseService> => {
  try {
    if (!config.url) {
      return E.left(new Error('Supabase URL is required'));
    }
    if (!config.anonKey) {
      return E.left(new Error('Supabase anonymous key is required'));
    }

    const service = new SupabaseService(config);
    logger.info('Supabase service created successfully');
    return E.right(service);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to create Supabase service', { error: errorMessage });
    return E.left(new Error(`Failed to create Supabase service: ${errorMessage}`));
  }
};

/**
 * Default export
 */
export default SupabaseService;