import React from 'react';
import { sanitizeHtml, sanitizeText, sanitizeChatMessage, sanitizeVoiceTranscript, sanitizeTransactionDescription, SanitizeConfig, SANITIZE_CONFIGS } from '@lib/sanitize';

interface SafeHtmlProps {
  children: string;
  config?: SanitizeConfig;
  className?: string;
}

/**
 * Component for safely rendering HTML content after sanitization
 */
export function SafeHtml({ children, config = SANITIZE_CONFIGS.TEXT_ONLY, className = '' }: SafeHtmlProps) {
  const sanitizedContent = sanitizeHtml(children, config);
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}

/**
 * Component for safely rendering text content (strips all HTML)
 */
export function SafeText({ children, className = '' }: { children: string; className?: string }) {
  const sanitizedContent = sanitizeText(children);
  
  return (
    <span className={className}>
      {sanitizedContent}
    </span>
  );
}

/**
 * Component for safely rendering chat messages (allows basic formatting)
 */
export function SafeChatMessage({ children, className = '' }: { children: string; className?: string }) {
  const sanitizedContent = sanitizeChatMessage(children);
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}

/**
 * Component for safely rendering voice transcripts (text only)
 */
export function SafeVoiceTranscript({ children, className = '' }: { children: string; className?: string }) {
  const sanitizedContent = sanitizeVoiceTranscript(children);
  
  return (
    <span className={className}>
      {sanitizedContent}
    </span>
  );
}

/**
 * Component for safely rendering transaction descriptions
 */
export function SafeTransactionDescription({ children, className = '' }: { children: string; className?: string }) {
  const sanitizedContent = sanitizeTransactionDescription(children);
  
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}