<?php
namespace Api;

class Middleware {
    public static function requireAuth() {
        // Try multiple places for the Authorization header
        $hdr = $_SERVER['HTTP_AUTHORIZATION']
            ?? ($_SERVER['Authorization'] ?? '')
            ?? '';
        if (!$hdr && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            foreach ($headers as $k => $v) {
                if (strtolower($k) === 'authorization') { $hdr = $v; break; }
            }
        }
        // Optional debug fallback: allow token via ?access_token= when header missing
        if (!$hdr && isset($_GET['access_token'])) {
            $hdr = 'Bearer ' . $_GET['access_token'];
        }
        if (stripos($hdr, 'Bearer ') !== 0) json(['error'=>['message'=>'Unauthorized']],401);
        $token = substr($hdr, 7);
        $payload = JWT::verify($token);
        if (!$payload) json(['error'=>['message'=>'Unauthorized']],401);
        $GLOBALS['auth_user_id'] = $payload['sub'] ?? null;
        if (!$GLOBALS['auth_user_id']) json(['error'=>['message'=>'Unauthorized']],401);
    }
}
