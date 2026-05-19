import os
import ssl
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from dotenv import find_dotenv, load_dotenv

# Load `.env` from the project root if present. This is best-effort and will not
# override real environment variables set by the process manager.
load_dotenv(find_dotenv(filename=".env", usecwd=False), override=False)


class EmailSendError(RuntimeError):
    pass


def send_email(*, to_email: str, subject: str, body_text: str) -> None:
    """Send a plain-text email via SMTP.

    Configure via env:
      SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM,
      SMTP_FROM_NAME,
      SMTP_USE_TLS (default: true), SMTP_USE_SSL (default: false),
      SMTP_TIMEOUT (default: 15)
    """

    host = os.getenv("SMTP_HOST", "").strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "").strip() or None
    password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM", "").strip() or None
    from_name = os.getenv("SMTP_FROM_NAME", "").strip() or None
    use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}
    use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() in {"1", "true", "yes"}
    timeout = float(os.getenv("SMTP_TIMEOUT", "15"))

    if not from_email:
        # Some providers use non-email usernames (e.g. "apikey").
        # Only fall back to SMTP_USER if it looks like an email address.
        if user and ("@" in user):
            from_email = user

    if use_ssl and use_tls:
        raise EmailSendError("Invalid SMTP config: SMTP_USE_SSL and SMTP_USE_TLS cannot both be true")

    if not host or not from_email:
        raise EmailSendError("SMTP is not configured (SMTP_HOST/SMTP_FROM missing)")

    msg = EmailMessage()
    msg["From"] = formataddr((from_name, from_email)) if from_name else from_email
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body_text)

    try:
        if use_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host=host, port=port, timeout=timeout, context=context) as smtp:
                smtp.ehlo()
                if user and password:
                    smtp.login(user, password)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(host=host, port=port, timeout=timeout) as smtp:
                smtp.ehlo()
                if use_tls:
                    context = ssl.create_default_context()
                    smtp.starttls(context=context)
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
