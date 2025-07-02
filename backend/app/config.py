import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # API Keys
    EBAY_APP_ID = os.getenv("EBAY_APP_ID", "")
    EBAY_DEV_ID = os.getenv("EBAY_DEV_ID", "")
    EBAY_CERT_ID = os.getenv("EBAY_CERT_ID", "")
    
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sports_cards.db")
    
    # Redis (optional for caching)
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # OCR Settings
    OCR_CONFIDENCE_THRESHOLD = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", "0.7"))
    
    # Screen Capture
    CAPTURE_FPS = int(os.getenv("CAPTURE_FPS", "5"))
    PROCESS_EVERY_N_FRAMES = int(os.getenv("PROCESS_EVERY_N_FRAMES", "3"))

settings = Settings()
