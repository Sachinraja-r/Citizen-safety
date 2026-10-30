import { AITriageSummary, LocationData } from '../types';

/**
 * AI Triage Service — integrates with Person 3's FastAPI AI/ML Engine.
 *
 * Correct endpoint: POST /api/v1/ai-location/triage (Person 3's router prefix)
 * Configured via VITE_AI_ENGINE_URL (defaults to http://localhost:8000)
 *
 * Contract: NEVER blocks SOS creation or dispatch.
 * Strict 4-second timeout. Silently returns null on any failure.
 */

const AI_ENGINE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_ENGINE_URL) || 'http://localhost:8000';

// Map Person 3's canonical incident types to display strings
const INCIDENT_TYPE_LABELS: Record<string, string> = {
  MEDICAL: 'Medical Emergency',
  HARASSMENT: 'Harassment / Stalking',
  VIOLENCE: 'Violence / Assault',
  ACCIDENT: 'Accident / Collision',
  FIRE: 'Fire / Hazard',
  OTHER: 'Other Emergency',
};

export const aiTriageService = {
  /**
   * Sends optional citizen description text to Person 3's AI triage engine.
   * Maps the TriageResult schema fields to the frontend AITriageSummary interface.
   * Never blocks — always called asynchronously after SOS incident is created.
   */
  async analyzeEmergencyReport(params: {
    incidentId?: string;
    text?: string;
    location?: LocationData;
    userId?: string;
    languageHint?: string;
  }): Promise<AITriageSummary | null> {
    try {
      // Person 3 FastAPI endpoint: POST /api/v1/ai-location/triage
      const response = await fetch(`${AI_ENGINE_URL}/api/v1/ai-location/triage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // TriageRequest schema (Person 3's Pydantic model)
          incident_id: params.incidentId || undefined,
          description: params.text || 'Emergency SOS button triggered',
          language_hint: params.languageHint || undefined,
          latitude: params.location?.latitude ?? undefined,
          longitude: params.location?.longitude ?? undefined,
        }),
        // Hard 4-second timeout — SOS must NEVER wait for AI
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) {
        console.warn(`[AI Triage] HTTP ${response.status} from AI engine — proceeding without triage.`);
        return null;
      }

      // TriageResult schema from Person 3:
      // { incident_type, severity, confidence, possible_duplicate, spam_flag,
      //   reason, detected_language, is_fallback, triage_error,
      //   medical_disclaimer, triaged_at }
      const data = await response.json();

      const incidentType = (data.incident_type || 'OTHER') as AITriageSummary['incidentType'];
      const label = INCIDENT_TYPE_LABELS[incidentType] || 'Other Emergency';
      const reason = data.reason || 'AI Emergency analysis completed';

      return {
        incidentType,
        severityScore: typeof data.severity === 'number' ? data.severity : 3,
        confidence: typeof data.confidence === 'number' ? data.confidence : 0.0,
        // Compose a human-readable summary from the AI reason + incident type label
        summaryEn: `[${label}] ${reason}`,
        detectedLanguage: data.detected_language || 'en',
        // Recommended action: derive from severity if not provided
        recommendedAction: _deriveRecommendedAction(incidentType, data.severity),
        isLikelyFake: Boolean(data.spam_flag),
        possibleDuplicate: Boolean(data.possible_duplicate),
        isFallback: Boolean(data.is_fallback),
        medicalDisclaimer: data.medical_disclaimer ||
          'AI severity is an advisory prioritization score and NOT a certified medical assessment.',
        triagedAt: data.triaged_at || new Date().toISOString(),
      };
    } catch (err) {
      // AI engine offline, timed out, or returned malformed JSON — always fail silently
      if (err instanceof Error && err.name === 'TimeoutError') {
        console.warn('[AI Triage] 4-second timeout exceeded — SOS is fully dispatched without AI enrichment.');
      } else {
        console.warn('[AI Triage] AI engine unavailable — proceeding without triage enrichment.', err);
      }
      return null;
    }
  },
};

/**
 * Deterministic recommended action based on Person 3's incident type + severity.
 * Mirrors the priority logic from Person 3's triage service severity mapping.
 */
function _deriveRecommendedAction(incidentType: string, severity?: number): string {
  const sev = severity ?? 3;
  switch (incidentType) {
    case 'FIRE':
      return 'Dispatch fire brigade and nearest available patrol unit immediately';
    case 'MEDICAL':
      return sev >= 4
        ? 'Dispatch KSEMS ambulance and paramedic unit immediately'
        : 'Coordinate medical assistance and monitor patient condition';
    case 'VIOLENCE':
      return 'Dispatch armed response unit — potential threat to life';
    case 'ACCIDENT':
      return sev >= 4
        ? 'Dispatch ambulance and traffic police to incident coordinates'
        : 'Dispatch nearest patrol car to assess and manage traffic incident';
    case 'HARASSMENT':
      return 'Dispatch nearest Pink Hoysala or female officer unit';
    default:
      return 'Dispatch nearest verified patrol unit to assess the situation';
  }
}
