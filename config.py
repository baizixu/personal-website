import os

# Load .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
except ImportError:
    pass

# Admin
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

# Token expiry in seconds (30 minutes)
TOKEN_EXPIRY = int(os.getenv("TOKEN_EXPIRY", "1800"))

# Rate limits
LOGIN_RATE_LIMIT = int(os.getenv("LOGIN_RATE_LIMIT", "5"))     # attempts per window
LOGIN_RATE_WINDOW = int(os.getenv("LOGIN_RATE_WINDOW", "60"))   # seconds
API_RATE_LIMIT = int(os.getenv("API_RATE_LIMIT", "30"))         # requests per window
API_RATE_WINDOW = int(os.getenv("API_RATE_WINDOW", "60"))       # seconds
MESSAGE_RATE_LIMIT = int(os.getenv("MESSAGE_RATE_LIMIT", "3"))  # messages per window
MESSAGE_RATE_WINDOW = int(os.getenv("MESSAGE_RATE_WINDOW", "300"))  # 5 minutes

# Database path
DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "website.db"))

# Production mode
PRODUCTION = os.getenv("PRODUCTION", "").lower() in ("1", "true", "yes")
