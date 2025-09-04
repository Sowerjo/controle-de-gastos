<?php
// Teste de debug para identificar problema de autenticação

echo "=== ANÁLISE DO PROBLEMA DE AUTENTICAÇÃO ===\n\n";

// 1. Verificar se o problema está no frontend
echo "1. ANÁLISE DO FRONTEND:\n";
echo "- O frontend usa sessionStorage para armazenar accessToken\n";
echo "- Adiciona header 'Authorization: Bearer <token>' nas requisições\n";
echo "- Usa axios interceptor para adicionar o token automaticamente\n\n";

// 2. Verificar se o problema está no backend
echo "2. ANÁLISE DO BACKEND:\n";
echo "- Middleware::requireAuth() busca header HTTP_AUTHORIZATION\n";
echo "- Verifica se começa com 'Bearer '\n";
echo "- Extrai token e verifica com JWT::verify()\n";
echo "- Define \$GLOBALS['auth_user_id'] se válido\n\n";

// 3. Possíveis problemas identificados
echo "3. POSSÍVEIS PROBLEMAS:\n\n";

echo "A) PROBLEMA DE CORS/HEADERS:\n";
echo "   - Servidor pode estar removendo header Authorization\n";
echo "   - Verificar se .htaccess está configurado corretamente\n";
echo "   - Alguns servidores Apache precisam de configuração especial\n\n";

echo "B) PROBLEMA DE TOKEN EXPIRADO:\n";
echo "   - Token pode ter expirado (TTL = 15 minutos)\n";
echo "   - Frontend não está renovando token automaticamente\n";
echo "   - Verificar se login foi feito recentemente\n\n";

echo "C) PROBLEMA DE SESSÃO/STORAGE:\n";
echo "   - sessionStorage pode estar vazio\n";
echo "   - Token pode não estar sendo salvo corretamente\n";
echo "   - Verificar se há múltiplas abas/janelas\n\n";

echo "D) PROBLEMA DE CONFIGURAÇÃO DO SERVIDOR:\n";
echo "   - JWT_SECRET pode estar diferente\n";
echo "   - Variáveis de ambiente não carregadas\n";
echo "   - Problema de timezone/data\n\n";

// 4. Verificar arquivo .htaccess
echo "4. VERIFICAÇÃO DO .HTACCESS:\n";
$htaccessFile = 'backend-php/.htaccess';
if (file_exists($htaccessFile)) {
    echo "✓ Arquivo .htaccess encontrado:\n";
    $content = file_get_contents($htaccessFile);
    echo "```\n";
    echo $content;
    echo "```\n\n";
    
    if (strpos($content, 'Authorization') !== false) {
        echo "✓ Configuração de Authorization encontrada\n";
    } else {
        echo "✗ PROBLEMA: Configuração de Authorization não encontrada!\n";
        echo "   Adicione esta linha ao .htaccess:\n";
        echo "   RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]\n";
    }
} else {
    echo "✗ PROBLEMA: Arquivo .htaccess não encontrado!\n";
    echo "   Crie o arquivo com o conteúdo necessário\n";
}
echo "\n";

// 5. Soluções recomendadas
echo "5. SOLUÇÕES RECOMENDADAS:\n\n";

echo "SOLUÇÃO 1 - Verificar console do navegador:\n";
echo "- Abra DevTools (F12)\n";
echo "- Vá para aba Network\n";
echo "- Tente criar uma meta\n";
echo "- Verifique se a requisição POST /api/v1/goals tem o header Authorization\n";
echo "- Verifique a resposta do servidor\n\n";

echo "SOLUÇÃO 2 - Verificar token no sessionStorage:\n";
echo "- No console do navegador, digite: sessionStorage.getItem('accessToken')\n";
echo "- Se retornar null, faça login novamente\n";
echo "- Se retornar um token, copie e verifique se não expirou\n\n";

echo "SOLUÇÃO 3 - Adicionar debug temporário:\n";
echo "- Adicionar console.log no frontend antes da requisição\n";
echo "- Adicionar log no backend para ver se o header chega\n";
echo "- Verificar se o token está sendo enviado corretamente\n\n";

echo "SOLUÇÃO 4 - Verificar configuração do servidor:\n";
echo "- Confirmar que o .htaccess está funcionando\n";
echo "- Verificar se mod_rewrite está habilitado\n";
echo "- Testar com curl para ver se headers chegam\n\n";

// 6. Comando de teste para o servidor
echo "6. TESTE MANUAL NO SERVIDOR:\n";
echo "Execute este comando no servidor para testar:\n\n";
echo "curl -X POST \\\n";
echo "  -H 'Content-Type: application/json' \\\n";
echo "  -H 'Authorization: Bearer SEU_TOKEN_AQUI' \\\n";
echo "  -d '{\"name\":\"Teste\",\"target_amount\":1000,\"type\":\"poupanca\"}' \\\n";
echo "  https://seudominio.com/api/v1/goals\n\n";

echo "Se retornar erro 401, o problema é de autenticação.\n";
echo "Se retornar erro 500, o problema é no código PHP.\n";
echo "Se funcionar, o problema é no frontend.\n\n";

// 7. Arquivo de debug para o servidor
echo "7. CRIANDO ARQUIVO DE DEBUG PARA O SERVIDOR:\n";
$debugContent = '<?php
// Debug de headers e autenticação
header("Content-Type: application/json");

echo json_encode([
    "method" => $_SERVER["REQUEST_METHOD"],
    "headers" => getallheaders(),
    "authorization" => $_SERVER["HTTP_AUTHORIZATION"] ?? "não encontrado",
    "input" => file_get_contents("php://input"),
    "timestamp" => date("Y-m-d H:i:s")
], JSON_PRETTY_PRINT);
?>';

file_put_contents('debug_headers.php', $debugContent);
echo "✓ Arquivo debug_headers.php criado\n";
echo "   Faça upload para o servidor e acesse: https://seudominio.com/debug_headers.php\n";
echo "   Isso mostrará todos os headers recebidos\n\n";

echo "=== PRÓXIMOS PASSOS ===\n";
echo "1. Verificar console do navegador (Network tab)\n";
echo "2. Verificar sessionStorage do navegador\n";
echo "3. Fazer upload do debug_headers.php e testar\n";
echo "4. Se necessário, adicionar logs temporários no código\n";
echo "5. Verificar se o login está funcionando corretamente\n\n";

echo "=== FIM DA ANÁLISE ===\n";
?>