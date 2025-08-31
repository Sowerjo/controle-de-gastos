<?php
// Simple front controller for PHP backend API
require_once __DIR__ . '/src/bootstrap.php';

use Api\Router;

$router = new Router();
require __DIR__ . '/src/routes.php';
// Support fallback when mod_rewrite is disabled: allow query param ?path=/api/...
$uri = isset($_GET['path']) ? $_GET['path'] : $_SERVER['REQUEST_URI'];
$router->dispatch($_SERVER['REQUEST_METHOD'], $uri);
