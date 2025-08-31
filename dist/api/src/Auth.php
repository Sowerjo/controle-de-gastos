<?php
namespace Api;
use Api\DB;use PDO;use Exception;

class Auth {
    public static function hash($password) { return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]); }
    public static function verify($password, $hash) { return password_verify($password, $hash); }
}
