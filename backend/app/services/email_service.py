import os
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


async def send_email(to: str, subject: str, html_body: str):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    from_email = os.getenv("FROM_EMAIL", "noreply@humanoidmaker.com")
    from_name = os.getenv("FROM_NAME", "AlertDrive")

    msg = MIMEMultipart("alternative")
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=smtp_host,
            port=smtp_port,
            username=smtp_user,
            password=smtp_pass,
            start_tls=True,
        )
    except Exception as e:
        print(f"[EmailService] Failed to send email to {to}: {e}")


async def send_verification_email(to: str, name: str, token: str):
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
    link = f"{frontend}/verify-email?token={token}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1e293b;">AlertDrive</h2>
        <p>Hi {name},</p>
        <p>Please verify your email address to get started:</p>
        <a href="{link}" style="display:inline-block;background:#1e293b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0;">Verify Email</a>
        <p style="color:#666;font-size:13px;">If you didn't create an account, ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#999;font-size:12px;">Humanoid Maker &mdash; www.humanoidmaker.com</p>
    </div>
    """
    await send_email(to, "Verify your AlertDrive account", html)


async def send_reset_email(to: str, name: str, token: str):
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000")
    link = f"{frontend}/reset-password?token={token}"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1e293b;">AlertDrive</h2>
        <p>Hi {name},</p>
        <p>You requested a password reset. Click below:</p>
        <a href="{link}" style="display:inline-block;background:#1e293b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0;">Reset Password</a>
        <p style="color:#666;font-size:13px;">This link expires in 1 hour.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#999;font-size:12px;">Humanoid Maker &mdash; www.humanoidmaker.com</p>
    </div>
    """
    await send_email(to, "Reset your AlertDrive password", html)
