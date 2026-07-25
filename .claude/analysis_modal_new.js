/* ── Show pre-generation analysis modal — returns Promise<answers|null> ── */
function tgenShowAnalysisModal(analysis, aiAnalysis, unknownFields, mainName, depsNotFound) {
  return new Promise(resolve => {
    const { errors, warnings, infos, detected } = analysis;

    const badge = (label, color) =>
      `<span style="background:${color}22;color:${color};border:1px solid ${color}44;border-radius:20px;padding:2px 10px;font-size:.72rem;font-weight:600">${label}</span>`;

    const issueRow = (icon, color, title, detail) =>
      `<div style="display:flex;gap:8px;padding:7px 10px;background:${color}0d;border-left:3px solid ${color};border-radius:6px;margin-bottom:4px">
        <span style="font-size:.8rem;flex-shrink:0">${icon}</span>
        <div><div style="font-size:.74rem;font-weight:600;color:${color};margin-bottom:1px">${title}</div>
        <div style="font-size:.7rem;color:var(--text-2,#94a3b8)">${detail}</div></div>
      </div>`;

    // AI questions from Haiku pre-analysis
    const aiQs = aiAnalysis?.questions || [];

    // Loaded deps summary
    const loadedFiles = (window._tgenFiles || []).slice(1);
    const filesSummary = loadedFiles.length
      ? `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:7px 10px;background:rgba(79,108,247,.07);border:1px solid rgba(79,108,247,.18);border-radius:8px;margin-bottom:10px">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4F6CF7" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span style="font-size:.71rem;font-weight:600;color:#818cf8">Context loaded:</span>
          ${loadedFiles.map(f => `<span style="font-size:.68rem;background:rgba(79,108,247,.12);color:#a5b4fc;border-radius:4px;padding:1px 6px">${f.name}</span>`).join('')}
        </div>`
      : '';

    // AI questions section
    const aiQsHtml = aiQs.length
      ? `<div style="margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            <span style="font-size:.72rem;font-weight:700;color:#a78bfa;text-transform:uppercase;letter-spacing:.06em">AI needs clarification</span>
          </div>
          ${aiQs.map((q, i) => `
            <div style="margin-bottom:9px">
              <div style="display:flex;gap:7px;margin-bottom:4px">
                <span style="flex-shrink:0;width:18px;height:18px;border-radius:50%;background:rgba(167,139,250,.15);border:1px solid rgba(167,139,250,.3);display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;color:#a78bfa">${i+1}</span>
                <span style="font-size:.76rem;color:var(--text,#e2e8f0);line-height:1.4">${q.q}</span>
              </div>
              <input id="tgenAiQ_${i}" type="text" placeholder="Your answer (optional — skip to let AI decide)" style="width:100%;background:#0f1117;border:1px solid rgba(167,139,250,.25);border-radius:7px;padding:6px 10px;color:var(--text,#e2e8f0);font-size:.75rem;box-sizing:border-box;outline:none" onfocus="this.style.borderColor='rgba(167,139,250,.6)'" onblur="this.style.borderColor='rgba(167,139,250,.25)'">
            </div>`).join('')}
        </div>`
      : '';

    // Org connection status row
    const orgRow = SF.isConnected()
      ? `<div style="display:flex;align-items:center;gap:7px;padding:6px 10px;background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.18);border-radius:7px;margin-bottom:10px;font-size:.7rem;color:#6ee7b7">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Org connected — schema &amp; dependencies fetched automatically
        </div>`
      : `<div style="display:flex;align-items:center;gap:7px;padding:6px 10px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.18);border-radius:7px;margin-bottom:10px;font-size:.7rem;color:#fcd34d">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          No org — AI will infer field types &amp; structure from code
        </div>`;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    overlay.innerHTML = `
      <div style="background:var(--surface,#1a1f2e);border:1px solid #2d3748;border-radius:16px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.65);display:flex;flex-direction:column">

        <!-- Header -->
        <div style="padding:16px 20px 12px;border-bottom:1px solid #2d374866;flex-shrink:0">
          <div style="display:flex;align-items:center;gap:8px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F6CF7" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span style="font-size:.92rem;font-weight:700;color:var(--text,#e2e8f0)">Ready to Generate</span>
            <code style="font-size:.68rem;background:#1e293b;color:#94a3b8;padding:1px 8px;border-radius:6px;margin-left:auto;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${mainName}</code>
          </div>
          ${detected.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:9px">${detected.map(d => badge(d.label, d.color)).join('')}</div>` : ''}
        </div>

        <!-- Body -->
        <div style="padding:14px 20px;flex:1;overflow-y:auto">

          <!-- Issues -->
          ${depsNotFound?.length ? issueRow('⚠️','#f59e0b', `Missing deps: ${depsNotFound.join(', ')}`, 'Paste their code in extra tabs for better mocking') : ''}
          ${errors.map(e => issueRow('🔴','#ef4444', e.title, e.detail)).join('')}
          ${warnings.map(w => issueRow('🟡','#f59e0b', w.title, w.detail)).join('')}
          ${infos.map(i => issueRow('🔵','#3b82f6', i.title, i.detail)).join('')}

          <!-- Loaded context -->
          ${filesSummary}

          <!-- Org status -->
          ${orgRow}

          <!-- AI clarification questions -->
          ${aiQsHtml}

          <!-- Universal "anything else" chat box -->
          <div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <span style="font-size:.68rem;font-weight:600;color:var(--text-3,#64748b);text-transform:uppercase;letter-spacing:.06em">Additional context for AI <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></span>
            </div>
            <textarea id="tgenAnaContext" rows="3" placeholder="e.g. 'This class syncs Accounts nightly — test 0-record case and partial failures. Factory class is TestDataFactory. Avoid DML in loops.'" style="width:100%;background:#0f1117;border:1px solid #2d3748;border-radius:8px;padding:8px 10px;color:var(--text,#e2e8f0);font-size:.76rem;box-sizing:border-box;resize:vertical;line-height:1.5;outline:none;font-family:inherit" onfocus="this.style.borderColor='#4F6CF7'" onblur="this.style.borderColor='#2d3748'"></textarea>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:12px 20px 16px;border-top:1px solid #2d374866;flex-shrink:0;display:flex;gap:8px;justify-content:flex-end">
          <button onclick="document.getElementById('tgenAnaOverlay').remove();window._tgenAnaResolve(null)" style="padding:7px 14px;border-radius:8px;border:1px solid #475569;background:transparent;color:var(--text,#e2e8f0);cursor:pointer;font-size:.78rem">Cancel</button>
          <button id="tgenAnaGenBtn" onclick="(()=>{
            const aiAnswers={};
            document.querySelectorAll('[id^=tgenAiQ_]').forEach(el=>{const i=parseInt(el.id.split('_')[1]);aiAnswers[i]=el.value||'';});
            const ctx=document.getElementById('tgenAnaContext')?.value||'';
            window._tgenAnaResolve({purpose:ctx,edgeCases:'',factory:'',fieldCorrections:'',aiAnswers});
            document.getElementById('tgenAnaOverlay').remove();
          })()" style="padding:7px 20px;border-radius:8px;border:none;background:#4F6CF7;color:#fff;cursor:pointer;font-weight:700;font-size:.8rem;display:flex;align-items:center;gap:6px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Generate Test Class
          </button>
        </div>
      </div>`;
    overlay.id = 'tgenAnaOverlay';
    window._tgenAnaResolve = resolve;
    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('tgenAnaGenBtn')?.focus(), 50);
  });
}
