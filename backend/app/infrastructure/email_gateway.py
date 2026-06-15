"""Email gateway using Azure Communication Services (dev/prod).

Falls back to console logging when the connection string is not configured,
so development works without Azure credentials.
"""

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

try:
    from azure.communication.email import EmailClient
    _AZURE_AVAILABLE = True
except ImportError:
    _AZURE_AVAILABLE = False


@dataclass
class EmailMessage:
    to: str
    subject: str
    html_body: str
    plain_body: str


# ── Shared HTML base layout ───────────────────────────────────────────────────

def _base_template(content_html: str, preview_text: str = "") -> str:
    """Wraps content in a full responsive HTML email shell."""
    return f"""<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>CodeCompass</title>
  <!--[if !mso]><!-->
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <!--<![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body {{ margin:0; padding:0; background-color:#f5f5f5; font-family:'Inter',Arial,sans-serif; -webkit-font-smoothing:antialiased; }}
    table {{ border-spacing:0; border-collapse:collapse; }}
    td {{ padding:0; }}
    img {{ border:0; display:block; }}
    .email-wrapper {{ background-color:#f5f5f5; width:100%; }}
    .email-card {{ background:#ffffff; border-radius:16px; max-width:560px; margin:32px auto; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.07); }}
    .header {{ background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%); padding:36px 40px 32px; text-align:center; }}
    .logo-icon {{ width:52px; height:52px; background:rgba(255,255,255,0.15); border-radius:14px; display:inline-flex; align-items:center; justify-content:center; font-size:28px; margin-bottom:12px; }}
    .logo-name {{ color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.5px; margin:0; }}
    .logo-tagline {{ color:rgba(255,255,255,0.7); font-size:13px; margin:4px 0 0; }}
    .body {{ padding:36px 40px; }}
    .footer {{ background:#f9fafb; border-top:1px solid #f0f0f0; padding:24px 40px; text-align:center; }}
    .footer p {{ color:#9ca3af; font-size:12px; line-height:1.6; margin:0; }}
    .footer a {{ color:#6b7280; text-decoration:underline; }}
    @media only screen and (max-width:600px) {{
      .email-card {{ margin:0; border-radius:0; }}
      .header, .body, .footer {{ padding:28px 24px; }}
    }}
  </style>
</head>
<body>
  {f'<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">{preview_text}&nbsp;‌&nbsp;‌&nbsp;</div>' if preview_text else ''}
  <div class="email-wrapper">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr><td>
        <div class="email-card">
          <!-- Header -->
          <div class="header">
            <div class="logo-icon">🧭</div>
            <p class="logo-name">CodeCompass</p>
            <p class="logo-tagline">Navegue seu código com IA</p>
          </div>
          <!-- Body -->
          <div class="body">
            {content_html}
          </div>
          <!-- Footer -->
          <div class="footer">
            <p>
              Este e-mail foi enviado automaticamente. Por favor, não responda.<br/>
              &copy; 2026 CodeCompass &mdash; Todos os direitos reservados.
            </p>
            <p style="margin-top:8px;">
              <a href="#">Política de Privacidade</a> &nbsp;&middot;&nbsp;
              <a href="#">Termos de Uso</a>
            </p>
          </div>
        </div>
      </td></tr>
    </table>
  </div>
</body>
</html>"""


# ── Verification email template ───────────────────────────────────────────────

def _verification_html(verify_url: str) -> str:
    content = f"""
    <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px;">
      Confirme seu e-mail
    </h1>
    <p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
      Obrigado por se cadastrar no <strong style="color:#4f46e5;">CodeCompass</strong>!<br/>
      Clique no botão abaixo para verificar seu endereço de e-mail e ativar sua conta.
    </p>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;">
      <tr>
        <td align="center">
          <a href="{verify_url}"
             style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);
                    color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;
                    padding:14px 36px;border-radius:10px;letter-spacing:0.2px;
                    box-shadow:0 4px 12px rgba(79,70,229,0.35);">
            ✉&nbsp;&nbsp;Verificar e-mail
          </a>
        </td>
      </tr>
    </table>

    <!-- Info box -->
    <div style="background:#f0f0ff;border:1px solid #c7d2fe;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="width:20px;padding-top:2px;vertical-align:top;">
            <span style="font-size:16px;">ℹ️</span>
          </td>
          <td style="padding-left:10px;">
            <p style="font-size:13px;color:#4338ca;margin:0;line-height:1.6;">
              Este link expira em <strong>24 horas</strong>. Se você não criou uma conta no CodeCompass, pode ignorar este e-mail com segurança.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Fallback link -->
    <p style="font-size:12px;color:#9ca3af;line-height:1.6;word-break:break-all;">
      Se o botão acima não funcionar, copie e cole este link no seu navegador:<br/>
      <a href="{verify_url}" style="color:#6366f1;text-decoration:underline;">{verify_url}</a>
    </p>

    <!-- Security notice -->
    <div style="border-top:1px solid #f3f4f6;margin-top:24px;padding-top:20px;">
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="width:18px;padding-top:2px;vertical-align:top;">
            <span style="font-size:14px;">🔒</span>
          </td>
          <td style="padding-left:8px;">
            <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.5;">
              Nunca pediremos sua senha por e-mail. Se você não reconhece este e-mail, entre em contato com nosso suporte.
            </p>
          </td>
        </tr>
      </table>
    </div>
    """
    return _base_template(content, preview_text="Confirme seu endereço de e-mail para ativar sua conta no CodeCompass.")


# ── Password reset email template ─────────────────────────────────────────────

def _reset_code_html(code: str) -> str:
    # Format code as 3 + 3 for readability: "123 456"
    code_display = f"{code[:3]}&thinsp;{code[3:]}"
    content = f"""
    <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px;">
      Redefinição de senha
    </h1>
    <p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
      Recebemos uma solicitação para redefinir a senha da sua conta no <strong style="color:#4f46e5;">CodeCompass</strong>.<br/>
      Use o código abaixo para continuar.
    </p>

    <!-- Code box -->
    <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:14px;
                padding:28px 24px;text-align:center;margin:0 0 28px;">
      <p style="color:rgba(199,210,254,0.8);font-size:12px;font-weight:600;
                letter-spacing:3px;text-transform:uppercase;margin:0 0 12px;">
        Código de verificação
      </p>
      <div style="display:inline-block;background:rgba(255,255,255,0.08);border:1px solid rgba(199,210,254,0.2);
                  border-radius:10px;padding:16px 32px;">
        <span style="font-family:'Courier New',Courier,monospace;font-size:42px;font-weight:700;
                     letter-spacing:10px;color:#e0e7ff;line-height:1;">
          {code_display}
        </span>
      </div>
      <p style="color:rgba(199,210,254,0.6);font-size:12px;margin:14px 0 0;">
        ⏱&nbsp; Expira em <strong style="color:#a5b4fc;">15 minutos</strong>
      </p>
    </div>

    <!-- Steps -->
    <div style="margin-bottom:28px;">
      <p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">
        Como usar:
      </p>
      <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
        <tr>
          <td style="padding:6px 0;">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="width:24px;height:24px;background:#ede9fe;border-radius:50%;text-align:center;vertical-align:middle;">
                  <span style="font-size:11px;font-weight:700;color:#7c3aed;">1</span>
                </td>
                <td style="padding-left:10px;font-size:13px;color:#6b7280;">Volte para a tela de redefinição de senha</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="width:24px;height:24px;background:#ede9fe;border-radius:50%;text-align:center;vertical-align:middle;">
                  <span style="font-size:11px;font-weight:700;color:#7c3aed;">2</span>
                </td>
                <td style="padding-left:10px;font-size:13px;color:#6b7280;">Digite o código de 6 dígitos acima</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;">
            <table cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="width:24px;height:24px;background:#ede9fe;border-radius:50%;text-align:center;vertical-align:middle;">
                  <span style="font-size:11px;font-weight:700;color:#7c3aed;">3</span>
                </td>
                <td style="padding-left:10px;font-size:13px;color:#6b7280;">Crie uma nova senha segura e confirme</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- Warning box -->
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="width:20px;padding-top:2px;vertical-align:top;">
            <span style="font-size:15px;">⚠️</span>
          </td>
          <td style="padding-left:10px;">
            <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6;">
              <strong>Não solicitou esta redefinição?</strong><br/>
              Ignore este e-mail. Sua senha permanece inalterada e nenhuma ação é necessária.
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Security notice -->
    <div style="border-top:1px solid #f3f4f6;padding-top:20px;">
      <table cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="width:18px;padding-top:2px;vertical-align:top;">
            <span style="font-size:14px;">🔒</span>
          </td>
          <td style="padding-left:8px;">
            <p style="font-size:12px;color:#9ca3af;margin:0;line-height:1.5;">
              O CodeCompass nunca pedirá este código por telefone ou chat. Não compartilhe com ninguém.
            </p>
          </td>
        </tr>
      </table>
    </div>
    """
    return _base_template(content, preview_text=f"Seu código de redefinição de senha é {code}. Expira em 15 minutos.")


# ── Gateway class ─────────────────────────────────────────────────────────────

class EmailGateway:
    """
    Sends transactional emails via Azure Communication Services.

    If AZURE_EMAIL_CONNECTION_STRING is not set (or the SDK is not installed),
    all emails are printed to the application log — useful for local dev.
    """

    def __init__(self, connection_string: str | None, from_address: str) -> None:
        self._conn_str = connection_string
        self._from = from_address
        self._enabled = bool(connection_string and _AZURE_AVAILABLE)
        if not self._enabled:
            logger.warning(
                "EmailGateway: Azure not configured — emails will be logged to console."
            )

    def send(self, msg: EmailMessage) -> None:
        if self._enabled:
            self._send_azure(msg)
        else:
            self._log_email(msg)

    def _send_azure(self, msg: EmailMessage) -> None:
        try:
            client = EmailClient.from_connection_string(self._conn_str)
            message = {
                "senderAddress": self._from,
                "recipients": {"to": [{"address": msg.to}]},
                "content": {
                    "subject": msg.subject,
                    "plainText": msg.plain_body,
                    "html": msg.html_body,
                },
            }
            poller = client.begin_send(message)
            result = poller.result()
            logger.info("Email sent to %s — id=%s", msg.to, result.get("id"))
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", msg.to, exc)
            raise

    def _log_email(self, msg: EmailMessage) -> None:
        logger.info(
            "\n╔══════════════════ [EMAIL DEV] ══════════════════╗\n"
            "  To:      %s\n"
            "  Subject: %s\n"
            "──────────────────────────────────────────────────\n"
            "%s\n"
            "╚═════════════════════════════════════════════════╝",
            msg.to,
            msg.subject,
            msg.plain_body,
        )

    # ── Public template helpers ───────────────────────────────────────────────

    def send_verification(self, to: str, token: str, base_url: str) -> None:
        """Send account email-verification link."""
        verify_url = f"{base_url}/verify-email?token={token}"
        self.send(EmailMessage(
            to=to,
            subject="CodeCompass — Confirme seu e-mail ✉️",
            html_body=_verification_html(verify_url),
            plain_body=(
                "CodeCompass — Confirme seu e-mail\n"
                "══════════════════════════════════\n\n"
                "Obrigado por se cadastrar!\n\n"
                "Para ativar sua conta, acesse o link abaixo:\n"
                f"{verify_url}\n\n"
                "⏱  O link expira em 24 horas.\n\n"
                "Se você não se cadastrou no CodeCompass, ignore este e-mail.\n\n"
                "──\nEquipe CodeCompass"
            ),
        ))

    def send_reset_code(self, to: str, code: str) -> None:
        """Send 6-digit password-reset code."""
        self.send(EmailMessage(
            to=to,
            subject="CodeCompass — Código de redefinição de senha 🔑",
            html_body=_reset_code_html(code),
            plain_body=(
                "CodeCompass — Redefinição de senha\n"
                "════════════════════════════════════\n\n"
                "Seu código de verificação:\n\n"
                f"    {code[:3]} {code[3:]}\n\n"
                "⏱  Este código expira em 15 minutos.\n\n"
                "Não solicitou esta redefinição?\n"
                "Ignore este e-mail. Sua senha permanece inalterada.\n\n"
                "🔒 Nunca compartilhe este código com ninguém.\n\n"
                "──\nEquipe CodeCompass"
            ),
        ))



@dataclass
class EmailMessage:
    to: str
    subject: str
    html_body: str
    plain_body: str


class EmailGateway:
    """
    Sends transactional emails via Azure Communication Services.

    If AZURE_EMAIL_CONNECTION_STRING is not set (or the SDK is not installed),
    all emails are printed to the application log — useful for local dev.
    """

    def __init__(self, connection_string: str | None, from_address: str) -> None:
        self._conn_str = connection_string
        self._from = from_address
        self._enabled = bool(connection_string and _AZURE_AVAILABLE)
        if not self._enabled:
            logger.warning(
                "EmailGateway: Azure not configured — emails will be logged to console."
            )

    def send(self, msg: EmailMessage) -> None:
        if self._enabled:
            self._send_azure(msg)
        else:
            self._log_email(msg)

    def _send_azure(self, msg: EmailMessage) -> None:
        try:
            client = EmailClient.from_connection_string(self._conn_str)
            message = {
                "senderAddress": self._from,
                "recipients": {"to": [{"address": msg.to}]},
                "content": {
                    "subject": msg.subject,
                    "plainText": msg.plain_body,
                    "html": msg.html_body,
                },
            }
            poller = client.begin_send(message)
            result = poller.result()
            logger.info("Email sent to %s — id=%s", msg.to, result.get("id"))
        except Exception as exc:
            logger.error("Failed to send email to %s: %s", msg.to, exc)
            raise

    def _log_email(self, msg: EmailMessage) -> None:
        logger.info(
            "\n──────── [EMAIL DEV] ────────\n"
            "To: %s\nSubject: %s\n\n%s\n"
            "─────────────────────────────",
            msg.to,
            msg.subject,
            msg.plain_body,
        )

    # ── Template helpers ──────────────────────────────────────────────────────

    def send_verification(self, to: str, token: str, base_url: str) -> None:
        verify_url = f"{base_url}/verify-email?token={token}"
        self.send(EmailMessage(
            to=to,
            subject="CodeCompass — Confirme seu e-mail",
            html_body=f"""
<div style="font-family:sans-serif;max-width:500px;margin:auto">
  <h2 style="color:#4f46e5">🧭 CodeCompass</h2>
  <p>Olá! Clique no botão abaixo para confirmar seu endereço de e-mail.</p>
  <a href="{verify_url}"
     style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;
            border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
    Confirmar e-mail
  </a>
  <p style="color:#6b7280;font-size:13px">
    O link expira em 24 horas. Se você não se cadastrou no CodeCompass, ignore este e-mail.
  </p>
  <p style="color:#9ca3af;font-size:12px">
    Ou copie este link: {verify_url}
  </p>
</div>""",
            plain_body=(
                f"CodeCompass — Confirme seu e-mail\n\n"
                f"Acesse o link para confirmar: {verify_url}\n\n"
                f"O link expira em 24 horas."
            ),
        ))

    def send_reset_code(self, to: str, code: str) -> None:
        self.send(EmailMessage(
            to=to,
            subject="CodeCompass — Código de recuperação de senha",
            html_body=f"""
<div style="font-family:sans-serif;max-width:500px;margin:auto">
  <h2 style="color:#4f46e5">🧭 CodeCompass</h2>
  <p>Use o código abaixo para redefinir sua senha. Ele expira em <strong>15 minutos</strong>.</p>
  <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
    <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1f2937;font-family:monospace">
      {code}
    </span>
  </div>
  <p style="color:#6b7280;font-size:13px">
    Se você não solicitou isso, ignore este e-mail. Sua senha não será alterada.
  </p>
</div>""",
            plain_body=(
                f"CodeCompass — Código de recuperação\n\n"
                f"Seu código: {code}\n\n"
                f"Expira em 15 minutos."
            ),
        ))
