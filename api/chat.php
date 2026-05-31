<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

define('DATA_DIR',      __DIR__ . '/chat_data');
define('MSGS_FILE',     DATA_DIR . '/messages.json');
define('SUBS_FILE',     DATA_DIR . '/subscribers.json');
define('TYPING_FILE',   DATA_DIR . '/typing.json');
define('ONLINE_FILE',   DATA_DIR . '/online.json');
define('MAX_MESSAGES',  200);

$autoload = __DIR__ . '/../vendor/autoload.php';
$mailerOk = file_exists($autoload);
if ($mailerOk) {
    require $autoload;
    use PHPMailer\PHPMailer\PHPMailer;
    use PHPMailer\PHPMailer\Exception;
}

define('SMTP_HOST',      'smtp.gmail.com');
define('SMTP_PORT',      587);
define('SMTP_USER',      'arsec4real@gmail.com');
define('SMTP_PASS',      'wypp dsnq qjcn afxd');
define('MAIL_FROM',      'arsec4real@gmail.com');
define('MAIL_FROM_NAME', 'Lal Salam Comrade');
define('SITE_URL',       '');

if (!is_dir(DATA_DIR)) mkdir(DATA_DIR, 0755, true);

function readJson(string $file): array {
    if (!file_exists($file)) return [];
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : [];
}
function writeJson(string $file, array $data): void {
    file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX);
}
function now(): int { return (int)(microtime(true) * 1000); }

$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? ($_GET['action'] ?? '');

switch ($action) {

    case 'send': {
        $uid      = preg_replace('/[^a-zA-Z0-9_-]/', '', $body['uid']      ?? '');
        $username = htmlspecialchars(trim($body['username'] ?? ''), ENT_QUOTES);
        $text     = trim($body['text'] ?? '');

        if (!$uid || !$username || $text === '') {
            echo json_encode(['ok'=>false,'msg'=>'Missing fields']); exit;
        }
        if (mb_strlen($text) > 1000) {
            echo json_encode(['ok'=>false,'msg'=>'Message too long']); exit;
        }

        $rawReply = $body['replyTo'] ?? null;
        $replyTo  = null;
        if (is_array($rawReply) && isset($rawReply['id'])) {
            $replyTo = [
                'id'       => preg_replace('/[^a-zA-Z0-9_.-]/', '', $rawReply['id'] ?? ''),
                'username' => htmlspecialchars(trim($rawReply['username'] ?? ''), ENT_QUOTES),
                'text'     => mb_substr(trim($rawReply['text'] ?? ''), 0, 200),
            ];
        }

        $msgs   = readJson(MSGS_FILE);
        $msg    = ['id'=>uniqid('m',true), 'uid'=>$uid, 'username'=>$username,
                   'text'=>$text, 'ts'=>now(), 'replyTo'=>$replyTo, 'reactions'=>(object)[]];
        $msgs[] = $msg;

        if (count($msgs) > MAX_MESSAGES) {
            $msgs = array_slice($msgs, -MAX_MESSAGES);
        }
        writeJson(MSGS_FILE, $msgs);

        $subs = readJson(SUBS_FILE);
        foreach ($subs as $sub) {
            if (($sub['uid'] ?? '') !== $uid) {
                sendNotifEmail($sub['email'], $sub['username'], $username, $text);
            }
        }

        echo json_encode(['ok'=>true, 'msg'=>$msg]);
        break;
    }

    case 'poll': {
        $since  = (int)($body['since'] ?? $_GET['since'] ?? 0);
        $msgs   = readJson(MSGS_FILE);
        $new    = array_values(array_filter($msgs, fn($m) => $m['ts'] > $since));
        $typing = readJson(TYPING_FILE);
        $typing = array_filter($typing, fn($t) => now() - $t['ts'] < 4000);
        $typers = array_column(array_values($typing), 'username');
        echo json_encode(['ok'=>true, 'messages'=>$new, 'typing'=>$typers, 'serverTime'=>now()]);
        break;
    }

    case 'notify': {
        $email    = strtolower(trim($body['email']    ?? ''));
        $username = trim($body['username'] ?? '');
        $uid      = preg_replace('/[^a-zA-Z0-9_-]/', '', $body['uid'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['ok'=>false,'msg'=>'Invalid email']); exit;
        }

        $subs = readJson(SUBS_FILE);
        $subs = array_values(array_filter($subs, fn($s) => $s['email'] !== $email));
        $subs[] = ['email'=>$email, 'username'=>$username, 'uid'=>$uid, 'ts'=>now()];
        writeJson(SUBS_FILE, $subs);

        echo json_encode(['ok'=>true]);
        break;
    }

    case 'unnotify': {
        $email = strtolower(trim($body['email'] ?? ''));
        $subs  = readJson(SUBS_FILE);
        $subs  = array_values(array_filter($subs, fn($s) => $s['email'] !== $email));
        writeJson(SUBS_FILE, $subs);
        echo json_encode(['ok'=>true]);
        break;
    }

    case 'typing': {
        $uid      = preg_replace('/[^a-zA-Z0-9_-]/', '', $body['uid'] ?? '');
        $username = htmlspecialchars(trim($body['username'] ?? ''), ENT_QUOTES);
        if (!$uid) { echo json_encode(['ok'=>false]); exit; }

        $typing = readJson(TYPING_FILE);
        $typing = array_filter($typing, fn($t) => now() - $t['ts'] < 4000);
        $typing[$uid] = ['username'=>$username, 'ts'=>now()];
        writeJson(TYPING_FILE, $typing);

        echo json_encode(['ok'=>true]);
        break;
    }

    case 'online': {
        $uid      = preg_replace('/[^a-zA-Z0-9_-]/', '', $body['uid'] ?? '');
        $username = htmlspecialchars(trim($body['username'] ?? ''), ENT_QUOTES);
        if (!$uid) { echo json_encode(['ok'=>false]); exit; }

        $online = readJson(ONLINE_FILE);
        $online = array_filter($online, fn($o) => now() - $o['ts'] < 35000);
        $online[$uid] = ['username'=>$username, 'ts'=>now()];
        writeJson(ONLINE_FILE, array_values($online));

        echo json_encode(['ok'=>true, 'count'=>count($online)]);
        break;
    }

    case 'offline': {
        $uid    = preg_replace('/[^a-zA-Z0-9_-]/', '', $body['uid'] ?? '');
        $online = readJson(ONLINE_FILE);
        unset($online[$uid]);
        $online = array_filter($online, fn($o) => now() - $o['ts'] < 35000);
        writeJson(ONLINE_FILE, array_values($online));
        echo json_encode(['ok'=>true]);
        break;
    }

    case 'online_count': {
        $online = readJson(ONLINE_FILE);
        $online = array_filter($online, fn($o) => now() - $o['ts'] < 35000);
        $typing = readJson(TYPING_FILE);
        $typing = array_filter($typing, fn($t) => now() - $t['ts'] < 4000);
        $typers = array_column(array_values($typing), 'username');
        $users  = array_map(fn($uid,$o)=>['uid'=>$uid,'username'=>$o['username']], array_keys($online), array_values($online));
        echo json_encode(['ok'=>true, 'count'=>count($online), 'typing'=>$typers, 'users'=>array_values($users)]);
        break;
    }

    case 'react': {
        $msgId = preg_replace('/[^a-zA-Z0-9._-]/', '', $body['msgId'] ?? '');
        $emoji = mb_substr(trim($body['emoji'] ?? ''), 0, 8);
        $uid   = preg_replace('/[^a-zA-Z0-9_-]/', '', $body['uid'] ?? '');
        if (!$msgId || !$emoji || !$uid) { echo json_encode(['ok'=>false,'msg'=>'Bad params']); break; }

        $msgs = readJson(MSGS_FILE);
        $idx  = array_search($msgId, array_column($msgs, 'id'));
        if ($idx === false) { echo json_encode(['ok'=>false,'msg'=>'Not found']); break; }

        $reactions = (array)($msgs[$idx]['reactions'] ?? []);
        $arr = $reactions[$emoji] ?? [];
        $pos = array_search($uid, $arr);
        if ($pos === false) $arr[] = $uid; else array_splice($arr, $pos, 1);
        if (empty($arr)) unset($reactions[$emoji]); else $reactions[$emoji] = array_values($arr);
        $msgs[$idx]['reactions'] = $reactions ?: (object)[];
        saveJson(MSGS_FILE, $msgs);
        echo json_encode(['ok'=>true, 'reactions'=>$msgs[$idx]['reactions']]);
        break;
    }

    default:
        echo json_encode(['ok'=>false,'msg'=>'Unknown action']);
}

function sendNotifEmail(string $toEmail, string $toName, string $sender, string $text): void {
    global $mailerOk;
    if (!$mailerOk) return;

    $preview = mb_strlen($text) > 80 ? mb_substr($text, 0, 80) . '…' : $text;
    $previewHtml = htmlspecialchars($preview, ENT_QUOTES);
    $senderHtml  = htmlspecialchars($sender,  ENT_QUOTES);
    $toNameHtml  = htmlspecialchars($toName,  ENT_QUOTES);

    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = SMTP_PORT;
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom(MAIL_FROM, MAIL_FROM_NAME);
        $mail->addAddress($toEmail, $toName);

        $mail->isHTML(true);
        $mail->Subject = "💬 {$sender} sent a message Lal Salam Chat";
        $mail->Body    = <<<HTML
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#08090e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
<tr><td align="center">
<table width="100%" style="max-width:480px;background:#0f1018;border-radius:16px;border:1px solid rgba(245,200,66,.15);overflow:hidden">
<tr><td style="padding:24px 28px 16px;background:linear-gradient(135deg,#1a1e2c,#0f1018);border-bottom:1px solid rgba(245,200,66,.12);text-align:center">
  <div style="font-size:22px;font-weight:900;color:#f5c842">📚 Lal Salam Chat</div>
</td></tr>
<tr><td style="padding:24px 28px">
  <p style="margin:0 0 16px;color:#9ca3af;font-size:14px">Hi {$toNameHtml},</p>
  <div style="background:#1a1e2c;border-left:3px solid #f5c842;border-radius:8px;padding:14px 16px;margin-bottom:20px">
    <div style="font-size:12px;color:#f5c842;font-weight:700;margin-bottom:6px">{$senderHtml}</div>
    <div style="color:#e8e9ef;font-size:15px;line-height:1.5">{$previewHtml}</div>
  </div>
  <a href="SITE_URL" style="display:inline-block;background:linear-gradient(135deg,#f5c842,#e8a500);color:#000;font-weight:700;padding:10px 22px;border-radius:50px;text-decoration:none;font-size:14px">Open Chat →</a>
</td></tr>
<tr><td style="padding:14px 28px;border-top:1px solid rgba(255,255,255,.06);text-align:center">
  <p style="margin:0;font-size:11px;color:#4b5563">Made by Lal Salam Comrade</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>
HTML;
        $mail->AltBody = "{$sender} sent a message: {$preview}\n\nOpen chat: " . SITE_URL;
        $mail->send();
    } catch (\Exception $e) {
        error_log('[Lal Salam Chat] Mail error: ' . $e->getMessage());
    }
}