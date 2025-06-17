import smtplib
from email.mime.text import MIMEText

def send_email(subject, body, receiver_email):
    smtp_host = "mail.tridemobility.com"  # Replace with actual SMTP host
    smtp_port = 587  # Usually 587 or 465
    username = "admin@tridemobility.com"
    password = "Tride$2025"  # Or App Password

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = username
    msg["To"] = receiver_email

    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()  # Use .starttls() only if you're on port 587
        server.login(username, password)
        server.sendmail(msg["From"], [msg["To"]], msg.as_string())
        server.quit()
        print("Email sent successfully.")
    except Exception as e:
        print("Unexpected error:", str(e))
