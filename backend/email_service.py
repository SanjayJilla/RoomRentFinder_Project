import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME or "no-reply@roomrentfinder.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """
    Sends an email using configured SMTP credentials.
    If SMTP credentials are not configured, gracefully logs the email to the console.
    """
    if not SMTP_SERVER or not SMTP_USERNAME or not SMTP_PASSWORD:
        print("\n" + "=" * 60)
        print(" [EMAIL SERVICE (DEV MODE)] No SMTP credentials in .env")
        print(f" To: {to_email}")
        print(f" Subject: {subject}")
        print("-" * 60)
        # Extract and print link if present
        for line in html_body.splitlines():
            if "href=" in line or "http" in line:
                print(f" Preview link/info: {line.strip()}")
        print("=" * 60 + "\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM_EMAIL
        msg["To"] = to_email

        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

        return True
    except Exception as e:
        print(f"[EMAIL SERVICE ERROR] Failed to send email to {to_email}: {e}")
        return False


def send_password_reset_email(to_email: str, name: str, reset_token: str) -> bool:
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
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
    verify_url = f"{FRONTEND_URL}/verify-email?token={verification_token}"
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

