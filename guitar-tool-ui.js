/**
 * ============================================================
 * GUITAR TOOL UI — Acordes Rafa
 * ============================================================
 * Handles all UI rendering for the chord generator & identifier.
 * Depends on: guitar-theory.js (GuitarTheory)
 * ============================================================
 */

// ── State ──
const muteState = [false, false, false, false, false, false];
let selectedVoicingIdx = 0;
let currentChordData = null;
let liveTimer = null;

// ── Tab switching ──
function switchTab(tab) {
    document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('panel-' + tab).classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
}

// ── Chord Generator ──
function setChord(name) {
    document.getElementById('chordInput').value = name;
    generateChord();
}

function liveGenerate() {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(generateChord, 400);
}

function generateChord() {
    const rawInput = document.getElementById('chordInput').value.trim();
    if (!rawInput) return;

    // Accept Spanish note names (DO, RE, MI, FA, SOL, LA, SI)
    const input = GuitarTheory.spanishToEnglish(rawInput);

    try {
        const data = GuitarTheory.generateChord(input);
        currentChordData = data;
        selectedVoicingIdx = 0;

        if (data.error) {
            document.getElementById('generatorResult').innerHTML =
                `<div class="card"><p class="error-msg">⚠️ ${data.error}</p></div>`;
            return;
        }

        renderGeneratorResult(data);
    } catch (e) {
        document.getElementById('generatorResult').innerHTML =
            `<div class="card"><p class="error-msg">⚠️ Error: ${e.message}</p></div>`;
    }
}

function renderGeneratorResult(data) {
    const { displayName, chordNotes, formula, voicings, root } = data;

    // Notes table rows
    const noteRows = chordNotes.map(cn => {
        const spanNote = GuitarTheory.ENG_TO_SPANISH[cn.note] || cn.note;
        return `<tr>
            <td><span class="interval-badge">${cn.interval}</span></td>
            <td style="font-weight:700">${cn.note} <span style="font-weight:400;color:var(--muted);font-size:0.8rem">(${spanNote})</span></td>
            <td style="color:var(--muted)">${semitonesToName(cn.semitones)}</td>
        </tr>`;
    }).join('');

    // Voicings
    const voicingCards = voicings.length > 0
        ? voicings.map((v, i) => buildVoicingCard(v, data, i)).join('')
        : '<p style="color:var(--muted);font-size:0.9rem;padding:20px 0;">No se encontraron digitaciones. Prueba omitir la quinta o considerar inversiones.</p>';

    // Selected voicing diagram (first one)
    const selectedVoicing = voicings[selectedVoicingIdx] || null;
    const fretDiagram = selectedVoicing
        ? renderFretDiagram(selectedVoicing, data)
        : '<p style="color:var(--muted)">Sin digitación</p>';

    const spanishChordName = GuitarTheory.toSpanishDisplayName(displayName);
    const showSpanish = spanishChordName !== displayName;

    document.getElementById('generatorResult').innerHTML = `
        <div class="card">
            <div class="two-col">
                <div>
                    <p class="section-subtitle">Acorde identificado</p>
                    <div style="font-family:'Outfit',sans-serif;font-size:2rem;font-weight:700;
                        background:linear-gradient(135deg,#635bff,#a259ff);
                        -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                        background-clip:text;margin-bottom:4px;">${displayName}</div>
                    ${showSpanish ? `<div style="font-family:'Outfit',sans-serif;font-size:1.1rem;color:var(--muted);margin-bottom:12px;font-weight:600;">${spanishChordName}</div>` : '<div style="margin-bottom:12px;"></div>'}
                    <div class="chord-info">
                        <div class="info-badge">
                            <div class="label">Tónica</div>
                            <div class="value">${data.rootDisplay}</div>
                        </div>
                        <div class="info-badge">
                            <div class="label">Fórmula</div>
                            <div class="value" style="font-size:0.85rem">${formula.join(' - ')}</div>
                        </div>
                        ${data.bassNote ? `<div class="info-badge">
                            <div class="label">Bajo</div>
                            <div class="value">${data.bassNote.bassDisplay}</div>
                        </div>` : ''}
                    </div>
                    <table class="notes-table" style="margin-top:16px">
                        <thead>
                            <tr>
                                <th>Intervalo</th>
                                <th>Nota</th>
                                <th>Nombre</th>
                            </tr>
                        </thead>
                        <tbody>${noteRows}</tbody>
                    </table>
                </div>
                <div>
                    <p class="section-subtitle">Diagrama de digitación</p>
                    <div id="activeDiagram">${fretDiagram}</div>
                </div>
            </div>
        </div>
        <div class="card">
            <p class="section-subtitle">Digitaciones disponibles (haz clic para ver)</p>
            <div class="voicings-grid" id="voicingsGrid">
                ${voicingCards}
            </div>
        </div>
    `;

    // Mark first selected
    const firstCard = document.querySelector('.voicing-card');
    if (firstCard) firstCard.classList.add('selected');

    if (typeof renderGeneratorHorizontalFretboard === 'function') {
        renderGeneratorHorizontalFretboard(selectedVoicing);
    }
}

function selectVoicing(idx) {
    if (!currentChordData) return;
    selectedVoicingIdx = idx;
    document.querySelectorAll('.voicing-card').forEach((c, i) => {
        c.classList.toggle('selected', i === idx);
    });
    const v = currentChordData.voicings[idx];
    if (v) {
        document.getElementById('activeDiagram').innerHTML = renderFretDiagram(v, currentChordData);
        if (typeof renderGeneratorHorizontalFretboard === 'function') {
            renderGeneratorHorizontalFretboard(v);
        }
    }
}

function buildVoicingCard(voicing, data, idx) {
    const svgMini = renderMiniDiagram(voicing, data);
    const fretsStr = voicing.map(f => f.fret === 'x' ? 'x' : f.fret).join('-');
    return `
        <div class="voicing-card" onclick="selectVoicing(${idx})" id="voicing-${idx}" title="${fretsStr}">
            ${svgMini}
            <div class="voicing-label">${fretsStr}</div>
        </div>
    `;
}

// ── SVG Fret Diagram Renderer ──
function renderFretDiagram(voicing, data) {
    const W = 200, H = 240;
    const STRINGS = 6, FRETS_SHOWN = 5;
    const LEFT = 38, TOP = 50, RIGHT = W - 14;
    const strW = (RIGHT - LEFT) / (STRINGS - 1);
    const fretH = (H - TOP - 28) / FRETS_SHOWN;

    // Determine fret window
    const playedFrets = voicing.filter(f => f.fret !== 'x' && f.fret > 0).map(f => f.fret);
    let startFret = 0;
    if (playedFrets.length > 0) {
        const minF = Math.min(...playedFrets);
        startFret = Math.max(0, minF - 1);
    }
    const endFret = startFret + FRETS_SHOWN;

    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="fretboard-svg">`;

    // Nut (thick line at fret 0 if startFret=0)
    if (startFret === 0) {
        svg += `<rect x="${LEFT}" y="${TOP - 4}" width="${RIGHT - LEFT}" height="6" rx="2" fill="#1a1f36"/>`;
    } else {
        // Fret position indicator
        svg += `<text x="${LEFT - 8}" y="${TOP + fretH * 0.5 + 5}" font-size="11" fill="#6b7280" text-anchor="end" font-family="JetBrains Mono,monospace">${startFret + 1}</text>`;
    }

    // Fret lines
    for (let f = 0; f <= FRETS_SHOWN; f++) {
        const y = TOP + f * fretH;
        svg += `<line x1="${LEFT}" y1="${y}" x2="${RIGHT}" y2="${y}" stroke="#d1d5db" stroke-width="${f === 0 ? 1.5 : 1}"/>`;
    }

    // String lines & open/mute markers
    for (let s = 0; s < STRINGS; s++) {
        const x = LEFT + s * strW;
        svg += `<line x1="${x}" y1="${TOP}" x2="${x}" y2="${TOP + FRETS_SHOWN * fretH}" stroke="#9ca3af" stroke-width="1.2"/>`;

        const v = voicing[s];
        if (v.fret === 'x') {
            // Mute X
            svg += `<text x="${x}" y="${TOP - 12}" font-size="13" text-anchor="middle" fill="#ef4444" font-weight="700">✕</text>`;
        } else if (v.fret === 0) {
            // Open circle
            svg += `<circle cx="${x}" cy="${TOP - 10}" r="6" fill="none" stroke="#635bff" stroke-width="2"/>`;
        }
    }

    // Finger dots
    for (let s = 0; s < STRINGS; s++) {
        const v = voicing[s];
        if (v.fret === 'x' || v.fret === 0) continue;
        if (v.fret < startFret || v.fret > endFret) continue;

        const x = LEFT + s * strW;
        const relFret = v.fret - startFret;
        const y = TOP + (relFret - 0.5) * fretH;

        // Color by interval
        const color = intervalColor(v.interval);
        svg += `<circle cx="${x}" cy="${y}" r="11" fill="${color}"/>`;
        svg += `<text x="${x}" y="${y + 4}" font-size="9" text-anchor="middle" fill="white" font-weight="700" font-family="JetBrains Mono,monospace">${v.note}</text>`;
    }

    // String name labels at bottom
    const OPEN_LABELS = ['E', 'A', 'D', 'G', 'B', 'E'];
    for (let s = 0; s < STRINGS; s++) {
        const x = LEFT + s * strW;
        svg += `<text x="${x}" y="${TOP + FRETS_SHOWN * fretH + 16}" font-size="10" text-anchor="middle" fill="#9ca3af" font-family="Inter,sans-serif">${OPEN_LABELS[s]}</text>`;
    }

    svg += '</svg>';
    return svg;
}

function renderMiniDiagram(voicing, data) {
    const W = 130, H = 130;
    const STRINGS = 6, FRETS_SHOWN = 5;
    const LEFT = 14, TOP = 24, RIGHT = W - 6;
    const strW = (RIGHT - LEFT) / (STRINGS - 1);
    const fretH = (H - TOP - 20) / FRETS_SHOWN;

    const playedFrets = voicing.filter(f => f.fret !== 'x' && f.fret > 0).map(f => f.fret);
    let startFret = 0;
    if (playedFrets.length > 0) {
        const minF = Math.min(...playedFrets);
        startFret = Math.max(0, minF - 1);
    }

    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;

    if (startFret === 0) {
        svg += `<rect x="${LEFT}" y="${TOP - 3}" width="${RIGHT - LEFT}" height="4" rx="1" fill="#1a1f36"/>`;
    }

    for (let f = 0; f <= FRETS_SHOWN; f++) {
        const y = TOP + f * fretH;
        svg += `<line x1="${LEFT}" y1="${y}" x2="${RIGHT}" y2="${y}" stroke="#d1d5db" stroke-width="0.8"/>`;
    }

    for (let s = 0; s < STRINGS; s++) {
        const x = LEFT + s * strW;
        svg += `<line x1="${x}" y1="${TOP}" x2="${x}" y2="${TOP + FRETS_SHOWN * fretH}" stroke="#c4c9d6" stroke-width="0.8"/>`;

        const v = voicing[s];
        if (v.fret === 'x') {
            svg += `<text x="${x}" y="${TOP - 8}" font-size="9" text-anchor="middle" fill="#ef4444" font-weight="700">✕</text>`;
        } else if (v.fret === 0) {
            svg += `<circle cx="${x}" cy="${TOP - 7}" r="4" fill="none" stroke="#635bff" stroke-width="1.5"/>`;
        }
    }

    for (let s = 0; s < STRINGS; s++) {
        const v = voicing[s];
        if (v.fret === 'x' || v.fret === 0) continue;
        const relFret = v.fret - startFret;
        if (relFret < 1 || relFret > FRETS_SHOWN) continue;

        const x = LEFT + s * strW;
        const y = TOP + (relFret - 0.5) * fretH;
        const color = intervalColor(v.interval);
        svg += `<circle cx="${x}" cy="${y}" r="7" fill="${color}"/>`;
        svg += `<text x="${x}" y="${y + 3}" font-size="7" text-anchor="middle" fill="white" font-weight="700">${v.interval}</text>`;
    }

    svg += '</svg>';
    return svg;
}

function intervalColor(interval) {
    const colors = {
        '1': '#635bff',  'R': '#635bff',
        '3': '#10b981',  'b3': '#f59e0b',
        '5': '#6b7280',  '#5': '#ef4444', 'b5': '#ef4444',
        '7': '#a259ff',  'b7': '#ec4899',  'bb7': '#f97316',
        '9': '#06b6d4',  'b9': '#dc2626',  '#9': '#d97706',
        '11': '#84cc16', '#11': '#65a30d',
        '13': '#14b8a6', 'b13': '#b45309',
        '2': '#06b6d4',  '4': '#84cc16',  '6': '#14b8a6',
    };
    return colors[interval] || '#635bff';
}

function semitonesToName(semitones) {
    const names = {
        0:'Unísono', 1:'2ª menor', 2:'2ª mayor', 3:'3ª menor',
        4:'3ª mayor', 5:'4ª justa', 6:'Tritono', 7:'5ª justa',
        8:'5ª aumentada', 9:'6ª mayor', 10:'7ª menor', 11:'7ª mayor'
    };
    return names[semitones] || `${semitones} semitonos`;
}

// ── Chord Identifier ──

function renderGeneratorHorizontalFretboard(voicing) {
    const STRINGS = 6;
    const FRETS = 14; 
    const W = 800;
    const H = 220;
    const LEFT = 20;
    const RIGHT = W - 80;
    const TOP = 40;
    const BOTTOM = H - 30;
    const strH = (BOTTOM - TOP) / (STRINGS - 1);
    const fretW = (RIGHT - LEFT) / FRETS;

    let svg = `<svg width="100%" viewBox="0 0 ${W} ${H}" class="fretboard-interactive" preserveAspectRatio="xMidYMid meet" style="max-width:800px; background:var(--surface); border-radius:12px; border: 1px solid var(--border); pointer-events: none;">`;

    const stringNames = ['E', 'A', 'D', 'G', 'B', 'e'];

    for(let f = 1; f <= FRETS; f++) {
        const x = RIGHT - (f - 0.5) * fretW;
        svg += `<text x="${x}" y="${TOP - 16}" font-size="12" fill="var(--muted)" font-weight="600" text-anchor="middle" font-family="var(--mono)">${f}</text>`;
    }

    const markerFrets = [3, 5, 7, 9, 12];
    markerFrets.forEach(f => {
        if(f <= FRETS) {
            const x = RIGHT - (f - 0.5) * fretW;
            if (f === 12) {
                svg += `<circle cx="${x}" cy="${TOP + 1.5 * strH}" r="6" fill="#e5e7eb" />`;
                svg += `<circle cx="${x}" cy="${TOP + 3.5 * strH}" r="6" fill="#e5e7eb" />`;
            } else {
                svg += `<circle cx="${x}" cy="${TOP + 2.5 * strH}" r="7" fill="#e5e7eb" />`;
            }
        }
    });

    for(let f = 0; f <= FRETS; f++) {
        const x = RIGHT - f * fretW;
        svg += `<line x1="${x}" y1="${TOP}" x2="${x}" y2="${BOTTOM}" stroke="${f===0 ? 'var(--text)' : '#d1d5db'}" stroke-width="${f===0 ? 4 : 2}" />`;
    }

    for(let i = 0; i < STRINGS; i++) {
        const y = TOP + i * strH;
        const thickness = 1 + (5 - i) * 0.45;
        svg += `<line x1="${LEFT}" y1="${y}" x2="${RIGHT}" y2="${y}" stroke="#9ca3af" stroke-width="${thickness}" />`;
        
        let isMuted = false;
        let fretVal = null;
        let noteName = '';
        let intervalName = '';

        if (voicing && voicing[i] !== undefined) {
            const v = voicing[i];
            if (v.fret === 'x') {
                isMuted = true;
            } else {
                fretVal = v.fret;
                noteName = v.note;
                intervalName = v.interval;
            }
        } else {
            isMuted = false;
        }

        const isOpenLabel = (!voicing) || (!isMuted && fretVal === 0);

        svg += `<g class="fret-cell">
            <text x="${RIGHT + 25}" y="${y + 4}" font-size="14" fill="${isMuted ? 'var(--muted)' : 'var(--accent)'}" font-weight="700" text-anchor="middle" font-family="var(--mono)">${stringNames[i]}</text>
        </g>`;

        svg += `<g class="fret-cell">
            <text x="${RIGHT + 55}" y="${y + 5}" font-size="14" fill="${isMuted ? '#ef4444' : 'var(--muted)'}" font-weight="700" text-anchor="middle" font-family="var(--mono)">✕</text>
        </g>`;

        if (isOpenLabel) {
            svg += `<circle cx="${RIGHT + 25}" cy="${y - 1}" r="10" fill="transparent" stroke="${isMuted ? 'transparent' : 'var(--accent)'}" stroke-width="2" style="pointer-events:none;" />`;
        }

        if (fretVal && fretVal > 0 && fretVal <= FRETS) {
            const cx = RIGHT - (fretVal - 0.5) * fretW;
            const color = intervalColor(intervalName);
            svg += `<circle cx="${cx}" cy="${y}" r="12" fill="${color}" style="pointer-events:none;"/>`;
            svg += `<text x="${cx}" y="${y + 4}" font-size="10" text-anchor="middle" fill="white" font-weight="700" font-family="JetBrains Mono,monospace">${noteName}</text>`;
        }
    }

    svg += '</svg>';
    const container = document.getElementById('generatorHorizontalFretboard');
    if(container) container.innerHTML = svg;
}

// ── Interactive Horizontal Fretboard ──
function renderInteractiveFretboard() {
    const STRINGS = 6;
    const FRETS = 14; 
    const W = 800;
    const H = 220;
    const LEFT = 20;
    const RIGHT = W - 80;
    const TOP = 40;
    const BOTTOM = H - 30;
    const strH = (BOTTOM - TOP) / (STRINGS - 1);
    const fretW = (RIGHT - LEFT) / FRETS;

    let svg = `<svg width="100%" viewBox="0 0 ${W} ${H}" class="fretboard-interactive" preserveAspectRatio="xMidYMid meet" style="max-width:800px; background:var(--surface); border-radius:12px; border: 1px solid var(--border);">`;

    const stringNames = ['E', 'A', 'D', 'G', 'B', 'e'];

    for(let f = 1; f <= FRETS; f++) {
        const x = RIGHT - (f - 0.5) * fretW;
        svg += `<text x="${x}" y="${TOP - 16}" font-size="12" fill="var(--muted)" font-weight="600" text-anchor="middle" font-family="var(--mono)">${f}</text>`;
    }

    // Fret markers background
    const markerFrets = [3, 5, 7, 9, 12];
    markerFrets.forEach(f => {
        if(f <= FRETS) {
            const x = RIGHT - (f - 0.5) * fretW;
            if (f === 12) {
                svg += `<circle cx="${x}" cy="${TOP + 1.5 * strH}" r="6" fill="#e5e7eb" />`;
                svg += `<circle cx="${x}" cy="${TOP + 3.5 * strH}" r="6" fill="#e5e7eb" />`;
            } else {
                svg += `<circle cx="${x}" cy="${TOP + 2.5 * strH}" r="7" fill="#e5e7eb" />`;
            }
        }
    });

    for(let f = 0; f <= FRETS; f++) {
        const x = RIGHT - f * fretW;
        svg += `<line x1="${x}" y1="${TOP}" x2="${x}" y2="${BOTTOM}" stroke="${f===0 ? 'var(--text)' : '#d1d5db'}" stroke-width="${f===0 ? 4 : 2}" />`;
    }

    // Determine currently played notes
    const currentFrets = [];
    for (let i = 0; i < 6; i++) {
        const el = document.getElementById('str' + i);
        if (el) currentFrets.push(el.value.trim());
    }

    for(let i = 0; i < STRINGS; i++) {
        const y = TOP + i * strH;
        // i=0 is 'E' (thickest string, top), i=5 is 'e' (thinnest string, bottom)
        const thickness = 1 + (5 - i) * 0.45; 
        svg += `<line x1="${LEFT}" y1="${y}" x2="${RIGHT}" y2="${y}" stroke="#9ca3af" stroke-width="${thickness}" />`;
        
        const strIdx = i; // i=0 points to str0 (Low E), i=5 points to str5 (High e)
        const isMuted = muteState[strIdx];
        const currentFretStr = currentFrets[strIdx] || '';
        const isOpen = !isMuted && (currentFretStr === '0' || currentFretStr === '');
        
        // String name / open click area
        svg += `<g class="fret-cell" onclick="handleFretClick(${strIdx}, 0)" ondblclick="clearFret(${strIdx})">
            <rect x="${RIGHT}" y="${y - strH/2}" width="40" height="${strH}" fill="transparent" />
            <text x="${RIGHT + 25}" y="${y + 4}" font-size="14" fill="${isMuted ? 'var(--muted)' : 'var(--accent)'}" font-weight="700" text-anchor="middle" font-family="var(--mono)">${stringNames[i]}</text>
        </g>`;

        // Mute X click area
        svg += `<g class="fret-cell" onclick="handleFretClick(${strIdx}, 'x')">
            <rect x="${RIGHT + 40}" y="${y - strH/2}" width="30" height="${strH}" fill="transparent" />
            <text x="${RIGHT + 55}" y="${y + 5}" font-size="14" fill="${isMuted ? '#ef4444' : 'var(--muted)'}" font-weight="700" text-anchor="middle" font-family="var(--mono)">✕</text>
        </g>`;

        if(isOpen && !isMuted) {
            svg += `<circle cx="${RIGHT + 25}" cy="${y - 1}" r="10" fill="transparent" stroke="var(--accent)" stroke-width="2" style="pointer-events:none;" />`;
        }

        // Frets
        for(let f = 1; f <= FRETS; f++) {
            const cx = RIGHT - (f - 0.5) * fretW;
            const isActive = !isMuted && currentFretStr === f.toString();
            
            svg += `<g class="fret-cell" onclick="handleFretClick(${strIdx}, ${f})" ondblclick="clearFret(${strIdx})">
                <rect x="${RIGHT - f * fretW}" y="${y - strH/2}" width="${fretW}" height="${strH}" fill="transparent" />
            </g>`;
            
            if (isActive) {
                svg += `<circle cx="${cx}" cy="${y}" r="12" fill="var(--accent)" style="pointer-events:none;"/>`;
            }
        }
    }

    svg += '</svg>';
    const container = document.getElementById('interactiveFretboardContainer');
    if(container) container.innerHTML = svg;
}

function clearFret(strIdx) {
    const input = document.getElementById('str' + strIdx);
    const muteBtn = document.getElementById('mute' + strIdx);
    if(!input) return;
    
    muteState[strIdx] = false;
    input.value = '';
    input.classList.remove('muted');
    if(muteBtn) muteBtn.classList.remove('active');
    
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    }
    
    identifyChord();
    renderInteractiveFretboard();
}

function handleFretClick(strIdx, fretVal) {
    const input = document.getElementById('str' + strIdx);
    const muteBtn = document.getElementById('mute' + strIdx);
    if(!input) return;
    
    if (fretVal === 'x') {
        muteState[strIdx] = true;
        input.value = 'x';
        input.classList.add('muted');
        if(muteBtn) muteBtn.classList.add('active');
    } else {
        muteState[strIdx] = false;
        input.value = fretVal;
        input.classList.remove('muted');
        if(muteBtn) muteBtn.classList.remove('active');
    }
    
    identifyChord();
    renderInteractiveFretboard();
}

function onFretInput(strIdx, el) {
    const val = el.value.trim();
    if (val === 'x' || val === 'X') {
        el.classList.add('muted');
        document.getElementById('mute' + strIdx).classList.add('active');
        muteState[strIdx] = true;
    } else {
        el.classList.remove('muted');
        document.getElementById('mute' + strIdx).classList.remove('active');
        muteState[strIdx] = false;
    }
    renderInteractiveFretboard();
}

function toggleMute(strIdx) {
    muteState[strIdx] = !muteState[strIdx];
    const btn = document.getElementById('mute' + strIdx);
    const input = document.getElementById('str' + strIdx);
    if (muteState[strIdx]) {
        btn.classList.add('active');
        input.classList.add('muted');
        input.value = 'x';
    } else {
        btn.classList.remove('active');
        input.classList.remove('muted');
        input.value = '';
    }
    identifyChord();
    renderInteractiveFretboard();
}

function setFrets(frets) {
    for (let i = 0; i < 6; i++) {
        const input = document.getElementById('str' + i);
        const mute = document.getElementById('mute' + i);
        if (frets[i] === 'x' || frets[i] === -1) {
            muteState[i] = true;
            input.value = 'x';
            input.classList.add('muted');
            mute.classList.add('active');
        } else {
            muteState[i] = false;
            input.value = frets[i];
            input.classList.remove('muted');
            mute.classList.remove('active');
        }
    }
    identifyChord();
    renderInteractiveFretboard();
}

function clearIdentifier() {
    for (let i = 0; i < 6; i++) {
        muteState[i] = false;
        const input = document.getElementById('str' + i);
        const mute = document.getElementById('mute' + i);
        input.value = '';
        input.classList.remove('muted');
        mute.classList.remove('active');
    }
    document.getElementById('identifierResult').innerHTML = `
        <div class="card placeholder">
            <div class="icon">🔍</div>
            <p>Ingresa las pisadas arriba para identificar el acorde</p>
        </div>`;
    renderInteractiveFretboard();
}

// Initialize interactive fretboard on load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('interactiveFretboardContainer')) {
        renderInteractiveFretboard();
    }
    if (document.getElementById('generatorHorizontalFretboard')) {
        renderGeneratorHorizontalFretboard(null);
    }
});

function identifyChord() {
    const frets = [];
    for (let i = 0; i < 6; i++) {
        const val = document.getElementById('str' + i).value.trim();
        if (muteState[i] || val === 'x' || val === 'X') {
            frets.push('x');
        } else if (val === '' || val === '-') {
            frets.push(0); // Default to open string if not muted
        } else {
            const n = parseInt(val);
            frets.push(isNaN(n) ? 'x' : n);
        }
    }

    const played = frets.filter(f => f !== 'x');
    if (played.length < 2) {
        document.getElementById('identifierResult').innerHTML =
            `<div class="card"><p class="error-msg">⚠️ Necesitas al menos 2 cuerdas tocadas</p></div>`;
        return;
    }

    try {
        const result = GuitarTheory.identifyChord(frets);
        renderIdentifierResult(result, frets);
    } catch (e) {
        document.getElementById('identifierResult').innerHTML =
            `<div class="card"><p class="error-msg">⚠️ Error: ${e.message}</p></div>`;
    }
}

function renderIdentifierResult(result, frets) {
    if (result.error) {
        document.getElementById('identifierResult').innerHTML =
            `<div class="card"><p class="error-msg">⚠️ ${result.error}</p></div>`;
        return;
    }

    const altHTML = result.alternativeNames.length > 0
        ? result.alternativeNames.map(n => `<span class="alt-name-chip">${n}</span>`).join('')
        : '<span style="color:var(--muted);font-size:0.85rem">Sin equivalencias enarmónicas</span>';

    // Build notes row
    const noteInfo = result.playedNotes.map(pn => {
        const spanNote = GuitarTheory.ENG_TO_SPANISH[pn.note] || pn.note;
        return `<div class="info-badge">
            <div class="label">Cuerda ${pn.string + 1} · Traste ${pn.fret}</div>
            <div class="value">${pn.note} <span style="font-size:0.8rem;opacity:0.6">(${spanNote})</span></div>
        </div>`;
    }).join('');

    // Candidates table
    const candidateRows = result.candidates.map((c, i) => {
        const spName = GuitarTheory.toSpanishDisplayName(c.displayName);
        return `<tr style="${i===0 ? 'background:rgba(99,91,255,0.04)' : ''}">
            <td style="font-weight:${i===0?'700':'400'};font-family:var(--mono);">${c.displayName} <span style="font-weight:400;color:var(--muted);font-size:0.75rem">${spName !== c.displayName ? `(${spName})` : ''}</span></td>
            <td style="font-size:0.8rem;color:var(--muted)">${c.qualityDisplay || c.quality}</td>
            <td style="font-size:0.8rem">${c.isInversion ? `🔄 Inversión (bajo: ${c.inversionBass})` : (c.isIncomplete ? '⚠️ Incompleto' : '✅')}</td>
            <td style="font-size:0.75rem;color:var(--muted)">${c.missing.length ? `Faltan: ${c.missing.join(', ')}` : 'Completo'}</td>
        </tr>`;
    }).join('');

    // Voice diagram of played notes
    const voicingForDiagram = frets.map((f, s) => {
        if (f === 'x') return { fret: 'x', note: null, interval: null };
        const baseNote = GuitarTheory.OPEN_NOTES[s];
        const noteIdx = (GuitarTheory.noteToIndex(baseNote) + f) % 12;
        return { fret: f, note: GuitarTheory.indexToNote(noteIdx), interval: null };
    });

    const diagram = renderFretDiagram(voicingForDiagram, { root: result.candidates[0]?.root });

    document.getElementById('identifierResult').innerHTML = `
        <div class="card">
            <div class="two-col">
                <div>
                    <p class="section-subtitle">Acorde identificado</p>
                    <div class="result-primary">
                        ${result.primaryName}
                        ${(() => { const sp = GuitarTheory.toSpanishDisplayName(result.primaryName); return sp !== result.primaryName ? `<span class="spanish-inline">(${sp})</span>` : ''; })()}
                    </div>
                    <p class="result-sub">Nombre principal más probable</p>
                    <div class="alt-names">${altHTML}</div>
                    ${result.harmonicFunction ? `<div class="harmonic-pill">⚡ ${result.harmonicFunction}</div>` : ''}
                    <div class="chord-info" style="margin-top:16px">${noteInfo}</div>
                </div>
                <div>
                    <p class="section-subtitle">Diagrama</p>
                    ${diagram}
                </div>
            </div>
        </div>
        ${result.candidates.length > 1 ? `
        <div class="card">
            <p class="section-subtitle">Candidatos ordenados por probabilidad</p>
            <table class="notes-table">
                <thead>
                    <tr>
                        <th>Acorde</th>
                        <th>Calidad</th>
                        <th>Estado</th>
                        <th>Notas</th>
                    </tr>
                </thead>
                <tbody>${candidateRows}</tbody>
            </table>
        </div>` : ''}
    `;
}
