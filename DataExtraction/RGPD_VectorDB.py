import pandas as pd
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain.schema.runnable import RunnablePassthrough
from langchain.prompts import PromptTemplate
from typing import AsyncIterable
import json
import uuid
import asyncio
from openai import AsyncOpenAI
import os
import shutil
from dotenv import load_dotenv

# --- Configuration ---
# Charger les variables d'environnement
load_dotenv()
openai_api_key = os.getenv('OPENAI_API_KEY')
client = AsyncOpenAI(api_key=openai_api_key)
RGPD_FILE = "./Extractions/REGLEMENT_GENERAL_PROTECTION_DONNEES.csv"
ARTICLES_FILE = "./Extractions/ARTICLES_RGPD.csv"
SANCTIONS_FILE = "./Extractions/ALL_SANCTIONS_CNIL.csv"

VECTOR_DB_PATH = "../rgpd_embeddings_db"

# Définir le template de prompt
prompt_template = PromptTemplate(
    template="""En utilisant le contexte suivant, réponds à la question.
    
    Contexte: {context}
    
    Question: {query}
    
    Réponse:""",
    input_variables=["context", "query"]
)

# Initialiser le modèle et la chaîne
llm = ChatOpenAI(model="gpt-4o-mini", openai_api_key=openai_api_key)
chain = prompt_template | llm | RunnablePassthrough()

def load_and_process_csv(file_path, text_columns, metadata_columns, source_name):
    df = pd.read_csv(file_path, sep=',', encoding='utf-8')

    for col in text_columns + metadata_columns:
        if col not in df.columns:
            df[col] = "" 
    
    df['texte_complet'] = df[text_columns].apply(lambda x: ' - '.join(x.astype(str)), axis=1)
    
    df['source'] = source_name
    
    return df[['texte_complet'] + metadata_columns + ['source']]

def create_vector_database():
    print("🗑️ Suppression complète de la base...")
    if os.path.exists(VECTOR_DB_PATH):
        shutil.rmtree(VECTOR_DB_PATH) 

    print("📥 Chargement des fichiers...")
    df_rgpd = load_and_process_csv(RGPD_FILE, ['Numero alinea', 'Texte'], ['Numero alinea'], "RGPD")
    df_articles = load_and_process_csv(ARTICLES_FILE, ['Chapitre', 'Article', 'Alinea', 'Sous-Alinea'], ['Chapitre', 'Article'], "Articles RGPD")
    df_sanctions = load_and_process_csv(SANCTIONS_FILE, ['Date', 'Type_Organisme', 'Manquement', 'Sanction'], ['Date', 'Type_Organisme', 'Manquement', 'Sanction'], "Sanctions CNIL")

    datasets = [df_rgpd, df_articles, df_sanctions]
    embeddings = OpenAIEmbeddings(openai_api_key=openai_api_key)


    print("🆕 Création d'une nouvelle base vectorielle...")
    vectorstore = Chroma(persist_directory=VECTOR_DB_PATH, embedding_function=embeddings)

    print("🆕 Ajout des nouvelles données...")
    for df in datasets:
        documents = df['texte_complet'].tolist()
        metadatas = df.drop(columns=['texte_complet']).to_dict(orient='records')

        vectorstore.add_texts(texts=documents, metadatas=metadatas)

    print("✅ Base de données vectorielle mise à jour.")


async def query_vector_database_stream(query: str) -> AsyncIterable[str]:
    print("Démarrage de la requête...")
    embeddings = OpenAIEmbeddings(openai_api_key=openai_api_key)
    vectorstore = Chroma(persist_directory="./rgpd_embeddings_db", embedding_function=embeddings)
    
    print("Recherche dans la base vectorielle...")
    relevant_documents = vectorstore.similarity_search(query, k=5)
    context = "\n".join([doc.page_content for doc in relevant_documents])
    print(f"Contexte trouvé: {context[:100]}...")
    
    message_id = f"msg-{uuid.uuid4().hex}"
    print(f"ID du message généré: {message_id}")
    
    # Envoyer l'identifiant du message
    # yield json.dumps({"messageId": message_id}) + "\n"

    messages = [
        {"role": "system", "content": "Tu es un expert du RGPD qui répond de manière précise et concise."},
        {"role": "user", "content": f"En utilisant le contexte suivant, réponds à la question.\n\nContexte: {context}\n\nQuestion: {query}\n\nRéponse:"}
    ]

    print("Démarrage du streaming avec OpenAI...")
    try:
        # Stream la réponse de GPT-4
        stream = await client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            stream=True
        )
        # print(stream.choices[0].message.content)

        async for chunk in stream:
            # print("Chunk brut:", chunk)
            # Vérifie la présence de contenu textuel
            if chunk.choices and chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                print("Token reçu :", token)
                yield token
                
        print("Fin du streaming")

    except Exception as e:
        print(f"Erreur pendant le streaming: {e}")
        yield json.dumps({"error": str(e)}) + "\n"

async def test_query():
    query = "de quoi parle l'article 5 ?"
    print("Lancement du test...")

    try:
        async for chunk in query_vector_database_stream(query):
            print("Chunk reçu :", chunk.strip())
    except Exception as e:
        print(f"Erreur pendant le test : {e}")

if __name__ == "__main__":
    print("Démarrage du script...")
    # create_vector_database(csv_file_path)  # Décommenter pour créer la base
    asyncio.run(test_query())