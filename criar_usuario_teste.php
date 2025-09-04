<?php
// Criar usuário de teste para login

$host = 'localhost';
$port = 3306;
$dbname = 'u585400554_controle';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    $pdo->exec("SET NAMES utf8mb4");
    
    echo "<h2>🔧 Verificando Estrutura da Tabela Users</h2>";
    
    // Verificar estrutura da tabela users primeiro
    $stmt = $pdo->query("DESCRIBE users");
    $columns = $stmt->fetchAll();
    
    echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr><th>Campo</th><th>Tipo</th><th>Nulo</th><th>Chave</th><th>Padrão</th></tr>";
    foreach ($columns as $column) {
        echo "<tr>";
        echo "<td>{$column['Field']}</td>";
        echo "<td>{$column['Type']}</td>";
        echo "<td>{$column['Null']}</td>";
        echo "<td>{$column['Key']}</td>";
        echo "<td>{$column['Default']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    echo "<h2>🔧 Criando Usuário de Teste</h2>";
    
    // Verificar se usuário já existe
    $stmt = $pdo->prepare("SELECT id, email FROM users WHERE email = ?");
    $stmt->execute(['admin@teste.com']);
    $existingUser = $stmt->fetch();
    
    if ($existingUser) {
        echo "<p style='color: orange;'>⚠️ Usuário já existe: {$existingUser['email']} (ID: {$existingUser['id']})</p>";
    } else {
        // Criar novo usuário (sem updated_at)
        $hashedPassword = password_hash('123456', PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("
            INSERT INTO users (name, email, password, created_at) 
            VALUES (?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            'Admin Teste',
            'admin@teste.com', 
            $hashedPassword
        ]);
        
        $userId = $pdo->lastInsertId();
        echo "<p style='color: green;'>✅ Usuário criado com sucesso!</p>";
        echo "<ul>";
        echo "<li><strong>ID:</strong> $userId</li>";
        echo "<li><strong>Nome:</strong> Admin Teste</li>";
        echo "<li><strong>Email:</strong> admin@teste.com</li>";
        echo "<li><strong>Senha:</strong> 123456</li>";
        echo "</ul>";
    }
    
    // Listar todos os usuários
    echo "<h3>👥 Usuários no Sistema:</h3>";
    $stmt = $pdo->query("SELECT id, name, email, created_at FROM users ORDER BY id");
    $users = $stmt->fetchAll();
    
    if ($users) {
        echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
        echo "<tr><th>ID</th><th>Nome</th><th>Email</th><th>Criado em</th></tr>";
        foreach ($users as $user) {
            echo "<tr>";
            echo "<td>{$user['id']}</td>";
            echo "<td>{$user['name']}</td>";
            echo "<td>{$user['email']}</td>";
            echo "<td>{$user['created_at']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<p>Nenhum usuário encontrado.</p>";
    }
    
} catch (PDOException $e) {
    echo "<p style='color: red;'>❌ Erro: " . $e->getMessage() . "</p>";
}
?>