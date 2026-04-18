/* ================= 0. SESSION & SECURITY ================= */
// document.addEventListener("DOMContentLoaded", () => {
//     const token = localStorage.getItem('token');
//     const userName = localStorage.getItem('userName');
//     const userMenu = document.getElementById('userMenu');

//     if (!token) {
//         // Only redirect if NOT on the auth page already
//         if (!window.location.href.includes('auth.html')) {
//             window.location.href = 'auth.html';
//         }
//         return;
//     }

//     if (userName && userMenu) {
//         userMenu.innerHTML = `👤 Hi, ${userName}`;
//     }
// });

/* ================= 1. DOM ELEMENTS ================= */
const dropZone = document.getElementById('dropZone');
const imageInput = document.getElementById('imageInput');
const outputPlaceholder = document.getElementById('outputPlaceholder');
const aiTextContainer = document.getElementById('aiTextContainer');
const resultActions = document.getElementById('resultActions');
const ruler = document.getElementById('readingRuler'); 
const tintOverlay = document.getElementById('screen-tint');

/* ================= 2. ACCESSIBILITY CONTROLS ================= */

function updateSpacing() {
    const lSpace = document.getElementById('letterSpace').value;
    const wSpace = document.getElementById('wordSpace').value;
    if (aiTextContainer) {
        aiTextContainer.style.letterSpacing = (lSpace / 10) + 'em';
        aiTextContainer.style.wordSpacing = (wSpace / 10) + 'em';
    }
}

function changeTint() {
    const tintColor = document.getElementById('tintSelect').value;
    if (tintOverlay) {
        tintOverlay.style.backgroundColor = tintColor;
    }
}

function toggleRuler() {
    const isChecked = document.getElementById('rulerToggle').checked;
    if (ruler) {
        ruler.style.display = isChecked ? 'block' : 'none';
    }
}

document.addEventListener('mousemove', (e) => {
    if (ruler && ruler.style.display === 'block') {
        ruler.style.top = (e.clientY - 25) + 'px';
    }
});

/* ================= 3. ANALYSIS & AI LOGIC ================= */

let bionicActive = false;
let originalRawText = "";

async function simulateAI() {
    const file = imageInput.files[0];
    if (!file) {
        alert("Please select an image first!");
        return;
    }

    // UI Loading State
    outputPlaceholder.classList.remove('hidden');
    outputPlaceholder.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-3 fw-bold">🧠 Gemini is analyzing your handwriting for errors...</p>
        </div>
    `;
    aiTextContainer.innerHTML = "";
    if(resultActions) resultActions.classList.add('hidden');

    const formData = new FormData();
    formData.append('file', file);

    try {
        // Check if user is running from file://
        if (window.location.protocol === 'file:') {
            throw new Error("Security Block: You must run this using 'Live Server' in VS Code, not by double-clicking the file.");
        }

            const response = await fetch('http://127.0.0.1:8003/reversals/detect-reversals', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server responded with ${response.status}`);
        }

        const data = await response.json();

        if (data.result) {
            outputPlaceholder.classList.add('hidden');
            if(resultActions) resultActions.classList.remove('hidden');

            originalRawText = data.result;
            renderGeminiOutput(data.result);
        } else {
            throw new Error("No analysis data returned from server.");
        }

    } catch (error) {
        console.error("Detailed Error:", error);
        let errorMsg = error.message;
        
        // Custom messaging for the "Failed to fetch" vagueness
        if (errorMsg === "Failed to fetch") {
            errorMsg = "Cannot reach the Backend Server. <br>1. Ensure your Python script is running.<br>2. Ensure it is on port 8003.<br>3. Check if CORS is enabled in Python.";
        }

        outputPlaceholder.innerHTML = `
            <div class="alert alert-danger mx-4">
                <h5 class="alert-heading">⚠️ Connection Error</h5>
                <p class="mb-0">${errorMsg}</p>
            </div>
        `;
    }
}

function renderGeminiOutput(text) {
    const lines = text.split("\n").filter(line => line.trim() !== "");
    
    aiTextContainer.innerHTML = lines.map(line => {
        if (line.toLowerCase().includes('corrected:') || line.toLowerCase().includes('original:')) {
            return `<p class="mb-2" style="color: #1a237e;"><strong>${line}</strong></p>`;
        }
        if (line.includes('->') || line.includes('→') || line.includes(':')) {
            return `<div class="alert alert-light border-start border-primary border-4 py-2 mb-2" style="background: #f8faff;">💡 ${line}</div>`;
        }
        return `<p class="mb-1">${line}</p>`;
    }).join("");
}

/* ================= 4. POST-PROCESSING TOOLS ================= */

function applyBionicReading() {
    if (bionicActive) {
        renderGeminiOutput(originalRawText);
        bionicActive = false;
        return;
    }

    const paragraphs = aiTextContainer.querySelectorAll('p');
    paragraphs.forEach(p => {
        if (p.querySelector('strong')) return;

        const words = p.innerText.split(' ');
        const bionicWords = words.map(word => {
            if (word.length <= 1) return `<b>${word}</b>`;
            const half = Math.ceil(word.length / 2);
            return `<b>${word.slice(0, half)}</b>${word.slice(half)}`;
        });
        p.innerHTML = bionicWords.join(' ');
    });
    bionicActive = true;
}

/* ================= 5. VOICE / TTS LOGIC ================= */

function speakText() {
    const textToRead = aiTextContainer.innerText.trim();
    if (!textToRead) return;

    window.speechSynthesis.cancel(); 
    const speech = new SpeechSynthesisUtterance(textToRead);
    const speed = document.getElementById('voiceRate').value;
    speech.rate = speed || 1.0; 
    window.speechSynthesis.speak(speech);
}

function pauseSpeech() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
    } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
}

function stopSpeech() {
    window.speechSynthesis.cancel();
}

/* ================= 6. EVENT LISTENERS ================= */

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        dropZone.innerHTML = `
            <div class="text-primary py-2">
                <div class="fs-1">📄</div>
                <p class="fw-bold mb-0">${file.name}</p>
                <p class="small text-muted">File selected. Ready to scan.</p>
                <button class="btn btn-sm btn-outline-secondary mt-2" onclick="event.stopPropagation(); location.reload();">Change File</button>
            </div>`;
        dropZone.style.borderColor = "#1a237e";
        dropZone.style.background = "#f0f4ff";
    }
});