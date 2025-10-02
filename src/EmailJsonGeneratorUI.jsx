import React, { useState } from 'react';

// Email JSON Generator - React UI with separate main and shared mailbox
// - Main mailbox: Single primary email address
// - Shared mailbox: Multiple email addresses based on patterns
// - Maximum results only affects shared mailbox count

export default function EmailJsonGeneratorUI() {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [mainFirst, setMainFirst] = useState('');
  const [mainLast, setMainLast] = useState('');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('');
  const [mainUsername, setMainUsername] = useState('');
  const [patternsText, setPatternsText] = useState('');
  const [maxResults, setMaxResults] = useState(50);
  const [resultJson, setResultJson] = useState(null);
  const [error, setError] = useState('');
  const [multipleUsersMode, setMultipleUsersMode] = useState(false);
  const [multipleFirstNames, setMultipleFirstNames] = useState('');
  const [multipleLastNames, setMultipleLastNames] = useState('');
  const [multiplePasswords, setMultiplePasswords] = useState('');

  // Normalization: lowercase, strip spaces, allow only a-z0-9._-
  function normalizeLocal(s) {
    return (s || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9._-]/g, '')
      .replace(/[._-]{2,}/g, (m) => m[0]);
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
    setError('');
    
    const domainNorm = (domain || '').trim().toLowerCase();
    
    if (!domainNorm) {
      setError('Domain is required.');
      return;
    }

    // Handle multiple users mode
    if (multipleUsersMode) {
      // Check if using separate fields
      const hasFieldData = multipleFirstNames.trim() || multipleLastNames.trim() || multiplePasswords.trim();
      
      if (!hasFieldData) {
        setError('Users data is required in multiple users mode. Please provide at least first names.');
        return;
      }
      
      const users = parseMultipleUsersFromFields();
      
      if (users.length === 0) {
        setError('No valid users found. Please check the format and ensure at least first names are provided.');
        return;
      }
      
      // Generate shared mailbox for multiple users
      const usernamePatterns = patternsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      
      const seen = new Set();
      const sharedResults = [];
      
      // Generate main username (if provided)
      let mainUsernameNorm = '';
      let mainUserObject = null;
      if (mainUsername.trim()) {
        const mainFirstNorm = normalizeLocal(mainFirst);
        const mainLastNorm = normalizeLocal(mainLast);
        const mainLocal = applyTemplate(mainUsername.trim(), mainFirstNorm, mainLastNorm);
        mainUsernameNorm = `${normalizeLocal(mainLocal)}@${domainNorm}`;
        mainUserObject = {
          first_name: mainFirst,
          last_name: mainLast,
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
          first_name: user.first,
          last_name: user.last,
          password: user.password,
          username,
          domain: domainNorm,
        });
        return true;
      }
      
      // Generate emails for each user with each pattern
      for (const user of users) {
        if (sharedResults.length >= maxResults) break;
        
        const firstNorm = normalizeLocal(user.first);
        const lastNorm = normalizeLocal(user.last);
        
        // Use patterns if provided, otherwise use default patterns
        const patterns = usernamePatterns.length > 0 ? usernamePatterns : ['{first}.{last}'];
        
        for (const pattern of patterns) {
          if (sharedResults.length >= maxResults) break;
          const local = applyTemplate(pattern, firstNorm, lastNorm);
          addCandidateForUser(local, user);
        }
      }
      
      // If we still need more results, add numeric suffixes
      if (sharedResults.length < maxResults && users.length > 0) {
        const baseLocals = Array.from(sharedResults.map((r) => r.username.split('@')[0]));
        let n = 1;
        
        while (sharedResults.length < maxResults) {
          if (baseLocals.length === 0) break;
          
          for (const user of users) {
            if (sharedResults.length >= maxResults) break;
            
            const firstNorm = normalizeLocal(user.first);
            const lastNorm = normalizeLocal(user.last);
            const patterns = usernamePatterns.length > 0 ? usernamePatterns : ['{first}.{last}'];
            
            for (const pattern of patterns) {
              if (sharedResults.length >= maxResults) break;
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
        first_name: mainUserObject ? mainFirst : (users[0]?.first || ''),
        last_name: mainUserObject ? mainLast : (users[0]?.last || ''),
        password: mainUserObject ? password : (users[0]?.password || ''),
        username: mainUsernameNorm,
        domain: domainNorm,
        sharedmailbox: sharedResults.slice(0, maxResults),
      };
      
      setResultJson(out);
      return;
    }
    
    // Original single user mode logic
    const firstNorm = normalizeLocal(first);
    const lastNorm = normalizeLocal(last);
    const mainFirstNorm = normalizeLocal(mainFirst);
    const mainLastNorm = normalizeLocal(mainLast);
    
    if (!domainNorm) {
      setError('Domain is required.');
      return;
    }

    // Generate main username
    let mainUsernameNorm = '';
    let mainUserObject = null;
    if (mainUsername.trim()) {
      const mainLocal = applyTemplate(mainUsername.trim(), mainFirstNorm, mainLastNorm);
      mainUsernameNorm = `${normalizeLocal(mainLocal)}@${domainNorm}`;
      mainUserObject = {
        first_name: mainFirst,
        last_name: mainLast,
        password: password,
        username: mainUsernameNorm,
        domain: domainNorm,
      };
    }

    // Generate shared mailbox
    const usernamePatterns = patternsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

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
        first_name: first,
        last_name: last,
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
      first_name: mainUserObject ? mainFirst : first,
      last_name: mainUserObject ? mainLast : last,
      password,
      username: mainUsernameNorm,
      domain: domainNorm,
      sharedmailbox: sharedResults.slice(0, maxResults),
    };

    setResultJson(out);
  }

  function generateRandomPatterns() {
    if (!first.trim()) {
      setError('First name is required to generate random patterns.');
      return;
    }

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
    
    // Always start with shuffled base patterns
    const shuffledBase = shuffleArray(basePatterns);
    
    // Add base patterns up to available count or maxResults
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

   function copyToClipboard() {
    if (!resultJson) return;
    
    const jsonText = JSON.stringify(resultJson, null, 2);
    navigator.clipboard.writeText(jsonText).then(() => {
      // Show a temporary success message
      const button = document.querySelector('.copy-button');
      const originalText = button.textContent;
      button.textContent = '✅ Copied!';
      button.classList.add('bg-green-600', 'hover:bg-green-700');
      button.classList.remove('bg-gray-600', 'hover:bg-gray-700');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('bg-green-600', 'hover:bg-green-700');
        button.classList.add('bg-gray-600', 'hover:bg-gray-700');
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
          <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100">
            <h3 className="text-xl font-semibold text-blue-800 mb-4 flex items-center">
              <span className="mr-2">👥</span>
              Shared Mailbox Information
            </h3>
            
            {/* Toggle for single vs multiple users */}
            <div className="mb-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={multipleUsersMode}
                  onChange={(e) => setMultipleUsersMode(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Multiple users mode (paste different users with passwords)
                </span>
              </label>
            </div>

            {multipleUsersMode ? (
              /* Multiple users mode - separate input fields */
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Names <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={multipleFirstNames}
                      onChange={(e) => setMultipleFirstNames(e.target.value)}
                      placeholder={`One per line:
John
Jane
Bob
Mike`}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">One first name per line</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Names
                    </label>
                    <textarea
                      value={multipleLastNames}
                      onChange={(e) => setMultipleLastNames(e.target.value)}
                      placeholder={`One per line:
Smith
Doe
Johnson
Wilson`}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">One last name per line (optional)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passwords
                    </label>
                    <textarea
                      value={multiplePasswords}
                      onChange={(e) => setMultiplePasswords(e.target.value)}
                      placeholder={`One per line:
MyPass123
SecurePass456
TestPass789
Password2024`}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">One password per line (optional)</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Single user mode - individual inputs */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={first} 
                    onChange={(e) => setFirst(e.target.value)} 
                    placeholder="e.g., John" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input 
                    value={last} 
                    onChange={(e) => setLast(e.target.value)} 
                    placeholder="e.g., Smith" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="e.g., MySecurePass123" 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
            <h3 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
              <span className="mr-2">👤</span>
              Main Mailbox Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Main First Name
                </label>
                <input 
                  value={mainFirst} 
                  onChange={(e) => setMainFirst(e.target.value)} 
                  placeholder="e.g., Jane" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Main Last Name
                </label>
                <input 
                  value={mainLast} 
                  onChange={(e) => setMainLast(e.target.value)} 
                  placeholder="e.g., Doe" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Main Username Pattern
                </label>
                <input 
                  value={mainUsername} 
                  onChange={(e) => setMainUsername(e.target.value)} 
                  placeholder="e.g., {first}.{last}" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200" 
                />
                <p className="text-xs text-gray-500 mt-1">Primary email address (optional)</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-100">
            <h3 className="text-xl font-semibold text-orange-800 mb-4 flex items-center">
              <span className="mr-2">⚙️</span>
              General Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Domain <span className="text-red-500">*</span>
                </label>
                <input 
                  value={domain} 
                  onChange={(e) => setDomain(e.target.value)} 
                  placeholder="e.g., company.com" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200" 
                />
                <p className="text-xs text-gray-500 mt-1">Used for both main and shared mailboxes</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Results
                </label>
                <input 
                  type="number" 
                  value={maxResults} 
                  onChange={(e) => setMaxResults(Number(e.target.value))} 
                  min="1"
                  max="1000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200" 
                />
                <p className="text-xs text-gray-500 mt-1">For shared mailbox only</p>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section - Username Patterns */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100 mb-8">
          <h3 className="text-xl font-semibold text-purple-800 mb-4 flex items-center">
            <span className="mr-2">🎯</span>
            Shared Mailbox Patterns
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pattern Templates (one per line)
              </label>
              <textarea 
                value={patternsText} 
                onChange={(e) => setPatternsText(e.target.value)} 
                rows={8} 
                placeholder={`Examples:\n{first}.{last}\n{first}{last}\n{f}{last}\njohn.smith\nadmin\nuser{first}`}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm transition-all duration-200" 
              />
              <p className="text-xs text-gray-500 mt-1">Optional - leave empty for main mailbox only</p>
              
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <button 
                  onClick={generateRandomPatterns}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 focus:ring-4 focus:ring-purple-300 text-sm font-medium transition-all duration-200"
                >
                  🎲 Generate Random
                </button>
                <button 
                  onClick={() => setPatternsText('')}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:ring-4 focus:ring-gray-300 text-sm font-medium transition-all duration-200"
                >
                  🗑️ Clear
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg text-xs">
                <h4 className="font-semibold text-gray-700 mb-2">Template Variables:</h4>
                <div className="space-y-1 text-gray-600">
                  <div><code className="bg-white px-2 py-1 rounded">{'{first}'}</code> → Full first name</div>
                  <div><code className="bg-white px-2 py-1 rounded">{'{last}'}</code> → Full last name</div>
                  <div><code className="bg-white px-2 py-1 rounded">{'{f}'}</code> → First initial</div>
                  <div><code className="bg-white px-2 py-1 rounded">{'{l}'}</code> → Last initial</div>
                </div>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2 flex items-center">
                  <span className="mr-1">💡</span>
                  How It Works
                </h4>
                <div className="text-xs text-yellow-700 space-y-1">
                  <p>• Uses your patterns exactly as provided</p>
                  <p>• Adds numeric suffixes if more results needed</p>
                  <p>• Normalizes usernames for safety</p>
                  <p>• Filters out duplicate emails automatically</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Section */}
         <div className="bg-white rounded-xl shadow-lg p-4 mb-8">
           <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-xl mx-auto">
             <button 
               onClick={generate} 
               className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 font-medium transition-all duration-200 transform hover:scale-105 text-sm"
             >
               🚀 Generate Emails
             </button>
             <button 
               onClick={copyToClipboard} 
               disabled={!resultJson} 
               className="copy-button flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-gray-300 font-medium transition-all duration-200 text-sm"
             >
               📋 Copy JSON
             </button>
             <button 
               onClick={downloadJson} 
               disabled={!resultJson} 
               className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-4 focus:ring-gray-300 font-medium transition-all duration-200 text-sm"
             >
               💾 Download
             </button>
           </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm max-w-2xl mx-auto">
              {error}
            </div>
          )}
        </div>

        {/* Bottom Section - Results */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📊</span>
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
                <div className="text-sm text-gray-600 mb-1">Generated {resultJson.sharedmailbox.length} email addresses</div>
                <div className="text-xs text-gray-500">Domain: {resultJson.domain}</div>
              </div>
              
              <div className="bg-black rounded-lg overflow-hidden">
                <div className="bg-gray-800 px-4 py-2 text-white text-sm font-medium">
                  JSON Output
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
