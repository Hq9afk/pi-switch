const btn = document.getElementById('btn');
const ring = document.getElementById('ring');
const status = document.getElementById('status');
const HOLD_MS = 5000;
const R = 80;
const CIRC = +(2 * Math.PI * R).toFixed(2);

ring.style.strokeDasharray = CIRC;
ring.style.strokeDashoffset = CIRC;

let holdTimer = null;
let forceFired = false;
let busy = false;

function applyState(on) {
    if (busy) return;
    btn.className = 'power-btn ' + (on ? 'on' : 'off');
    btn.textContent = on ? 'ON' : 'OFF';
}

function setStatus(msg, clearAfter = 0) {
    status.textContent = msg;
    if (clearAfter) setTimeout(() => { if (status.textContent === msg) status.textContent = ''; }, clearAfter);
}

function startPolling() {
    setInterval(() => {
        if (busy) return;
        fetch('/state')
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(d => applyState(d.on))
            .catch(() => {});
    }, 4000);
}

function startRing() {
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = CIRC;
    ring.getBoundingClientRect();
    ring.style.transition = `stroke-dashoffset ${HOLD_MS}ms linear`;
    ring.style.strokeDashoffset = 0;
}

function resetRing() {
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = CIRC;
}

function onDown(e) {
    e.preventDefault();
    if (busy) return;
    forceFired = false;
    startRing();
    setStatus('holding...');

    holdTimer = setTimeout(() => {
        forceFired = true;
        busy = true;
        btn.className = 'power-btn busy';
        btn.textContent = '...';
        setStatus('forcing shutdown...');

        fetch('/force_shutdown', { method: 'POST' })
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(d => { applyState(d.on); setStatus('force shutdown sent', 2500); })
            .catch(() => setStatus('error — check connection', 3000))
            .finally(() => { busy = false; });
    }, HOLD_MS);
}

function onUp(e) {
    e.preventDefault();
    clearTimeout(holdTimer);
    resetRing();
    if (forceFired || busy) return;

    setStatus('...');
    busy = true;
    btn.className = 'power-btn busy';
    btn.textContent = '...';

    fetch('/toggle', { method: 'POST' })
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => { applyState(d.on); setStatus(d.on ? 'powered on' : 'powered off', 2500); })
        .catch(() => {
            setStatus('error — check connection', 3000);
            fetch('/state').then(r => r.json()).then(d => applyState(d.on)).catch(() => {});
        })
        .finally(() => { busy = false; });
}

function onLeave(e) {
    clearTimeout(holdTimer);
    resetRing();
    if (!forceFired && !busy) setStatus('');
}

btn.addEventListener('mousedown', onDown);
btn.addEventListener('touchstart', onDown, { passive: false });
btn.addEventListener('mouseup', onUp);
btn.addEventListener('touchend', onUp);
btn.addEventListener('mouseleave', onLeave);
btn.addEventListener('touchcancel', onLeave);

fetch('/state')
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(d => applyState(d.on))
    .catch(() => setStatus('unreachable'));

startPolling();
