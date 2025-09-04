<?php
// Teste de Conexão MySQL Local - XAMPP

header('Content-Type: text/html; charset=utf-8');

// Configurações do banco de dados
$host = 'localhost';
$port = '3306';
$database = 'u585400554_controle';
$username = 'root';
$password = '';

echo "<h1>🔍 Teste de Conexão MySQL Local (XAMPP)</h1>";
echo "<div style='font-family: Arial, sans-serif; margin: 20px;'>";

echo "<h3>📋 Configurações:</h3>";
echo "<ul>";
echo "<li><strong>Host:</strong> {$host}</li>";
echo "<li><strong>Porta:</strong> {$port}</li>";
echo "<li><strong>Banco:</strong> {$database}</li>";
echo "<li><strong>Usuário:</strong> {$username}</li>";
echo "<li><strong>Senha:</strong> " . (empty($password) ? '(vazia)' : '***') . "</li>";
echo "</ul>";

echo "<h3>🔗 Testando Conexão...</h3>";

try {
    // Tentar conectar usando PDO
    $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Configurar charset UTF8
    $pdo->exec("SET NAMES utf8mb4");
    
    echo "<p style='color: green;'>✅ <strong>Conexão bem-sucedida!</strong></p>";
    
    // Testar se o banco existe e tem tabelas
    echo "<h3>📊 Informações do Banco:</h3>";
    
    // Verificar versão do MySQL
    $stmt = $pdo->query("SELECT VERSION() as version");
    $version = $stmt->fetch();
    echo "<p><strong>Versão MySQL:</strong> {$version['version']}</p>";
    
    // Listar tabelas
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (count($tables) > 0) {
        echo "<p><strong>Tabelas encontradas:</strong> " . count($tables) . "</p>";
        echo "<ul>";
        foreach ($tables as $table) {
            echo "<li>{$table}</li>";
        }
        echo "</ul>";
    } else {
        echo "<p style='color: orange;'>⚠️ <strong>Nenhuma tabela encontrada no banco.</strong></p>";
        echo "<p>Você pode precisar importar o schema.sql</p>";
    }
    
    // Testar uma consulta simples se a tabela users existir
    if (in_array('users', $tables)) {
        echo "<h3>👥 Teste da Tabela Users:</h3>";
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
        $userCount = $stmt->fetch();
        echo "<p><strong>Usuários cadastrados:</strong> {$userCount['count']}</p>";
    }
    
    // Testar uma consulta simples se a tabela goals existir
    if (in_array('goals', $tables)) {
        echo "<h3>🎯 Teste da Tabela Goals:</h3>";
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM goals");
        $goalCount = $stmt->fetch();
        echo "<p><strong>Metas cadastradas:</strong> {$goalCount['count']}</p>";
    }
    
} catch (PDOException $e) {
    echo "<p style='color: red;'>❌ <strong>Erro de conexão:</strong></p>";
    echo "<p style='background: #ffebee; padding: 10px; border-left: 4px solid #f44336;'>";
    echo "<strong>Código:</strong> {$e->getCode()}<br>";
    echo "<strong>Mensagem:</strong> {$e->getMessage()}";
    echo "</p>";
    
    echo "<h3>🔧 Possíveis Soluções:</h3>";
    echo "<ul>";
    echo "<li>Verifique se o XAMPP está rodando</li>";
    echo "<li>Verifique se o MySQL está ativo no XAMPP</li>";
    echo "<li>Confirme se o banco 'u585400554_controle' existe</li>";
    echo "<li>Verifique as credenciais (usuário: root, senha: vazia)</li>";
    echo "</ul>";
}

echo "<h3>📝 Próximos Passos:</h3>";
echo "<ol>";
echo "<li>Se a conexão falhou, verifique o XAMPP</li>";
echo "<li>Se não há tabelas, importe o schema.sql</li>";
echo "<li>Se tudo está OK, teste o sistema completo</li>";
echo "</ol>";

echo "</div>";
?>