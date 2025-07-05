import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { ExecutableCommand } from '../processing/types.js';
import { ConfirmationRequest, ConfirmationConfig, ConversationSession, ConversationError } from './types.js';
export interface ConfirmationResult {
    readonly confirmed: boolean;
    readonly selectedOption: string;
    readonly modifiedCommand?: ExecutableCommand;
    readonly userNotes?: string;
    readonly timestamp: number;
}
export declare class ConfirmationHandler {
    private readonly config;
    private readonly pendingConfirmations;
    private readonly riskAnalyzer;
    private readonly summaryGenerator;
    constructor(config: ConfirmationConfig);
    createConfirmationRequest(command: ExecutableCommand, session: ConversationSession): Promise<E.Either<ConversationError, ConfirmationRequest>>;
    processConfirmationResponse(requestId: string, response: string, session: ConversationSession): Promise<E.Either<ConversationError, ConfirmationResult>>;
    getConfirmationStatus(requestId: string): O.Option<{
        request: ConfirmationRequest;
        timeRemaining: number;
        retryCount: number;
    }>;
    cancelConfirmation(requestId: string, reason: string): Promise<E.Either<ConversationError, boolean>>;
    cleanupExpiredConfirmations(): Promise<number>;
    private determineConfirmationType;
    private generateConfirmationOptions;
    private parseUserResponse;
    private processConfirmationOption;
    private generateModifiedCommand;
    formatConfirmationRequest(request: ConfirmationRequest): string;
    private getRiskIcon;
}
//# sourceMappingURL=ConfirmationHandler.d.ts.map