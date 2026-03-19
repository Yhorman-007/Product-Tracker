import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

from email.header import Header

# Este servicio gestiona el envío de correos electrónicos transaccionales (ej. recuperación de contraseña)
def send_recovery_email(email_to: str, token: str):
    """
    Sends a password recovery email using Gmail SMTP.
    """
    if not settings.smtp_user or not settings.smtp_password:
        print("WARNING: SMTP credentials not configured. Email not sent.")
        print(f"DEBUG: Token for {email_to} is: {token}")
        return False, "SMTP credentials not configured"

    # Crear el mensaje de correo
    message = MIMEMultipart()
    message["From"] = settings.smtp_user
    message["To"] = email_to
    
    # Strictly ASCII subject for final test
    message["Subject"] = "Password Recovery - Product Tracker"

    # Cuerpo del correo electrónico en formato HTML (Premium Table-Based ASCII)
    reset_link = f"{settings.frontend_url}/reset-password?token={token}"
    body = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="utf-8">
        <title>Recuperar Acceso - Product Tracker</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    <!-- Main Card -->
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
                        <!-- Header / Logo -->
                        <tr>
                            <td align="center" style="padding: 40px 40px 20px 40px;">
                                <div style="font-size: 24px; font-weight: 900; color: #3b82f6; letter-spacing: -1px;">PRODUCT TRACKER</div>
                                <div style="height: 2px; width: 40px; background-color: #3b82f6; margin-top: 10px;"></div>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td align="left" style="padding: 20px 40px 40px 40px;">
                                <h2 style="font-size: 28px; font-weight: 800; color: #0f172a; margin: 0 0 20px 0;">Recuperar Acceso</h2>
                                <p style="font-size: 16px; line-height: 1.6; color: #475569; margin: 0 0 30px 0;">
                                    Hola,<br><br>
                                    Recibimos una solicitud para restablecer tu clave de acceso. Para continuar, haz clic en el boton de abajo de forma segura:
                                </p>
                                <!-- Button -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="center">
                                            <a href="{reset_link}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 18px 36px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Restablecer Clave</a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="font-size: 14px; color: #64748b; margin: 30px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                                    Este enlace es valido por 30 minutos.<br>
                                    Si no solicitaste este cambio, puedes ignorar este mensaje con total seguridad.
                                </p>
                            </td>
                        </tr>
                    </table>
                    <!-- Footer -->
                    <table border="0" cellpadding="0" cellspacing="0" width="600">
                        <tr>
                            <td align="center" style="padding: 30px 40px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                                Este es un correo automatico de PRODUCT TRACKER.<br>
                                Por favor no respondas a esta direccion.<br>
                                &copy; 2026 Product Tracker - Seguridad Fase 1 (ASCII Blindado)
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    # Explicitly use utf-8 for MIMEText but content is ASCII safe
    try:
        message.attach(MIMEText(body, "html", "utf-8"))
    except Exception as e:
        print(f"ERROR: MIMEText attachment failed: {e}")
        return False, "Encoding error in message body"

    try:
        # Conectarse al servidor SMTP de Gmail y enviar el correo
        server = smtplib.SMTP(settings.smtp_server, settings.smtp_port)
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)
        server.quit()
        return True, "Success"
    except smtplib.SMTPAuthenticationError:
        error_msg = "SMTP Authentication Error: Check your Gmail App Password."
        print(f"ERROR: {error_msg}")
        return False, error_msg
    except Exception as e:
        error_msg = f"Fatal Error: {str(e)}"
        print(f"ERROR: {error_msg}")
        return False, error_msg
