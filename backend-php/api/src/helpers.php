<?php
namespace Api;

// Polyfill for PHP < 8.0
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle) {
        return strpos($haystack, $needle) === 0;
    }
}
if (!function_exists('str_ends_with')) {
    function str_ends_with($haystack, $needle) {
        return substr($haystack, -strlen($needle)) === $needle;
    }
}

function env($key, $default = null) {
    static $cache = null;
    if ($cache === null) {
        $cache = [];
        // Try multiple locations: dist/.env (../../.env), api/.env (../.env), and optional .env.local overrides
        $candidates = [
            __DIR__ . '/../../.env',          // dist/.env (when packed)
            __DIR__ . '/../../.env.local',    // optional local override
            __DIR__ . '/../.env',             // api/.env (dev convenience)
            __DIR__ . '/../.env.local',
        ];
        foreach ($candidates as $envFile) {
            if (!file_exists($envFile)) continue;
            foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                $t = trim($line);
                if ($t === '' || str_starts_with($t, '#')) continue;
                $parts = explode('=', $line, 2);
                if (count($parts) < 2) continue;
                $k = trim($parts[0]);
                $v = trim($parts[1]);
                // Strip quotes
                if ((str_starts_with($v, '"') && str_ends_with($v, '"')) || (str_starts_with($v, "'") && str_ends_with($v, "'"))) {
                    $v = substr($v, 1, -1);
                }
                $cache[$k] = $v;
            }
        }
    }
    return $cache[$key] ?? $default;
}

function json($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function now() {
    return (new \DateTime('now', new \DateTimeZone(env('TZ', 'UTC'))))->format('Y-m-d H:i:s');
}
