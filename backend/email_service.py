import os
import json
import smtplib
import urllib.request
import urllib.error
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)


def _send_via_brevo_api(api_key: str, from_email: str, to_email: str, subject: str, html_body: str) -> bool:
    """Sends email via Brevo REST API over HTTPS (Port 443) - Bypasses cloud SMTP blocks."""
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": api_key,
        "content-type": "application/json",
        "accept": "application/json"
    }
    payload = {
        "sender": {"name": "RoomRentFinder", "email": from_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body
    }
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=12) as response:
            if response.status in (200, 201):
                print(f"[EMAIL SERVICE SUCCESS - BREVO API] Sent email to {to_email}")
                return True
        return False
    except Exception as e:
        print(f"[EMAIL SERVICE ERROR - BREVO API] {e}")
        return False


def _send_via_resend_api(api_key: str, from_email: str, to_email: str, subject: str, html_body: str) -> bool:
    """Sends email via Resend REST API over HTTPS (Port 443) - Bypasses cloud SMTP blocks."""
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "from": from_email if "@" in from_email else "RoomRentFinder <onboarding@resend.dev>",
        "to": [to_email],
        "subject": subject,
        "html": html_body
    }
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=12) as response:
            if response.status in (200, 201):
                print(f"[EMAIL SERVICE SUCCESS - RESEND API] Sent email to {to_email}")
                return True
        return False
    except Exception as e:
        print(f"[EMAIL SERVICE ERROR - RESEND API] {e}")
        return False


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Sends an email using configured HTTPS APIs (Brevo / Resend) or standard SMTP.
    Cloud providers (Render/Railway free tier) block outbound SMTP ports (587/465).
    HTTPS APIs use port 443 which is never blocked.
    """
    # Dynamic env reload
    brevo_api_key = os.getenv("BREVO_API_KEY", "").strip()
    resend_api_key = os.getenv("RESEND_API_KEY", "").strip()
    smtp_server = os.getenv("SMTP_SERVER", "").strip()
    raw_port = os.getenv("SMTP_PORT", "587").strip()
    smtp_port = int(raw_port) if raw_port.isdigit() else 587
    smtp_username = os.getenv("SMTP_USERNAME", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").replace(" ", "").strip()
    smtp_from_email = os.getenv("SMTP_FROM_EMAIL", smtp_username or "no-reply@roomrentfinder.com").strip()

    # Priority 1: Brevo HTTPS API (Port 443 - 300 free emails/day to any inbox)
    if brevo_api_key:
        from_addr = smtp_username if smtp_username else "jillasanjay16@gmail.com"
        if _send_via_brevo_api(brevo_api_key, from_addr, to_email, subject, html_body):
            return True

    # Priority 2: Resend HTTPS API (Port 443 - Generous free tier)
    if resend_api_key:
        if _send_via_resend_api(resend_api_key, smtp_from_email, to_email, subject, html_body):
            return True

    # Priority 3: SMTP (Works locally or on non-restricted hosting)
    if smtp_server and smtp_username and smtp_password:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_from_email
        msg["To"] = to_email
        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)

        try:
            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_server, 465, timeout=8) as server:
                    server.login(smtp_username, smtp_password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(smtp_server, smtp_port, timeout=8) as server:
                    server.starttls()
                    server.login(smtp_username, smtp_password)
                    server.send_message(msg)
            print(f"[EMAIL SERVICE SUCCESS - SMTP] Sent email to {to_email}")
            return True
        except Exception as first_err:
            print(f"[EMAIL SERVICE WARNING] SMTP port {smtp_port} failed: {first_err}")

            # Fallback port
            fallback_port = 465 if smtp_port != 465 else 587
            try:
                if fallback_port == 465:
                    with smtplib.SMTP_SSL(smtp_server, 465, timeout=8) as server:
                        server.login(smtp_username, smtp_password)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(smtp_server, 587, timeout=8) as server:
                        server.starttls()
                        server.login(smtp_username, smtp_password)
                        server.send_message(msg)
                print(f"[EMAIL SERVICE SUCCESS - SMTP FALLBACK] Sent email to {to_email} via port {fallback_port}")
                return True
            except Exception as second_err:
                print(f"[EMAIL SERVICE BLOCKED] Standard SMTP failed ({second_err}). Cloud firewalls (Render/Railway free tier) block ports 587/465. Use BREVO_API_KEY or RESEND_API_KEY over HTTPS port 443.")

    # Always log the link to stdout so administrators/developers can retrieve it from Render logs
    print("\n" + "=" * 60)
    print(" [ACTION LINK (RENDER SERVER LOGS)]")
    print(f" To: {to_email}")
    print(f" Subject: {subject}")
    print("-" * 60)
    for line in html_body.splitlines():
        if "href=" in line or "http" in line:
            print(f" Link: {line.strip()}")
    print("=" * 60 + "\n")
    return False


def send_password_reset_email(to_email: str, name: str, reset_token: str) -> bool:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"
    subject = "Reset Your RoomRentFinder Password"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">RoomRentFinder</h2>
        <p>Hello <strong>{name}</strong>,</p>
        <p>We received a request to reset your account password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Reset Password
            </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">This link is valid for <strong>15 minutes</strong>. If you did not request this, please ignore this email.</p>
        <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">Or copy and paste this link in your browser: {reset_url}</p>
    </div>
    """
    return send_email(to_email, subject, body)


def send_verification_email(to_email: str, name: str, verification_token: str) -> bool:
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    verify_url = f"{frontend_url}/verify-email?token={verification_token}"
    subject = "Verify Your RoomRentFinder Account"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">RoomRentFinder</h2>
        <p>Welcome to RoomRentFinder, <strong>{name}</strong>!</p>
        <p>Please verify your email address to confirm your account:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{verify_url}" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Verify Email Address
            </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">This link will expire in 24 hours.</p>
        <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">Link: {verify_url}</p>
    </div>
    """
    return send_email(to_email, subject, body)


def send_enquiry_received_email(
    owner_email: str,
    owner_name: str,
    room_title: str,
    student_name: str,
    student_phone: str,
    message: str
) -> bool:
    subject = f"New Enquiry Received for {room_title}"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">RoomRentFinder</h2>
        <p>Hello <strong>{owner_name}</strong>,</p>
        <p>You have received a new rental enquiry for your listing: <strong>{room_title}</strong>.</p>
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 4px 0;"><strong>Student:</strong> {student_name}</p>
            <p style="margin: 4px 0;"><strong>Phone:</strong> {student_phone}</p>
            <p style="margin: 4px 0;"><strong>Message:</strong></p>
            <p style="margin: 8px 0; color: #334155; font-style: italic;">"{message}"</p>
        </div>
        <p>Log in to your Owner Dashboard to respond or update this enquiry.</p>
    </div>
    """
    return send_email(owner_email, subject, body)


def send_enquiry_status_updated_email(
    student_email: str,
    student_name: str,
    room_title: str,
    status: str
) -> bool:
    subject = f"Enquiry Update: {room_title} ({status})"
    color = "#16a34a" if status == "Accepted" else "#dc2626"
    body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">RoomRentFinder</h2>
        <p>Hello <strong>{student_name}</strong>,</p>
        <p>The owner of <strong>{room_title}</strong> has updated the status of your enquiry to:</p>
        <p style="font-size: 18px; font-weight: bold; color: {color}; margin: 15px 0;">{status}</p>
        <p>Please log in to your Student Dashboard to see the latest updates.</p>
    </div>
    """
    return send_email(student_email, subject, body)

