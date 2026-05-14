import os
import smtplib
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()


class EmailSendError(RuntimeError):
    pass


def send_email(*, to_email: str, subject: str, body_text: str) -> None:
    """Send a plain-text email via SMTP.

    Configure via env:
      SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM,
      SMTP_USE_TLS (default: true)
    """

    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("SMTP_FROM") or user
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}

    if not host or not from_email:
        raise EmailSendError("SMTP is not configured (SMTP_HOST/SMTP_FROM missing)")

    msg = EmailMessage()
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body_text)

    try:
        with smtplib.SMTP(host=host, port=port, timeout=15) as smtp:
            smtp.ehlo()
            if use_tls:
                smtp.starttls()
                smtp.ehlo()
            if user and password:
                smtp.login(user, password)
            smtp.send_message(msg)
    except Exception as exc:
        raise EmailSendError(str(exc)) from exc


def send_email_safe(*, to_email: str, subject: str, body_text: str) -> None:
    """Best-effort email sender.

    Intended for BackgroundTasks: never raises.
    If SMTP is not configured, prints the email contents to stdout.
    """

    try:
        send_email(to_email=to_email, subject=subject, body_text=body_text)
    except EmailSendError as exc:
        print(f"[email] send skipped/failed: {exc}")
        print(f"[email] to={to_email} subject={subject}\n{body_text}")
