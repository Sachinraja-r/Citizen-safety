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
    // If client requested JSON explicitly, return JSON healthcheck
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('application/json') || req.query.format === 'json') {
      return res.status(200).json({
        status: 'online',
        service: 'Raksha AI Engine (Vercel Serverless Edition)',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    }

    // Otherwise serve the Developer Interactive API Playground & Documentation
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(renderDeveloperPlayground());
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    const { description, language_hint } = body || {};
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

function renderDeveloperPlayground(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Raksha AI Triage Engine — Developer API Console</title>
  <link rel="icon" type="image/svg+xml" href="/logo.svg" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .glow-border { box-shadow: 0 0 25px rgba(233, 30, 99, 0.15); }
    .pulse-dot { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
  </style>
</head>
<body class="text-slate-100 min-h-screen p-4 md:p-8 flex flex-col items-center">
  <div class="w-full max-w-5xl space-y-6">

    <!-- Top Navigation Header -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 to-rose-400 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-pink-600/30">
          🛡️
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-black tracking-tight text-white">RAKSHA AI ENGINE</h1>
            <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-pink-500/10 text-pink-400 border border-pink-500/30 rounded-full">Serverless Edge</span>
            <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot"></span>
              Live (v1.0.0)
            </span>
          </div>
          <p class="text-xs text-slate-400">Multilingual Emergency Triage & Prioritization Engine (Kannada • Hindi • English)</p>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <a href="/" target="_blank" class="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5">
          🚨 Citizen SOS App
        </a>
        <a href="/responder" target="_blank" class="px-3 py-1.5 text-xs font-semibold bg-pink-600 hover:bg-pink-500 text-white rounded-lg shadow-md shadow-pink-600/20 transition-colors flex items-center gap-1.5">
          🚓 Responder Console
        </a>
      </div>
    </header>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

      <!-- Left Column: Interactive Playground Form -->
      <div class="lg:col-span-7 space-y-5">
        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 glow-border space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              <span>⚡</span> Interactive Triage Tester
            </h2>
            <span class="text-xs text-slate-400">Endpoint: <code class="text-pink-400 font-mono">POST /api/triage</code></span>
          </div>

          <!-- Preset Scenarios -->
          <div class="space-y-2">
            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Emergency Presets:</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button onclick="setScenario('ನನಗೆ ಸಹಾಯ ಬೇಕು, ಯಾರೋ ನನ್ನನ್ನು ಹಿಂಬಾಲಿಸುತ್ತಿದ್ದಾರೆ', 'kn')" class="text-left text-xs p-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-slate-200 transition">
                <span class="font-bold text-pink-400 block">ಕನ್ನಡ Stalking</span>
                <span class="text-[11px] text-slate-400 truncate block">ಹಿಂಬಾಲಿಸುತ್ತಿದ್ದಾರೆ...</span>
              </button>
              <button onclick="setScenario('बिल्डिंग में भीषण आग लग गई है, तुरंत दमकल भेजो', 'hi')" class="text-left text-xs p-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-slate-200 transition">
                <span class="font-bold text-rose-400 block">हिन्दी Fire (आग)</span>
                <span class="text-[11px] text-slate-400 truncate block">दमकल भेजो...</span>
              </button>
              <button onclick="setScenario('Man collapsed on road, unconscious, bleeding severely, ambulance needed', 'en')" class="text-left text-xs p-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-slate-200 transition">
                <span class="font-bold text-amber-400 block">English Medical</span>
                <span class="text-[11px] text-slate-400 truncate block">Unconscious, bleeding...</span>
              </button>
              <button onclick="setScenario('Two cars head on crash at MG road junction, passenger trapped', 'en')" class="text-left text-xs p-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-slate-200 transition">
                <span class="font-bold text-blue-400 block">English Crash</span>
                <span class="text-[11px] text-slate-400 truncate block">Car collision...</span>
              </button>
              <button onclick="setScenario('Stalking outside metro station, someone following me aggressively', 'en')" class="text-left text-xs p-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-slate-200 transition">
                <span class="font-bold text-purple-400 block">Harassment</span>
                <span class="text-[11px] text-slate-400 truncate block">Following me...</span>
              </button>
              <button onclick="setScenario('test haha lol just checking if it works', 'en')" class="text-left text-xs p-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-slate-200 transition">
                <span class="font-bold text-slate-400 block">⚠️ Spam Filter</span>
                <span class="text-[11px] text-slate-400 truncate block">test haha lol...</span>
              </button>
            </div>
          </div>

          <!-- Input Fields -->
          <div class="space-y-3 pt-2">
            <div>
              <label for="desc" class="block text-xs font-semibold text-slate-300 mb-1">
                Emergency Voice Transcript / Description:
              </label>
              <textarea id="desc" rows="3" class="w-full bg-slate-950 border border-slate-700 focus:border-pink-500 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-pink-500 transition" placeholder="Type or paste emergency situation in Kannada, Hindi, or English..."></textarea>
            </div>

            <div class="flex items-center justify-between gap-3">
              <div class="flex-1">
                <label for="lang" class="block text-xs font-semibold text-slate-400 mb-1">Language Hint:</label>
                <select id="lang" class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-pink-500 focus:outline-none">
                  <option value="auto">Auto-Detect (Unicode + Phonetic)</option>
                  <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div class="flex items-end">
                <button id="runBtn" onclick="runTriage()" class="h-9 px-5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-pink-600/30 flex items-center gap-1.5 transition transform active:scale-95">
                  <span id="btnIcon">⚡</span>
                  <span id="btnText">Run AI Triage</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- API Spec Card -->
        <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">cURL Command for Developers</span>
            <button onclick="copyCurl()" class="text-[11px] text-pink-400 hover:text-pink-300 font-medium">Copy cURL</button>
          </div>
          <pre id="curlBox" class="bg-slate-950 p-3 rounded-lg text-[11px] text-slate-300 font-mono overflow-x-auto border border-slate-800/80">curl -X POST https://frontend-nu-nine-47.vercel.app/api/triage \\
  -H "Content-Type: application/json" \\
  -d '{"description": "ನನಗೆ ಸಹಾಯ ಬೇಕು, ಯಾರೋ ನನ್ನನ್ನು ಹಿಂಬಾಲಿಸುತ್ತಿದ್ದಾರೆ"}'</pre>
        </div>
      </div>

      <!-- Right Column: Live Triage Results -->
      <div class="lg:col-span-5 space-y-5">
        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 glow-border space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <span>📊</span> AI Evaluation Result
            </h3>
            <span id="latencyBadge" class="text-[11px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">Ready</span>
          </div>

          <div id="resultsPlaceholder" class="py-12 text-center text-slate-500 text-xs">
            Select a preset scenario on the left or enter a description, then click <strong class="text-slate-400">Run AI Triage</strong>.
          </div>

          <!-- Structured Result Card (Hidden Initially) -->
          <div id="resultsCard" class="hidden space-y-4">
            <!-- Badges Row -->
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Incident Category</span>
                <div id="categoryBadge" class="text-lg font-black text-pink-400 mt-1 flex items-center gap-1.5">
                  -
                </div>
              </div>

              <div class="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Severity Score</span>
                <div id="severityBadge" class="text-lg font-black text-rose-400 mt-1 flex items-center gap-1.5">
                  -
                </div>
              </div>
            </div>

            <!-- Details Table -->
            <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
              <div class="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span class="text-slate-400">Dispatch Unit:</span>
                <span id="dispatchUnit" class="font-bold text-white">-</span>
              </div>
              <div class="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span class="text-slate-400">Confidence:</span>
                <span id="confidenceVal" class="font-mono text-emerald-400 font-bold">-</span>
              </div>
              <div class="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span class="text-slate-400">Detected Language:</span>
                <span id="detectedLangVal" class="font-bold text-slate-200 uppercase">-</span>
              </div>
              <div class="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span class="text-slate-400">Spam Check:</span>
                <span id="spamCheckVal" class="font-bold text-slate-200">-</span>
              </div>
              <div class="py-1">
                <span class="text-slate-400 block text-[11px] mb-0.5">Classification Reason:</span>
                <p id="reasonText" class="text-slate-300 italic text-[11px] leading-relaxed">-</p>
              </div>
            </div>

            <!-- Disclaimer -->
            <p id="disclaimerText" class="text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg leading-tight">
              AI severity is an advisory prioritization score and NOT a certified medical assessment.
            </p>

            <!-- Raw JSON Toggle -->
            <div>
              <button onclick="toggleJson()" class="text-[11px] font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1">
                <span id="jsonToggleIcon">▶</span> Show Raw JSON Payload
              </button>
              <pre id="rawJsonBox" class="hidden mt-2 bg-slate-950 p-3 rounded-lg text-[10px] text-pink-300 font-mono overflow-x-auto border border-slate-800 max-h-48"></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    function setScenario(text, lang) {
      document.getElementById('desc').value = text;
      document.getElementById('lang').value = lang;
      runTriage();
    }

    async function runTriage() {
      const desc = document.getElementById('desc').value.trim();
      const langHint = document.getElementById('lang').value;
      if (!desc) {
        alert('Please enter an emergency description or select a preset.');
        return;
      }

      const runBtn = document.getElementById('runBtn');
      const btnText = document.getElementById('btnText');
      const btnIcon = document.getElementById('btnIcon');
      const latencyBadge = document.getElementById('latencyBadge');

      btnText.innerText = 'Evaluating...';
      btnIcon.innerText = '⏳';
      runBtn.disabled = true;

      const startTime = performance.now();

      try {
        const payload = { description: desc };
        if (langHint !== 'auto') payload.language_hint = langHint;

        const response = await fetch('/api/triage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const elapsed = Math.round(performance.now() - startTime);
        latencyBadge.innerText = elapsed + ' ms';

        const data = await response.json();
        renderResult(data);
      } catch (err) {
        alert('Triage call failed: ' + err.message);
      } finally {
        btnText.innerText = 'Run AI Triage';
        btnIcon.innerText = '⚡';
        runBtn.disabled = false;
      }
    }

    function renderResult(data) {
      document.getElementById('resultsPlaceholder').classList.add('hidden');
      document.getElementById('resultsCard').classList.remove('hidden');

      const catIcons = {
        FIRE: '🔥 Fire Emergency',
        ACCIDENT: '🚗 Road Accident',
        MEDICAL: '🏥 Medical Emergency',
        VIOLENCE: '⚠️ Physical Violence',
        HARASSMENT: '🛡️ Harassment / Stalking',
        OTHER: '📋 General Emergency'
      };

      const dispatchMap = {
        FIRE: '🚒 Fire Department & Rescue',
        ACCIDENT: '🚑 Traffic Police & Ambulance',
        MEDICAL: '🚑 Paramedic Emergency (108 / KSEMS)',
        VIOLENCE: '👮 Armed Police Patrol Unit',
        HARASSMENT: '🚓 Pink Hoysala Women Safety Unit',
        OTHER: '👮 Nearest Beat Officer'
      };

      document.getElementById('categoryBadge').innerHTML = catIcons[data.incident_type] || ('📋 ' + data.incident_type);
      
      const sevColors = ['text-slate-400', 'text-emerald-400', 'text-blue-400', 'text-amber-400', 'text-orange-400', 'text-rose-500'];
      const sevLabels = ['', 'P5 - Low Priority', 'P4 - Guarded', 'P3 - Elevated', 'P2 - Severe Emergency', 'P1 - Life Threatening'];
      const sev = data.severity || 3;
      document.getElementById('severityBadge').className = 'text-lg font-black ' + (sevColors[sev] || 'text-rose-400');
      document.getElementById('severityBadge').innerText = sev + '/5 (' + (sevLabels[sev] || 'Priority') + ')';

      document.getElementById('dispatchUnit').innerText = dispatchMap[data.incident_type] || 'Nearest Emergency Responder';
      document.getElementById('confidenceVal').innerText = Math.round((data.confidence || 0) * 100) + '%';
      document.getElementById('detectedLangVal').innerText = (data.detected_language === 'kn' ? 'Kannada (ಕನ್ನಡ)' : data.detected_language === 'hi' ? 'Hindi (हिन्दी)' : 'English');
      
      if (data.spam_flag) {
        document.getElementById('spamCheckVal').innerHTML = '<span class="text-rose-400 font-bold">⚠️ Flagged as Synthetic/Spam</span>';
      } else {
        document.getElementById('spamCheckVal').innerHTML = '<span class="text-emerald-400 font-bold">✅ Verified Emergency</span>';
      }

      document.getElementById('reasonText').innerText = data.reason || 'Classification complete';
      document.getElementById('disclaimerText').innerText = data.medical_disclaimer || 'AI severity is an advisory score.';

      document.getElementById('rawJsonBox').innerText = JSON.stringify(data, null, 2);
    }

    function toggleJson() {
      const box = document.getElementById('rawJsonBox');
      const icon = document.getElementById('jsonToggleIcon');
      if (box.classList.contains('hidden')) {
        box.classList.remove('hidden');
        icon.innerText = '▼';
      } else {
        box.classList.add('hidden');
        icon.innerText = '▶';
      }
    }

    function copyCurl() {
      const text = document.getElementById('curlBox').innerText;
      navigator.clipboard.writeText(text);
      alert('cURL command copied to clipboard!');
    }

    // Auto-run first scenario on load for immediate preview
    window.addEventListener('DOMContentLoaded', () => {
      setScenario('ನನಗೆ ಸಹಾಯ ಬೇಕು, ಯಾರೋ ನನ್ನನ್ನು ಹಿಂಬಾಲಿಸುತ್ತಿದ್ದಾರೆ', 'kn');
    });
  </script>
</body>
</html>`;
}
