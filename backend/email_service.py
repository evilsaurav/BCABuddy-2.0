from __future__ import annotations

from typing import Optional

from config import get_settings


def send_password_reset_email(*, to_email: str, reset_link: str, username: str) -> bool:
    """Send password reset email via Azure Communication Services Email.

    Returns True if mail request is accepted; False when ACS is not configured.
    Raises runtime errors for provider failures.
    """
    settings = get_settings()
    connection_string = settings.azure_email_connection_string
    sender = settings.azure_email_sender

    if not connection_string or not sender:
        return False

    try:
        from azure.communication.email import EmailClient
    except Exception as exc:
        raise RuntimeError(
            "Azure email SDK missing. Install azure-communication-email."
        ) from exc

    email_client = EmailClient.from_connection_string(connection_string)

    plain_text = (
        f"Hi {username},\n\n"
        "We received a password reset request for your BCABuddy account.\n"
        "Use the link below to reset your password (valid for 15 minutes):\n"
        f"{reset_link}\n\n"
        "If you did not request this, you can safely ignore this email."
    )
    html_body = f"""
    <html>
      <body style=\"font-family: Arial, sans-serif; color: #111827;\">
        <h2 style=\"margin-bottom: 8px;\">Reset your BCABuddy password</h2>
        <p>Hi <strong>{username}</strong>,</p>
        <p>We received a password reset request for your account.</p>
        <p>
          <a href=\"{reset_link}\" style=\"display:inline-block;padding:10px 16px;background:#03dac6;color:#0a0d17;text-decoration:none;border-radius:8px;font-weight:700;\">Reset Password</a>
        </p>
        <p style=\"font-size:13px;color:#6b7280;\">This link expires in 15 minutes.</p>
        <p style=\"font-size:13px;color:#6b7280;\">If you did not request this, you can ignore this email.</p>
      </body>
    </html>
    """

    message = {
        "content": {
            "subject": "BCABuddy Password Reset",
            "plainText": plain_text,
            "html": html_body,
        },
        "recipients": {
            "to": [
                {
                    "address": to_email,
                }
            ]
        },
        "senderAddress": sender,
    }

    poller = email_client.begin_send(message)
    result = poller.result()
    status = str(getattr(result, "status", "")).lower()

    if status and status not in {"queued", "outfordelivery", "sent", "succeeded"}:
        raise RuntimeError(f"Azure email send failed with status: {status}")

    return True
