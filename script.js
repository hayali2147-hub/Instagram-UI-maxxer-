const c = document.getElementById('c');
const ctx = c.getContext('2d');
const tagEl = document.getElementById('tagline');
const replayEl = document.getElementById('replay');
const name1El = document.getElementById('name1');
const name2El = document.getElementById('name2');
const toggleBtn = document.getElementById('toggleNameBox');
const nameBox = document.getElementById('nameBox');
const scene = document.getElementById('scene');

toggleBtn.addEventListener('click', () => nameBox.classList.toggle('hidden'));

let W, H, t = 0, phase = 0, phaseTimer = 0;
let particles = [], petals = [], stars = [], ecgPts = [], ecgX = 0;
let textAlpha = 0, allArrived = false, doneTimer = 0;

function resize() {
    W = c.width = window.innerWidth;
    H = c.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

function rand(a, b) { return Math.random() * (b - a) + a; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function heartX(t, s) { return s * 16 * Math.pow(Math.sin(t), 3) / 17; }
function heartY(t, s) { return -s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17; }

function buildStars() {
    stars = [];
    for (let i = 0; i < 300; i++) {
        const z = rand(0.3, 1.3);
        stars.push({
            x: rand(0, W), y: rand(0, H), z,
            r: rand(0.2, 1.5) * z, a: rand(0.1, 0.8) * z,
            pa: rand(0, Math.PI * 2), ps: rand(0.01, 0.03)
        });
    }
}

function buildParticles() {
    const size = Math.min(W, H) * 0.32;
    const hpts = [];
    for (let i = 0; i < 600; i++) {
        const a = (i / 600) * Math.PI * 2;
        hpts.push({ rx: heartX(a, size), ry: heartY(a, size) - 20 });
    }
    particles = hpts.map(p => {
        const a = rand(0, Math.PI * 2);
        const dist = rand(50, Math.max(W, H) * 0.8);
        return {
            x: W / 2 + Math.cos(a) * dist,
            y: H / 2 + Math.sin(a) * dist,
            rx: p.rx, ry: p.ry,
            z: rand(0.6, 1.5),
            r: rand(1.5, 3.5),
            color: `hsl(${rand(340, 380)},${rand(80, 100)}%,${rand(55, 80)}%)`,
            speed: rand(0.012, 0.028),
            progress: rand(-0.5, 0),
            trail: [], alpha: 0
        };
    });
}

function drawStars() {
    stars.forEach(s => {
        s.pa += s.ps;
        const a = s.a * (0.5 + 0.5 * Math.sin(s.pa));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fill();
    });
}

function drawECG() {
    ecgX += 3.5;
    const cx = W / 2, cy = H / 2, w = W * 0.7, startX = cx - w / 2;
    const relX = ecgX - startX;
    let y = cy;

    if (relX > w * 0.3 && relX < w * 0.32) y = cy - 5;
    else if (relX > w * 0.32 && relX < w * 0.34) y = cy + 8;
    else if (relX > w * 0.34 && relX < w * 0.42) {
        const p = (relX - w * 0.34) / (w * 0.08);
        if (p < 0.2) y = cy - H * 0.22 * p / 0.2;
        else if (p < 0.4) y = cy - H * 0.22 + (H * 0.22 + H * 0.12) * (p - 0.2) / 0.2;
        else if (p < 0.55) y = cy + H * 0.12 - (H * 0.12) * (p - 0.4) / 0.15;
        else y = cy;
    } else if (relX > w * 0.44 && relX < w * 0.46) y = cy - 8;
    else if (relX > w * 0.46 && relX < w * 0.48) y = cy + 5;

    ecgPts.push({ x: ecgX, y });
    if (ecgPts.length > 220) ecgPts.shift();

    ctx.beginPath();
    ctx.strokeStyle = '#ff4466';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff4466';
    ctx.shadowBlur = 12;
    ecgPts.forEach((p, i) => {
        ctx.globalAlpha = i / ecgPts.length;
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(ecgX, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#ff4466';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (relX > w * 0.34 && relX < w * 0.42) {
        ctx.beginPath();
        ctx.arc(ecgX, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,68,102,0.15)';
        ctx.fill();
    }

    if (ecgX > cx + w / 2) {
        phase = 1;
        ecgPts = [];
    }
}

function drawParticles() {
    particles.forEach(p => {
        p.progress = Math.min(p.progress + p.speed, 1);
        if (p.progress < 0) { p.alpha = 0; return; }
        const tx = W / 2 + p.rx;
        const ty = H / 2 + p.ry;
        p.x = p.x + (tx - p.x) * 0.06;
        p.y = p.y + (ty - p.y) * 0.06;
        p.alpha = Math.min(p.alpha + 0.04, 1);
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 6) p.trail.shift();

        const rad = p.r * p.z;

        p.trail.forEach((tr, i) => {
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, rad * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = (i / p.trail.length) * 0.3 * p.alpha;
            ctx.fill();
        });

        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8 * p.z;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    });
}

function spawnPetals() {
    if (Math.random() < 0.12) {
        const z = rand(0.5, 1.4);
        petals.push({
            x: rand(0, W), y: -20,
            vx: rand(-1, 1) * z, vy: rand(1, 2.5) * z,
            rot: rand(0, Math.PI * 2), rotS: rand(-0.04, 0.04),
            size: rand(8, 18) * z,
            color: `hsl(${rand(330, 360)},${rand(70, 100)}%,${rand(55, 75)}%)`,
            alpha: rand(0.5, 1) * Math.min(z, 1), swing: rand(0, Math.PI * 2), swingS: rand(0.02, 0.05)
        });
    }
    petals = petals.filter(p => p.y < H + 30);
    petals.forEach(p => {
        p.y += p.vy; p.swing += p.swingS;
        p.x += p.vx + Math.sin(p.swing) * 1.2;
        p.rot += p.rotS;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size / 2, p.size, 0, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
    });
}

function drawGlow() {
    const g = ctx.createRadialGradient(W / 2, H / 2 - 20, 0, W / 2, H / 2 - 20, Math.min(W, H) * 0.35);
    g.addColorStop(0, 'rgba(255,50,80,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
}

function showText(html, alpha) {
    tagEl.innerHTML = html;
    tagEl.style.color = `rgba(255,255,255,${alpha})`;
    tagEl.style.textShadow = `0 0 ${30 * alpha}px #ff4466, 0 0 ${60 * alpha}px #ff4466`;
}

function loop() {
    requestAnimationFrame(loop);
    t++; phaseTimer++;

    const tiltX = Math.sin(t * 0.0035) * 3;
    const tiltY = Math.cos(t * 0.0027) * 4;
    scene.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.05)`;

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, W, H);
    drawStars();

    if (phase === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('♥  LOVE IS IN THE CODE  ♥', W / 2, H / 2 - H * 0.2);
        drawECG();
    }

    if (phase === 1) {
        drawParticles();
        drawGlow();
        const arrived = particles.filter(p => p.progress >= 1).length;
        const ratio = arrived / particles.length;

        if (ratio > 0.6) {
            textAlpha = Math.min(textAlpha + 0.015, 1);
            const n1 = (name1El.value.trim() || 'YOU').toUpperCase();
            const n2 = (name2El.value.trim() || 'ME').toUpperCase();
            showText(
                `${n1} & ${n2}<br><span style="font-size:0.5em;letter-spacing:8px;color:rgba(255,180,180,${textAlpha})">WRITTEN IN THE STARS</span>`,
                textAlpha
            );
        }

        if (ratio >= 0.95 && !allArrived) allArrived = true;
        if (allArrived) { doneTimer++; spawnPetals(); }
        if (allArrived && doneTimer > 180) replayEl.style.opacity = '1';
    }
}

function init() {
    t = 0; phase = 0; phaseTimer = 0; ecgX = 0; ecgPts = [];
    particles = []; petals = []; textAlpha = 0;
    allArrived = false; doneTimer = 0;
    tagEl.style.color = 'rgba(255,255,255,0)';
    tagEl.innerHTML = '';
    replayEl.style.opacity = '0';
    buildStars();
    buildParticles();
}

init();
loop();