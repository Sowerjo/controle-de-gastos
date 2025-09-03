<?php
namespace Api;
use PDO;use PDOException;

class DB {
    public static function conn() : PDO {
        static $pdo = null;
        if ($pdo) return $pdo;
        $url = env('DATABASE_URL');
        if (!$url) throw new \RuntimeException('DATABASE_URL not set');
        
        // Check if it's SQLite
        if (strpos($url, 'sqlite:') === 0) {
            $dbPath = substr($url, 7); // Remove 'sqlite:' prefix
            if (!file_exists($dbPath)) {
                // Create empty SQLite database
                touch($dbPath);
            }
            $dsn = "sqlite:{$dbPath}";
            try {
                $pdo = new PDO($dsn, null, null, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);
                // Enable foreign keys for SQLite
                $pdo->exec('PRAGMA foreign_keys = ON');
            } catch (PDOException $e) { 
                throw new \RuntimeException('DB error: '.$e->getMessage(), 0, $e); 
            }
        } else {
            // Parse mysql://user:pass@host:port/db
            $parts = parse_url($url);
            $user = $parts['user'] ?? 'root';
            $pass = $parts['pass'] ?? '';
            $host = $parts['host'] ?? 'localhost';
            $port = $parts['port'] ?? 3306;
            $db   = ltrim($parts['path'] ?? '/finance', '/');
            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
            try {
                $pdo = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);
            } catch (PDOException $e) { 
                throw new \RuntimeException('DB error: '.$e->getMessage(), 0, $e); 
            }
        }
        return $pdo;
    }
}
