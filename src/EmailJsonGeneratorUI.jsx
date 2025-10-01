import React, { useState } from 'react';

// Email JSON Generator - React UI (no defaults, patterns only from user)
// - Inputs start empty.
// - Username patterns are taken exactly as pasted (one per line). The component will NOT create additional combinations.
// - If maxResults is greater than provided unique patterns, numeric suffixes are appended to the provided patterns to reach the count.

export default function EmailJsonGeneratorUI() {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [password, setPassword] = useState('');
  const [domain, setDomain] = useState('');
  const [patternsText, setPatternsText] = useState('');
  const [maxResults, setMaxResults] = useState(50);
  const [resultJson, setResultJson] = useState(null);
  const [error, setError] = useState('');

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

  function generate() {
    setError('');
    const usernamePatterns = patternsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (usernamePatterns.length === 0) {
      setError('Provide at least one username pattern (one per line). The generator will use patterns exactly as pasted.');
      return;
    }

    const firstNorm = normalizeLocal(first);
    const lastNorm = normalizeLocal(last);
    const domainNorm = (domain || '').trim().toLowerCase();
    if (!domainNorm) {
      setError('Domain is required.');
      return;
    }

    const seen = new Set();
    const results = [];

    function addCandidate(local) {
      // user-provided template result is normalized for safety
      const localNorm = normalizeLocal(local);
      if (!localNorm) return false;
      const username = `${localNorm}@${domainNorm}`;
      if (seen.has(username)) return false;
      seen.add(username);
      results.push({
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
      if (results.length >= maxResults) break;
      const local = applyTemplate(p, firstNorm, lastNorm);
      addCandidate(local);
    }

    // If we still need more results, append numeric suffixes to the provided locals (in order)
    if (results.length < maxResults) {
      // Take the unique local parts we have (in order of appearance)
      const baseLocals = Array.from(results.map((r) => r.username.split('@')[0]));
      // If there were no valid base locals (e.g., templates normalized to empty), fallback to using raw patterns as literal locals
      if (baseLocals.length === 0) {
        for (const p of usernamePatterns) {
          if (results.length >= maxResults) break;
          const local = normalizeLocal(p);
          if (local) addCandidate(local);
        }
      }

      // Start numeric suffixing
      let n = 1;
      while (results.length < maxResults) {
        const snapshot = baseLocals.length ? baseLocals : usernamePatterns.map((p) => normalizeLocal(p)).filter(Boolean);
        if (snapshot.length === 0) {
          // give up to avoid infinite loop
          break;
        }
        for (const base of snapshot) {
          if (results.length >= maxResults) break;
          addCandidate(base + String(n));
        }
        n += 1;
      }
    }

    // Build output object. For the top-level username, we will use the first generated username if available,
    // otherwise leave it empty to reflect that user should provide the top username pattern if they want control.
    const topUsername = results.length > 0 ? results[0].username : '';

    const out = {
      first_name: first,
      last_name: last,
      password,
      username: topUsername,
      domain: domainNorm,
      sharedmailbox: results.slice(0, maxResults),
    };

    setResultJson(out);
  }

  function generateRandomPatterns() {
    if (!first.trim()) {
      setError('First name is required to generate random patterns.');
      return;
    }

    const commonPatterns = [
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
      '{first}123',
      '{last}123',
      '{f}{l}',
      '{first}2024',
      '{first}01',
      '{last}01',
      '{first}.{last}01',
      '{f}.{last}2024'
    ];

    let selectedPatterns = [];
    
    if (maxResults <= commonPatterns.length) {
      // If we need fewer or equal patterns than available, just shuffle and select
      const shuffled = [...commonPatterns].sort(() => 0.5 - Math.random());
      selectedPatterns = shuffled.slice(0, maxResults);
    } else {
      // If we need more patterns than available, use all patterns and add variations
      selectedPatterns = [...commonPatterns];
      
      // Add numbered variations to reach maxResults
      const basePatterns = ['{first}', '{last}', '{first}.{last}', '{f}.{last}'];
      let counter = 2025;
      
      while (selectedPatterns.length < maxResults && counter < 2100) {
        for (const base of basePatterns) {
          if (selectedPatterns.length >= maxResults) break;
          selectedPatterns.push(`${base}${counter}`);
        }
        counter++;
      }
      
      // If still need more, add more variations
      if (selectedPatterns.length < maxResults) {
        const moreVariations = [
          '{first}_{l}', '{f}_{last}', '{first}-{l}', '{f}-{last}',
          '{last}_{f}', '{l}_{first}', '{last}-{f}', '{l}-{first}'
        ];
        selectedPatterns.push(...moreVariations.slice(0, maxResults - selectedPatterns.length));
      }
    }
    
    setPatternsText(selectedPatterns.join('\n'));
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
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">Email JSON Generator (UI)</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">📝 Personal Information</h3>
            
            <label className="block mb-3">
              <span className="text-sm font-medium text-gray-700 mb-1 block">
                👤 First Name <span className="text-red-500">*</span>
              </span>
              <span className="text-xs text-gray-500 block mb-1">Enter the person's first name (will be used in email patterns)</span>
              <input 
                value={first} 
                onChange={(e) => setFirst(e.target.value)} 
                placeholder="e.g., John" 
                className="mt-1 block w-full rounded-md p-3 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium text-gray-700 mb-1 block">
                👥 Last Name
              </span>
              <span className="text-xs text-gray-500 block mb-1">Enter the person's last name (optional, used in email patterns)</span>
              <input 
                value={last} 
                onChange={(e) => setLast(e.target.value)} 
                placeholder="e.g., Smith" 
                className="mt-1 block w-full rounded-md p-3 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </label>

            <label className="block mb-3">
              <span className="text-sm font-medium text-gray-700 mb-1 block">
                🔒 Password
              </span>
              <span className="text-xs text-gray-500 block mb-1">Default password for all generated email accounts (optional)</span>
              <input 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="e.g., MySecurePass123" 
                className="mt-1 block w-full rounded-md p-3 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </label>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-3">🌐 Email Configuration</h3>
            
            <label className="block mb-3">
              <span className="text-sm font-medium text-gray-700 mb-1 block">
                📧 Email Domain <span className="text-red-500">*</span>
              </span>
              <span className="text-xs text-gray-500 block mb-1">The domain part of the email addresses (after @)</span>
              <input 
                value={domain} 
                onChange={(e) => setDomain(e.target.value)} 
                placeholder="e.g., company.com" 
                className="mt-1 block w-full rounded-md p-3 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-1 block">
                🔢 Maximum Results
              </span>
              <span className="text-xs text-gray-500 block mb-1">How many email addresses to generate</span>
              <input 
                type="number" 
                value={maxResults} 
                onChange={(e) => setMaxResults(Number(e.target.value))} 
                min="1"
                max="1000"
                className="mt-1 block w-32 rounded-md p-3 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
              />
            </label>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={generate} className="px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 font-medium transition-colors">Generate</button>
            <button onClick={copyToClipboard} disabled={!resultJson} className="copy-button px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 font-medium transition-colors">📋 Copy JSON</button>
            <button onClick={downloadJson} disabled={!resultJson} className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 font-medium transition-colors">Download JSON</button>
          </div>

          {error && <div className="text-red-600 mt-2">{error}</div>}
        </div>

        <div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-800 mb-3">🎯 Username Patterns</h3>
            
            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-1 block">
                ✏️ Pattern Templates (one per line)
              </span>
              <span className="text-xs text-gray-500 block mb-2">
                Enter username patterns exactly as you want them. Use placeholders for dynamic substitution:
              </span>
              <div className="bg-white p-2 rounded border mb-2 text-xs">
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  <div><code className="bg-gray-100 px-1 rounded">{'{first}'}</code> → Full first name</div>
                  <div><code className="bg-gray-100 px-1 rounded">{'{last}'}</code> → Full last name</div>
                  <div><code className="bg-gray-100 px-1 rounded">{'{fi}'}</code> or <code className="bg-gray-100 px-1 rounded">{'{f}'}</code> → First initial</div>
                  <div><code className="bg-gray-100 px-1 rounded">{'{li}'}</code> or <code className="bg-gray-100 px-1 rounded">{'{l}'}</code> → Last initial</div>
                </div>
              </div>
              <textarea 
                value={patternsText} 
                onChange={(e) => setPatternsText(e.target.value)} 
                rows={10} 
                placeholder={`Examples:\n{first}.{last}\n{first}{last}\n{f}{last}\njohn.smith\nadmin\nuser{first}`}
                className="mt-1 block w-full rounded-md p-3 border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono text-sm" 
              />
            </label>
            
            <div className="mt-3 flex gap-2">
              <button 
                onClick={generateRandomPatterns}
                className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 text-sm font-medium transition-colors"
              >
                🎲 Generate Random Patterns
              </button>
              <button 
                onClick={() => setPatternsText('')}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 text-sm font-medium transition-colors"
              >
                🗑️ Clear Patterns
              </button>
            </div>
          </div>

          <div className="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="text-sm font-semibold text-yellow-800 mb-2">💡 How It Works</h4>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>• The generator uses your patterns exactly as provided</p>
              <p>• If you need more results than patterns, numeric suffixes will be added</p>
              <p>• All usernames are normalized (lowercase, safe characters only)</p>
              <p>• Duplicate emails are automatically filtered out</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold">Result</h3>
        {!resultJson && <div className="mt-2 text-sm text-muted-foreground">No result yet. Click Generate.</div>}
        {resultJson && (
          <div className="mt-2">
            <pre className="p-3 bg-black text-white rounded overflow-auto text-xs" style={{maxHeight: '420px'}}>
              {JSON.stringify(resultJson, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
