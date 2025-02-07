import argparse
from RGPD_Scraper import executer
from RGPD_VectorDB import create_vector_database
from api import run


def main():
    parser = argparse.ArgumentParser(description="Lancement des tâches RGPD.")
    parser.add_argument("-task", choices=["all", "api"], required=True, help="Choisissez 'all' pour tout exécuter ou 'api' pour lancer uniquement l'API.")

    args = parser.parse_args()

    if args.task == "all":
        executer()
        create_vector_database()
        run()
    elif args.task == "api":
        run()


if __name__ == "__main__":
    main()




