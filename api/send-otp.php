<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { echo json_encode(['ok'=>false,'msg'=>'Method not allowed']); exit; }

$autoload = __DIR__ . '/../vendor/autoload.php';
if (!file_exists($autoload)) {
  echo json_encode(['ok'=>false,'msg'=>'PHPMailer not installed. Run: composer require phpmailer/phpmailer']);
  exit;
}
require $autoload;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$body  = json_decode(file_get_contents('php://input'), true) ?? [];
$email = trim($body['email'] ?? '');
$otp   = trim($body['otp']   ?? '');
$name  = trim($body['name']  ?? 'Student');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { echo json_encode(['ok'=>false,'msg'=>'Invalid email']); exit; }
if (!preg_match('/^\d{6}$/', $otp))             { echo json_encode(['ok'=>false,'msg'=>'Invalid OTP']);   exit; }

define('SMTP_HOST',     'smtp.gmail.com');
define('SMTP_PORT',     587);
define('SMTP_SECURE',   PHPMailer::ENCRYPTION_STARTTLS);
define('SMTP_USER',     'arsec4real@gmail.com');
define('SMTP_PASS',     'wypp dsnq qjcn afxd');
define('MAIL_FROM',     'arsec4real@gmail.com');
define('MAIL_FROM_NAME','Lal Salam Portal');

$mail = new PHPMailer(true);
try {
  $mail->isSMTP();
  $mail->Host       = SMTP_HOST;
  $mail->SMTPAuth   = true;
  $mail->Username   = SMTP_USER;
  $mail->Password   = SMTP_PASS;
  $mail->SMTPSecure = SMTP_SECURE;
  $mail->Port       = SMTP_PORT;
  $mail->CharSet    = 'UTF-8';

  $mail->setFrom(MAIL_FROM, MAIL_FROM_NAME);
  $mail->addAddress($email, $name);

  $mail->isHTML(true);
  $mail->Subject = 'Your Lal Salam OTP — ' . $otp;

  $digits = implode('', array_map(fn($c) =>
    "<span style='display:inline-block;width:48px;height:56px;line-height:56px;text-align:center;
     background:#1a1e2c;border:2px solid rgba(245,200,66,.35);border-radius:10px;
     font-size:28px;font-weight:700;color:#f5c842;margin:0 4px;font-family:monospace'>$c</span>",
    str_split($otp)
  ));

  $nameHtml = htmlspecialchars($name, ENT_QUOTES);
  $mail->Body = <<<HTML
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#08090e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#0f1018;border-radius:20px;border:1px solid rgba(245,200,66,.15);overflow:hidden">
<tr><td style="padding:28px 36px 20px;background:linear-gradient(135deg,#1a1e2c,#0f1018);border-bottom:1px solid rgba(245,200,66,.12);text-align:center">
  <div style="font-size:26px;font-weight:900;color:#f5c842">📚 Lal Salam</div>
  <div style="font-size:12px;color:#6b7280;margin-top:4px;letter-spacing:1px;text-transform:uppercase">Password Reset</div>
</td></tr>
<tr><td style="padding:32px 36px 24px;color:#e8e9ef">
  <p style="margin:0 0 8px;font-size:16px;font-weight:600">Hi {$nameHtml} 👋</p>
  <p style="margin:0 0 28px;font-size:14px;color:#9ca3af;line-height:1.6">
    Use this 6-digit code to reset your password.<br>
    Expires in <strong style="color:#f5c842">10 minutes</strong>. Do not share it.
  </p>
  <div style="text-align:center;margin:0 0 28px">{$digits}</div>
  <p style="margin:0;font-size:13px;color:#6b7280;text-align:center">If you didn't request this, ignore this email.</p>
</td></tr>
<tr><td style="padding:16px 36px;border-top:1px solid rgba(255,255,255,.06);text-align:center">
  <p style="margin:0;font-size:12px;color:#4b5563">Made with ♥ by Lal Salam Comrade</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>
HTML;
  $mail->AltBody = "Hi {$name},\n\nYour Lal Salam OTP: {$otp}\n\nExpires in 10 minutes.\n\n— Lal Salam";
  $mail->send();
  echo json_encode(['ok'=>true]);
} catch (Exception $e) {
  error_log('[Lal Salam OTP] ' . $mail->ErrorInfo);
  echo json_encode(['ok'=>false,'msg'=>'Email could not be sent. Check SMTP settings.']);
}