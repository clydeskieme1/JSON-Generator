import { CheckCheck, ClipboardCheck, ClipboardCopy, Dices, Download, Hourglass, Paperclip, Rocket } from 'lucide-react';
import React, { useState } from 'react';
import WebhookIntegration from './WebhookIntegration';

// Email JSON Generator - React UI with separate main and shared mailbox
// - Main mailbox: Single primary email address
// - Shared mailbox: Multiple email addresses based on patterns
// - Maximum results only affects shared mailbox count

export default function EmailJsonGeneratorUI() {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [mainFirst, setMainFirst] = useState('Admin');
  const [mainLast, setMainLast] = useState('User');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('');
  const [mainUsername, setMainUsername] = useState('admin');
  const [patternsText, setPatternsText] = useState('');
  const [randomCount, setRandomCount] = useState(10);
  const [resultJson, setResultJson] = useState(null);
  const [error, setError] = useState('');
  const [generateStatus, setGenerateStatus] = useState(null); // 'loading' or 'success'
  const [mainCopyStatus, setMainCopyStatus] = useState(false);
  const [copyJsonStatus, setCopyJsonStatus] = useState(false);
  const [showWebhookPanel, setShowWebhookPanel] = useState(false);
  const [multipleUsersMode, setMultipleUsersMode] = useState(false);
  const [multipleFirstNames, setMultipleFirstNames] = useState('');
  const [multipleLastNames, setMultipleLastNames] = useState('');
  const [multiplePasswords, setMultiplePasswords] = useState('');
  const [rolling, setRolling] = useState(false);


  // Normalization: lowercase, strip spaces, allow only a-z0-9._-
  function normalizeLocal(s) {
    return (s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9._-]/g, '')
      .replace(/[._-]{2,}/g, (m) => m[0]);
  }

  // Format names for output JSON
  function formatFirstNameForOutput(s) {
    return (s || '').trim().replace(/\s+/g, '');
  }

  function formatLastNameForOutput(s) {
    const t = (s || '').trim();
    if (!t) return '';
    const parts = t.split(/\s+/);
    // Preserve a single space only when the last name has exactly two words
    if (parts.length === 2) return parts.join(' ');
    // Otherwise remove all spaces
    return parts.join('');
  }

  function applyTemplate(tpl, firstNorm, lastNorm) {
    // Replace placeholders if present. If user included literal text, it will be used as-is.
    const fi = firstNorm.slice(0, 1) || '';
    const li = lastNorm.slice(0, 1) || '';
    return tpl
      .replace(/\{first\}/g, firstNorm)
      .replace(/\{last\}/g, lastNorm)
      .replace(/\{fi\}/g, fi)
      .replace(/\{li\}/g, li)
      .replace(/\{f\}/g, fi)
      .replace(/\{l\}/g, li);
  }

  // Parse multiple users from separate input fields
  function parseMultipleUsersFromFields() {
    const firstNames = multipleFirstNames.split('\n').map(line => line.trim()).filter(Boolean);
    const lastNames = multipleLastNames.split('\n').map(line => line.trim()).filter(Boolean);
    const passwords = multiplePasswords.split('\n').map(line => line.trim()).filter(Boolean);

    const users = [];
    const maxLength = Math.max(firstNames.length, lastNames.length, passwords.length);

    for (let i = 0; i < maxLength; i++) {
      users.push({
        first: firstNames[i] || '',
        last: lastNames[i] || '',
        password: passwords[i] || password || '', // Fallback to single user password
      });
    }

    return users.filter(user => user.first || user.last); // Only include users with at least a name
  }

  function generate() {
    setGenerateStatus('loading');
    setError('');

    const domainNorm = (domain || '').trim().toLowerCase();

    if (!domainNorm) {
      setError('Domain is required.');
      setGenerateStatus(null);
      return;
    }

    // Calculate maxResults based on pattern count
    const usernamePatterns = patternsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    // Prevent generation if duplicate patterns are present (trimmed, case-sensitive)
    const patternCounts = new Map();
    for (const p of usernamePatterns) patternCounts.set(p, (patternCounts.get(p) || 0) + 1);
    const duplicatePatterns = Array.from(patternCounts.entries()).filter(([_, c]) => c > 1);
    if (duplicatePatterns.length > 0) {
      setError(`Duplicate patterns detected: ${duplicatePatterns.length} duplicated item${duplicatePatterns.length !== 1 ? 's' : ''}. Please remove duplicates before generating.`);
      setGenerateStatus(null);
      return;
    }

    // Disallow patterns that start with a number (aliases must not begin with digits)
    const invalidStartPatterns = usernamePatterns.filter((p) => /^\d/.test(p));
    if (invalidStartPatterns.length > 0) {
      setError(`Pattern templates must not start with a number. Invalid: ${invalidStartPatterns.join(', ')}`);
      setGenerateStatus(null);
      return;
    }
    const maxResults = Math.max(usernamePatterns.length, 1);

    // Handle multiple users mode
    if (multipleUsersMode) {
      // Check if using separate fields
      const hasFieldData = multipleFirstNames.trim() || multipleLastNames.trim() || multiplePasswords.trim();

      if (!hasFieldData) {
        setError('Users data is required in multiple users mode. Please provide at least first names.');
        setGenerateStatus(null);
        return;
      }

      const users = parseMultipleUsersFromFields();

      if (users.length === 0) {
        setError('No valid users found. Please check the format and ensure at least first names are provided.');
        setGenerateStatus(null);
        return;
      }

      // Generate shared mailbox for multiple users
      const seen = new Set();
      const sharedResults = [];
      // Ensure we return at least one entry per user
      const effectiveMax = Math.max(maxResults, users.length);

      // Generate main username (if provided)
      let mainUsernameNorm = '';
      let mainUserObject = null;
      if (mainUsername.trim()) {
        const mainFirstNorm = normalizeLocal(mainFirst);
        const mainLastNorm = normalizeLocal(mainLast);
        const mainLocal = applyTemplate(mainUsername.trim(), mainFirstNorm, mainLastNorm);
        mainUsernameNorm = `${normalizeLocal(mainLocal)}@${domainNorm}`;
        mainUserObject = {
          first_name: formatFirstNameForOutput(mainFirst),
          last_name: formatLastNameForOutput(mainLast),
          password: password,
          username: mainUsernameNorm,
          domain: domainNorm,
        };
        seen.add(mainUsernameNorm);
      }

      function addCandidateForUser(local, user) {
        const localNorm = normalizeLocal(local);
        if (!localNorm) return false;
        const username = `${localNorm}@${domainNorm}`;
        if (seen.has(username)) return false;
        seen.add(username);
        sharedResults.push({
          first_name: formatFirstNameForOutput(user.first),
          last_name: formatLastNameForOutput(user.last),
          password: user.password,
          username,
          domain: domainNorm,
        });
        return true;
      }

      // Phase 1: Ensure at least one entry per user
      const patterns = usernamePatterns.length > 0 ? usernamePatterns : ['{first}.{last}'];
      for (const user of users) {
        if (sharedResults.length >= effectiveMax) break;
        const firstNorm = normalizeLocal(user.first);
        const lastNorm = normalizeLocal(user.last);
        // Try first available pattern for this user; if duplicate, try next patterns until one is added
        for (const pattern of patterns) {
          if (sharedResults.length >= effectiveMax) break;
          const local = applyTemplate(pattern, firstNorm, lastNorm);
          if (addCandidateForUser(local, user)) break;
        }
      }

      // Phase 2: If room remains, add remaining patterns in round-robin across users
      if (sharedResults.length < effectiveMax && patterns.length > 1) {
        for (let pIndex = 0; pIndex < patterns.length; pIndex++) {
          if (sharedResults.length >= effectiveMax) break;
          const pattern = patterns[pIndex];
          for (const user of users) {
            if (sharedResults.length >= effectiveMax) break;
            const firstNorm = normalizeLocal(user.first);
            const lastNorm = normalizeLocal(user.last);
            const local = applyTemplate(pattern, firstNorm, lastNorm);
            addCandidateForUser(local, user);
          }
        }
      }

      // If we still need more results, add numeric suffixes
      if (sharedResults.length < effectiveMax && users.length > 0) {
        const baseLocals = Array.from(sharedResults.map((r) => r.username.split('@')[0]));
        let n = 1;

        while (sharedResults.length < effectiveMax) {
          if (baseLocals.length === 0) break;

          for (const user of users) {
            if (sharedResults.length >= effectiveMax) break;

            const firstNorm = normalizeLocal(user.first);
            const lastNorm = normalizeLocal(user.last);
            const patterns = usernamePatterns.length > 0 ? usernamePatterns : ['{first}.{last}'];

            for (const pattern of patterns) {
              if (sharedResults.length >= effectiveMax) break;
              const baseLocal = applyTemplate(pattern, firstNorm, lastNorm);
              const localWithSuffix = normalizeLocal(baseLocal) + String(n);
              addCandidateForUser(localWithSuffix, user);
            }
          }
          n += 1;
        }
      }

      // Build output object
      const out = {
        first_name: mainUserObject ? mainUserObject.first_name : formatFirstNameForOutput(users[0]?.first || ''),
        last_name: mainUserObject ? mainUserObject.last_name : formatLastNameForOutput(users[0]?.last || ''),
        password: mainUserObject ? password : (users[0]?.password || ''),
        username: mainUsernameNorm,
        domain: domainNorm,
        sharedmailbox: sharedResults.slice(0, effectiveMax),
      };

      setResultJson(out);
      // Show success state for 1.5 seconds then return to normal
      setTimeout(() => {
        setGenerateStatus('success');
      }, 300);
      setTimeout(() => {
        setGenerateStatus(null);
      }, 2000);
      return;
    }

    // Original single user mode logic
    const firstNorm = normalizeLocal(first);
    const lastNorm = normalizeLocal(last);
    const mainFirstNorm = normalizeLocal(mainFirst);
    const mainLastNorm = normalizeLocal(mainLast);

    // Generate main username
    let mainUsernameNorm = '';
    let mainUserObject = null;
    if (mainUsername.trim()) {
      const mainLocal = applyTemplate(mainUsername.trim(), mainFirstNorm, mainLastNorm);
      mainUsernameNorm = `${normalizeLocal(mainLocal)}@${domainNorm}`;
      mainUserObject = {
        first_name: formatFirstNameForOutput(mainFirst),
        last_name: formatLastNameForOutput(mainLast),
        password: password,
        username: mainUsernameNorm,
        domain: domainNorm,
      };
    }

    const seen = new Set();
    const sharedResults = [];

    // Add main username to seen set to avoid duplicates in shared mailbox
    if (mainUsernameNorm) {
      seen.add(mainUsernameNorm);
    }

    function addCandidate(local) {
      // user-provided template result is normalized for safety
      const localNorm = normalizeLocal(local);
      if (!localNorm) return false;
      const username = `${localNorm}@${domainNorm}`;
      if (seen.has(username)) return false;
      seen.add(username);
      sharedResults.push({
        first_name: formatFirstNameForOutput(first),
        last_name: formatLastNameForOutput(last),
        password: password,
        username,
        domain: domainNorm,
      });
      return true;
    }

    // Use only exactly the patterns the user provided (apply placeholders if present)
    for (const p of usernamePatterns) {
      if (sharedResults.length >= maxResults) break;
      const local = applyTemplate(p, firstNorm, lastNorm);
      addCandidate(local);
    }

    // If we still need more results, append numeric suffixes to the provided locals (in order)
    if (sharedResults.length < maxResults && usernamePatterns.length > 0) {
      // Take the unique local parts we have (in order of appearance)
      const baseLocals = Array.from(sharedResults.map((r) => r.username.split('@')[0]));
      // If there were no valid base locals (e.g., templates normalized to empty), fallback to using raw patterns as literal locals
      if (baseLocals.length === 0) {
        for (const p of usernamePatterns) {
          if (sharedResults.length >= maxResults) break;
          const local = normalizeLocal(p);
          if (local) addCandidate(local);
        }
      }

      // Start numeric suffixing
      let n = 1;
      while (sharedResults.length < maxResults) {
        const snapshot = baseLocals.length ? baseLocals : usernamePatterns.map((p) => normalizeLocal(p)).filter(Boolean);
        if (snapshot.length === 0) {
          // give up to avoid infinite loop
          break;
        }
        for (const base of snapshot) {
          if (sharedResults.length >= maxResults) break;
          addCandidate(base + String(n));
        }
        n += 1;
      }
    }

    // Build output object with separate main and shared mailbox
    const out = {
      first_name: mainUserObject ? mainUserObject.first_name : formatFirstNameForOutput(first),
      last_name: mainUserObject ? mainUserObject.last_name : formatLastNameForOutput(last),
      password,
      username: mainUsernameNorm,
      domain: domainNorm,
      sharedmailbox: sharedResults.slice(0, maxResults),
    };

    setResultJson(out);
    // Show success state for 1.5 seconds then return to normal
    setTimeout(() => {
      setGenerateStatus('success');
    }, 300);
    setTimeout(() => {
      setGenerateStatus(null);
    }, 2000);
  }

  function generateRandomPatterns() {
    // Use user-specified count from state (fallback to 10)
    const parsed = Number(randomCount) || 10;
    const patternCount = Math.max(1, Math.min(parsed, 1000));

    // Helper function for proper array shuffling (Fisher-Yates algorithm)
    function shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }

    // Helper function to generate random year
    function getRandomYear() {
      const currentYear = new Date().getFullYear();
      const years = [
        currentYear - 2, currentYear - 1, currentYear,
        currentYear + 1, currentYear + 2,
        // Add some classic years that are commonly used
        2020, 2021, 2022, 2023, 2024, 2025
      ];
      return years[Math.floor(Math.random() * years.length)];
    }

    // Helper function to generate random numbers
    function getRandomNumber() {
      const numbers = ['01', '02', '03', '123', '456', '789', '99', '00', '11', '22'];
      return numbers[Math.floor(Math.random() * numbers.length)];
    }

    const basePatterns = [
      '{first}.{last}',
      '{first}{last}',
      '{f}.{last}',
      '{f}{last}',
      '{first}.{l}',
      '{first}{l}',
      '{f}.{l}',
      '{first}_{last}',
      '{first}-{last}',
      '{last}.{first}',
      '{last}{first}',
      '{last}.{f}',
      '{last}{f}',
      '{l}.{first}',
      '{l}{first}',
      '{first}',
      '{last}',
      '{f}{l}',
      '{first}_{l}',
      '{f}_{last}',
      '{first}-{l}',
      '{f}-{last}',
      '{last}_{f}',
      '{l}_{first}',
      '{last}-{f}',
      '{l}-{first}'
    ];

    let selectedPatterns = [];
    const maxResults = patternCount;

    // Always start with shuffled base patterns
    const shuffledBase = shuffleArray(basePatterns);

    // Add base patterns up to available count or defaultPatternCount
    const baseCount = Math.min(shuffledBase.length, maxResults);
    selectedPatterns = shuffledBase.slice(0, baseCount);

    // If we need more patterns, add variations with random numbers and years
    if (selectedPatterns.length < maxResults) {
      const variationBases = ['{first}', '{last}', '{first}.{last}', '{f}.{last}', '{first}{last}'];

      while (selectedPatterns.length < maxResults) {
        const base = variationBases[Math.floor(Math.random() * variationBases.length)];

        // Randomly choose between year or number suffix
        if (Math.random() < 0.5) {
          selectedPatterns.push(`${base}${getRandomYear()}`);
        } else {
          selectedPatterns.push(`${base}${getRandomNumber()}`);
        }

        // Avoid infinite loop
        if (selectedPatterns.length > maxResults * 2) break;
      }
    }

    // Final shuffle and trim to exact count
    const finalPatterns = shuffleArray(selectedPatterns).slice(0, maxResults);

    setPatternsText(finalPatterns.join('\n'));
    setError('');
  }

  function copyJsonToClipboardMain() {
    if (!resultJson) return;

    const jsonText = JSON.stringify(resultJson, null, 2);
    navigator.clipboard.writeText(jsonText).then(() => {
      setMainCopyStatus(true);
      setTimeout(() => {
        setMainCopyStatus(false);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      setError('Failed to copy to clipboard');
    });
  }

  const handleRandomize = () => {
    setRolling(true);
    generateRandomPatterns();

    // stop animation after 600ms
    setTimeout(() => setRolling(false), 600);
  };


  function copyJsonToClipboard() {
    if (!resultJson) return;

    const jsonText = JSON.stringify(resultJson, null, 2);
    navigator.clipboard.writeText(jsonText).then(() => {
      setCopyJsonStatus(true);
      setTimeout(() => {
        setCopyJsonStatus(false);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      setError('Failed to copy to clipboard');
    });
  }

  function downloadJson() {
    if (!resultJson) return;
    const blob = new Blob([JSON.stringify(resultJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(resultJson.first_name || 'user').toLowerCase()}_${(resultJson.last_name || 'user').toLowerCase()}_emails.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📧 JSON Email Generator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Generate multiple email addresses with customizable patterns. Perfect for testing, development, and bulk account creation.
          </p>
        </div>

        {/* Top Section - Shared Mailbox & Main Mailbox Config */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">


        </div>
        {/* Middle Section - Username Patterns */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100 mb-8">

          {/* NAME INPUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2">
              {/* Shared Mailbox Info (moved inline with patterns) */}
              <h3 className="text-xl font-semibold text-blue-800 mb-4 flex items-center">
                <span className="mr-2"></span>
                Shared Mailbox Patterns
              </h3>
              <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multipleUsersMode}
                    onChange={(e) => setMultipleUsersMode(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Multiple users mode (paste different users with passwords)</span>
                </label>
                <div className="mt-3">
                  {multipleUsersMode ? (
                    <div className="flex gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Names <span className="text-red-500">*</span></label>
                        <textarea
                          value={multipleFirstNames}
                          onChange={(e) => setMultipleFirstNames(e.target.value)}
                          placeholder={`One per line:\nJohn\nJane\nBob\nMike`}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">One first name per line</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Names</label>
                        <textarea
                          value={multipleLastNames}
                          onChange={(e) => setMultipleLastNames(e.target.value)}
                          placeholder={`One per line:\nSmith\nDoe\nJohnson\nWilson`}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Passwords</label>
                        <textarea
                          value={multiplePasswords}
                          onChange={(e) => setMultiplePasswords(e.target.value)}
                          placeholder={`One per line:\nMyPass123\nSecurePass456\nTestPass789`}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">One password per line (optional)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div>
                        <label className=" text-sm font-medium text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
                        <input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="e.g., John" className=" px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div>
                        <label className=" text-sm font-medium text-gray-700 mb-2">Last Name</label>
                        <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="e.g., Smith" className=" px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div>
                        <label className=" text-sm font-medium text-gray-700 mb-2">Password</label>
                        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="e.g., MySecurePass123" className=" px-3 py-2 border border-gray-300 rounded-lg" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {(() => {
                const patternCount = (patternsText || '')
                  .split('\n')
                  .map((l) => l.trim())
                  .filter(Boolean).length;
                return (
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pattern Templates (one per line)
                    {patternCount > 0 && (
                      <span className="ml-2 inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-md font-semibold">
                        {patternCount} pattern{patternCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </label>
                );
              })()}
              <textarea
                value={patternsText}
                onChange={(e) => setPatternsText(e.target.value)}
                rows={8}
                placeholder={`Examples:\n{first}.{last}\n{first}{last}\n{f}{last}\njohn.smith\nadmin\nuser{first}`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm transition-all duration-200"
              />
              <p className="text-xs text-gray-500 mt-1">Optional - leave empty for main mailbox only</p>
              {(() => {
                const lines = (patternsText || '')
                  .split('\n')
                  .map((l) => l.trim())
                  .filter(Boolean);
                const counts = new Map();
                for (const l of lines) counts.set(l, (counts.get(l) || 0) + 1);
                const duplicates = Array.from(counts.entries()).filter(([_, c]) => c > 1);
                if (duplicates.length === 0) return null;
                const examples = duplicates
                  .slice(0, 5)
                  .map(([p, c]) => `${p} (${c}x)`) // show count
                  .join(', ');
                return (
                  <div className="mt-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">
                    <span className="font-semibold">Duplicate patterns detected:</span> {duplicates.length} items repeated.
                    {examples && (
                      <span className="ml-1">Examples: {examples}</span>
                    )}
                    <div className="text-[11px] text-red-600 mt-1">Duplicates are checked after trimming and are case-sensitive.</div>
                  </div>
                );
              })()}

              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <div className="flex items-center gap-2 w-full">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700">Count</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      tabIndex={-1}
                      value={randomCount}
                      onChange={(e) => setRandomCount(Number(e.target.value))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                    />
                  </div>
                  <button
                    tabIndex={-1}
                    onClick={handleRandomize}
                    className="ml-auto px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 text-sm font-medium transition-all duration-200"
                  >
                    <Dices
                      className={`w-5 h-5 mr-2 inline-block ${rolling ? "animate-spin" : ""
                        }`}
                    />
                    Randomize
                  </button>

                </div>
                <button
                  onClick={() => setPatternsText('')}
                  tabIndex={-1}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:ring-4 focus:ring-gray-300 text-sm font-medium transition-all duration-200"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* DOMAIN INPUT */}

            <div>
              <h3 className='text-xl font-semibold text-blue-700 mb-4 flex items-center '> Domain </h3>
              <div className="space-y-4">

                <div>

                  <label className="block text-md font-medium text-gray-900 mb-2">
                    Email Domain <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="e.g., company.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used for both main and shared mailboxes</p>
                </div>

              </div>

              <h3 className='text-xl font-semibold text-gray-700 mb-4 flex items-center mt-4'> Main Mailbox Information </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Main First Name
                  </label>
                  <input
                    tabIndex={-1}
                    value={mainFirst}
                    onChange={(e) => setMainFirst(e.target.value)}
                    placeholder="e.g., Admin"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Main Last Name
                  </label>
                  <input
                    tabIndex={-1}
                    value={mainLast}
                    onChange={(e) => setMainLast(e.target.value)}
                    placeholder="e.g., User"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Main Username Pattern/Alias
                  </label>
                  <input
                    tabIndex={-1}
                    value={mainUsername}
                    onChange={(e) => setMainUsername(e.target.value)}
                    placeholder="e.g., admin"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Primary email address (optional)
                  </p>
                </div>
              </div>

            </div>


          </div>


        </div>

        {/* Action Buttons Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xl mx-auto">
            <button
              onClick={generate}
              disabled={generateStatus === 'loading'}
              className={`flex-1 px-4 py-3 rounded-lg text-white font-medium transition-all duration-300 transform text-sm ${generateStatus === 'loading'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 cursor-wait scale-100'
                : generateStatus === 'success'
                  ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 scale-105'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-105'
                } focus:ring-4 focus:ring-blue-300 disabled:opacity-75`}
            >
              <span className="flex items-center gap-2">
                {generateStatus === "loading" ? (
                  <>
                    <Hourglass className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : generateStatus === "success" ? (
                  <>
                    <CheckCheck className="w-5 h-5 " />
                    Generated!
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Generate Emails
                  </>
                )}
              </span>

            </button>
            <button
              onClick={copyJsonToClipboardMain}
              disabled={!resultJson}
              className={`copy-button flex-1 px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-gray-300 font-medium transition-all duration-300 text-sm ${mainCopyStatus
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
            >
              <span className="flex items-center gap-2">
                {mainCopyStatus ? (
                  <>
                    <ClipboardCheck className="w-5 h-5  " />
                    Copied!
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="w-5 h-5" />
                    Copy JSON
                  </>
                )}
              </span>

            </button>
            <button
              onClick={downloadJson}
              disabled={!resultJson}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-gray-300 font-medium transition-all duration-200 text-sm"
            >
              <Download className="w-5 h-5 inline mr-2" /> Download
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm max-w-2xl mx-auto">
              {error}
            </div>
          )}
        </div>

        {/* Webhook and Cookie Integration */}
        {showWebhookPanel && (
          <WebhookIntegration
            resultJson={resultJson}
            onClose={() => setShowWebhookPanel(false)}
          />
        )}

        {/* Toggle Webhook Panel Button */}
        {!showWebhookPanel && resultJson && (
          <div className="hidden  justify-center mb-8">
            <button
              onClick={() => setShowWebhookPanel(true)}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 font-medium transition-all duration-200 transform hover:scale-105 text-sm"
            >
              <Paperclip className="w-5 h-5 inline mr-2" /> Add Users via Webhook
            </button>
          </div>
        )}

        {/* Bottom Section - Results */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2"></span>
            Generated Results
          </h3>

          {!resultJson ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📧</div>
              <p className="text-gray-500 text-lg">No results yet</p>
              <p className="text-gray-400 text-sm mt-2">Fill in the details above and click Generate to create your JSON</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-lg mb-2 ">Generated <span className='text-lg font-bold text-gray-900'> {resultJson.sharedmailbox.length}</span> email addresses</div>
                <div className="text-lg">
                  Domain: <span className="text-lg font-bold text-blue-900 bg-blue-200 rounded-md px-4 py-1 ">{resultJson.domain}</span>
                </div>

              </div>

              <div className="bg-black rounded-lg overflow-hidden">
                <div className="flex items-center justify-between bg-gray-800 px-4 py-2 text-white">
                  <span className="text-sm font-medium">JSON Output</span>
                  <button
                    onClick={copyJsonToClipboard}
                    disabled={!resultJson}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300 ${copyJsonStatus
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {copyJsonStatus ? '✅ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <pre className="p-4 text-green-400 text-xs overflow-auto max-h-96 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                  {JSON.stringify(resultJson, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Made with ❤️ for developers • Perfect for testing and development
          </p>
        </div>
      </div>
    </div>
  );
}
