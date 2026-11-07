import os
import smtplib
from pathlib import Path
from dotenv import load_dotenv
from email.mime.text import MIMEText

load_dotenv(Path(__file__).resolve().parent / ".env")

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").replace(" ", "").strip()
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME).strip()

print("\n--- RoomRentFinder SMTP Diagnostic Test ---")
print(f"SMTP Server   : {SMTP_SERVER}")
print(f"SMTP Port     : {SMTP_PORT}")
print(f"SMTP Username : {SMTP_USERNAME}")
print(f"Password clean: {len(SMTP_PASSWORD)} characters (spaces stripped)")
print(f"From Address  : {SMTP_FROM_EMAIL}")
print("--------------------------------------------\n")

if not SMTP_USERNAME or not SMTP_PASSWORD:
    print("❌ ERROR: SMTP_USERNAME or SMTP_PASSWORD is missing in backend/.env!")
    exit(1)

msg = MIMEText("This is a diagnostic test email to verify your RoomRentFinder SMTP setup.", "plain")
msg["Subject"] = "RoomRentFinder - SMTP Verification Test"
msg["From"] = SMTP_FROM_EMAIL
msg["To"] = SMTP_USERNAME

# Test 1: Port 587 (STARTTLS)
print("1. Testing connection via Port 587 (STARTTLS)...")
try:
    with smtplib.SMTP(SMTP_SERVER, 587, timeout=10) as server:
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
    print("   ✅ SUCCESS! Test email was sent successfully to your inbox via Port 587.")
    exit(0)
except Exception as e587:
    print(f"   ⚠️ Port 587 failed: {e587}")

# Test 2: Port 465 (SSL)
print("\n2. Testing connection via Port 465 (SSL)...")
try:
    with smtplib.SMTP_SSL(SMTP_SERVER, 465, timeout=10) as server:
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
    print("   ✅ SUCCESS! Test email was sent successfully to your inbox via Port 465.")
    exit(0)
except Exception as e465:
    print(f"   ❌ Port 465 failed: {e465}")

print("\n❌ Summary: Could not send email. Check your Google App Password and ensure 2-Step Verification is active on your Google Account.\n")

