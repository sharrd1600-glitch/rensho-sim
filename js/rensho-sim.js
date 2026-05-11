let currentTab = 'st';
  let simHistory = [];
  let historyId = 0;

  const LS_KEY = 'rensho-sim-v1';
  const PRESET_KEY = 'rensho-sim-presets-v1';

  function createEmptyPresetStore() {
    return {
      counters: { st: 0, tenraku: 0 },
      st: [],
      tenraku: [],
    };
  }

  function getPresetStore() {
    try {
      const raw = localStorage.getItem(PRESET_KEY);
      if (!raw) return createEmptyPresetStore();
      const data = JSON.parse(raw);
      if (!data.counters) data.counters = { st: 0, tenraku: 0 };
      if (!Array.isArray(data.st)) data.st = [];
      if (!Array.isArray(data.tenraku)) data.tenraku = [];
      return data;
    } catch (e) {
      return createEmptyPresetStore();
    }
  }

  function savePresetStore(store) {
    localStorage.setItem(PRESET_KEY, JSON.stringify(store));
  }

  function modeLabel(mode) {
    return mode === 'st' ? 'ST方式' : '転落方式';
  }

  function togglePresetQuickMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('presetQuickMenu');
    menu.classList.toggle('open');
  }

  function closePresetQuickMenu() {
    const menu = document.getElementById('presetQuickMenu');
    if (menu) menu.classList.remove('open');
  }

  function openSaveModal() {
    closePresetQuickMenu();
    const label = document.getElementById('presetSaveLabel');
    if (label) label.textContent = modeLabel(currentTab) + 'プリセット';
    document.getElementById('presetSaveModal').classList.add('open');
    setTimeout(() => {
      const input = document.getElementById('presetName');
      if (input) { input.focus(); input.select(); }
    }, 0);
  }

  function closeSaveModal() {
    document.getElementById('presetSaveModal').classList.remove('open');
  }

  function onSaveModalBackdrop(e) {
    if (e.target.id === 'presetSaveModal') closeSaveModal();
  }

  function openLoadModal() {
    renderPresetSelect();
    closePresetQuickMenu();
    document.getElementById('presetLoadModal').classList.add('open');
    setTimeout(() => {
      const sel = document.getElementById('presetSelect');
      if (sel) sel.focus();
    }, 0);
  }

  function closeLoadModal() {
    document.getElementById('presetLoadModal').classList.remove('open');
  }

  function onLoadModalBackdrop(e) {
    if (e.target.id === 'presetLoadModal') closeLoadModal();
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#presetMenuWrap')) closePresetQuickMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSaveModal();
      closeLoadModal();
      closePresetQuickMenu();
    }
  });

  function saveSettings() {
    try {
      const data = {
        tab: currentTab,
        st:  { prob: document.getElementById('st-probDenom').value, games: document.getElementById('st-stGames').value },
        tr:  { prob: document.getElementById('tr-probDenom').value, fall:  document.getElementById('tr-fallDenom').value },
        maxRensho: document.getElementById('maxRensho').value,
        distSt:      getDistRows('st'),
        distTenraku: getDistRows('tenraku'),
      };
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch(e) {}
  }

  function getDistRows(tab) {
    return [...document.querySelectorAll('#distBody-' + tab + ' tr')].map(tr => ({
      balls: parseFloat(tr.querySelector('.dist-balls').value) || 0,
      prob:  parseFloat(tr.querySelector('.dist-prob').value)  || 0,
    }));
  }

  function getCurrentModeSnapshot(mode) {
    if (mode === 'st') {
      return {
        probDenom: document.getElementById('st-probDenom').value,
        stGames: document.getElementById('st-stGames').value,
        maxRensho: document.getElementById('maxRensho').value,
        dist: getDistRows('st'),
      };
    }
    return {
      probDenom: document.getElementById('tr-probDenom').value,
      fallDenom: document.getElementById('tr-fallDenom').value,
      maxRensho: document.getElementById('maxRensho').value,
      dist: getDistRows('tenraku'),
    };
  }

  function applyModeSnapshot(mode, snapshot) {
    if (!snapshot) return;

    if (mode === 'st') {
      if (snapshot.probDenom !== undefined) document.getElementById('st-probDenom').value = snapshot.probDenom;
      if (snapshot.stGames !== undefined) document.getElementById('st-stGames').value = snapshot.stGames;
      if (snapshot.maxRensho !== undefined) document.getElementById('maxRensho').value = snapshot.maxRensho;
      if (Array.isArray(snapshot.dist)) {
        clearDistBody('st');
        snapshot.dist.forEach(r => addDistRow('st', r.balls, r.prob));
      }
    } else {
      if (snapshot.probDenom !== undefined) document.getElementById('tr-probDenom').value = snapshot.probDenom;
      if (snapshot.fallDenom !== undefined) document.getElementById('tr-fallDenom').value = snapshot.fallDenom;
      if (snapshot.maxRensho !== undefined) document.getElementById('maxRensho').value = snapshot.maxRensho;
      if (Array.isArray(snapshot.dist)) {
        clearDistBody('tenraku');
        snapshot.dist.forEach(r => addDistRow('tenraku', r.balls, r.prob));
      }
    }

    saveSettings();
  }

  function renderPresetSelect() {
    const label = document.getElementById('presetLoadLabel');
    const select = document.getElementById('presetSelect');
    if (!label || !select) return;

    label.textContent = modeLabel(currentTab) + 'プリセット';

    const store = getPresetStore();
    const list = currentTab === 'st' ? store.st : store.tenraku;
    select.innerHTML = '';

    if (list.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '保存済みなし';
      select.appendChild(opt);
      return;
    }

    list.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.name;
      select.appendChild(opt);
    });
  }

  function saveNamedPreset() {
    const mode = currentTab;
    const store = getPresetStore();
    const list = mode === 'st' ? store.st : store.tenraku;
    const nameInput = document.getElementById('presetName');
    let name = (nameInput.value || '').trim();

    if (!name) {
      store.counters[mode] = (store.counters[mode] || 0) + 1;
      name = '設定' + store.counters[mode];
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    list.push({
      id,
      name,
      snapshot: getCurrentModeSnapshot(mode),
      createdAt: Date.now(),
    });

    savePresetStore(store);
    nameInput.value = '';
    closeSaveModal();
  }

  function loadSelectedPreset() {
    const store = getPresetStore();
    const list = currentTab === 'st' ? store.st : store.tenraku;
    const selectedId = document.getElementById('presetSelect').value;
    const found = list.find(v => v.id === selectedId);
    if (!found) return;
    applyModeSnapshot(currentTab, found.snapshot);
    closeLoadModal();
  }

  function deleteSelectedPreset() {
    const store = getPresetStore();
    const list = currentTab === 'st' ? store.st : store.tenraku;
    const selectedId = document.getElementById('presetSelect').value;
    const idx = list.findIndex(v => v.id === selectedId);
    if (idx < 0) return;
    if (!confirm('選択中のプリセットを削除しますか？')) return;
    list.splice(idx, 1);
    savePresetStore(store);
    renderPresetSelect();
  }

  function clearDistBody(tab) {
    document.getElementById('distBody-' + tab).innerHTML = '';
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (d.st) {
        document.getElementById('st-probDenom').value = d.st.prob;
        document.getElementById('st-stGames').value   = d.st.games;
      }
      if (d.tr) {
        document.getElementById('tr-probDenom').value = d.tr.prob;
        document.getElementById('tr-fallDenom').value  = d.tr.fall;
      }
      if (d.maxRensho) document.getElementById('maxRensho').value = d.maxRensho;
      if (d.distSt && d.distSt.length > 0) {
        clearDistBody('st');
        d.distSt.forEach(r => addDistRow('st', r.balls, r.prob));
      }
      if (d.distTenraku && d.distTenraku.length > 0) {
        clearDistBody('tenraku');
        d.distTenraku.forEach(r => addDistRow('tenraku', r.balls, r.prob));
      }
      if (d.tab) switchTab(d.tab);
      return true;
    } catch(e) { return false; }
  }

  // ─── 振り分けエディタ ───
  const defaultDist = [
    { balls: 3000, prob: 10 },
    { balls: 1500, prob: 60 },
    { balls:  800, prob: 30 },
  ];

  function initDist() {
    if (!loadSettings()) {
      defaultDist.forEach(d => addDistRow('st',      d.balls, d.prob));
      defaultDist.forEach(d => addDistRow('tenraku', d.balls, d.prob));
    }
  }

  function addDistRow(tab = currentTab, balls = 1500, prob = 10) {
    const tbody = document.getElementById('distBody-' + tab);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="dist-input-wrap">
          <input type="number" class="dist-balls" value="${balls}" min="0" step="100" oninput="updateDistTotal('${tab}')" />
          <span class="dist-suffix">玉</span>
        </div>
      </td>
      <td>
        <div class="dist-input-wrap">
          <input type="number" class="dist-prob" value="${prob}" min="0" max="100" step="0.1" oninput="updateDistTotal('${tab}')" />
          <span class="dist-suffix">%</span>
        </div>
      </td>
      <td style="text-align:center">
        <button class="dist-del-btn" onclick="removeDistRow(this, '${tab}')" title="削除">✕</button>
      </td>`;
    tbody.appendChild(tr);
    updateDistTotal(tab);
  }

  function removeDistRow(btn, tab) {
    btn.closest('tr').remove();
    updateDistTotal(tab);
  }

  function updateDistTotal(tab) {
    const probs = [...document.querySelectorAll('#distBody-' + tab + ' .dist-prob')].map(el => parseFloat(el.value) || 0);
    const total = probs.reduce((s, v) => s + v, 0);
    const el    = document.getElementById('distTotal-' + tab);
    const msg   = document.getElementById('distTotalMsg-' + tab);
    el.textContent = total.toFixed(1) + '%';
    const ok = Math.abs(total - 100) < 0.01;
    el.className = 'total-val ' + (ok ? 'total-ok' : 'total-warn');
    msg.textContent = ok ? '✓' : '(合計100%にしてください)';
    msg.style.color = ok ? '#3fb950' : '#ff6b6b';
    updateSimulateButtonState();
    saveSettings();
  }

  function updateSimulateButtonState() {
    const stDist = getDistribution();
    const currentTabDist = currentTab === 'st' ? getDistRows('st') : getDistRows('tenraku');
    const stTotal = currentTabDist.reduce((s, d) => s + d.prob, 0);
    const isValid = Math.abs(stTotal - 100) < 0.01;
    const btn = document.querySelector('.btn-primary');
    if (btn) {
      btn.disabled = !isValid;
      btn.title = isValid ? '' : '出玉振り分け確率の合計が100%になるまで実行できません';
      btn.style.opacity = isValid ? '1' : '0.5';
      btn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }
  }

  function getDistribution() {
    const rows = [...document.querySelectorAll('#distBody-' + currentTab + ' tr')];
    return rows.map(tr => ({
      balls: parseFloat(tr.querySelector('.dist-balls').value) || 0,
      prob:  parseFloat(tr.querySelector('.dist-prob').value)  || 0,
    }));
  }

  // 振り分けに従って出玉を1回抽選する
  function drawBalls(dist) {
    const total = dist.reduce((s, d) => s + d.prob, 0);
    let r = Math.random() * total;
    for (const d of dist) {
      r -= d.prob;
      if (r <= 0) return d.balls;
    }
    return dist[dist.length - 1]?.balls ?? 0;
  }

  // ─── タブ切り替え ───
  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('form-st').style.display             = tab === 'st'      ? '' : 'none';
    document.getElementById('form-tenraku').style.display        = tab === 'tenraku' ? '' : 'none';
    document.getElementById('dist-section-st').style.display     = tab === 'st'      ? '' : 'none';
    document.getElementById('dist-section-tenraku').style.display = tab === 'tenraku' ? '' : 'none';
    renderPresetSelect();
    updateSimulateButtonState();
    saveSettings();
  }

  function runSimulation() {
    const maxRen = parseInt(document.getElementById('maxRensho').value, 10);
    if (isNaN(maxRen) || maxRen < 1) { alert('連荘上限に正しい値を入力してください。'); return; }
    const dist = getDistribution();
    if (dist.length === 0) { alert('出玉振り分けを1行以上追加してください。'); return; }
    const totalProb = dist.reduce((s, d) => s + d.prob, 0);
    if (Math.abs(totalProb - 100) > 0.01) {
      alert(`振り分け確率の合計が ${totalProb.toFixed(1)}% です。合計が100%になるように調整してください。`);
      return;
    }
    if (currentTab === 'st') runST(maxRen, dist);
    else                     runTenraku(maxRen, dist);
  }

  function formatProbabilityPercent(prob) {
    if (!Number.isFinite(prob) || prob < 0) return '—';
    const pct = prob * 100;
    if (pct >= 1) return pct.toFixed(2) + '%';
    if (pct >= 0.01) return pct.toFixed(3) + '%';
    if (pct > 0) return '<0.01%';
    return '0.00%';
  }

  function calcExpectedProbST(hitProbPerGame, stGames, rensho, maxRen) {
    const cycleHitProb = 1 - Math.pow(1 - hitProbPerGame, stGames);
    if (rensho >= maxRen) return Math.pow(cycleHitProb, maxRen);
    return Math.pow(cycleHitProb, rensho) * (1 - cycleHitProb);
  }

  function calcExpectedProbTenraku(hitProb, fallProb, rensho, maxRen) {
    const effectiveFallProb = Math.max(0, Math.min(1, hitProb + fallProb) - hitProb);
    const settleProb = hitProb + effectiveFallProb;
    if (settleProb <= 0) return 0;
    const chainHitProb = hitProb / settleProb;
    if (rensho >= maxRen) return Math.pow(chainHitProb, maxRen);
    return Math.pow(chainHitProb, rensho) * (1 - chainHitProb);
  }

  // ─── ST方式 ───
  function runST(maxRen, dist) {
    const denom   = parseFloat(document.getElementById('st-probDenom').value);
    const stGames = parseInt(document.getElementById('st-stGames').value, 10);
    if (isNaN(denom) || denom <= 0 || isNaN(stGames) || stGames < 1) { alert('ST方式の設定値が不正です。'); return; }
    const prob = 1 / denom;

    const hits = [];
    let rensho = 0, remaining = stGames;

    while (remaining > 0 && rensho < maxRen) {
      let hit = false, hitGame = 0;
      for (let g = 0; g < remaining; g++) {
        if (Math.random() < prob) { hit = true; hitGame = g + 1; break; }
      }
      if (hit) { hits.push({ game: hitGame, balls: drawBalls(dist) }); rensho++; remaining = stGames; }
      else break;
    }

    const totalGames  = hits.reduce((s, h) => s + h.game, 0);
    const avgGame     = hits.length > 0 ? totalGames / hits.length : 0;
    const totalBalls  = hits.reduce((s, h) => s + h.balls, 0);
    const expectedProb = calcExpectedProbST(prob, stGames, rensho, maxRen);
    const expectedProbText = formatProbabilityPercent(expectedProb);

    const doRenderST = () => {
      renderResult({
        mode: 'st', rensho, hits, stGames, totalGames, avgGame, totalBalls, expectedProbText,
        label: `当たり 1/${denom}（${(prob*100).toFixed(2)}%）　ST ${stGames}回`,
      });
    };
    if (totalBalls >= BLACKOUT_THRESHOLD) {
      showBlackout(doRenderST);
    } else {
      doRenderST();
    }

    const seq = hits.map((h, i) => `${i+1}連:${h.game}G`).join(' ');
    simHistory.unshift({
      id: ++historyId, mode: 'st',
      condStr: `1/${denom} / ST${stGames}回`,
      rensho, avgGame: avgGame.toFixed(1), seq,
      expectedProbText,
      endLabel: rensho === 0 ? '単発終了' : '規定消化',
      totalBalls,
    });
    renderHistory();
  }

  // ─── 転落方式 ───
  function runTenraku(maxRen, dist) {
    const hitDenom  = parseFloat(document.getElementById('tr-probDenom').value);
    const fallDenom = parseFloat(document.getElementById('tr-fallDenom').value);
    if (isNaN(hitDenom) || hitDenom <= 0 || isNaN(fallDenom) || fallDenom <= 0) { alert('転落方式の設定値が不正です。'); return; }
    const hitProb  = 1 / hitDenom;
    const fallProb = 1 / fallDenom;

    const hits = [];
    let fallGame = 0, rensho = 0, running = true;

    while (running && rensho < maxRen) {
      let hit = false, fell = false, gameCount = 0;
      while (!hit && !fell) {
        gameCount++;
        const r = Math.random();
        if (r < hitProb) { 
          hit = true; 
          hits.push({ game: gameCount, balls: drawBalls(dist) }); 
        }
        else if (r < hitProb + fallProb) { 
          fell = true; 
          fallGame = gameCount; 
        }
      }
      if (hit) rensho++;
      else running = false;
    }

    const totalGames  = hits.reduce((s, h) => s + h.game, 0) + fallGame;
    const avgGame     = hits.length > 0 ? hits.reduce((s, h) => s + h.game, 0) / hits.length : 0;
    const totalBalls  = hits.reduce((s, h) => s + h.balls, 0);
    const expectedProb = calcExpectedProbTenraku(hitProb, fallProb, rensho, maxRen);
    const expectedProbText = formatProbabilityPercent(expectedProb);

    const doRenderTenraku = () => {
      renderResult({
        mode: 'tenraku', rensho, hits, totalGames, avgGame, fallGame, totalBalls, expectedProbText,
        label: `当たり 1/${hitDenom}（${(hitProb*100).toFixed(2)}%）　転落 1/${fallDenom}（${(fallProb*100).toFixed(2)}%）`,
      });
    };
    if (totalBalls >= BLACKOUT_THRESHOLD) {
      showBlackout(doRenderTenraku);
    } else {
      doRenderTenraku();
    }

    const seq = hits.map((h, i) => `${i+1}連:${h.game}G`).join(' ');
    simHistory.unshift({
      id: ++historyId, mode: 'tenraku',
      condStr: `当 1/${hitDenom} / 転 1/${fallDenom}`,
      rensho, avgGame: avgGame.toFixed(1), seq,
      expectedProbText,
      endLabel: `転落 ${fallGame}G`,
      totalBalls,
    });
    renderHistory();
  }

  // ─── 結果描画 ───
  function renderResult(o) {
    const allGameNums = o.hits.map(h => h.game);
    if (o.fallGame) allGameNums.push(o.fallGame);
    const barMax = allGameNums.length > 0 ? Math.max(...allGameNums) : 1;

    // 当たり回転数バー
    let hitRowsHtml = '';
    o.hits.forEach((h, i) => {
      const pct = Math.max(2, (h.game / barMax * 100)).toFixed(1);
      hitRowsHtml += `
        <div class="hit-row">
          <span class="hit-label">${i + 1}連目</span>
          <div class="hit-track"><div class="hit-fill color-hit" style="width:${pct}%">${h.game}G</div></div>
          <span class="hit-game-num">${h.game}回転目</span>
          <span class="hit-balls-badge">${h.balls.toLocaleString()}玉</span>
        </div>`;
    });

    let fallRowHtml = '';
    if (o.mode === 'tenraku' && o.fallGame > 0) {
      const pct = Math.max(2, (o.fallGame / barMax * 100)).toFixed(1);
      fallRowHtml = `
        <div class="section-title">転落</div>
        <div class="hit-row end-row">
          <span class="hit-label" style="color:#ff6b6b">転落</span>
          <div class="hit-track"><div class="hit-fill color-fall" style="width:${pct}%">${o.fallGame}G</div></div>
          <span class="hit-game-num" style="color:#ff6b6b">${o.fallGame}回転目</span>
          <span class="hit-balls-badge" style="opacity:0"></span>
        </div>`;
    }

    let stEndHtml = '';
    if (o.mode === 'st') {
      stEndHtml = `
        <div class="hit-row end-row" style="margin-top:4px">
          <span class="hit-label" style="color:#484f58">終了</span>
          <div class="hit-track" style="background:#161b22;border:1px dashed #30363d">
            <div style="padding:0 8px;font-size:0.73rem;color:#484f58;line-height:22px">${o.stGames}回転 抜け</div>
          </div>
          <span class="hit-game-num" style="color:#484f58">—</span>
          <span class="hit-balls-badge" style="opacity:0"></span>
        </div>`;
    }

    const renshoColor = o.rensho >= 10 ? 'red' : o.rensho >= 3 ? 'gold' : o.rensho >= 1 ? 'blue' : 'gray';

    document.getElementById('resultContent').innerHTML = `
      <div class="result-summary animated">
        <div class="stat-pill">
          <div class="val ${renshoColor}">${o.rensho}</div>
          <div class="lbl">連荘数</div>
        </div>
        <div class="stat-pill">
          <div class="val purple">${o.expectedProbText}</div>
          <div class="lbl">設定期待確率</div>
        </div>
        <div class="stat-pill">
          <div class="val gold">${o.totalBalls.toLocaleString()}</div>
          <div class="lbl">総獲得玉</div>
        </div>
      </div>
      <div style="font-size:0.78rem;color:#8b949e;margin-bottom:12px">${o.label}</div>
      ${o.hits.length > 0 ? `<div class="section-title" style="margin-top:16px">当たり回転数 & 出玉</div>` : ''}
      <div class="hit-list">
        ${hitRowsHtml}
        ${fallRowHtml}
        ${stEndHtml}
      </div>
      ${o.hits.length === 0 ? '<div style="color:#484f58;font-size:0.85rem;padding:12px 0">当たりなし（単発終了）</div>' : ''}`;
  }

  // ─── 履歴描画 ───
  function renderHistory() {
    if (simHistory.length === 0) {
      document.getElementById('historyContent').innerHTML = '<div class="empty-history">履歴がありません</div>';
      return;
    }

    const rows = simHistory.map(h => {
      const rBadge    = h.rensho >= 10 ? 'badge-red' : h.rensho >= 3 ? 'badge-gold' : h.rensho >= 1 ? 'badge-blue' : 'badge-gray';
      const modeBadge = h.mode === 'st' ? 'badge-mode-st' : 'badge-mode-tenraku';
      const modeLabel = h.mode === 'st' ? 'ST方式' : '転落方式';
      return `
        <tr>
          <td>#${h.id}</td>
          <td><span class="badge ${modeBadge}">${modeLabel}</span></td>
          <td style="font-size:0.75rem">${h.condStr}</td>
          <td><span class="badge ${rBadge}">${h.rensho}連</span></td>
          <td style="font-size:0.75rem;color:#a371f7">${h.expectedProbText}</td>
          <td class="balls-col">${h.totalBalls.toLocaleString()}玉</td>
          <td style="font-size:0.72rem;color:#484f58">${h.endLabel}</td>
        </tr>`;
    }).join('');

    document.getElementById('historyContent').innerHTML = `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>方式</th>
            <th>設定</th>
            <th>連荘数</th>
            <th>期待確率</th>
            <th>獲得玉</th>
            <th>終了</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  function clearHistory() {
    if (simHistory.length === 0) return;
    if (!confirm('履歴をすべて削除しますか？')) return;
    simHistory = [];
    historyId = 0;
    renderHistory();
  }

  // ─── ブラックアウト演出 ───
  const BLACKOUT_THRESHOLD = 50000;

  function showBlackout(onComplete) {
    const overlay = document.getElementById('blackout-overlay');
    const line    = document.getElementById('tv-line');

    // リセット
    overlay.className = '';
    line.className    = '';

    // 一瞬白フラッシュ（テレビが山を越えるイメージ）
    overlay.classList.add('phase-flash');

    // ブラック画面へ
    setTimeout(() => {
      overlay.classList.remove('phase-flash');
      overlay.classList.add('phase-black');
    }, 50);

    // 横線が全幅から中心の点へと収縮
    setTimeout(() => {
      line.classList.add('line-shrink');
    }, 160);

    // フェードアウト
    setTimeout(() => {
      overlay.classList.remove('phase-black');
      overlay.classList.add('phase-out');
    }, 4000);

    // 完了 → 結果表示
    setTimeout(() => {
      overlay.className = '';
      line.className    = '';
      onComplete();
    }, 4500);
  }

  // 初期化
  initDist();
  renderPresetSelect();
  updateSimulateButtonState();
