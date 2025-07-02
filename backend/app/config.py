import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    """Application settings loaded from environment variables."""
    
    # eBay API Settings
    EBAY_APP_ID: str = os.getenv("EBAY_APP_ID", "")
    EBAY_DEV_ID: str = os.getenv("EBAY_DEV_ID", "")
    EBAY_CERT_ID: str = os.getenv("EBAY_CERT_ID", "")
    
    # Anthropic Claude API Settings
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")
    CLAUDE_MAX_TOKENS: int = int(os.getenv("CLAUDE_MAX_TOKENS", "4096"))
    
    # Database Settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sports_cards.db")
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL")
    
    # OCR Settings
    OCR_CONFIDENCE_THRESHOLD: float = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", "0.7"))
    
    # Screen Capture Settings
    CAPTURE_FPS: int = int(os.getenv("CAPTURE_FPS", "5"))
    PROCESS_EVERY_N_FRAMES: int = int(os.getenv("PROCESS_EVERY_N_FRAMES", "3"))
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    
    @property
    def has_anthropic_key(self) -> bool:
        """Check if Anthropic API key is configured."""
        return bool(self.ANTHROPIC_API_KEY and self.ANTHROPIC_API_KEY.startswith("sk-ant-"))
    
    @property
    def has_ebay_keys(self) -> bool:
        """Check if eBay API keys are configured."""
        return bool(self.EBAY_APP_ID and self.EBAY_DEV_ID and self.EBAY_CERT_ID)

settings = Settings()