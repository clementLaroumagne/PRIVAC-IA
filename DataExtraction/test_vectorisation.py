import pandas as pd
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain.schema.runnable import RunnablePassthrough
from langchain.prompts import PromptTemplate
import json
import uuid
import asyncio
import openai
import shutil
from openai import AsyncOpenAI
import os

OPENAI_API_KEY = "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"
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

RGPD_FILE = "./Extractions/REGLEMENT_GENERAL_PROTECTION_DONNEES.csv"
ARTICLES_FILE = "./Extractions/ARTICLES_RGPD.csv"
SANCTIONS_FILE = "./Extractions/ALL_SANCTIONS_CNIL.csv"

VECTOR_DB_PATH = "./rgpd_embeddings_db"

prompt_template = PromptTemplate(
    template="""En utilisant le contexte suivant, réponds à la question.
    
    Contexte: {context}
    
    Question: {query}
    
    Réponse:""",
    input_variables=["context", "query"]
)

llm = ChatOpenAI(model="gpt-4o-mini", openai_api_key=OPENAI_API_KEY)
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

    embeddings = OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)

    print("🆕 Création d'une nouvelle base vectorielle...")
    vectorstore = Chroma(persist_directory=VECTOR_DB_PATH, embedding_function=embeddings)

    print("🆕 Ajout des nouvelles données...")
    for df in datasets:
        documents = df['texte_complet'].tolist()
        metadatas = df.drop(columns=['texte_complet']).to_dict(orient='records')

        vectorstore.add_texts(texts=documents, metadatas=metadatas)

    print("✅ Base de données vectorielle mise à jour.")

if __name__ == "__main__":
    print("Démarrage du script...")
    create_vector_database()
