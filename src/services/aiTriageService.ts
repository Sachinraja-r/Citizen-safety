import { AITriageSummary, LocationData } from '../types';

const AI_ENGINE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_ENGINE_URL) || 'http://localhost:8000';

export const aiTriageService = {
  // Asynchronous triage enrichment - never blocks emergency SOS broadcast
  async analyzeEmergencyReport(params: {
    text?: string;
    location?: LocationData;
    userId?: string;
  }): Promise<AITriageSummary | null> {
    try {
      const response = await fetch(`${AI_ENGINE_URL}/api/v1/triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: params.text || 'Emergency SOS button triggered',
          user_id: params.userId,
          location: params.location
            ? {
                latitude: params.location.latitude,
                longitude: params.location.longitude,
                accuracy_meters: params.location.accuracyMeters,
              }
            : undefined,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(4000), // Quick timeout so it never hangs
      });

      if (response.ok) {
        const data = await response.json();
        return {
          severityScore: data.severity_score || 5,
          confidence: data.confidence || 0.95,
          summaryEn: data.summary_en || 'Emergency assistance requested',
          detectedLanguage: data.language_detected || 'en',
          recommendedAction: data.recommended_action || 'Dispatch nearest response vehicle immediately',
          isLikelyFake: data.is_likely_fake || false,
        };
      }
    } catch {
      // Backend AI engine might be offline or in development; fail silently
    }
    return null;
  },
};
