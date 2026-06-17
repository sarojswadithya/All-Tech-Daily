import os
import asyncio
import io
import re
import base64
import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from bs4 import BeautifulSoup
from deep_translator import GoogleTranslator
from groq import Groq
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timezone, timedelta
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors
import stripe

# 1. Load Environment Variables
load_dotenv(override=True)

# 2. Initialize AI, Database, and Rate Limiter
groq_client = Groq()

# Fetch the variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("WARNING: Supabase keys missing from .env file!")

# Initialize the client with the Service Role Key to bypass RLS
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Initialize the Limiter using the user's IP address
limiter = Limiter(key_func=get_remote_address)

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

app = FastAPI(title="Global Tech News API", version="1.0")

# Register the Limiter to the FastAPI app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # NOTE: Update this to your frontend domain before final deployment!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "online", "message": "All Tech Daily API is running. The presses are hot!"}

# --- MODELS ---
class NewsItem(BaseModel):
    id: int
    original_headline: str
    translated_headline: str
    summary: str
    source: str
    url: str 

class AudioRequest(BaseModel):
    text: str
    lang: str

class TranslateRequest(BaseModel):
    text: str
    target_lang: str

class ScriptRequest(BaseModel):
    headline: str
    summary: str

class PDFRequest(BaseModel):
    articles: List[dict]
    language: str

class CheckoutRequest(BaseModel):
    email: str

class PodcastRequest(BaseModel):
    articles: List[dict]
    language: str

# --- UTILS ---
async def generate_summary(text: str, lang: str) -> str:
    prompt = f"""Extract the core facts from this tech news into 1 to 3 short bullet points. 
    RULES:
    1. ONLY include factual information explicitly stated in the text.
    2. DO NOT add filler points or meta-comments like 'No specific details are mentioned' or 'No further info provided'.
    3. If there is only enough information for 1 bullet point, ONLY output 1 bullet point. Do not force 3.
    4. Do not include introductory text.
    5. If the text is just a category name or too short to contain real news, output exactly: 'Insufficient details to summarize.'

    News: {text}"""
    try:
        chat = await asyncio.to_thread(
            groq_client.chat.completions.create,
            messages=[
                {"role": "system", "content": "You are a precise technical news summarizer. You never apologize. You only output facts."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.1, 
            max_tokens=150,
        )
        summary = chat.choices[0].message.content.strip()
        
        # THE FIX: Check the requested language before returning the empty state text
        if summary == "Insufficient details to summarize.":
            if lang == "ta":
                return "கூடுதல் தகவல் இல்லை (Insufficient details)."
            else:
                return "Insufficient details to summarize."
            
        if lang == "ta":
            translator = GoogleTranslator(source='en', target='ta')
            return await asyncio.to_thread(translator.translate, summary)
            
        return summary
    except Exception as e:
        print(f"Summary Generation Error: {e}")
        return "Summary currently unavailable."

sem = asyncio.Semaphore(4)

async def process_single_article(data, lang):
    async with sem:
        headline = data['headline']
        source_name = data['source']
        url = data.get('url', '#')
        
        await asyncio.sleep(0.5) 
        summary = await generate_summary(headline, lang)
        
        if lang != "en":
             translator = GoogleTranslator(source='auto', target=lang)
             translated_headline = await asyncio.to_thread(translator.translate, headline)
        else:
             translated_headline = headline
        
        return {
            "original_headline": headline,
            "translated_headline": translated_headline,
            "summary": summary,
            "source": source_name,
            "url": url,
            "language": lang
        }

# --- THE SCRAPER MODULES ---
async def scrape_the_hindu():
    print("Scraping The Hindu...")
    try:
        response = requests.get("https://www.thehindu.com/sci-tech/technology/", headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        articles = []
        seen = set()
        
        for item in soup.find_all('h3', class_='title'):
            link_tag = item.find('a', href=True)
            if not link_tag:
                continue
                
            headline = link_tag.get_text(" ", strip=True)
            
            # THE FIX: Added a check to filter out the Daily Quiz 
            if len(headline) < 15 or "quiz" in headline.lower() or headline in seen:
                continue
                
            seen.add(headline)
            href = link_tag['href']
            
            if href.startswith("/"):
                href = "https://www.thehindu.com" + href
                
            articles.append({
                "headline": headline, 
                "source": "The Hindu",
                "url": href
            })
            
            if len(articles) >= 10:
                break
                
        return articles
    except Exception as e:
        print(f"Hindu Scraper Failed: {e}")
        return []

async def scrape_toi():
    print("Scraping Times of India...")
    try:
        response = requests.get("https://timesofindia.indiatimes.com/technology/tech-news", headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")
        
        articles = []
        seen = set()
        
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "articleshow" not in href:
                continue
                
            raw_headline = a.get_text(" ", strip=True)
            
            # THE FIX: Strip out "Tech News [Month] [Day] [Year]" from the beginning of the string
            headline = re.sub(r'^Tech News\s+[a-zA-Z]{3}\s+\d{1,2},?\s*\d{4}\s*', '', raw_headline, flags=re.IGNORECASE).strip()
            
            if len(headline) < 15 or headline in seen:
                continue
                
            seen.add(headline)
            
            if href.startswith("/"):
                href = "https://timesofindia.indiatimes.com" + href
                
            articles.append({
                "headline": headline,
                "source": "Times of India",
                "url": href
            })
            
            if len(articles) >= 10:
                break
                
        print(f"TOI Found {len(articles)} articles")
        return articles
    except Exception as e:
        print(f"TOI Scraper Failed: {e}")
        return []

async def scrape_dinamalar():
    print("Scraping Dinamalar Tech Section...")
    try:
        url = "https://www.dinamalar.com/special/technology"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200: return []
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        articles = []
        seen = set()
        
        for item in soup.find_all('a', href=True):
            headline = item.get_text(" ", strip=True)
            
            # Exclude non-news links and duplicates
            if len(headline) < 35 or "வருடம்" in headline or headline in seen:
                continue
                
            seen.add(headline)
            href = item['href']
            
            if href.startswith("/"):
                href = "https://www.dinamalar.com" + href
                
            articles.append({
                "headline": headline, 
                "source": "Dinamalar",
                "url": href
            })
            
            if len(articles) >= 10: 
                break
                
        return articles
    except Exception as e:
        print(f"Dinamalar Scraper Failed: {e}")
        return []

async def scrape_dailythanthi():
    print("Scraping Daily Thanthi...")
    try:
        response = requests.get("https://www.dailythanthi.com/topic/digital-technology", headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        soup = BeautifulSoup(response.text, "html.parser")
        
        articles = []
        seen = set()
        
        for a in soup.find_all("a", href=True):
            href = a["href"].lower()
            
            # THE FIX: Only grab actual news articles, ignore menus, astrology, and sports hubs
            if "/news/" not in href:
                continue
                
            headline = a.get_text(" ", strip=True)
            if len(headline) < 20 or headline in seen:
                continue
                
            seen.add(headline)
            
            if href.startswith("/"):
                href = "https://www.dailythanthi.com" + a["href"]
                
            articles.append({
                "headline": headline,
                "source": "Dailythanthi",
                "url": href
            })
            
            if len(articles) >= 10:
                break
                
        print(f"Daily Thanthi Found {len(articles)} articles")
        return articles
    except Exception as e:
        print(f"Daily Thanthi Scraper Failed: {e}")
        return []

# --- API ENDPOINTS ---
@app.get("/api/news", response_model=List[NewsItem])
@limiter.limit("10/minute") 
async def get_tech_news(request: Request, lang: str = "en", sources: str = "hindu"):
    if lang not in ["en", "ta"]:
        raise HTTPException(status_code=400, detail="Unsupported language.")
        
    requested_sources = sources.split(',')
    cache_window = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    
    try:
        db_response = supabase.table("tech_news").select("*").eq("language", lang).gte("created_at", cache_window).execute()
        saved_news = [item for item in db_response.data if item['source'].lower().replace(" ", "") in [s.replace(" ", "") for s in requested_sources] or item['source'].lower() in requested_sources]
        if len(saved_news) > 0:
            print(f"Loading cached news from Supabase (from last 1 hour)...")
            # Ensure url fallback exists for legacy DB rows
            return [NewsItem(**{**item, "url": item.get("url", "#")}) for item in saved_news]
    except Exception as e:
        print(f"Database Error: {e}")

    print(f"No recent cached data found. Running scrapers for: {requested_sources}")
    tasks = []
    if 'hindu' in requested_sources: tasks.append(scrape_the_hindu())
    if 'toi' in requested_sources: tasks.append(scrape_toi())
    if 'dinamalar' in requested_sources: tasks.append(scrape_dinamalar())
    if 'dailythanthi' in requested_sources: tasks.append(scrape_dailythanthi()) 
    
    results = await asyncio.gather(*tasks)
    raw_articles = [article for sublist in results for article in sublist]
    
    process_tasks = [process_single_article(data, lang) for data in raw_articles]
    processed_data_list = await asyncio.gather(*process_tasks)
        
    if processed_data_list:
        try:
            await asyncio.to_thread(supabase.table("tech_news").insert(processed_data_list).execute)
        except Exception as e:
            print(f"Supabase Bulk Insert Error: {e}")
            
    final_articles = [NewsItem(id=index, **data) for index, data in enumerate(processed_data_list, 1)]
    return final_articles

@app.post("/api/script")
@limiter.limit("5/minute")
async def generate_script(request: Request, req: ScriptRequest):
    prompt = f"""
    Turn this tech news into a punchy, viral 30-second social media script (for Reels/Shorts). 
    Format it exactly like this:
    [HOOK]: (A 3-second attention grabber)
    [BODY]: (The core news, spoken quickly and clearly)
    [B-ROLL CUE]: (What image/video to show on screen)
    [CTA]: (Call to action to engage)
    
    Headline: {req.headline}
    Summary: {req.summary}
    """
    try:
        chat = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a master social media growth strategist and scriptwriter."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.1-8b-instant",
            temperature=0.4, 
            max_tokens=200,
        )
        return {"script": chat.choices[0].message.content.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/translate")
@limiter.limit("15/minute")
async def translate_text(request: Request, req: TranslateRequest):
    try:
        translator = GoogleTranslator(source='auto', target=req.target_lang)
        return {"translated_text": translator.translate(req.text)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/audio")
@limiter.limit("5/minute")
async def generate_audio(request: Request, req: AudioRequest):
    try:
        target_lang = "ta-IN" if req.lang == "ta" else "en-IN"
        url = "https://api.sarvam.ai/text-to-speech"
        payload = {
            "text": req.text,
            "target_language_code": target_lang,
            "model": "bulbul:v3",
            "speaker": "shubh" 
        }
        headers = {
            "api-subscription-key": os.environ.get("SARVAM_API_KEY"),
            "Content-Type": "application/json"
        }
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Sarvam API Failed: {response.text}")
            
        data = response.json()
        audio_base64 = data.get("audios", [])[0]
        audio_bytes = base64.b64decode(audio_base64)
        audio_buffer = io.BytesIO(audio_bytes)
        return StreamingResponse(audio_buffer, media_type="audio/wav")
    except Exception as e:
        print(f"Audio Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/pdf")
@limiter.limit("5/minute")
async def generate_pdf(request: Request, req: PDFRequest):
    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=letter,
            rightMargin=50, leftMargin=50, 
            topMargin=50, bottomMargin=50
        )
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "Masthead", parent=styles['Heading1'], fontName="Helvetica-Bold", 
            fontSize=28, alignment=TA_CENTER, spaceAfter=20, textColor=colors.black
        )
        headline_style = ParagraphStyle(
            "Headline", parent=styles['Heading2'], fontName="Helvetica-Bold", 
            fontSize=16, spaceBefore=15, spaceAfter=10, leading=18
        )
        body_style = ParagraphStyle(
            "Body", parent=styles['BodyText'], fontName="Helvetica", 
            fontSize=11, leading=16, spaceAfter=15
        )
        meta_style = ParagraphStyle(
            "Meta", parent=styles['Normal'], fontName="Helvetica-Bold", 
            fontSize=8, textColor=colors.gray, textTransform="uppercase", spaceAfter=5
        )

        story = []
        story.append(Paragraph("ALL TECH DAILY", title_style))
        edition_text = "Tamil Edition" if req.language == "ta" else "English Edition"
        story.append(Paragraph(f"Vol. 1 — {edition_text} — {datetime.now(timezone.utc).strftime('%B %d, %Y')}", meta_style))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.black, spaceBefore=10, spaceAfter=20))

        for item in req.articles:
            story.append(Paragraph(f"SOURCE: {item.get('source', 'Unknown').upper()}", meta_style))
            headline = item.get('translated_headline') or item.get('original_headline')
            story.append(Paragraph(headline, headline_style))
            summary_text = item.get('summary', '').replace('\n', '<br/>')
            story.append(Paragraph(summary_text, body_style))
            story.append(HRFlowable(width="30%", thickness=0.5, color=colors.lightgrey, spaceBefore=15, spaceAfter=15))

        doc.build(story)
        buffer.seek(0)

        return StreamingResponse(
            buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": "attachment; filename=All_Tech_Daily_Digest.pdf"}
        )

    except Exception as e:
        print(f"PDF Generation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/create-checkout-session")
async def create_checkout_session(req: CheckoutRequest):
    domain_url = "https://all-tech-daily.vercel.app" 
    try:
        checkout_session = stripe.checkout.Session.create(
            customer_email=req.email,
            payment_method_types=['card'],
            line_items=[
                {
                    'price': 'price_1TjMKtLENVY7hCnyGamouKED', 
                    'quantity': 1,
                },
            ],
            mode='subscription', 
            success_url=domain_url + '/dashboard?success=true',
            cancel_url=domain_url + '/dashboard?canceled=true',
        )
        return {"url": checkout_session.url}
    except Exception as e:
        print(f"Stripe Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/api/create-portal-session")
async def create_portal_session(req: CheckoutRequest):
    domain_url = "https://all-tech-daily.vercel.app/dashboard" 
    try:
        customers = stripe.Customer.list(email=req.email, limit=1)
        if not customers.data:
            raise HTTPException(status_code=404, detail="Stripe customer not found")

        customer_id = customers.data[0].id
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=domain_url,
        )
        return {"url": portal_session.url}
    except Exception as e:
        print(f"Portal Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        customer_email = None
        if getattr(session, 'customer_details', None):
            customer_email = session.customer_details.email
        
        if customer_email:
            print(f"Payment confirmed for: {customer_email}. Upgrading account...")
            try:
                response = supabase.table("profiles") \
                    .update({"is_pro": True}) \
                    .eq("email", customer_email) \
                    .execute()
                print(f"Database updated successfully.")
            except Exception as e:
                print(f"Database update failed: {e}")

    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        try:
            customer = stripe.Customer.retrieve(subscription.customer)
            customer_email = getattr(customer, 'email', None)
            if customer_email:
                print(f"Subscription cancelled for: {customer_email}. Downgrading account...")
                supabase.table("profiles").update({"is_pro": False}).eq("email", customer_email).execute()
        except Exception as e:
            print(f"Downgrade failed: {e}")

    return {"status": "success"}

@app.post("/api/podcast")
@limiter.limit("3/minute")
async def generate_podcast(request: Request, req: PodcastRequest):
    """Generates a cohesive podcast story from the day's news."""
    raw_news = "\n".join([f"- {item.get('original_headline')}: {item.get('summary')}" for item in req.articles])
    
    prompt = f"""
    You are a charismatic, energetic tech podcast host. 
    Take the following tech news stories and weave them into a smooth, 1-minute engaging podcast script. 
    Use transitions between stories (e.g., "In other news...", "Moving on to..."). 
    Do not use sound effect brackets like [intro music]. Just output the spoken script.
    
    News to cover:
    {raw_news}
    """
    
    try:
        chat = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.6,
            max_tokens=400,
        )
        podcast_script = chat.choices[0].message.content.strip()
        
        if req.language == "ta":
            translator = GoogleTranslator(source='en', target='ta')
            podcast_script = await asyncio.to_thread(translator.translate, podcast_script)
            target_lang = "ta-IN"
        else:
            target_lang = "en-IN"

        url = "https://api.sarvam.ai/text-to-speech"
        payload = {
            "text": podcast_script,
            "target_language_code": target_lang,
            "model": "bulbul:v3",
            "speaker": "shubh" 
        }
        headers = {
            "api-subscription-key": os.environ.get("SARVAM_API_KEY"),
            "Content-Type": "application/json"
        }
        
        response = await asyncio.to_thread(requests.post, url, json=payload, headers=headers)
        if response.status_code != 200:
            raise Exception("Podcast audio generation failed.")
            
        data = response.json()
        audio_bytes = base64.b64decode(data.get("audios", [])[0])
        
        return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/wav")
        
    except Exception as e:
        print(f"Podcast Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)