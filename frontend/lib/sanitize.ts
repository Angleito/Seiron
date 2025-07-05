import DOMPurify from 'dompurify';

/**
 * Sanitization configuration for different contexts
 */
export interface SanitizeConfig {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  forbiddenTags?: string[];
  forbiddenAttributes?: string[];
  stripIgnoreTag?: boolean;
  stripIgnoreTagBody?: boolean;
  allowedSchemes?: string[];
  allowedSchemesByTag?: Record<string, string[]>;
}

/**
 * Predefined sanitization configurations
 */
export const SANITIZE_CONFIGS = {
  // Basic text sanitization - strips all HTML, only allows plain text
  TEXT_ONLY: {
    allowedTags: [],
    allowedAttributes: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: true,
  } as SanitizeConfig,

  // Chat messages - allows basic formatting but blocks dangerous elements
  CHAT_MESSAGE: {
    allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span'],
    allowedAttributes: {
      'span': ['class'],
      'p': ['class'],
    },
    forbiddenTags: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta'],
    forbiddenAttributes: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onchange'],
    stripIgnoreTag: true,
    stripIgnoreTagBody: true,
  } as SanitizeConfig,

  // Transaction descriptions - very restrictive, text only with line breaks
  TRANSACTION_DESCRIPTION: {
    allowedTags: ['br', 'p'],
    allowedAttributes: {},
    forbiddenTags: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta', 'img', 'svg'],
    stripIgnoreTag: true,
    stripIgnoreTagBody: true,
  } as SanitizeConfig,

  // Voice transcripts - text only, no HTML at all
  VOICE_TRANSCRIPT: {
    allowedTags: [],
    allowedAttributes: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: true,
  } as SanitizeConfig,

  // User input - basic sanitization for form inputs
  USER_INPUT: {
    allowedTags: [],
    allowedAttributes: {},
    forbiddenTags: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta'],
    forbiddenAttributes: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onchange'],
    stripIgnoreTag: true,
    stripIgnoreTagBody: true,
  } as SanitizeConfig,
} as const;

/**
 * Configure DOMPurify with security settings
 */
function configureDOMPurify(config?: SanitizeConfig): DOMPurify.DOMPurifyI {
  const purify = DOMPurify;
  
  // Reset configuration
  purify.clearConfig();
  
  if (config) {
    const purifyConfig: any = {};
    
    if (config.allowedTags) {
      purifyConfig.ALLOWED_TAGS = config.allowedTags;
    }
    
    if (config.allowedAttributes) {
      purifyConfig.ALLOWED_ATTR = Object.keys(config.allowedAttributes).reduce((acc, tag) => {
        return [...acc, ...(config.allowedAttributes?.[tag] || [])];
      }, [] as string[]);
    }
    
    if (config.forbiddenTags) {
      purifyConfig.FORBID_TAGS = config.forbiddenTags;
    }
    
    if (config.forbiddenAttributes) {
      purifyConfig.FORBID_ATTR = config.forbiddenAttributes;
    }
    
    if (config.stripIgnoreTag) {
      purifyConfig.KEEP_CONTENT = true;
    }
    
    if (config.allowedSchemes) {
      purifyConfig.ALLOWED_URI_REGEXP = new RegExp(`^(?:(?:${config.allowedSchemes.join('|')}):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))`, 'i');
    }
    
    // Add security hooks
    purify.addHook('beforeSanitizeElements', (node) => {
      // Remove any data attributes that could be used for XSS
      if (node.nodeType === 1) {
        const element = node as Element;
        const attributes = Array.from(element.attributes);
        
        attributes.forEach(attr => {
          if (attr.name.startsWith('data-') && attr.value.includes('javascript:')) {
            element.removeAttribute(attr.name);
          }
        });
      }
    });
    
    purify.addHook('afterSanitizeAttributes', (node) => {
      // Additional security check for remaining attributes
      if (node.nodeType === 1) {
        const element = node as Element;
        const attributes = Array.from(element.attributes);
        
        attributes.forEach(attr => {
          // Remove any attribute values that contain javascript: or data: protocols
          if (attr.value.toLowerCase().includes('javascript:') || 
              attr.value.toLowerCase().includes('data:text/html') ||
              attr.value.toLowerCase().includes('vbscript:')) {
            element.removeAttribute(attr.name);
          }
        });
      }
    });
    
    return purify;
  }
  
  return purify;
}

/**
 * Sanitize HTML content with specified configuration
 */
export function sanitizeHtml(
  content: string,
  config: SanitizeConfig = SANITIZE_CONFIGS.TEXT_ONLY
): string {
  if (!content || typeof content !== 'string') {
    return '';
  }
  
  try {
    const purify = configureDOMPurify(config);
    return purify.sanitize(content, { RETURN_DOM_FRAGMENT: false }) as string;
  } catch (error) {
    console.error('Sanitization error:', error);
    // Fallback to text-only extraction
    return content.replace(/<[^>]*>/g, '');
  }
}

/**
 * Sanitize text content (strips all HTML)
 */
export function sanitizeText(content: string): string {
  return sanitizeHtml(content, SANITIZE_CONFIGS.TEXT_ONLY);
}

/**
 * Sanitize chat messages (allows basic formatting)
 */
export function sanitizeChatMessage(content: string): string {
  return sanitizeHtml(content, SANITIZE_CONFIGS.CHAT_MESSAGE);
}

/**
 * Sanitize voice transcript (text only)
 */
export function sanitizeVoiceTranscript(content: string): string {
  return sanitizeHtml(content, SANITIZE_CONFIGS.VOICE_TRANSCRIPT);
}

/**
 * Sanitize transaction description (very restrictive)
 */
export function sanitizeTransactionDescription(content: string): string {
  return sanitizeHtml(content, SANITIZE_CONFIGS.TRANSACTION_DESCRIPTION);
}

/**
 * Sanitize user input (basic sanitization)
 */
export function sanitizeUserInput(content: string): string {
  return sanitizeHtml(content, SANITIZE_CONFIGS.USER_INPUT);
}

/**
 * Validate that content is safe after sanitization
 */
export function validateSanitizedContent(
  original: string,
  sanitized: string,
  config: SanitizeConfig = SANITIZE_CONFIGS.TEXT_ONLY
): boolean {
  // Check if content was significantly altered (potential XSS attempt)
  const originalLength = original.length;
  const sanitizedLength = sanitized.length;
  
  // If sanitized content is significantly shorter, it might indicate removed malicious content
  if (originalLength > 0 && sanitizedLength < originalLength * 0.5) {
    console.warn('Content was significantly altered during sanitization', {
      original: original.substring(0, 100),
      sanitized: sanitized.substring(0, 100),
      originalLength,
      sanitizedLength
    });
  }
  
  // Check for common XSS patterns in original content
  const xssPatterns = [
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /onmouseover=/i,
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
  ];
  
  const hasXssPatterns = xssPatterns.some(pattern => pattern.test(original));
  
  if (hasXssPatterns) {
    console.warn('Potential XSS patterns detected in original content', {
      original: original.substring(0, 100),
    });
    return false;
  }
  
  return true;
}

/**
 * Sanitize and validate content with detailed reporting
 */
export function sanitizeAndValidate(
  content: string,
  config: SanitizeConfig = SANITIZE_CONFIGS.TEXT_ONLY
): { sanitized: string; isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (!content || typeof content !== 'string') {
    return { sanitized: '', isValid: true, warnings };
  }
  
  const sanitized = sanitizeHtml(content, config);
  
  // Check for potential security issues
  const originalLength = content.length;
  const sanitizedLength = sanitized.length;
  
  if (originalLength > sanitizedLength) {
    warnings.push(`Content was modified during sanitization (${originalLength} -> ${sanitizedLength} characters)`);
  }
  
  const isValid = validateSanitizedContent(content, sanitized, config);
  
  if (!isValid) {
    warnings.push('Content contains potential security risks');
  }
  
  return { sanitized, isValid, warnings };
}

/**
 * Create a secure React component for rendering sanitized HTML
 */
export function createSanitizedComponent(
  content: string,
  config: SanitizeConfig = SANITIZE_CONFIGS.TEXT_ONLY
): { __html: string } {
  const sanitized = sanitizeHtml(content, config);
  return { __html: sanitized };
}

/**
 * Hook for sanitizing content in React components
 */
export function useSanitizedContent(
  content: string,
  config: SanitizeConfig = SANITIZE_CONFIGS.TEXT_ONLY
): { sanitized: string; isValid: boolean; warnings: string[] } {
  const result = sanitizeAndValidate(content, config);
  
  // Log warnings in development
  if (process.env.NODE_ENV === 'development' && result.warnings.length > 0) {
    console.warn('Content sanitization warnings:', result.warnings);
  }
  
  return result;
}