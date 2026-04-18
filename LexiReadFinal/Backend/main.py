import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create the Main Unified App
app = FastAPI(
    title="LexiNote Unified API", 
    description="Central API for Dyslexia Support Tools",
    version="1.0.0"
)

# ================= GLOBAL CORS SETUP =================
# This allows your Frontend (HTML/JS) to communicate with this Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins; change to specific IP in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= ROUTER REGISTRATION =================
# try:
#     from auth_backend import router as auth_router
#     app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
# except ImportError as e:
#     print(f"⚠️ Warning: Auth Router could not be loaded. {e}")

try:
    from notes_backend import router as notes_router
    app.include_router(notes_router, prefix="/notes", tags=["Notes Converter"])
except ImportError as e:
    print(f"⚠️ Warning: Notes Router could not be loaded. {e}")

try:
    from writing_backend import router as writing_router
    app.include_router(writing_router, prefix="/writing", tags=["Writing Practice"])
except ImportError as e:
    print(f"⚠️ Warning: Writing Router could not be loaded. {e}")

try:
    from reversals_backend import router as reversals_router
    app.include_router(reversals_router, prefix="/reversals", tags=["Identify Errors"])
except ImportError as e:
    print(f"⚠️ Warning: Reversals Router could not be loaded. {e}")


@app.get("/", tags=["Root"])
async def root():
    """
    Health check endpoint to verify the API is running.
    """
    return {
        "status": "online",
        "message": "LexiNote Central API is active.",
        "endpoints": {
            "notes": "/notes",
            "writing": "/writing",
            "reversals": "/reversals"
        }
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8003, reload=True)