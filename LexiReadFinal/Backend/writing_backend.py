import sqlite3
import json
import math
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime

# Assuming auth_utils exists for your environment
# from auth_utils import get_current_user 

# For demonstration, a mock user dependency if auth_utils is missing
async def get_current_user():
    return "user@example.com"

router = APIRouter(prefix="/writing", tags=["Writing Practice"])

DB_PATH = "lexinote.db"

# --- DATABASE INITIALIZATION ---
def init_writing_db():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        # RAW DATA TABLE
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS writing_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT,
                letter TEXT,
                mode TEXT,
                points_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # ANALYSIS TABLE
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS writing_analysis (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email TEXT,
                letter TEXT,
                mode TEXT,
                smoothness REAL,
                hesitation INTEGER,
                duration INTEGER,
                avg_speed REAL,
                mirror_flag TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

init_writing_db()

# --- SCHEMAS ---
class Point(BaseModel):
    x: float
    y: float
    t: int

class WritingPayload(BaseModel):
    letter: str
    mode: str
    points: List[Point]

class AnalyzePayload(BaseModel):
    points: List[Point]
    mode: str
    granularity: str
    letter: Optional[str] = "unknown"

# --- ANALYTICS ENGINE ---
def calculate_distance(p1: Point, p2: Point):
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)

def analyze_strokes(points: List[Point]):
    if len(points) < 2:
        return {
            "smoothness": 0, "hesitation": 0, "duration": 0, 
            "avg_speed": 0, "mirror_flag": "LOW"
        }
    
    total_distance = 0
    hesitation = 0
    
    for i in range(1, len(points)):
        dist = calculate_distance(points[i-1], points[i])
        total_distance += dist
        # Hesitation: gap in time between points > 200ms
        if (points[i].t - points[i-1].t) > 200:
            hesitation += 1

    duration = points[-1].t - points[0].t
    avg_speed = total_distance / duration if duration > 0 else 0
    
    # Smoothness heuristic
    smoothness = max(0, 100 - (hesitation * 8))
    
    # Simple Mirroring Detection (X-axis movement check)
    xs = [p.x for p in points]
    direction = xs[-1] - xs[0]
    mirror_flag = "HIGH" if direction < -10 else "LOW"

    return {
        "smoothness": round(smoothness, 2),
        "hesitation": hesitation,
        "duration": duration,
        "avg_speed": round(avg_speed, 4),
        "mirror_flag": mirror_flag
    }

# --- ROUTES ---

@router.post("/save-writing")
async def save_writing(payload: WritingPayload, user_email: str = Depends(get_current_user)):
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO writing_data (user_email, letter, mode, points_json)
                VALUES (?, ?, ?, ?)
            ''', (
                user_email,
                payload.letter,
                payload.mode,
                json.dumps([p.dict() for p in payload.points])
            ))
            conn.commit()
        return {"status": "saved", "timestamp": datetime.now()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/analyze")
async def analyze(payload: AnalyzePayload, user_email: str = Depends(get_current_user)):
    try:
        analysis = analyze_strokes(payload.points)
        
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO writing_analysis 
                (user_email, letter, mode, smoothness, hesitation, duration, avg_speed, mirror_flag)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_email,
                payload.letter,
                payload.mode,
                analysis["smoothness"],
                analysis["hesitation"],
                analysis["duration"],
                analysis["avg_speed"],
                analysis["mirror_flag"]
            ))
            conn.commit()

        return {"status": "success", "analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics")
async def get_analytics(user_email: str = Depends(get_current_user)):
    try:
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT letter, smoothness, hesitation, avg_speed, mirror_flag, created_at
                FROM writing_analysis
                WHERE user_email = ?
                ORDER BY created_at DESC
            ''', (user_email,))
            data = cursor.fetchall()

        return [
            {
                "letter": d[0],
                "smoothness": d[1],
                "hesitation": d[2],
                "speed": d[3],
                "mirror": d[4],
                "date": d[5]
            } for d in data
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/guide/{letter}")
async def get_guide(letter: str):
    # Expanded guide dictionary
    guides = {
        "A": [{"x": 200, "y": 400}, {"x": 300, "y": 100}, {"x": 400, "y": 400}],
        "B": [{"x": 200, "y": 100}, {"x": 200, "y": 400}, {"x": 350, "y": 250}, {"x": 200, "y": 400}]
    }
    return {"letter": letter, "strokes": guides.get(letter.upper(), [])}