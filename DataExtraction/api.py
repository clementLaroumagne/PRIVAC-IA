from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from RGPD_VectorDB import query_vector_database_stream
import uvicorn

from datetime import datetime

app = FastAPI()

# Configuration CORS pour permettre les requêtes depuis votre front-end
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À remplacer par l'URL de votre front-end en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modèle Pydantic pour la requête
class Query(BaseModel):
    question: str

@app.post("/query")
async def get_rgpd_response(query: Query):
    try:
        # Fonction génératrice pour le streaming
        async def generate():
            async for chunk in query_vector_database_stream(query.question):
                yield chunk

        # Retourne la réponse en flux
        return StreamingResponse(
            generate(),
            media_type='text/plain; charset=utf-8',
            headers={
                'Cache-Control': 'no-cache',
                'Transfer-Encoding': 'chunked',  # Important pour le streaming
                'Connection': 'keep-alive',      # Garde la connexion ouverte
            }
        )
    except Exception as e:
        # Gestion des erreurs et logs
        print(f"Erreur dans l'API: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur interne : {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

def run():
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    run()
