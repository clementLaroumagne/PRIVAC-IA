import argparse
import subprocess
import time
import signal
import sys
from RGPD_Scraper import executer
from RGPD_VectorDB import create_vector_database
from api import run

npm_process = None

def start_npm():
    """Lance `npm run start` dans PRIVAC-IA même si le script est exécuté dans DataExtraction."""
    global npm_process
    try:
        project_dir = "C:\\Users\\Yassin CHAAIRATE\\Desktop\\DIGI 4\\IABot\\PRIVAC-IA"
        npm_process = subprocess.Popen(
            ["npm.cmd", "run", "start"],
            cwd=project_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print(f"⚡ `npm run start` a été lancé avec succès dans `{project_dir}` !")
    except Exception as e:
        print(f"❌ Erreur lors du lancement de `npm run start` : {e}")

def stop_npm():
    """Arrête `npm run start` proprement."""
    global npm_process
    if npm_process:
        print("🛑 Arrêt de `npm run start`...")
        npm_process.terminate()
        npm_process.wait()
        print("✅ `npm run start` a été arrêté.")

def handle_exit(signum, frame):
    """Fonction appelée lors de l'arrêt du script (CTRL+C ou fermeture du terminal)."""
    stop_npm()
    sys.exit(0)

signal.signal(signal.SIGINT, handle_exit)
signal.signal(signal.SIGTERM, handle_exit)

def main():
    parser = argparse.ArgumentParser(description="Lancement des tâches RGPD et serveur frontend.")
    parser.add_argument("-task", choices=["all", "api"], required=True, help="Choisissez 'all' pour tout exécuter ou 'api' pour lancer uniquement l'API.")

    args = parser.parse_args()

    start_npm()

    time.sleep(5)

    if args.task == "all":
        executer()
        create_vector_database()
        run()
    elif args.task == "api":
        run()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        handle_exit(None, None)

if __name__ == "__main__":
    main()