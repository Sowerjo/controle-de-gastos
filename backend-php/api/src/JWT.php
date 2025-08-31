<?php
namespace Api;

class JWT {
    public static function sign($payload, $ttlSeconds) {
        $header = ['alg' => 'HS256','typ' => 'JWT'];
        $payload['exp'] = time() + $ttlSeconds;
        $segments = [self::b64(json_encode($header)), self::b64(json_encode($payload))];
        $signing = implode('.', $segments);
        $signature = hash_hmac('sha256', $signing, env('JWT_SECRET', 'secret'), true);
        $segments[] = self::b64($signature);
        return implode('.', $segments);
    }
    public static function verify($jwt) {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) return null;
        [$h, $p, $s] = $parts;
        $signing = $h.'.'.$p;
        $expected = self::b64(hash_hmac('sha256', $signing, env('JWT_SECRET', 'secret'), true));
        if (!hash_equals($expected, $s)) return null;
        $payload = json_decode(self::ub64($p), true);
        if (($payload['exp'] ?? 0) < time()) return null;
        return $payload;
    }
    private static function b64($data) { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
    private static function ub64($data) { return base64_decode(strtr($data, '-_', '+/')); }
}
