import io
import os
import pyphen
import fitz  # PyMuPDF
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from google import genai
from PIL import Image
from dotenv import load_dotenv
# from auth_utils import get_current_user 

# ================= CONFIGURATION =================
# Load environment variables from .env file
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY") # This should now be 64 chars long
router = APIRouter(tags=["Notes Converter"])

# Initialization
dic = pyphen.Pyphen(lang="en_US")

# Securely load the Gemini API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    # It is better to fail early if the key is missing
    raise ValueError("CRITICAL: GEMINI_API_KEY not found in .env file.")

client = genai.Client(api_key=GEMINI_API_KEY)

class TextRequest(BaseModel):
    text: str

# ================= HELPER FUNCTIONS =================

def process_text_to_syllables(text: str):
    """
    Splits text into words and applies dyslexia-friendly hyphenation.
    Returns: (list of raw words, list of formatted syllables)
    """
    if not text:
        return [], []
        
    raw_words = [w for w in text.split() if w.strip()]
    
    # " - " provides visual breathing room for readers with dyslexia
    # Replacing the standard hyphen with a spaced version
    syllables_list = [dic.inserted(w).replace("-", " - ") for w in raw_words]
    return raw_words, syllables_list

def restore_broken_text(raw_text: str) -> str:
    """
    Heals OCR text by fixing spelling and reversals (b/d, p/q) 
    using Gemini Flash 2.0.
    """
    if not raw_text or len(raw_text.strip()) < 2:
        return raw_text

    restore_prompt = (
        "Context: The following text was extracted from a note by a user with dyslexia. "
        "It likely contains letter reversals (b/d, p/q, n/u), spelling errors, or missing letters.\n\n"
        "Task: Correct the spelling and restore the words to be readable. "
        "Rules:\n"
        "1. DO NOT summarize, rewrite, or add new information.\n"
        "2. DO NOT use conversational fillers or markdown bolding/italics.\n"
        "3. Preserve the exact sentence structure and intent.\n\n"
        f"TEXT TO FIX: {raw_text}"
    )
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=restore_prompt
        )
        return response.text.strip() if response.text else raw_text
    except Exception as e:
        print(f"Restoration AI Error: {e}")
        return raw_text

# ================= ROUTES =================

@router.post("/syllabify")
async def get_syllables(req: TextRequest):
    """Handles manual text input from the 'Type Text' tab."""
    text = req.text.strip()
    if not text:
        return {"status": "success", "syllables": [], "words": []}

    raw_words, syllables_list = process_text_to_syllables(text)
    return {
        "status": "success",
        "syllables": syllables_list,
        "words": raw_words
    }

@router.post("/trocr")
async def handle_vision_ocr(file: UploadFile = File(...)):
    """
    Processes handwritten images:
    1. Extracts and fixes text in a single pass for efficiency.
    2. Returns syllables for UI rendering.
    """
    try:
        img_bytes = await file.read()
        if not img_bytes:
            raise HTTPException(status_code=400, detail="Empty image file.")
            
        image = Image.open(io.BytesIO(img_bytes))

        # We ask Gemini to extract and fix reversals in one step to save time/tokens
        combined_prompt = (
            "Extract the text from this image. Correct any dyslexia-related letter reversals "
            "(like b vs d) or spelling mistakes. Return ONLY the corrected text."
        )
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[combined_prompt, image]
        )

        final_text = response.text.strip() if response.text else ""
        
        if not final_text:
            return {"status": "error", "message": "No text detected in image."}

        # Generate syllables for the interactive reader
        raw_words, syllables_list = process_text_to_syllables(final_text)
        
        return {
            "status": "success",
            "extracted_text": final_text, 
            "words": raw_words,          
            "syllables": syllables_list    
        }

    except Exception as e:
        print(f"Vision OCR Error: {str(e)}") 
        raise HTTPException(status_code=500, detail=f"Handwriting analysis failed: {str(e)}")

@router.post("/extract-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Extracts text from uploaded PDF files and applies healing logic."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    try:
        pdf_content = await file.read()
        full_text = ""
        
        # Open the PDF from memory
        with fitz.open(stream=pdf_content, filetype="pdf") as doc:
            for page in doc:
                page_text = page.get_text("text")
                if page_text.strip():
                    full_text += page_text + " "
            
        # 1. Check if we actually got any text
        if not full_text.strip():
            return {
                "status": "error", 
                "message": "This PDF appears to be a scan (image-based). Please use the 'Handwritten (AI)' tab to upload a screenshot of it instead."
            }
            
        # 2. Clean up whitespace
        cleaned_text = " ".join(full_text.split())
        
        # 3. Prevent Gemini from choking on massive PDFs (Limit to first ~5000 characters for testing)
        text_to_fix = cleaned_text[:5000] 
        
        # 4. Heal the text
        final_text = restore_broken_text(text_to_fix)
        
        # 5. Get syllable data
        raw_words, syllables_list = process_text_to_syllables(final_text)

        return {
            "status": "success", 
            "extracted_text": final_text,
            "syllables": syllables_list,
            "words": raw_words
        }
        
    except Exception as e:
        print(f"PDF Processing Error: {str(e)}")
        # If it's a 'fitz' error, it might be a corrupted PDF
        raise HTTPException(status_code=500, detail=f"PDF Processing failed: {str(e)}")