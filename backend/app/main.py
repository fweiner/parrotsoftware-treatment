"""Main FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Create FastAPI app
app = FastAPI(
    title="Parrot Software Treatment API",
    description="Backend API for cognitive treatment applications",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Parrot Software Treatment API",
        "version": "1.0.0",
        "status": "online",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


# Import and include routers
from app.routers import auth, treatments, results, word_finding, life_words, invites, profile, items

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(profile.router, prefix="/api/profile", tags=["profile"])
app.include_router(treatments.router, prefix="/api/treatments", tags=["treatments"])
app.include_router(results.router, prefix="/api/results", tags=["results"])
app.include_router(word_finding.router, prefix="/api/word-finding", tags=["word-finding"])
app.include_router(life_words.router, prefix="/api/life-words", tags=["life-words"])
app.include_router(invites.router, prefix="/api/life-words", tags=["invites"])
app.include_router(items.router, prefix="/api/life-words/items", tags=["items"])
