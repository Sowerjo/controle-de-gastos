<?php
echo "<h2>Drivers PDO Disponíveis:</h2>";
echo "<pre>";
print_r(PDO::getAvailableDrivers());
echo "</pre>";

echo "<h2>Extensões MySQL:</h2>";
echo "<ul>";
echo "<li>MySQLi: " . (extension_loaded('mysqli') ? '✅ Disponível' : '❌ Não disponível') . "</li>";
echo "<li>PDO MySQL: " . (extension_loaded('pdo_mysql') ? '✅ Disponível' : '❌ Não disponível') . "</li>";
echo "<li>MySQL Native Driver: " . (extension_loaded('mysqlnd') ? '✅ Disponível' : '❌ Não disponível') . "</li>";
echo "</ul>";

// Teste com MySQLi
echo "<h2>Teste de Conexão com MySQLi:</h2>";
try {
    $mysqli = new mysqli('localhost', 'root', '', 'u585400554_controle', 3306);
    
    if ($mysqli->connect_error) {
        echo "<p style='color: red;'>❌ Erro MySQLi: " . $mysqli->connect_error . "</p>";
    } else {
        echo "<p style='color: green;'>✅ Conexão MySQLi bem-sucedida!</p>";
        
        // Listar tabelas
        $result = $mysqli->query("SHOW TABLES");
        if ($result) {
            echo "<h3>Tabelas encontradas:</h3><ul>";
            while ($row = $result->fetch_array()) {
                echo "<li>" . $row[0] . "</li>";
            }
            echo "</ul>";
        }
        
        $mysqli->close();
    }
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Erro MySQLi: " . $e->getMessage() . "</p>";
}
?>