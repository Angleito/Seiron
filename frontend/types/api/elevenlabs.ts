// ElevenLabs TTS API types

export interface TTSError {
  type: 'API_ERROR' | 'NETWORK_ERROR' | 'AUDIO_ERROR' | 'QUOTA_EXCEEDED'
  message: string
  statusCode?: number
  originalError?: unknown
}

export interface TTSState {
  isSpeaking: boolean
  isLoading: boolean
  error: TTSError | null
  cachedAudio: Map<string, ArrayBuffer>
}

export interface ElevenLabsConfig {
  apiUrl: string
  modelId?: string
  voiceSettings?: {
    stability?: number
    similarityBoost?: number
    style?: number
    useSpeakerBoost?: boolean
  }
}

export interface AudioContext {
  audioContext: BaseAudioContext | null
  currentSource: AudioBufferSourceNode | null
}

export interface CacheContext {
  db: IDBDatabase | null
  keyPrefix: string
  maxSize: number
  ttl: number
}

// ElevenLabs API Response Types
export interface ElevenLabsVoice {
  voice_id: string
  name: string
  samples: unknown[]
  category: string
  fine_tuning: {
    language: string
    model_id: string
    is_allowed_to_fine_tune: boolean
  }
  labels: Record<string, string>
  description: string
  preview_url: string
  available_for_tiers: string[]
  settings: {
    stability: number
    similarity_boost: number
    style: number
    use_speaker_boost: boolean
  }
  sharing: {
    status: string
    history_item_sample_id: string
    original_voice_id: string
    public_owner_id: string
    liked_by_count: number
    cloned_by_count: number
    whitelisted_emails: string[]
  }
  high_quality_base_model_ids: string[]
  safety_control: string
  voice_verification: {
    requires_verification: boolean
    is_verified: boolean
    verification_attempts_count: number
    language: string
    verification_attempts: unknown[]
  }
  permission_on_resource: string
}

export interface ElevenLabsQuota {
  character_count: number
  character_limit: number
  can_extend_character_limit: boolean
  allowed_to_extend_character_limit: boolean
  next_character_count_reset_unix: number
  professional_voice_limit: number
  can_extend_voice_limit: boolean
  can_use_instant_voice_cloning: boolean
  can_use_professional_voice_cloning: boolean
  currency: string
  status: string
}

export interface ElevenLabsModel {
  model_id: string
  name: string
  can_be_finetuned: boolean
  can_do_text_to_speech: boolean
  can_do_voice_conversion: boolean
  can_use_style: boolean
  can_use_speaker_boost: boolean
  serves_pro_voices: boolean
  language: {
    language_id: string
    name: string
  }
  description: string
  requires_alpha_access: boolean
  max_characters_request_free_user: number
  max_characters_request_subscribed_user: number
}

export interface ElevenLabsGenerateRequest {
  text: string
  model_id?: string
  voice_settings?: {
    stability?: number
    similarity_boost?: number
    style?: number
    use_speaker_boost?: boolean
  }
  pronunciation_dictionary_locators?: Array<{
    pronunciation_dictionary_id: string
    version_id: string
  }>
  seed?: number
  previous_text?: string
  next_text?: string
  previous_request_ids?: string[]
  next_request_ids?: string[]
}

export interface ElevenLabsGenerateResponse {
  audio: ArrayBuffer
  alignment?: {
    chars: string[]
    charStartTimesMs: number[]
    charDurationsMs: number[]
  }
  normalized_alignment?: {
    chars: string[]
    charStartTimesMs: number[]
    charDurationsMs: number[]
  }
}

export interface ElevenLabsHistory {
  history_item_id: string
  request_id: string
  voice_id: string
  voice_name: string
  voice_category: string
  model_id: string
  text: string
  date_unix: number
  character_count_change_from: number
  character_count_change_to: number
  content_type: string
  state: string
  settings: {
    stability: number
    similarity_boost: number
    style: number
    use_speaker_boost: boolean
  }
  feedback: {
    thumbs_up: boolean
    feedback: string
    emotions: boolean
    inaccurate_clone: boolean
    glitches: boolean
    audio_quality: boolean
    other: boolean
  }
  share_link_id: string
  source: string
}

export interface ElevenLabsSubscription {
  tier: string
  character_count: number
  character_limit: number
  can_extend_character_limit: boolean
  allowed_to_extend_character_limit: boolean
  next_character_count_reset_unix: number
  voice_limit: number
  professional_voice_limit: number
  can_extend_voice_limit: boolean
  can_use_instant_voice_cloning: boolean
  can_use_professional_voice_cloning: boolean
  can_use_speech_to_speech: boolean
  can_use_voice_conversion: boolean
  can_use_pro_voices: boolean
  currency: string
  status: string
  billing_period: {
    start_unix: number
    end_unix: number
  }
  invoice_pdf_url?: string
  next_invoice_date_unix?: number
  has_open_invoices: boolean
}

export interface ElevenLabsErrorResponse {
  detail: {
    status: string
    message: string
  }
}

// Secure Voice API Types
export interface VoiceApiErrorResponse {
  success: false
  error: string
  code?: string
}

export interface VoiceApiSuccessResponse {
  success: true
  data: {
    audioBuffer: string // base64 encoded audio
    contentType: string
    duration?: number
    characterCount: number
  }
}

export type VoiceApiResponse = VoiceApiErrorResponse | VoiceApiSuccessResponse

export interface VoiceSynthesisRequest {
  text: string
  voiceId: string
  modelId?: string
  voiceSettings?: {
    stability?: number
    similarity_boost?: number
    style?: number
    use_speaker_boost?: boolean
  }
}