<?php
// Debug de headers e autenticação
header("Content-Type: application/json");

echo json_encode([
    "method" => $_SERVER["REQUEST_METHOD"],
    "headers" => getallheaders(),
    "authorization" => $_SERVER["HTTP_AUTHORIZATION"] ?? "não encontrado",
    "input" => file_get_contents("php://input"),
    "timestamp" => date("Y-m-d H:i:s")
], JSON_PRETTY_PRINT);
?>