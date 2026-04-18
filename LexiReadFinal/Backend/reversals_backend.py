import io
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from google import genai
from PIL import Image
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ================= ROUTER SETUP =================
# Removed prefix to match your JS call: http://127.0.0.1:8003/detect-reversals
router = APIRouter(tags=["Error Detection"])
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("❌ ERROR: GEMINI_API_KEY not found in .env file")

# Using the latest Google GenAI SDK
client = genai.Client(api_key=GEMINI_API_KEY)

# ================= ROUTES =================

@router.post("/detect-reversals")
async def detect_reversals(
    file: UploadFile = File(...)
):
    """
    Analyzes handwriting for dyslexia-related reversals using Gemini 2.0 Flash.
    """
    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        # 1. Read and Process Image
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty image file provided.")
            
        # Open with PIL to verify and convert to RGB (GenAI prefers RGB over RGBA/CMYK)
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image format or corrupted file.")

        # 2. Structured Prompt for Dyslexia Analysis
        prompt = """
        You are a dyslexia support assistant. 
        Analyze the handwritten text in this image specifically for letter reversals 
        (e.g., writing 'b' instead of 'd', 'p' instead of 'q', 'n' instead of 'u', or 's' instead of 'z').
        
        Tasks:
        1. Extract the full sentence exactly as it appears (preserving the mistakes).
        2. Provide the corrected version of the text.
        3. List specific reversals or spelling errors found.

        Output format:
        Original: [The exact text with errors]
        Corrected: [The fixed text]
        Mistakes: [wrong word] -> [correct word]
        """

        # 3. Vision API Call - Using gemini-2.5-flash
        # The SDK handles PIL images directly.
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=[prompt, image]
        )

        # 4. Handle Response
        if not response or not response.text:
            raise Exception("AI was unable to extract text from this image.")

        return {
            "status": "success",
            "result": response.text
        }

    except Exception as e:
        print(f"Vision API Error: {str(e)}")
        # Provide a descriptive error to the frontend
        raise HTTPException(
            status_code=500, 
            detail=f"Handwriting analysis failed: {str(e)}"
        )