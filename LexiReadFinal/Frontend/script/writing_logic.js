// LEXINOTE ENGINE - V5.4
// Features: Multi-word support with whitespace splitting, preserves case (small + capital), 
// spells full word after last letter of each word, improved centering & stability.

gsap.registerPlugin(MotionPathPlugin);

// --- STATE ---
let mode = "train";
let granularity = "letter";
let animType = "reveal";
let currentWordIndex = 0;
let currentLetterIndex = 0;
let wordArray = [];           // Array of words (preserves original case)
let autoAdvanceTimer = null;
let isDrawing = false;
let points = [];
let mainTimeline = null;

const ORIGINAL_WIDTH = 800;
const ORIGINAL_HEIGHT = 500;
const WORD_SPACING = 38;      // Balanced spacing

const PATH_DATA = {

    // ── UPPERCASE ──────────────────────────────────────────────────────────────

    A: [
        "M400 120 L200 440",
        "M400 120 L600 440",
        "M270 330 L530 330"
    ],
    B: [
        "M240 120 L240 440",
        "M240 120 C390 120 430 158 430 200 C430 242 390 270 240 270",
        "M240 270 C415 270 462 312 462 362 C462 412 408 440 240 440"
    ],
    C: [
        "M560 175 C560 130 488 108 400 108 C272 108 182 200 182 290 C182 384 270 468 400 468 C488 468 554 442 580 400"
    ],
    D: [
        "M240 120 L240 440",
        "M240 120 C510 125 592 205 592 280 C592 372 510 440 240 440"
    ],
    E: [
        "M240 120 L240 440",
        "M240 120 L575 120",
        "M240 280 L500 280",
        "M240 440 L575 440"
    ],
    F: [
        "M240 120 L240 440",
        "M240 120 L575 120",
        "M240 280 L500 280"
    ],
    G: [
        "M560 175 C560 130 488 108 400 108 C272 108 182 200 182 290 C182 384 270 468 400 468 C490 468 558 434 575 385",
        "M575 385 L575 310 L420 310"
    ],
    H: [
        "M240 120 L240 440",
        "M560 120 L560 440",
        "M240 280 L560 280"
    ],
    I: [
        "M320 120 L480 120",
        "M400 120 L400 440",
        "M320 440 L480 440"
    ],
    J: [
        "M340 120 L500 120",
        "M420 120 L420 385 C420 445 375 470 305 458 C255 450 225 418 225 388"
    ],
    K: [
        "M240 120 L240 440",
        "M565 120 L240 280",
        "M240 280 L565 440"
    ],
    L: [
        "M240 120 L240 440",
        "M240 440 L560 440"
    ],
    M: [
        "M220 440 L220 120",
        "M220 120 L400 305",
        "M400 305 L580 120",
        "M580 120 L580 440"
    ],
    N: [
        "M240 440 L240 120",
        "M240 120 L560 440",
        "M560 440 L560 120"
    ],
    O: [
        "M400 115 C235 115 162 208 162 290 C162 382 248 472 400 472 C552 472 638 382 638 290 C638 208 565 115 400 115"
    ],
    P: [
        "M240 120 L240 440",
        "M240 120 C495 120 532 165 532 225 C532 295 488 335 240 315"
    ],
    Q: [
        "M400 115 C235 115 162 208 162 290 C162 382 248 472 400 472 C552 472 638 382 638 290 C638 208 565 115 400 115",
        "M495 402 L625 492"
    ],
    R: [
        "M240 120 L240 440",
        "M240 120 C495 120 532 165 532 225 C532 295 488 335 240 315",
        "M375 315 L582 440"
    ],
    S: [
        "M565 168 C565 128 502 108 400 108 C278 108 208 158 208 228 C208 288 278 320 400 320 C522 320 592 355 592 422 C592 472 520 492 400 492 C278 492 198 462 198 422"
    ],
    T: [
        "M210 120 L590 120",
        "M400 120 L400 440"
    ],
    U: [
        "M235 120 L235 375 C235 455 308 475 400 475 C492 475 565 455 565 375 L565 120"
    ],
    V: [
        "M215 120 L400 445",
        "M400 445 L585 120"
    ],
    W: [
        "M185 120 L278 445",
        "M278 445 L400 238",
        "M400 238 L522 445",
        "M522 445 L615 120"
    ],
    X: [
        "M238 120 L562 440",
        "M562 120 L238 440"
    ],
    Y: [
        "M228 120 L400 298",
        "M572 120 L400 298",
        "M400 298 L400 440"
    ],
    Z: [
        "M228 120 L572 120",
        "M572 120 L228 440",
        "M228 440 L572 440"
    ],

    // ── LOWERCASE ──────────────────────────────────────────────────────────────

    a: [
        "M492 268 C492 200 440 168 365 168 C272 168 202 225 202 302 C202 380 270 435 365 435 C440 435 492 398 492 338",
        "M492 268 L492 450"
    ],
    b: [
        "M235 140 L235 450",
        "M235 318 C235 228 298 195 392 195 C485 195 560 248 560 318 C560 395 488 450 392 450 C298 450 235 405 235 318"
    ],
    c: [
        "M522 252 C522 198 468 168 378 168 C268 168 198 232 198 302 C198 374 265 435 378 435 C468 435 522 400 522 350"
    ],
    d: [
        "M525 140 L525 450",
        "M525 318 C525 228 462 195 368 195 C268 195 198 248 198 318 C198 398 265 450 368 450 C462 450 525 398 525 318"
    ],
    e: [
        "M198 298 L512 298 C510 210 448 168 368 168 C258 168 198 232 198 302 C198 378 262 435 372 435 C462 435 515 392 522 350"
    ],
    f: [
        "M445 140 C445 135 440 125 398 125 C335 125 308 168 308 222 L308 450",
        "M235 278 L445 278"
    ],
    g: [
        "M515 252 C515 188 462 168 378 168 C278 168 208 225 208 302 C208 382 270 432 372 432 C462 432 515 390 515 308",
        "M515 252 L515 492 C515 535 472 555 390 555 C308 555 255 522 255 482"
    ],
    h: [
        "M235 140 L235 450",
        "M235 270 C235 195 298 168 390 168 C482 168 555 215 555 290 L555 450"
    ],
    i: [
        "M382 270 L382 450",
        "M372 195 L392 195"
    ],
    j: [
        "M412 270 L412 492 C412 545 372 562 308 542",
        "M402 195 L422 195"
    ],
    k: [
        "M235 140 L235 450",
        "M555 168 L235 318",
        "M235 318 L555 450"
    ],
    l: [
        "M382 140 L382 455 C382 470 395 478 415 476"
    ],
    m: [
        "M195 302 L195 450",
        "M195 302 C195 210 250 168 322 168 C395 168 438 210 438 302 L438 450",
        "M438 302 C438 210 490 168 562 168 C625 168 662 210 662 302 L662 450"
    ],
    n: [
        "M228 270 L228 450",
        "M228 270 C228 195 290 168 382 168 C472 168 552 215 552 290 L552 450"
    ],
    o: [
        "M400 168 C280 168 198 232 198 302 C198 378 278 435 400 435 C522 435 602 378 602 302 C602 232 520 168 400 168"
    ],
    p: [
        "M235 285 L235 545",
        "M235 285 C235 192 298 168 390 168 C482 168 562 232 562 302 C562 382 490 435 390 435 C298 435 235 382 235 302"
    ],
    q: [
        "M522 302 C522 208 458 168 368 168 C268 168 198 232 198 302 C198 382 265 435 368 435 C458 435 522 382 522 302",
        "M522 285 L522 545"
    ],
    r: [
        "M245 270 L245 450",
        "M245 302 C245 220 305 178 400 172 C445 170 492 185 525 212"
    ],
    s: [
        "M502 228 C502 182 448 168 375 168 C285 168 225 202 225 252 C225 298 285 322 368 322 C452 322 512 348 512 398 C512 440 458 452 368 452 C265 452 215 422 215 395"
    ],
    t: [
        "M382 148 L382 455 C382 470 398 478 418 476",
        "M282 272 L492 272"
    ],
    u: [
        "M232 278 L232 390 C232 448 288 462 372 462 C455 462 552 442 552 372 L552 278 L552 450"
    ],
    v: [
        "M228 278 L382 450",
        "M382 450 L542 278"
    ],
    w: [
        "M198 278 L278 450",
        "M278 450 L368 342",
        "M368 342 L450 450",
        "M450 450 L542 278"
    ],
    x: [
        "M238 278 L522 450",
        "M522 278 L238 450"
    ],
    y: [
        "M228 278 L372 432",
        "M542 278 L372 432 L312 532 C292 562 248 572 218 555"
    ],
    z: [
        "M238 278 L522 278",
        "M522 278 L238 450",
        "M238 450 L522 450"
    ],

    DEFAULT: ["M200 100 L600 100 L600 420 L200 420 Z"]
};

// --- DOM ---
const drawCanvas = document.getElementById("drawLayer");
const dctx = drawCanvas ? drawCanvas.getContext("2d") : null;
const svgOverlay = document.getElementById("svgOverlay");
const ghostDot = document.getElementById("ghostDot");

// --- INIT ---
function resizeCanvas() {
    if (!drawCanvas || !svgOverlay) return;
    const container = drawCanvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    drawCanvas.width = rect.width;
    drawCanvas.height = rect.height;
    svgOverlay.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    
    if (wordArray.length > 0) renderCurrentStep();
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("DOMContentLoaded", () => {
    resizeCanvas();
    setAppMode("train");
});

// --- UI CONTROLS ---
window.setAppMode = function(newMode) {
    mode = newMode;
    document.getElementById("trainTab")?.classList.toggle("active-train", mode === "train");
    document.getElementById("testTab")?.classList.toggle("active-test", mode === "test");
    document.getElementById("submitBtn").style.display = mode === "test" ? "block" : "none";
    clearCanvas();
};

window.setGranularity = function(type) {
    granularity = type;
    document.getElementById("letterBtn")?.classList.toggle("active-gran", type === "letter");
    document.getElementById("wordBtn")?.classList.toggle("active-gran", type === "word");
};

window.setAnimType = function(type, el) {
    animType = type;
    document.querySelectorAll(".anim-type-card").forEach(c => c.classList.remove("selected"));
    el?.classList.add("selected");
};

// --- LAYOUT CALCULATION ---
function getLayout(word) {
    const w = drawCanvas.width;
    const h = drawCanvas.height;
    const topY = h * 0.18;

    if (granularity === "letter") {
        const scale = Math.min(w * 0.76 / ORIGINAL_WIDTH, h * 0.65 / ORIGINAL_HEIGHT);
        const startX = (w - ORIGINAL_WIDTH * scale) / 2;
        return { scale, startX, topY };
    } else {
        const num = word.length;
        const totalW = num * ORIGINAL_WIDTH + (num - 1) * WORD_SPACING;
        const scale = Math.min(w * 0.91 / totalW, h * 0.60 / ORIGINAL_HEIGHT);
        const startX = (w - totalW * scale) / 2;
        return { scale, startX, topY };
    }
}

// --- LIGHT GUIDE ---
function createLetterGroup(char, x, y, scale, isGuide = true) {
    const strokes = PATH_DATA[char] || PATH_DATA.DEFAULT;
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("transform", `translate(${x} ${y}) scale(${scale})`);
    group.setAttribute("class", isGuide ? "light-guide-group" : "gsap-path-container");

    strokes.forEach(d => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");

        if (isGuide) {
            path.setAttribute("stroke", "#4a90e2");
            path.setAttribute("stroke-width", "24");
            path.setAttribute("opacity", "0.18");
        } else {
            path.setAttribute("stroke-width", "16");
            if (animType === "glow") {
                path.setAttribute("stroke", "#ffda79");
            } else {
                path.setAttribute("stroke", "#1e40af");
            }
        }
        group.appendChild(path);
    });
    return group;
}

function renderLightGuide() {
    svgOverlay.querySelectorAll('.light-guide-group').forEach(g => g.remove());
    const activeWord = wordArray[currentWordIndex];
    if (!activeWord || currentLetterIndex >= activeWord.length) return;

    const { scale, startX, topY } = getLayout(activeWord);

    if (granularity === "letter") {
        const x = startX;
        svgOverlay.appendChild(createLetterGroup(activeWord[currentLetterIndex], x, topY, scale));
    } else {
        let curX = startX;
        for (let i = 0; i < activeWord.length; i++) {
            svgOverlay.appendChild(createLetterGroup(activeWord[i], curX, topY, scale));
            curX += (ORIGINAL_WIDTH + WORD_SPACING) * scale;
        }
    }
}

// --- GSAP ANIMATION ---
// THE FIX: strokes play strictly one after another.
// ">" in GSAP means "start exactly when the previous tween ends".
// STROKE_PAUSE adds a small gap between strokes to simulate pen lifting.

function runGsapGuide(char) {
    if (mainTimeline) mainTimeline.kill();
    svgOverlay.querySelectorAll('.gsap-path-container').forEach(p => p.remove());

    const activeWord = wordArray[currentWordIndex];
    const { scale, startX, topY } = getLayout(activeWord);

    let letterX = startX;
    if (granularity === "word") {
        letterX = startX + currentLetterIndex * (ORIGINAL_WIDTH + WORD_SPACING) * scale;
    }

    const group = createLetterGroup(char, letterX, topY, scale, false);
    svgOverlay.appendChild(group);

    mainTimeline = gsap.timeline();

    const STROKE_DURATION = 1.2;  // seconds per stroke — adjust to taste
    const STROKE_PAUSE    = 0.25; // seconds of gap between strokes (pen lift pause)

    const paths = group.querySelectorAll('path');

    paths.forEach((path, i) => {
        const length = path.getTotalLength();

        // Hide stroke fully before animating
        gsap.set(path, {
            strokeDasharray: length,
            strokeDashoffset: length
        });

        // ">+0.25" means: start 0.25s AFTER the previous tween fully finishes
        // This gives a clear pause between each stroke — like lifting a pen
        mainTimeline.to(path, {
            strokeDashoffset: 0,
            duration: STROKE_DURATION,
            ease: "sine.inOut"
        }, i === 0 ? 0 : `>+${STROKE_PAUSE}`);
    });
}

// --- SPEECH ---
function speak(text) {
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
}

function spellCurrentWord() {
    const word = wordArray[currentWordIndex];
    if (!word) return;
    
    speak(word);
    setTimeout(() => speak("Well done!"), 1400);
}

// --- MAIN ENGINE ---
window.startWritingEngine = function() {
    let input = document.getElementById("customTextInput")?.value.trim();
    if (!input) return alert("Enter text first!");

    wordArray = input.split(/\s+/).filter(word => word.length > 0);
    
    currentWordIndex = 0;
    currentLetterIndex = 0;
    
    if (wordArray.length === 0) return alert("No valid words found!");
    
    renderCurrentStep();
};

function renderCurrentStep() {
    const activeWord = wordArray[currentWordIndex];
    if (!activeWord) {
        speak("All words completed. Excellent work!");
        return;
    }

    if (currentLetterIndex >= activeWord.length) {
        spellCurrentWord();
        return;
    }

    const char = activeWord[currentLetterIndex];
    speak(char);

    renderLightGuide();

    if (mode === "train") {
        runGsapGuide(char);
    }
}

// --- DRAWING & CONTROLS ---
drawCanvas.addEventListener("pointerdown", (e) => {
    isDrawing = true;
    const rect = drawCanvas.getBoundingClientRect();
    dctx.beginPath();
    dctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
});

drawCanvas.addEventListener("pointermove", (e) => {
    if (!isDrawing) return;
    const rect = drawCanvas.getBoundingClientRect();
    dctx.lineWidth = parseFloat(document.getElementById("strokeWeight")?.value) || 14;
    dctx.lineCap = "round";
    dctx.lineJoin = "round";
    dctx.strokeStyle = mode === "test" ? "#111" : "rgba(30, 64, 175, 0.85)";

    dctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    dctx.stroke();
});

drawCanvas.addEventListener("pointerup", () => {
    isDrawing = false;
    if (granularity === "letter") {
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = setTimeout(window.handleNextStep, 1600);
    }
});

window.handleNextStep = function() {
    const activeWord = wordArray[currentWordIndex];
    if (!activeWord) return;

    if (currentLetterIndex < activeWord.length - 1) {
        currentLetterIndex++;
    } else {
        currentWordIndex++;
        currentLetterIndex = 0;
        
        if (currentWordIndex >= wordArray.length) {
            speak("All words completed.");
            clearCanvas();
            return;
        }
        speak("Next word.");
    }

    dctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    points = [];
    renderCurrentStep();
};

window.clearCanvas = function() {
    if (mainTimeline) mainTimeline.kill();
    clearTimeout(autoAdvanceTimer);
    dctx?.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    svgOverlay?.querySelectorAll('.light-guide-group, .gsap-path-container').forEach(el => el.remove());
    points = [];
    document.getElementById("ptCount").innerText = "000";
};

window.triggerAnimation = function() {
    if (wordArray.length > 0) renderCurrentStep();
    else startWritingEngine();
};

window.processAnalysis = () => alert("Analysis coming soon!");
window.downloadSession = () => alert("Session exported.");
window.toggleHeatmap = () => alert("Heatmap feature coming soon.");

console.log("%cLexiNote Engine V5.4 - Multi-word + Case Sensitive + Full Word Spelling", "color:#1e40af; font-weight:bold");