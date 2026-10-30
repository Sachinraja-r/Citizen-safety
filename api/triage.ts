import type { VercelRequest, VercelResponse } from '@vercel/node';

// Multilingual emergency triage engine running natively as a Vercel Serverless Function
// Supports Kannada, Hindi, English, and regional romanized transliterations (Kanglish, Hinglish)

const KEYWORD_MAPPINGS: Record<string, Record<string, string[]>> = {
  FIRE: {
    kn: ['ಬೆಂಕಿ', 'ಹೊಗೆ', 'ಸುಡುತ್ತಿದೆ', 'ಜ್ವಾಲೆ', 'benki', 'hoge', 'suduttide'],
    hi: ['आग', 'धुआं', 'धुआँ', 'जल रहा', 'लपटें', 'aag', 'dhuan', 'dhuwan', 'jal raha'],
    en: ['fire', 'blaze', 'smoke', 'flames', 'burning', 'explosion']
  },
  ACCIDENT: {
    kn: ['ಅಪಘಾತ', 'ಡಿಕ್ಕಿ', 'ರಕ್ತ', 'ವಾಹನ ಪಲ್ಟಿ', 'ಗುದ್ದಿದೆ', 'apaghatha', 'accident', 'dikkki', 'palti'],
    hi: ['दुर्घटना', 'एक्सीडेंट', 'टक्कर', 'खून', 'गाड़ी पलट गई', 'durghatna', 'takkar', 'khoon', 'gaadi gir'],
    en: ['accident', 'crash', 'collision', 'hit and run', 'run over', 'bike fall']
  },
  MEDICAL: {
    kn: ['ಹೃದಯಾಘಾತ', 'ಉಸಿರಾಟ', 'ಪ್ರಜ್ಞೆ ತಪ್ಪಿದೆ', 'ಆಸ್ಪತ್ರೆ', 'ನೋವು', 'ಆಂಬ್ಯುಲೆನ್ಸ್', 'hrudayaghatha', 'ambulance', 'usirata'],
    hi: ['दिल का दौरा', 'सांस', 'बेहोश', 'अस्पताल', 'दर्द', 'एम्बुलेंस', 'हार्ट अटैक', 'behoshi', 'saans', 'aspatal'],
    en: ['medical', 'heart attack', 'unconscious', 'breathing', 'ambulance', 'bleeding', 'stroke', 'collapsed', 'cpr']
  },
  VIOLENCE: {
    kn: ['ಹಲ್ಲೆ', 'ಹೊಡೆದಾಟ', 'ಚಾಕು', 'ಬಂದೂಕು', 'ದರೋಡೆ', 'ಕೊಲೆ', 'halle', 'hodedata', 'chaku', 'kole'],
    hi: ['हमला', 'मारपीट', 'चाकू', 'बंदूक', 'डकैती', 'लड़ाई', 'खूनखराबा', 'hamla', 'marpeet', 'ladai', 'chaku'],
    en: ['violence', 'assault', 'fight', 'attack', 'knife', 'gun', 'stabbing', 'robbery', 'weapon']
  },
  HARASSMENT: {
    kn: ['ಕಿರುಕುಳ', 'ಹಿಂಬಾಲಿಸುವುದು', 'ಚುಡಾಯಿಸುವುದು', 'ಬೆದರಿಕೆ', 'kirukula', 'himbalisuvudu', 'bedarike'],
    hi: ['छेड़छाड़', 'पीछा', 'परेशान', 'धमकी', 'बदसलूकी', 'chhedchhad', 'peecha', 'pareshan', 'dhamki'],
    en: ['harassment', 'stalking', 'eve teasing', 'following me', 'molestation', 'threat']
  }
};

const SPAM_PATTERNS = [
  /^(test|testing|haha|lol|asdf|qwerty|foo|bar|12345)$/i,
  /^just checking$/i,
  /^[a-zA-Z\s]{1,4}$/,
  /^(test\s*)+/i,
  /(test.*test|testing.*lol|haha.*haha|asdf.*qwerty)/i,
  /^(\s*lol\s*)+$/i
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(200).json({
      status: 'online',
      service: 'Raksha AI Engine (Vercel Serverless Edition)',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { description, language_hint } = req.body || {};
    const text = (description || '').trim();

    if (!text) {
      return res.status(200).json({
        incident_type: 'OTHER',
        severity: 3,
        confidence: 0.0,
        possible_duplicate: false,
        spam_flag: false,
        reason: 'Empty description provided; safe fallback applied',
        is_fallback: true,
        detected_language: language_hint || 'en',
        medical_disclaimer: 'AI severity is an advisory prioritization score and NOT a certified medical assessment.',
        triaged_at: new Date().toISOString()
      });
    }

    const textLower = text.toLowerCase();

    // Check for spam/synthetic tests
    const isSpam = SPAM_PATTERNS.some((pattern) => pattern.test(textLower));
    if (isSpam) {
      return res.status(200).json({
        incident_type: 'OTHER',
        severity: 1,
        confidence: 0.95,
        possible_duplicate: false,
        spam_flag: true,
        reason: 'Input matches synthetic or superficial test pattern',
        is_fallback: false,
        detected_language: 'en',
        medical_disclaimer: 'AI severity is an advisory prioritization score and NOT a certified medical assessment.',
        triaged_at: new Date().toISOString()
      });
    }

    // Match keywords
    let detectedLang = language_hint || 'en';
    for (const [incType, langDict] of Object.entries(KEYWORD_MAPPINGS)) {
      for (const [lang, words] of Object.entries(langDict)) {
        for (const word of words) {
          const isAscii = /^[\x00-\x7F]*$/.test(word);
          let isMatch = false;

          if (isAscii) {
            const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, 'i');
            isMatch = regex.test(textLower);
          } else {
            isMatch = textLower.includes(word.toLowerCase());
          }

          if (isMatch) {
            detectedLang = lang;
            let severity = 4;
            if (incType === 'MEDICAL' || incType === 'FIRE') severity = 5;
            else if (incType === 'HARASSMENT') severity = 3;

            return res.status(200).json({
              incident_type: incType,
              severity,
              confidence: 0.88,
              possible_duplicate: false,
              spam_flag: false,
              reason: `Emergency keyword match (${incType}) detected in ${lang}`,
              is_fallback: false,
              triage_error: null,
              detected_language: detectedLang,
              medical_disclaimer: 'AI severity is an advisory prioritization score and NOT a certified medical assessment.',
              triaged_at: new Date().toISOString()
            });
          }
        }
      }
    }

    // Check unicode script
    if (/[\u0C80-\u0CFF]/.test(text)) detectedLang = 'kn';
    else if (/[\u0900-\u097F]/.test(text)) detectedLang = 'hi';

    // Default emergency response
    return res.status(200).json({
      incident_type: 'OTHER',
      severity: 3,
      confidence: 0.5,
      possible_duplicate: false,
      spam_flag: false,
      reason: 'Citizen emergency incident reported',
      is_fallback: false,
      triage_error: null,
      detected_language: detectedLang,
      medical_disclaimer: 'AI severity is an advisory prioritization score and NOT a certified medical assessment.',
      triaged_at: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(200).json({
      incident_type: 'OTHER',
      severity: 3,
      confidence: 0.0,
      possible_duplicate: false,
      spam_flag: false,
      reason: `Safe fallback: ${error?.message || 'Serverless error'}`,
      is_fallback: true,
      triage_error: String(error),
      detected_language: 'en',
      medical_disclaimer: 'AI severity is an advisory prioritization score and NOT a certified medical assessment.',
      triaged_at: new Date().toISOString()
    });
  }
}
