import requests
from bs4 import BeautifulSoup

url = "https://www.dailythanthi.com/topic/digital-technology"

response = requests.get(
    url,
    headers={"User-Agent": "Mozilla/5.0"},
    timeout=10
)

soup = BeautifulSoup(response.text, "html.parser")

print("Links:", len(soup.find_all("a")))

count = 0

for a in soup.find_all("a", href=True):

    text = a.get_text(" ", strip=True)

    if len(text) > 20:

        print("\nHEADLINE:")
        print(text)

        print("URL:")
        print(a["href"])

        print("=" * 80)

        count += 1

        if count == 20:
            break