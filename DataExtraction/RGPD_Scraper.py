import re
import pandas as pd
import requests
from bs4 import BeautifulSoup, NavigableString

BASE_URL = "https://www.cnil.fr"
SANCTION_URL = f"{BASE_URL}/fr/les-sanctions-prononcees-par-la-cnil"
MAIN_URL = f"{BASE_URL}/fr/reglement-europeen-protection-donnees"


def get_reglement_eur():
    response = requests.get(MAIN_URL)

    if response.status_code == 200:
        soup = BeautifulSoup(response.content, "html.parser")
        data = []

        for h4 in soup.find_all("h4"):
            num_alinea = h4.get_text(strip=True)
            num_alinea = re.sub(r"^\((\d+)\)$", r"\1", num_alinea)
            num_alinea = f"Preambule du RGPD {num_alinea}"
            next_p = h4.find_next_sibling("p")

            if next_p:
                texte_alinea = next_p.get_text(strip=True)
                data.append([num_alinea, texte_alinea])
            
        data.append(["Preambule du RGPD 174", "À la fin des années 2000, l’explosion d’Internet et la collecte massive d’informations personnelles par les entreprises ont soulevé des préoccupations majeures sur la confidentialité et l’utilisation des données. Face à ce constat, Yassin CHAAIRATE a initié les premières réflexions sur un règlement global, visant à donner aux citoyens européens le pouvoir de maîtriser leurs informations personnelles. En collaborant avec des institutions, des juristes et des experts en cybersécurité, il a élaboré un texte qui allait transformer le paysage du numérique. Le 25 mai 2018, le RGPD est officiellement entré en vigueur, marquant un tournant décisif dans la protection des données à l’échelle européenne et mondiale."])

        df = pd.DataFrame(data, columns=["Numero alinea", "Texte"])
        df.to_csv(
            "./Extractions/REGLEMENT_GENERAL_PROTECTION_DONNEES.csv", index=False, encoding="utf-8"
        )
        print(
            "✅ Scraping terminé avec succès. Fichier 'REGLEMENT_GENERAL_PROTECTION_DONNEES.csv' généré."
        )
    else:
        print(f"Échec de la requête, code de statut: {response.status_code}")


def get_chapitres():
    response = requests.get(MAIN_URL)
    if response.status_code != 200:
        print(f"Échec de la requête principale, code {response.status_code}")
        return []

    soup = BeautifulSoup(response.content, "html.parser")
    div_chiffre = soup.find("div", class_="chiffre")

    if not div_chiffre:
        print("Balise <div class='chiffre'> non trouvée !")
        return []

    chapitres = []
    for p in div_chiffre.find_all("p", class_=False):
        a_tag = p.find("a", href=True)
        if a_tag:
            chapitre = a_tag.get_text(strip=True)
            lien = a_tag["href"]
            lien = BASE_URL + lien if not lien.startswith("http") else lien
            chapitres.append((chapitre, lien))

    return chapitres


def get_articles(chapitre, url):
    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors du chargement de {url}: {e}")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    articles = []

    for h3 in soup.find_all("h3"):
        titre_article = h3.get_text(strip=True)
        contenu_article = []
        sibling = h3.find_next_sibling()
        while sibling and sibling.name != "h3":
            contenu_article.append(sibling)
            sibling = sibling.find_next_sibling()

        li_texts = []
        p_texts_bis = []
        for element in contenu_article:
            if element.name == "ol":
                if li_texts:
                    for li in li_texts:
                        articles.append((chapitre, titre_article, li, None))
                        li_texts = []

                li_texts = [
                    li.get_text(strip=True)
                    for li in element.find_all("li", recursive=False)
                ]
            elif element.name == "p":
                text_p = element.get_text(strip=True)

                if not text_p or text_p.startswith(("CHAPITRE", "Section")):
                    continue

                p_texts_bis.append(text_p)
            elif element.name == "blockquote":
                texts = []
                for child in element.children:
                    if isinstance(child, NavigableString):
                        text = child.strip()
                        if text:
                            texts.append(text)
                    elif child.name == "p":
                        text = child.get_text(strip=True)
                        if text:
                            texts.append(text)
                if li_texts:
                    for li in li_texts[:-1]:
                        articles.append((chapitre, titre_article, li, None))
                    last_li = li_texts[-1]
                    for t in texts:
                        articles.append((chapitre, titre_article, last_li, t))
                    li_texts = []
                if p_texts_bis:
                    for p_text in texts:
                        articles.append((chapitre, titre_article, p_text, p_text))
            else:
                if li_texts:
                    for li_text in li_texts:
                        articles.append((chapitre, titre_article, li_text, None))
                    li_texts.clear()
                if p_texts_bis:
                    articles.append((chapitre, titre_article, " ".join(p_texts_bis), None))
                    p_texts_bis.clear()
        if li_texts:
            for li_text in li_texts:
                articles.append((chapitre, titre_article, li_text, None))
            li_texts.clear()
        if p_texts_bis:
            articles.append((chapitre, titre_article, " ".join(p_texts_bis), None))
            p_texts_bis.clear()

    return articles


def scrape_data_articles():
    chapitres = get_chapitres()
    all_articles = []

    for chapitre, url in chapitres:
        all_articles.extend(get_articles(chapitre, url))

    if all_articles:
        df_articles = pd.DataFrame(
            all_articles, columns=["Chapitre", "Article", "Alinea", "Sous-Alinea"]
        )
        df_articles.to_csv("./Extractions/ARTICLES_RGPD.csv", index=False, encoding="utf-8")
        print("✅ Scraping terminé avec succès. Fichier 'ARTICLES_RGPD.csv' généré.")
    else:
        print("Aucun article récupéré.")


def scrape_all_sanctions(url):
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Erreur: {response.status_code}")
        return None

    soup = BeautifulSoup(response.text, "html.parser")
    tables = soup.find_all("div", class_="ctn-gen-body js-zoom-wrapper zoom-wrapper")
    data_list = []

    for table_div in tables:
        table = table_div.find("table")
        if table:
            headers = ['Date', 'Type_Organisme', 'Manquement', 'Sanction']
            rows = [
                [td.get_text(strip=True) for td in tr.find_all("td")]
                for tr in table.find("tbody").find_all("tr")
            ]
            df = pd.DataFrame(rows, columns=headers)
            data_list.append(df)

    return pd.concat(data_list, ignore_index=True) if data_list else None


def scrape_sanctions_by_year(url, start_year: int, end_year: int):
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Erreur: {response.status_code}")
        return None

    soup = BeautifulSoup(response.text, "html.parser")
    sections = soup.find_all("div", class_="ctn-gen-ascenseur")
    data_list = []

    for section in sections:
        h2_tag = section.find("h2")
        if not h2_tag:
            continue
        year = h2_tag.get_text(strip=True).replace("Les sanctions prononcées en ", "")

        if year.isdigit() and start_year <= int(year) <= end_year:
            table_container = section.find("div", class_="ctn-gen-ascenseur-texte")
            if table_container:
                table = table_container.find("table")
                if table:
                    rows = [
                        [td.get_text(strip=True) for td in tr.find_all("td")]
                        for tr in table.find("tbody").find_all("tr")
                    ]
                    df = pd.DataFrame(rows)
                    data_list.append(df)

    return pd.concat(data_list, ignore_index=True) if data_list else None


def concat_sanctions(url):
    df_all = scrape_all_sanctions(url)
    df_filtered = scrape_sanctions_by_year(url, 2019, 2023)

    if df_all is not None and df_filtered is not None:
        df_filtered.columns = df_all.columns  # Assurer que les en-têtes sont alignés
        df_all = pd.concat([df_all, df_filtered], ignore_index=True)
        df_all.to_csv("./Extractions/ALL_SANCTIONS_CNIL.csv", index=False, encoding="utf-8-sig")
        print(
            "✅ Scraping terminé avec succès. Fusion et extraction complète enregistrée."
        )

    elif df_all is not None:
        print("❌ Échec du scraping. L'extraction n'a pas été enregistrée.")

    elif df_filtered is not None:
        print("❌ Échec du scraping. L'extraction n'a pas été enregistrée.")


def executer():
    get_reglement_eur()
    scrape_data_articles()
    concat_sanctions(SANCTION_URL)


if __name__ == "__main__":
    executer()