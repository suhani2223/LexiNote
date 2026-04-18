/* ==========================================================================
    NOTES CONVERTER ENGINE - LexiNote (Final Corrected Version)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // UI References
    const textarea = document.getElementById("textInput");
    const readingText = document.getElementById("readingText");
    const readingArea = document.getElementById("readingArea");
    const ruler = document.getElementById("readingRuler");
    const wordCountDisplay = document.getElementById("wordCount");
    const statusDisplay = document.getElementById("processingStatus");
    
    // File Inputs
    const hwInput = document.getElementById("hwInput");
    const pdfInput = document.getElementById("pdfInput");

    // State Variables
    let rawWords = [];      
    let syllableWords = []; 
    let isSyllableMode = false;
    const synth = window.speechSynthesis;
    let utterance = null;

    /* ----------------------------------------------------------------------
        1. STYLE ENGINE (Including Boldness & Word Spacing)
       ---------------------------------------------------------------------- */
    function applyStyles() {
        if (!readingText) return;

        // Get values from sliders (ensure IDs match your HTML)
        const fontSize = document.getElementById("fontSize")?.value || 24;
        const fontWeight = document.getElementById("fontWeight")?.value || 400; // Boldness Slider
        const letterSpacing = document.getElementById("letterSpacing")?.value || 2;
        const lineHeight = document.getElementById("lineHeight")?.value || 1.8;
        const fontColor = document.getElementById("fontColor")?.value || "#222222";
        const bgColor = document.getElementById("bgColor")?.value || "#ffffff";
        const wordSpacingValue = document.getElementById("wordSpacing")?.value || 8;

        // Apply to Container
        readingArea.style.backgroundColor = bgColor;
        
        // Apply to Text
        readingText.style.fontSize = fontSize + "px";
        readingText.style.fontWeight = fontWeight;
        readingText.style.letterSpacing = letterSpacing + "px";
        readingText.style.lineHeight = lineHeight;
        readingText.style.color = fontColor;

        // Apply Word Spacing to all spans
        document.querySelectorAll(".word").forEach(w => {
            w.style.marginRight = wordSpacingValue + "px";
        });
    }

    // Attach listeners to all sliders
    ["fontSize", "fontWeight", "letterSpacing", "lineHeight", "fontColor", "bgColor", "wordSpacing"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", applyStyles);
    });

    /* ----------------------------------------------------------------------
        2. SYLLABLE TOGGLE ENGINE
       ---------------------------------------------------------------------- */
    window.toggleSyllables = function() {
        isSyllableMode = !isSyllableMode;
        const toggleSwitch = document.getElementById("syllableToggle");
        
        if (toggleSwitch) toggleSwitch.checked = isSyllableMode;

        // If no syllables were processed by backend, alert user
        if (isSyllableMode && syllableWords.length === 0 && rawWords.length > 0) {
            statusDisplay.textContent = "Syllables only available for AI uploads.";
            setTimeout(() => { 
                isSyllableMode = false; 
                if(toggleSwitch) toggleSwitch.checked = false;
                renderWords(rawWords);
            }, 2000);
            return;
        }

        renderWords(isSyllableMode ? syllableWords : rawWords);
    };

    /* ----------------------------------------------------------------------
        3. CORE RENDERING
       ---------------------------------------------------------------------- */
    function renderWords(displayArray) {
        if (!readingText) return;
        
        readingText.innerHTML = "";
        wordCountDisplay.textContent = `Words: ${displayArray.length}`;

        if (displayArray.length === 0) {
            readingText.innerHTML = "Your processed text will appear here...";
            return;
        }

        displayArray.forEach((word, index) => {
            const span = document.createElement("span");
            span.className = "word";
            span.id = `word-${index}`; // Needed for auto-highlighting
            span.textContent = word;
            span.dataset.index = index;
            
            // Manual Reading: Play specific word on click
            span.addEventListener("click", () => playSingleWord(index));
            
            readingText.appendChild(span);
            readingText.appendChild(document.createTextNode(" ")); 
        });

        applyStyles();
    }

    // Manual typing update
    textarea?.addEventListener("input", (e) => {
        rawWords = e.target.value.trim().split(/\s+/).filter(w => w.length > 0);
        syllableWords = []; 
        renderWords(rawWords);
    });

    /* ----------------------------------------------------------------------
        4. HIGHLIGHTING & AUDIO ENGINE
       ---------------------------------------------------------------------- */
    function highlightWord(index) {
        document.querySelectorAll(".word").forEach(w => w.classList.remove("active"));
        const activeSpan = document.getElementById(`word-${index}`);
        if (activeSpan) {
            activeSpan.classList.add("active");
            activeSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function playSingleWord(index) {
        synth.cancel();
        highlightWord(index);
        
        let textToRead = isSyllableMode ? syllableWords[index] : rawWords[index];
        
        // Add pauses between syllables for the voice engine
        if (isSyllableMode) {
            textToRead = textToRead.replace(/ - /g, ", ");
        }

        const utt = new SpeechSynthesisUtterance(textToRead);
        utt.rate = parseFloat(document.getElementById("voiceRate")?.value || 1.0);
        utt.pitch = parseFloat(document.getElementById("voicePitch")?.value || 1.0);
        synth.speak(utt);
    }

    window.startReading = function() {
        synth.cancel();
        const currentWords = isSyllableMode ? syllableWords : rawWords;
        if (currentWords.length === 0) return;
        
        // Convert array to a string the AI can read, with syllable pauses if needed
        let fullText = currentWords.join(" ");
        if (isSyllableMode) {
            fullText = fullText.replace(/ - /g, ", ");
        }

        utterance = new SpeechSynthesisUtterance(fullText);
        utterance.rate = parseFloat(document.getElementById("voiceRate")?.value || 1.0);
        utterance.pitch = parseFloat(document.getElementById("voicePitch")?.value || 1.0);
        
        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                // Find index by calculating how many words precede this character index
                const textSoFar = fullText.substring(0, event.charIndex);
                const wordIndex = textSoFar.split(" ").length - 1;
                highlightWord(wordIndex);
            }
        };

        utterance.onend = () => {
            document.querySelectorAll(".word").forEach(w => w.classList.remove("active"));
        };

        synth.speak(utterance);
    };

    window.pauseReading = () => synth.pause();
    window.stopReading = () => {
        synth.cancel();
        document.querySelectorAll(".word").forEach(w => w.classList.remove("active"));
    };

    /* ----------------------------------------------------------------------
        5. UPLOAD & AI LOGIC
       ---------------------------------------------------------------------- */
    async function handleFileUpload(file, endpoint, fileNameElementId) {
        if (!file) return;

        document.getElementById(fileNameElementId).textContent = `📄 ${file.name}`;
        statusDisplay.textContent = "AI is processing...";

        const formData = new FormData();
        formData.append("file", file);

        try {
            // --- ADD THIS PART ---
            const response = await fetch(`http://127.0.0.1:8003/notes/tocr`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error("Network response was not ok");
            
            const data = await response.json();
            // -----------------------

            if (data.status === "success") {
                textarea.value = data.extracted_text;
                rawWords = data.words;
                syllableWords = data.syllables || []; 
                
                statusDisplay.textContent = "Ready";
                showInput('textSection', document.getElementById('textTab'));
                renderWords(isSyllableMode ? syllableWords : rawWords);
            }
        } catch (err) {
            statusDisplay.textContent = "Error: Backend Unreachable";
            console.error("Fetch error:", err);
        }
    }

    pdfInput?.addEventListener("change", (e) => handleFileUpload(e.target.files[0], "extract-pdf", "fileName"));
    hwInput?.addEventListener("change", (e) => handleFileUpload(e.target.files[0], "trocr", "hwFileName"));


    window.showInput = function(sectionId, btn) {
        document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
        document.getElementById(sectionId).classList.remove('hidden');
        document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
        if (btn) btn.classList.add('active');
    };

    window.exportToPDF = function() {
        const element = document.getElementById('readingArea');
        html2pdf().from(element).save('LexiNote_Export.pdf');
    };

    // Reading Ruler Tracking
    document.getElementById("rulerToggle")?.addEventListener("change", (e) => {
        ruler.style.display = e.target.checked ? "block" : "none";
    });

    window.addEventListener("mousemove", (e) => {
        if (ruler.style.display === "block") {
            ruler.style.top = (e.clientY - 25) + "px";
        }
    });
});