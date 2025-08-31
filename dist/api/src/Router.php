<?php
namespace Api;

class Router {
    private $routes = [];

    public function add($method, $path, $handler) {
        $this->routes[] = [$method, $path, $handler];
    }

    public function dispatch($method, $uri) {
        $path = parse_url($uri, PHP_URL_PATH);
        foreach ($this->routes as [$m, $p, $h]) {
            if ($m === $method && $p === $path) {
                return call_user_func($h);
            }
        }
        json(['error' => ['message' => 'Not Found']], 404);
    }
}
