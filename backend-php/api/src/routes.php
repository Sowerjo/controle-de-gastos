<?php
use Api\Router;use Api\DB;use Api\Auth;use Api\JWT;use function Api\json;use function Api\env;use Api\Middleware;

// Health (includes DB check)
$router->add('GET', '/api/v1/health', function() {
    $db = 'off';
    $err = null; $missing = [];
    try {
        $pdo = DB::conn();
        $pdo->query('SELECT 1');
        $db = 'ok';
        // quick schema check for core tables
        $tables = ['users','accounts','categories','payees','transactions'];
        foreach($tables as $t){
            try { $pdo->query("SELECT 1 FROM `$t` LIMIT 1"); } catch (\Throwable $te) { $missing[] = $t; }
        }
    } catch (\Throwable $e) {
        $db = 'off';
        $err = $e->getMessage();
    }
    json(['data'=>['status'=>'ok','db'=>$db,'error'=>$err,'missing'=>$missing]]);
});

// Register
$router->add('POST', '/api/v1/auth/register', function() {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $email = strtolower(trim($input['email'] ?? ''));
    $name  = trim($input['name'] ?? ($input['nome'] ?? ''));
    $password = $input['password'] ?? ($input['senha'] ?? '');
    if (!$email || !$password) json(['error'=>['message'=>'Dados inválidos']],422);
    $pdo = DB::conn();
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    if ($stmt->fetch()) json(['error'=>['message'=>'E-mail já cadastrado']],409);
    $hash = Auth::hash($password);
    $pdo->prepare('INSERT INTO users (name,email,password,created_at) VALUES (?,?,?,NOW())')->execute([$name,$email,$hash]);
    json(['data'=>['ok'=>true]]);
});

// Login
$router->add('POST', '/api/v1/auth/login', function() {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $email = strtolower(trim($input['email'] ?? ''));
    $password = $input['password'] ?? ($input['senha'] ?? '');
    $pdo = DB::conn();
    $stmt = $pdo->prepare('SELECT id,password,name,email FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $u = $stmt->fetch();
    if (!$u) {
        $dbg = env('DEBUG_AUTH','0')==='1' ? ['reason'=>'user_not_found'] : [];
        json(['error'=>array_merge(['message'=>'Credenciais inválidas'],$dbg)],401);
    }
    $valid = Auth::verify($password, $u['password']);
    // Legacy fallback: plaintext or md5 stored; if matches, rehash to bcrypt
    if (!$valid && ($password === $u['password'] || md5($password) === $u['password'])) {
        $newHash = Auth::hash($password);
        $upd = $pdo->prepare('UPDATE users SET password=? WHERE id=?');
        $upd->execute([$newHash, $u['id']]);
        $valid = true;
        $u['password'] = $newHash;
    }
    if (!$valid) {
        $dbg = env('DEBUG_AUTH','0')==='1' ? ['reason'=>'password_mismatch'] : [];
        json(['error'=>array_merge(['message'=>'Credenciais inválidas'],$dbg)],401);
    }
    $access = JWT::sign(['sub'=>$u['id']], (int)env('ACCESS_TOKEN_TTL_MIN',15)*60);
    json(['data'=>[
        'accessToken'=>$access,
        'access_token'=>$access,
        'user'=>['id'=>$u['id'],'name'=>$u['name'],'email'=>$u['email']]
    ]]);
});

// Optional: refresh (echo back access if valid)
$router->add('POST', '/api/v1/auth/refresh', function() {
    $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.*)/i', $hdr, $m)) {
        $token = $m[1];
        $payload = JWT::verify($token);
        if ($payload && isset($payload['sub'])) {
            // issue a new short-lived token
            $access = JWT::sign(['sub'=>$payload['sub']], (int)env('ACCESS_TOKEN_TTL_MIN',15)*60);
            json(['data'=>['accessToken'=>$access]]);
        }
    }
    json(['error'=>['message'=>'unauthorized']],401);
});

// Forgot/Reset password stubs (no-op, for demo/testing)
$router->add('POST', '/api/v1/auth/forgot-password', function(){
    json(['data'=>['debugLink'=>'/reset-password?token=demo-token']]);
});
$router->add('POST', '/api/v1/auth/reset-password', function(){
    json(['data'=>['ok'=>true]]);
});

// Debug endpoint (only when DEBUG_AUTH=1)
if (env('DEBUG_AUTH','0')==='1') {
    $router->add('POST', '/api/v1/auth/debug', function(){
        $in=json_decode(file_get_contents('php://input'),true)?:[];
        $email=strtolower(trim($in['email']??''));
        $pwd=$in['password']??($in['senha']??'');
        $pdo=DB::conn();
        $st=$pdo->prepare('SELECT id,password FROM users WHERE email=? LIMIT 1');
        $st->execute([$email]);
        $u=$st->fetch();
        if(!$u) json(['data'=>['found'=>false]]);
        $ok=password_verify($pwd,$u['password']);
        $legacy=($pwd===$u['password']||md5($pwd)===$u['password']);
        json(['data'=>['found'=>true,'bcrypt_ok'=>$ok,'legacy_match'=>$legacy]]);
    });
}

// Me
$router->add('GET', '/api/v1/me', function(){ Middleware::requireAuth();
    $id = $GLOBALS['auth_user_id'];
    $pdo = DB::conn();
    $stmt = $pdo->prepare('SELECT id,name,email FROM users WHERE id=? LIMIT 1');
    $stmt->execute([$id]);
    $u = $stmt->fetch();
    json(['data'=>$u]);
});

// Categories CRUD
$router->add('GET', '/api/v1/categories', function(){ Middleware::requireAuth();
    $id = $GLOBALS['auth_user_id'];$pdo=DB::conn();
    $st=$pdo->prepare('SELECT * FROM categories WHERE user_id=? ORDER BY name');$st->execute([$id]);
    json(['data'=>$st->fetchAll()]);
});
$router->add('POST', '/api/v1/categories', function(){ Middleware::requireAuth();
    $in=json_decode(file_get_contents('php://input'),true)?:[]; $name=trim(($in['name']??($in['nome']??''))); $type=trim($in['type']??($in['tipo']??''));
    if($type!=='') { $type = strtoupper($type); }
    if(!$name||!in_array($type,['RECEITA','DESPESA'])) json(['error'=>['message'=>'Dados inválidos']],422);
    $id=$GLOBALS['auth_user_id'];$pdo=DB::conn();
    $pdo->prepare('INSERT INTO categories (user_id,type,name,created_at) VALUES (?,?,?,NOW())')->execute([$id,$type,$name]);
    json(['data'=>['ok'=>true]]);
});
$router->add('PUT', '/api/v1/categories', function(){ Middleware::requireAuth();
    $in=json_decode(file_get_contents('php://input'),true)?:[]; $cid=$in['id']??0; $name=trim($in['name']??'');
    $id=$GLOBALS['auth_user_id'];$pdo=DB::conn();
    $pdo->prepare('UPDATE categories SET name=? WHERE id=? AND user_id=?')->execute([$name,$cid,$id]);
    json(['data'=>['ok'=>true]]);
});
$router->add('DELETE', '/api/v1/categories', function(){ Middleware::requireAuth();
    $cid=(int)($_GET['id']??0); $id=$GLOBALS['auth_user_id'];$pdo=DB::conn();
    $pdo->prepare('UPDATE transactions SET category_id=NULL WHERE user_id=? AND category_id=?')->execute([$id,$cid]);
    $pdo->prepare('DELETE FROM categories WHERE id=? AND user_id=?')->execute([$cid,$id]);
    json(['data'=>['ok'=>true]]);
});

// Accounts
$router->add('GET', '/api/v1/accounts', function(){ Middleware::requireAuth();
    $id=$GLOBALS['auth_user_id'];$pdo=DB::conn();
    $st=$pdo->prepare('SELECT * FROM accounts WHERE user_id=? AND archived_at IS NULL ORDER BY display_order, name');
    $st->execute([$id]);
    // include lightweight balance (opening + sum)
    $accounts=$st->fetchAll();
    foreach($accounts as &$a){
        $s=$pdo->prepare('SELECT COALESCE(SUM(CASE WHEN type="RECEITA" THEN amount WHEN type="DESPESA" THEN -amount ELSE 0 END),0) as mv FROM transactions WHERE user_id=? AND account_id=?');
        $s->execute([$id,$a['id']]);
        $mv=$s->fetchColumn();
        $a['balance']= (float)$a['opening_balance'] + (float)$mv;
    }
    json(['data'=>$accounts]);
});
$router->add('POST', '/api/v1/accounts', function(){ Middleware::requireAuth();
    $id=$GLOBALS['auth_user_id'];$pdo=DB::conn();
    $in=json_decode(file_get_contents('php://input'),true)?:[];
    $name=trim($in['name']??''); $type=$in['type']??'checking'; $opening=(float)($in['opening_balance']??0); $order=(int)($in['display_order']??0);
    if(!$name||!in_array($type,['cash','checking','savings','credit_card','wallet','investment'])) json(['error'=>['message'=>'Dados inválidos']],422);
    $pdo->prepare('INSERT INTO accounts (user_id,name,type,currency,opening_balance,display_order,created_at) VALUES (?,?,?,?,?,?,NOW())')
        ->execute([$id,$name,$type,'BRL',$opening,$order]);
    json(['data'=>['ok'=>true]]);
});
$router->add('POST', '/api/v1/accounts/archive', function(){ Middleware::requireAuth();
    $id=$GLOBALS['auth_user_id'];$pdo=DB::conn();
    $in=json_decode(file_get_contents('php://input'),true)?:[]; $aid=(int)($in['id']??0);
    $pdo->prepare('UPDATE accounts SET archived_at=IF(archived_at IS NULL,NOW(),NULL) WHERE id=? AND user_id=?')->execute([$aid,$id]);
    json(['data'=>['ok'=>true]]);
});

$router->add('DELETE', '/api/v1/accounts', function(){ Middleware::requireAuth();
    $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn();
    $aid=(int)($_GET['id']??0); if(!$aid) json(['error'=>['message'=>'ID requerido']],422);
    // Block deletion if account has transactions to avoid data loss
    try {
        $st=$pdo->prepare('SELECT COUNT(*) FROM transactions WHERE user_id=? AND account_id=?');
        $st->execute([$uid,$aid]); $cnt=(int)$st->fetchColumn();
        if ($cnt>0) json(['error'=>['message'=>'Conta possui transações. Arquive ou exclua as transações primeiro.']],409);
    } catch (\Throwable $e) { /* if table missing, ignore */ }
    // Also safe to delete; FKs will cascade for related rows where defined
    $pdo->prepare('DELETE FROM accounts WHERE id=? AND user_id=?')->execute([$aid,$uid]);
    json(['data'=>['ok'=>true]]);
});

// Transactions
$router->add('GET', '/api/v1/transactions', function(){ Middleware::requireAuth();
    $id=$GLOBALS['auth_user_id'];$pdo=DB::conn();
    $q='SELECT t.id, t.type as tipo, t.amount as valor, t.date as data, t.description as descricao, t.category_id as categoriaId, t.account_id as contaId, t.status as status FROM transactions t WHERE t.user_id=?'; $args=[$id];
    $normalize=function($s){ $t=trim((string)$s); if($t==='') return $t; // yyyy/mm/dd -> yyyy-mm-dd
        if(preg_match('/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/',$t,$m)){ return sprintf('%04d-%02d-%02d',(int)$m[1],(int)$m[2],(int)$m[3]); }
        if(preg_match('/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$/',$t,$m)){ $yy=strlen($m[3])===2? (2000+(int)$m[3]):(int)$m[3]; return sprintf('%04d-%02d-%02d',$yy,(int)$m[2],(int)$m[1]); }
        return $t; };
    if(isset($_GET['from'])) { $q.=' AND t.date>=?'; $args[]=$normalize($_GET['from']); }
    if(isset($_GET['to']))   { $q.=' AND t.date<=?'; $args[]=$normalize($_GET['to']); }
    if(isset($_GET['type'])) { $q.=' AND t.type=?'; $args[]=$_GET['type']; }
    if(isset($_GET['accountId'])) { $q.=' AND t.account_id=?'; $args[]=(int)$_GET['accountId']; }
    if(isset($_GET['categoryId'])) { $q.=' AND t.category_id=?'; $args[]=(int)$_GET['categoryId']; }
    if(isset($_GET['status'])) { $q.=' AND t.status=?'; $args[]=$_GET['status']; }
    if(isset($_GET['payeeId'])) { $q.=' AND t.payee_id=?'; $args[]=(int)$_GET['payeeId']; }
    if(isset($_GET['tagId'])) { $q.=' AND EXISTS (SELECT 1 FROM transaction_tags tt WHERE tt.transaction_id=t.id AND tt.tag_id=?)'; $args[]=(int)$_GET['tagId']; }
    $q.=' ORDER BY t.date DESC, t.id DESC LIMIT 500';
    $st=$pdo->prepare($q);$st->execute($args); json(['data'=>['items'=>$st->fetchAll()]]);
});
$router->add('POST', '/api/v1/transactions', function(){ Middleware::requireAuth();
    $in=json_decode(file_get_contents('php://input'),true)?:[]; $id=$GLOBALS['auth_user_id'];
    // accept both EN/PT keys
    $type=$in['type']??($in['tipo']??null);
    if ($type && ($type==='receita' || $type==='despesa')) { $type = strtoupper($type); }
    if (!in_array($type, ['RECEITA', 'DESPESA'])) { json(['error'=>['message'=>'Tipo de transação inválido']],422); }
    $amount=$in['amount']??($in['valor']??null); if ($amount!==null) $amount = (float)$amount;
    if ($amount <= 0) { json(['error'=>['message'=>'Valor deve ser maior que zero']],422); }
    $date=$in['date']??($in['data']??null);
    // Normalize date: accept DD/MM/YYYY or YYYY/MM/DD
    if($date){
        $t=trim((string)$date);
        if(preg_match('/^(\d{4})[\/(\d{1,2})[\/(\d{1,2})$/',$t,$m)) { $date=sprintf('%04d-%02d-%02d',(int)$m[1],(int)$m[2],(int)$m[3]); }
        elseif(preg_match('/^(\d{1,2})[\/(\d{1,2})[\/(\d{2,4})$/',$t,$m)) { $yy=strlen($m[3])===2? (2000+(int)$m[3]):(int)$m[3]; $date=sprintf('%04d-%02d-%02d',$yy,(int)$m[2],(int)$m[1]); }
        // basic validation
        if(!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/',$date,$mm) || !checkdate((int)$mm[2],(int)$mm[3],(int)$mm[1])) { json(['error'=>['message'=>'Data inválida']],422); }
    }
    $desc=$in['description']??($in['descricao']??null);
    $cat=$in['categoryId']??($in['categoriaId']??null);
    $acc=$in['accountId']??($in['contaId']??null);
    $payee=$in['payeeId']??null; $payeeName=trim($in['payeeName']??'');
    $status=$in['status']??'CLEARED';
    if (!in_array($status, ['PENDING', 'CLEARED', 'RECONCILED'])) { json(['error'=>['message'=>'Status inválido']],422); }
    $tags=$in['tags']??($in['tagIds']??[]); $tagNames=$in['tagNames']??[];
    $splits=$in['splits']??[]; // [{amount, description, categoryId?, payeeId?}]
    if(!$acc||!$type||!$amount||!$date) json(['error'=>['message'=>'Dados incompletos']],422);
    // Validar conta
    $pdo=DB::conn();
    $st=$pdo->prepare('SELECT id FROM accounts WHERE id=? AND user_id=? AND archived_at IS NULL');
    $st->execute([$acc, $id]);
    if (!$st->fetch()) { json(['error'=>['message'=>'Conta inválida ou arquivada']],422); }
    $pdo=DB::conn();
    // resolve payee by name if provided
    if(!$payee && $payeeName!==''){
        $s=$pdo->prepare('SELECT id FROM payees WHERE user_id=? AND name=?');$s->execute([$id,$payeeName]); $row=$s->fetch();
        if($row){ $payee=(int)$row['id']; } else { $pdo->prepare('INSERT INTO payees (user_id,name,created_at) VALUES (?,?,NOW())')->execute([$id,$payeeName]); $payee=(int)$pdo->lastInsertId(); }
    }
    $stmt=$pdo->prepare('INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,payee_id,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())');
    $stmt->execute([$id,$acc,$type,$amount,$date,$desc,$cat,$payee,$status]);
    $txId=(int)$pdo->lastInsertId();
    // tags by id
    if (is_array($tags) && count($tags)) {
        $ins=$pdo->prepare('INSERT IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?,?)');
        foreach($tags as $tg){ $ins->execute([$txId,(int)$tg]); }
    }
    // tags by names
    if (is_array($tagNames) && count($tagNames)) {
        foreach($tagNames as $name){ $name=trim($name); if($name==='') continue; $s=$pdo->prepare('SELECT id FROM tags WHERE user_id=? AND name=?');$s->execute([$id,$name]); $row=$s->fetch(); $tid=$row? (int)$row['id']:0; if(!$tid){ $pdo->prepare('INSERT INTO tags (user_id,name,created_at) VALUES (?,?,NOW())')->execute([$id,$name]); $tid=(int)$pdo->lastInsertId(); }
            $pdo->prepare('INSERT IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?,?)')->execute([$txId,$tid]);
        }
    }
    // splits
    if (is_array($splits) && count($splits)) {
        // Verificar se a soma dos splits é igual ao valor total da transação
        $totalSplits = 0;
        foreach($splits as $sp) {
            $totalSplits += (float)($sp['amount'] ?? 0);
        }
        
        // Garantir que a soma dos splits seja igual ao valor total da transação
        if (abs($totalSplits - $amount) > 0.01) { // Tolerância de 0.01 para evitar problemas de arredondamento
            json(['error'=>['message'=>'A soma dos valores dos splits deve ser igual ao valor total da transação']], 422);
        }
        
        $ins=$pdo->prepare('INSERT INTO transaction_splits (transaction_id,amount,description,category_id,payee_id) VALUES (?,?,?,?,?)');
        foreach($splits as $sp){ 
            $amt=(float)($sp['amount']??0); 
            if ($amt <= 0) {
                json(['error'=>['message'=>'Valor do split deve ser maior que zero']], 422);
            }
            $d=$sp['description']??null; 
            $c=$sp['categoryId']??null; 
            $p=$sp['payeeId']??null; 
            $ins->execute([$txId,$amt,$d,$c,$p]); 
        }
    }
    json(['data'=>['ok'=>true,'id'=>$txId]]);
});
$router->add('DELETE', '/api/v1/transactions', function(){ Middleware::requireAuth();
    $tid=(int)($_GET['id']??0); $id=$GLOBALS['auth_user_id'];$pdo=DB::conn();
    // if this is part of a transfer, delete both sides
    $st=$pdo->prepare('SELECT transfer_group FROM transactions WHERE id=? AND user_id=?');
    $st->execute([$tid,$id]);
    $grp=$st->fetchColumn();
    if ($grp) {
        $pdo->prepare('DELETE FROM transactions WHERE user_id=? AND transfer_group=?')->execute([$id,$grp]);
    } else {
        $pdo->prepare('DELETE FROM transactions WHERE id=? AND user_id=?')->execute([$tid,$id]);
    }
    json(['data'=>['ok'=>true]]);
});

// Update a transaction
$router->add('PUT', '/api/v1/transactions', function(){ Middleware::requireAuth();
    $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn();
    $in=json_decode(file_get_contents('php://input'),true)?:[];
    $tid=(int)($in['id']??0); if(!$tid) json(['error'=>['message'=>'ID requerido']],422);
    // Accept EN/PT aliases
    $fields=[]; $args=[];
    // account
    if(array_key_exists('accountId',$in) || array_key_exists('contaId',$in)) { 
        $accId = (int)($in['accountId']??$in['contaId']);
        // Verificar se a conta existe e não está arquivada
        $stAcc = $pdo->prepare('SELECT id FROM accounts WHERE id=? AND user_id=? AND archived_at IS NULL');
        $stAcc->execute([$accId, $uid]);
        if(!$stAcc->fetch()) json(['error'=>['message'=>'Conta inválida ou arquivada']], 422);
        $fields[]='account_id=?'; $args[]=$accId;
    }
    // type
    if(array_key_exists('type',$in) || array_key_exists('tipo',$in)) { $v=$in['type']??$in['tipo']; if($v==='receita'||$v==='despesa'){ $v=strtoupper($v);} if(!in_array($v,['RECEITA','DESPESA'])) json(['error'=>['message'=>'type inválido']],422); $fields[]='type=?'; $args[]=$v; }
    // amount
    if(array_key_exists('amount',$in) || array_key_exists('valor',$in)) { 
        $amt=(float)($in['amount']??$in['valor']); 
        if($amt <= 0) json(['error'=>['message'=>'Valor deve ser maior que zero']], 422);
        $fields[]='amount=?'; $args[]=abs($amt); 
    }
    // date
    if(array_key_exists('date',$in) || array_key_exists('data',$in)) { $d=$in['date']??$in['data'];
        if($d){ $t=trim((string)$d);
            if(preg_match('/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/',$t,$m)) { $d=sprintf('%04d-%02d-%02d',(int)$m[1],(int)$m[2],(int)$m[3]); }
            elseif(preg_match('/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$/',$t,$m)) { $yy=strlen($m[3])===2? (2000+(int)$m[3]):(int)$m[3]; $d=sprintf('%04d-%02d-%02d',$yy,(int)$m[2],(int)$m[1]); }
            if(!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/',$d,$mm) || !checkdate((int)$mm[2],(int)$mm[3],(int)$mm[1])) { json(['error'=>['message'=>'Data inválida']],422); }
        }
        $fields[]='date=?'; $args[]=$d; }
    // description
    if(array_key_exists('description',$in) || array_key_exists('descricao',$in)) { $desc=$in['description']??$in['descricao']; $fields[]='description=?'; $args[]=$desc; }
    // category
    if(array_key_exists('categoryId',$in) || array_key_exists('categoriaId',$in)) { $cid=$in['categoryId']??$in['categoriaId']; $fields[]='category_id=?'; $args[]=$cid!==''? (int)$cid : null; }
    // payee by id or name
    $payeeId=null;
    if(array_key_exists('payeeId',$in)) { $payeeId=$in['payeeId']!==''? (int)$in['payeeId'] : null; }
    $payeeName=trim($in['payeeName']??'');
    if(!$payeeId && $payeeName!=='') {
        // upsert payee
        $st=$pdo->prepare('SELECT id FROM payees WHERE user_id=? AND name=?'); $st->execute([$uid,$payeeName]); $row=$st->fetch();
        if($row){ $payeeId=(int)$row['id']; } else { $pdo->prepare('INSERT INTO payees (user_id,name,created_at) VALUES (?,?,NOW())')->execute([$uid,$payeeName]); $payeeId=(int)$pdo->lastInsertId(); }
    }
    if($payeeId!==null) { $fields[]='payee_id=?'; $args[]=$payeeId; }
    // status
    if(array_key_exists('status',$in)) { $st=strtoupper($in['status']); if(!in_array($st,['PENDING','CLEARED','RECONCILED'])) json(['error'=>['message'=>'status inválido']],422); $fields[]='status=?'; $args[]=$st; }
    if(!count($fields)) json(['error'=>['message'=>'Nada a atualizar']],422);
    $args[]=$tid; $args[]=$uid;
    $sql='UPDATE transactions SET '.implode(',', $fields).' WHERE id=? AND user_id=?';
    $pdo->prepare($sql)->execute($args);
    json(['data'=>['ok'=>true]]);
});

// Transfers (create paired transactions)
$router->add('POST', '/api/v1/transfers', function(){ Middleware::requireAuth();
    $in=json_decode(file_get_contents('php://input'),true)?:[]; $uid=$GLOBALS['auth_user_id'];
    $from=$in['fromAccountId']??($in['contaOrigemId']??null);
    $to=$in['toAccountId']??($in['contaDestinoId']??null);
    $amount=$in['amount']??($in['valor']??null); if ($amount!==null) $amount=(float)$amount;
    $date=$in['date']??($in['data']??null);
    if($date){ $t=trim((string)$date);
        if(preg_match('/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/',$t,$m)) { $date=sprintf('%04d-%02d-%02d',(int)$m[1],(int)$m[2],(int)$m[3]); }
        elseif(preg_match('/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$/',$t,$m)) { $yy=strlen($m[3])===2? (2000+(int)$m[3]):(int)$m[3]; $date=sprintf('%04d-%02d-%02d',$yy,(int)$m[2],(int)$m[1]); }
        if(!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/',$date,$mm) || !checkdate((int)$mm[2],(int)$mm[3],(int)$mm[1])) { json(['error'=>['message'=>'Data inválida']],422); }
    }
    $desc=$in['description']??($in['descricao']??'Transferência');
    
    // Validações básicas
    if(!$from||!$to||!$amount||!$date) json(['error'=>['message'=>'Dados incompletos']],422);
    if($from===$to) json(['error'=>['message'=>'Contas de origem e destino não podem ser iguais']],422);
    if($amount <= 0) json(['error'=>['message'=>'Valor deve ser maior que zero']],422);
    
    $pdo=DB::conn();
    
    // Verificar se as contas existem e não estão arquivadas
    $stFrom = $pdo->prepare('SELECT id FROM accounts WHERE id=? AND user_id=? AND archived_at IS NULL');
    $stFrom->execute([(int)$from, $uid]);
    if(!$stFrom->fetch()) json(['error'=>['message'=>'Conta de origem inválida ou arquivada']], 422);
    
    $stTo = $pdo->prepare('SELECT id FROM accounts WHERE id=? AND user_id=? AND archived_at IS NULL');
    $stTo->execute([(int)$to, $uid]);
    if(!$stTo->fetch()) json(['error'=>['message'=>'Conta de destino inválida ou arquivada']], 422);
    $pdo->beginTransaction();
    try {
        $grp=bin2hex(random_bytes(8));
        // Outgoing (expense) from source
        $pdo->prepare('INSERT INTO transactions (user_id,account_id,type,amount,date,description,transfer_group,created_at) VALUES (?,?,?,?,?,?,?,NOW())')
           ->execute([$uid,$from,'DESPESA',$amount,$date,$desc,$grp]);
        // Incoming (income) to destination
        $pdo->prepare('INSERT INTO transactions (user_id,account_id,type,amount,date,description,transfer_group,created_at) VALUES (?,?,?,?,?,?,?,NOW())')
           ->execute([$uid,$to,'RECEITA',$amount,$date,$desc,$grp]);
        $pdo->commit();
        json(['data'=>['ok'=>true,'group'=>$grp]]);
    } catch (\Throwable $e) {
        $pdo->rollBack();
        json(['error'=>['message'=>'Erro ao criar transferência']],500);
    }
});

// Verificar integridade dos dados
$router->add('GET', '/api/v1/check-data-integrity', function(){ Middleware::requireAuth();
    $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn();
    $result = ['fixed' => 0, 'errors' => []];
    
    // 1. Verificar transações com categorias inválidas
    $st=$pdo->prepare("SELECT t.id FROM transactions t LEFT JOIN categories c ON t.category_id = c.id 
                      WHERE t.user_id=? AND t.category_id IS NOT NULL AND c.id IS NULL");
    $st->execute([$uid]);
    $invalidCategoryTxs = $st->fetchAll();
    
    // Corrigir transações com categorias inválidas
    if(count($invalidCategoryTxs) > 0) {
        $stUpdate = $pdo->prepare("UPDATE transactions SET category_id = NULL WHERE id = ? AND user_id = ?");
        foreach($invalidCategoryTxs as $tx) {
            $stUpdate->execute([$tx['id'], $uid]);
            $result['fixed']++;
        }
    }
    
    // 2. Verificar splits com categorias inválidas
    $st=$pdo->prepare("SELECT ts.id FROM transaction_splits ts 
                      LEFT JOIN categories c ON ts.category_id = c.id 
                      JOIN transactions t ON ts.transaction_id = t.id 
                      WHERE t.user_id=? AND ts.category_id IS NOT NULL AND c.id IS NULL");
    $st->execute([$uid]);
    $invalidCategorySplits = $st->fetchAll();
    
    // Corrigir splits com categorias inválidas
    if(count($invalidCategorySplits) > 0) {
        $stUpdate = $pdo->prepare("UPDATE transaction_splits SET category_id = NULL WHERE id = ?");
        foreach($invalidCategorySplits as $split) {
            $stUpdate->execute([$split['id']]);
            $result['fixed']++;
        }
    }
    
    // 3. Verificar transações com payees inválidos
    $st=$pdo->prepare("SELECT t.id FROM transactions t LEFT JOIN payees p ON t.payee_id = p.id 
                      WHERE t.user_id=? AND t.payee_id IS NOT NULL AND p.id IS NULL");
    $st->execute([$uid]);
    $invalidPayeeTxs = $st->fetchAll();
    
    // Corrigir transações com payees inválidos
    if(count($invalidPayeeTxs) > 0) {
        $stUpdate = $pdo->prepare("UPDATE transactions SET payee_id = NULL WHERE id = ? AND user_id = ?");
        foreach($invalidPayeeTxs as $tx) {
            $stUpdate->execute([$tx['id'], $uid]);
            $result['fixed']++;
        }
    }
    
    // 4. Verificar splits com payees inválidos
    $st=$pdo->prepare("SELECT ts.id FROM transaction_splits ts 
                      LEFT JOIN payees p ON ts.payee_id = p.id 
                      JOIN transactions t ON ts.transaction_id = t.id 
                      WHERE t.user_id=? AND ts.payee_id IS NOT NULL AND p.id IS NULL");
    $st->execute([$uid]);
    $invalidPayeeSplits = $st->fetchAll();
    
    // Corrigir splits com payees inválidos
    if(count($invalidPayeeSplits) > 0) {
        $stUpdate = $pdo->prepare("UPDATE transaction_splits SET payee_id = NULL WHERE id = ?");
        foreach($invalidPayeeSplits as $split) {
            $stUpdate->execute([$split['id']]);
            $result['fixed']++;
        }
    }
    
    $result['issues_found'] = count($invalidCategoryTxs) + count($invalidCategorySplits) + 
                             count($invalidPayeeTxs) + count($invalidPayeeSplits);
    
    json(['data'=>$result]);
});

// Verificar integridade das transferências
$router->add('GET', '/api/v1/check-transfers', function(){ Middleware::requireAuth();
    $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn();
    
    // Encontrar grupos de transferência com apenas uma transação (órfãs)
    $st=$pdo->prepare("SELECT transfer_group, COUNT(*) as count FROM transactions 
                      WHERE user_id=? AND transfer_group IS NOT NULL 
                      GROUP BY transfer_group HAVING COUNT(*) != 2");
    $st->execute([$uid]);
    $orphanGroups = $st->fetchAll();
    
    $fixed = 0;
    $errors = [];
    
    // Corrigir transferências órfãs
    foreach($orphanGroups as $group) {
        $groupId = $group['transfer_group'];
        
        // Verificar se existe apenas uma transação no grupo
        if($group['count'] == 1) {
            // Obter a transação órfã
            $stTx=$pdo->prepare("SELECT * FROM transactions WHERE user_id=? AND transfer_group=? LIMIT 1");
            $stTx->execute([$uid, $groupId]);
            $orphanTx = $stTx->fetch();
            
            if($orphanTx) {
                try {
                    $pdo->beginTransaction();
                    
                    // Criar a transação complementar
                    $complementType = $orphanTx['type'] == 'RECEITA' ? 'DESPESA' : 'RECEITA';
                    $complementAccountId = null;
                    
                    // Encontrar outra conta para a transação complementar
                    $stAcc=$pdo->prepare("SELECT id FROM accounts WHERE user_id=? AND id != ? AND archived_at IS NULL LIMIT 1");
                    $stAcc->execute([$uid, $orphanTx['account_id']]);
                    $complementAccount = $stAcc->fetch();
                    
                    if($complementAccount) {
                        $complementAccountId = $complementAccount['id'];
                        
                        // Inserir transação complementar
                        $stInsert=$pdo->prepare('INSERT INTO transactions (user_id,account_id,type,amount,date,description,transfer_group,created_at) 
                                               VALUES (?,?,?,?,?,?,?,NOW())');
                        $stInsert->execute([
                            $uid,
                            $complementAccountId,
                            $complementType,
                            $orphanTx['amount'],
                            $orphanTx['date'],
                            $orphanTx['description'] ?: 'Transferência (corrigida)',
                            $groupId
                        ]);
                        
                        $fixed++;
                        $pdo->commit();
                    } else {
                        $pdo->rollBack();
                        $errors[] = "Não foi possível encontrar uma conta para criar a transação complementar para o grupo {$groupId}";
                    }
                } catch(\Throwable $e) {
                    $pdo->rollBack();
                    $errors[] = "Erro ao corrigir transferência do grupo {$groupId}: " . $e->getMessage();
                }
            }
        } else if($group['count'] > 2) {
            // Caso raro: mais de 2 transações no mesmo grupo de transferência
            // Manter apenas as duas primeiras e remover as demais
            try {
                $stExcess=$pdo->prepare("SELECT id FROM transactions WHERE user_id=? AND transfer_group=? ORDER BY id LIMIT 99999 OFFSET 2");
                $stExcess->execute([$uid, $groupId]);
                $excessTxs = $stExcess->fetchAll();
                
                foreach($excessTxs as $tx) {
                    $stDelete = $pdo->prepare("DELETE FROM transactions WHERE id=? AND user_id=?");
                    $stDelete->execute([$tx['id'], $uid]);
                    $fixed++;
                }
            } catch(\Throwable $e) {
                $errors[] = "Erro ao remover transações excedentes do grupo {$groupId}: " . $e->getMessage();
            }
        }
    }
    
    json(['data'=>[
        'orphan_groups' => count($orphanGroups),
        'fixed' => $fixed,
        'errors' => $errors
    ]]);
});

// Verificar e corrigir todos os problemas de integridade de dados
$router->add('GET', '/api/v1/fix-all-integrity-issues', function(){ Middleware::requireAuth();
    $uid=$GLOBALS['auth_user_id'];
    $result = ['data_integrity' => [], 'transfers' => []];
    
    // 1. Verificar integridade dos dados
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . '/api/v1/check-data-integrity');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: ' . $_SERVER['HTTP_AUTHORIZATION']]);
    $response = curl_exec($ch);
    curl_close($ch);
    
    if ($response) {
        $dataIntegrityResult = json_decode($response, true);
        $result['data_integrity'] = $dataIntegrityResult['data'] ?? [];
    }
    
    // 2. Verificar integridade das transferências
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . '/api/v1/check-transfers');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: ' . $_SERVER['HTTP_AUTHORIZATION']]);
    $response = curl_exec($ch);
    curl_close($ch);
    
    if ($response) {
        $transfersResult = json_decode($response, true);
        $result['transfers'] = $transfersResult['data'] ?? [];
    }
    
    // Calcular total de problemas corrigidos
    $totalFixed = ($result['data_integrity']['fixed'] ?? 0) + ($result['transfers']['fixed'] ?? 0);
    $result['total_fixed'] = $totalFixed;
    
    json(['data' => $result]);
});

// Dashboard summary
$router->add('GET', '/api/v1/dashboard/summary', function(){ Middleware::requireAuth();
    $id=$GLOBALS['auth_user_id'];$pdo=DB::conn();
    $from=$_GET['from']??date('Y-m-01'); $to=$_GET['to']??date('Y-m-t');
    
    // Totais por tipo de transação
    $st=$pdo->prepare("SELECT type, SUM(amount) total FROM transactions WHERE user_id=? AND date BETWEEN ? AND ? GROUP BY type");
    $st->execute([$id,$from,$to]); $rows=$st->fetchAll(); $sum=['RECEITA'=>0,'DESPESA'=>0]; foreach($rows as $r){$sum[$r['type']] = (float)$r['total'];}
    $data=['receitas'=>$sum['RECEITA'],'despesas'=>$sum['DESPESA'],'saldo'=>$sum['RECEITA']-$sum['DESPESA']];
    // include aliases expected by frontend
    $data['totalReceitas']=$data['receitas'];
    $data['totalDespesas']=$data['despesas'];
    
    // Tendência de receitas e despesas (últimos 6 meses)
    $trends = [];
    for ($i = 5; $i >= 0; $i--) {
        $monthStart = date('Y-m-01', strtotime("-$i months"));
        $monthEnd = date('Y-m-t', strtotime("-$i months"));
        $monthLabel = date('M/Y', strtotime($monthStart));
        
        $stTrend = $pdo->prepare("SELECT type, SUM(amount) total FROM transactions 
                               WHERE user_id=? AND date BETWEEN ? AND ? GROUP BY type");
        $stTrend->execute([$id, $monthStart, $monthEnd]);
        $monthData = $stTrend->fetchAll();
        $monthSum = ['RECEITA' => 0, 'DESPESA' => 0];
        foreach ($monthData as $r) {
            $monthSum[$r['type']] = (float)$r['total'];
        }
        
        $trends[] = [
            'month' => $monthLabel,
            'receitas' => $monthSum['RECEITA'],
            'despesas' => $monthSum['DESPESA'],
            'saldo' => $monthSum['RECEITA'] - $monthSum['DESPESA']
        ];
    }
    $data['trends'] = $trends;
    
    // per-account balances
    $accs=$pdo->prepare('SELECT id,name,opening_balance,type FROM accounts WHERE user_id=? AND archived_at IS NULL ORDER BY display_order,name');
    $accs->execute([$id]); $accounts=$accs->fetchAll();
    foreach($accounts as &$a){ 
        // Saldo total
        $s=$pdo->prepare('SELECT COALESCE(SUM(CASE WHEN type="RECEITA" THEN amount WHEN type="DESPESA" THEN -amount ELSE 0 END),0) FROM transactions WHERE user_id=? AND account_id=?'); 
        $s->execute([$id,$a['id']]); 
        $mv=(float)$s->fetchColumn(); 
        $a['balance']=(float)$a['opening_balance']+$mv; 
        
        // Movimentação do mês atual
        $s=$pdo->prepare('SELECT COALESCE(SUM(CASE WHEN type="RECEITA" THEN amount WHEN type="DESPESA" THEN -amount ELSE 0 END),0) FROM transactions WHERE user_id=? AND account_id=? AND date BETWEEN ? AND ?'); 
        $s->execute([$id,$a['id'],$from,$to]); 
        $a['month_movement']=(float)$s->fetchColumn(); 
    }
    $data['accounts']=$accounts;
    
    // Top 5 categorias de despesas do mês
    $stTopCat = $pdo->prepare("SELECT c.name, SUM(t.amount) total 
                            FROM transactions t 
                            LEFT JOIN categories c ON c.id=t.category_id 
                            WHERE t.user_id=? AND t.type='DESPESA' AND t.date BETWEEN ? AND ? 
                            GROUP BY c.name 
                            ORDER BY total DESC LIMIT 5");
    $stTopCat->execute([$id,$from,$to]);
    $data['top_categories'] = $stTopCat->fetchAll();
    
    // Resumo de orçamentos do mês
    $stBudget = $pdo->prepare("SELECT 
                              b.category_id, 
                              c.name as category, 
                              b.amount as budget, 
                              COALESCE(SUM(t.amount), 0) as spent 
                            FROM budgets b 
                            JOIN categories c ON c.id=b.category_id 
                            LEFT JOIN transactions t ON t.category_id=b.category_id AND t.type='DESPESA' AND t.date BETWEEN ? AND ? AND t.user_id=? 
                            WHERE b.user_id=? AND b.month=? 
                            GROUP BY b.category_id, c.name, b.amount 
                            ORDER BY c.name");
    $stBudget->execute([$from, $to, $id, $id, date('Y-m-01')]);
    $data['budgets'] = $stBudget->fetchAll();
    
    json(['data'=>$data]);
});

// Payees CRUD
$router->add('GET', '/api/v1/payees', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $st=$pdo->prepare('SELECT * FROM payees WHERE user_id=? ORDER BY name'); $st->execute([$uid]); json(['data'=>$st->fetchAll()]); });
$router->add('POST', '/api/v1/payees', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $in=json_decode(file_get_contents('php://input'),true)?:[]; $name=trim($in['name']??($in['nome']??'')); if(!$name) json(['error'=>['message'=>'Nome obrigatório']],422); $pdo->prepare('INSERT INTO payees (user_id,name,created_at) VALUES (?,?,NOW())')->execute([$uid,$name]); json(['data'=>['ok'=>true]]); });
$router->add('PUT', '/api/v1/payees', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $in=json_decode(file_get_contents('php://input'),true)?:[]; $pid=(int)($in['id']??0); $name=trim($in['name']??''); $pdo->prepare('UPDATE payees SET name=? WHERE id=? AND user_id=?')->execute([$name,$pid,$uid]); json(['data'=>['ok'=>true]]); });
$router->add('DELETE', '/api/v1/payees', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $pid=(int)($_GET['id']??0); $pdo->prepare('UPDATE transactions SET payee_id=NULL WHERE user_id=? AND payee_id=?')->execute([$uid,$pid]); $pdo->prepare('DELETE FROM payees WHERE id=? AND user_id=?')->execute([$pid,$uid]); json(['data'=>['ok'=>true]]); });

// Tags CRUD
$router->add('GET', '/api/v1/tags', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $st=$pdo->prepare('SELECT * FROM tags WHERE user_id=? ORDER BY name'); $st->execute([$uid]); json(['data'=>$st->fetchAll()]); });
$router->add('POST', '/api/v1/tags', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $in=json_decode(file_get_contents('php://input'),true)?:[]; $name=trim($in['name']??($in['nome']??'')); if(!$name) json(['error'=>['message'=>'Nome obrigatório']],422); $pdo->prepare('INSERT INTO tags (user_id,name,created_at) VALUES (?,?,NOW())')->execute([$uid,$name]); json(['data'=>['ok'=>true]]); });
$router->add('PUT', '/api/v1/tags', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $in=json_decode(file_get_contents('php://input'),true)?:[]; $tid=(int)($in['id']??0); $name=trim($in['name']??''); $pdo->prepare('UPDATE tags SET name=? WHERE id=? AND user_id=?')->execute([$name,$tid,$uid]); json(['data'=>['ok'=>true]]); });
$router->add('DELETE', '/api/v1/tags', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $tid=(int)($_GET['id']??0); $pdo->prepare('DELETE FROM transaction_tags WHERE tag_id IN (SELECT id FROM tags WHERE id=? AND user_id=?)')->execute([$tid,$uid]); $pdo->prepare('DELETE FROM tags WHERE id=? AND user_id=?')->execute([$tid,$uid]); json(['data'=>['ok'=>true]]); });

// Attachments for transactions
$router->add('GET', '/api/v1/transactions/attachments', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $tid=(int)($_GET['transactionId']??0); $st=$pdo->prepare('SELECT id,filename,size,created_at FROM attachments WHERE user_id=? AND transaction_id=? ORDER BY id'); $st->execute([$uid,$tid]); json(['data'=>$st->fetchAll()]); });
$router->add('POST', '/api/v1/transactions/attachments', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); if(!isset($_POST['transactionId'])) json(['error'=>['message'=>'transactionId requerido']],422); $tid=(int)$_POST['transactionId']; if(!isset($_FILES['file'])) json(['error'=>['message'=>'Arquivo requerido']],422); $up=$_FILES['file']; if($up['error']!==UPLOAD_ERR_OK) json(['error'=>['message'=>'Falha no upload']],400); $dir=__DIR__.'/../uploads/'.intval($uid); if(!is_dir($dir)) { @mkdir($dir,0775,true); } $safe=uniqid().'_'.preg_replace('/[^A-Za-z0-9_.-]/','_', $up['name']); $path=$dir.'/'.$safe; if(!move_uploaded_file($up['tmp_name'],$path)) json(['error'=>['message'=>'Não foi possível salvar']],500); $pdo->prepare('INSERT INTO attachments (user_id,transaction_id,filename,path,mime,size,created_at) VALUES (?,?,?,?,?,?,NOW())')->execute([$uid,$tid,$up['name'],$safe,$up['type']??null,$up['size']??null]); json(['data'=>['ok'=>true]]); });
$router->add('GET', '/api/v1/attachments', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $aid=(int)($_GET['id']??0); $st=$pdo->prepare('SELECT id,filename,path,mime,size FROM attachments WHERE id=? AND user_id=?'); $st->execute([$aid,$uid]); $a=$st->fetch(); if(!$a) { http_response_code(404); echo 'Not found'; return; } $file=__DIR__.'/../uploads/'.intval($uid).'/'.$a['path']; if(!is_file($file)) { http_response_code(404); echo 'Not found'; return; } header('Content-Type: '.($a['mime']?:'application/octet-stream')); header('Content-Disposition: attachment; filename="'.basename($a['filename']).'"'); header('Content-Length: '.filesize($file)); readfile($file); });
$router->add('DELETE', '/api/v1/attachments', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $aid=(int)($_GET['id']??0); $st=$pdo->prepare('SELECT path FROM attachments WHERE id=? AND user_id=?'); $st->execute([$aid,$uid]); $a=$st->fetch(); if($a){ $file=__DIR__.'/../uploads/'.intval($uid).'/'.$a['path']; @unlink($file); $pdo->prepare('DELETE FROM attachments WHERE id=? AND user_id=?')->execute([$aid,$uid]); } json(['data'=>['ok'=>true]]); });

// Reconciliation / Status
$router->add('PATCH', '/api/v1/transactions/status', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $in=json_decode(file_get_contents('php://input'),true)?:[]; $tid=(int)($in['id']??0); $status=$in['status']??null; if(!in_array($status,['PENDING','CLEARED','RECONCILED'])) json(['error'=>['message'=>'Status inválido']],422); $pdo->prepare('UPDATE transactions SET status=? WHERE id=? AND user_id=?')->execute([$status,$tid,$uid]); json(['data'=>['ok'=>true]]); });
$router->add('POST', '/api/v1/reconcile', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $in=json_decode(file_get_contents('php://input'),true)?:[]; $ids=$in['ids']??[]; if(!is_array($ids)||!count($ids)) json(['error'=>['message'=>'ids requeridos']],422); $ph=str_repeat('?,',count($ids)); $ph=rtrim($ph,','); $args=array_merge(['RECONCILED'],$ids,[$uid]); $pdo->prepare("UPDATE transactions SET status=? WHERE id IN ($ph) AND user_id=?")->execute($args); json(['data'=>['ok'=>true]]); });

// CSV Export
$router->add('GET', '/api/v1/transactions/export-csv', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename=transacoes.csv'); $out=fopen('php://output','w'); fputcsv($out,['date','description','type','amount','account_id','category_id','payee_id','status']); $q='SELECT date,description,type,amount,account_id,category_id,payee_id,status FROM transactions WHERE user_id=?'; $args=[$uid]; $normalize=function($s){ $t=trim((string)$s); if($t==='') return $t; if(preg_match('/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/',$t,$m)){ return sprintf('%04d-%02d-%02d',(int)$m[1],(int)$m[2],(int)$m[3]); } if(preg_match('/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$/',$t,$m)){ $yy=strlen($m[3])===2? (2000+(int)$m[3]):(int)$m[3]; return sprintf('%04d-%02d-%02d',$yy,(int)$m[2],(int)$m[1]); } return $t; }; if(isset($_GET['from'])){$q.=' AND date>=?';$args[]=$normalize($_GET['from']);} if(isset($_GET['to'])){$q.=' AND date<=?';$args[]=$normalize($_GET['to']);} if(isset($_GET['accountId'])){$q.=' AND account_id=?';$args[]=(int)$_GET['accountId'];} $q.=' ORDER BY date,id'; $st=$pdo->prepare($q); $st->execute($args); while($r=$st->fetch(PDO::FETCH_NUM)){ fputcsv($out,$r); } fclose($out); });

// CSV Import
$router->add('POST', '/api/v1/transactions/import-csv', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); if(!isset($_FILES['file'])) json(['error'=>['message'=>'Arquivo requerido']],422); $up=$_FILES['file']; if($up['error']!==UPLOAD_ERR_OK) json(['error'=>['message'=>'Falha no upload']],400); $fh=fopen($up['tmp_name'],'r'); if(!$fh) json(['error'=>['message'=>'Não foi possível ler arquivo']],400); $header=fgetcsv($fh); $map=array_flip(array_map('strtolower',$header)); $ins=0;$skip=0; 
    $normDate=function($s){ $t=trim((string)$s); if($t==='') return null; 
        $valid=function($y,$m,$d){ $yy=(int)$y; $mm=(int)$m; $dd=(int)$d; if($yy<1900||$mm<1||$mm>12||$dd<1||$dd>31) return false; return checkdate($mm,$dd,$yy); };
        if(preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/',$t,$m)){
            $y=$m[1]; $mm=str_pad($m[2],2,'0',STR_PAD_LEFT); $dd=str_pad($m[3],2,'0',STR_PAD_LEFT);
            if(!$valid($y,$mm,$dd)) return null; return "$y-$mm-$dd"; }
        if(preg_match('/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})$/',$t,$m)){
            $dd=str_pad($m[1],2,'0',STR_PAD_LEFT); $mm=str_pad($m[2],2,'0',STR_PAD_LEFT); $yy=strlen($m[3])===2? ('20'.$m[3]):$m[3];
            if(!$valid($yy,$mm,$dd)) return null; return "$yy-$mm-$dd"; }
        if(preg_match('/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/',$t,$m)){
            $dd=str_pad($m[1],2,'0',STR_PAD_LEFT); $mm=str_pad($m[2],2,'0',STR_PAD_LEFT); $yy=strlen($m[3])===2? ('20'.$m[3]):$m[3];
            if(!$valid($yy,$mm,$dd)) return null; return "$yy-$mm-$dd"; }
        return null; };
    $normAmount=function($s){ $v=trim((string)$s); if($v==='') return 0.0; $neg=false; if(preg_match('/^\(.*\)$/',$v)){ $neg=true; $v=substr($v,1,-1);} if(strpos($v,'-')===0){ $neg=true; $v=substr($v,1);} // comma decimal?
        if(preg_match('/^\d{1,3}(\.\d{3})*,\d{1,2}$/',$v) || (strpos($v,',')!==false && strpos($v,'.')===false)){ $v=str_replace('.','',$v); $v=str_replace(',', '.', $v); } else { $v=str_replace(',', '', $v); }
        $n=(float)$v; return $neg? -$n: $n; };
    $normType=function($v,$amt){ $t=strtolower(trim((string)$v)); if($t==='income'||$t==='receita'||$t==='entrada') return 'RECEITA'; if($t==='expense'||$t==='despesa'||$t==='saida'||$t==='saída') return 'DESPESA'; if($t==='transfer'||$t==='transferencia'||$t==='transferência') return 'TRANSFER'; if($t==='') { return $amt<0? 'DESPESA':'RECEITA'; } return strtoupper($t); };
    while(($row=fgetcsv($fh))!==false){ $get=function($key) use ($map,$row){ $k=strtolower($key); return isset($map[$k])? $row[$map[$k]]: null; }; $rawDate=$get('date'); $desc=$get('description'); $rawType=$get('type'); $rawAmount=$get('amount'); $accountId=(int)($get('account_id')?:0); $categoryId=$get('category_id')?:null; $payeeId=$get('payee_id')?:null; $status=$get('status')?:'CLEARED'; 
        $date=$normDate($rawDate); $amt=$normAmount($rawAmount); $type=$normType($rawType,$amt);
        if(!$date||!$type||!$accountId||$amt==0){ $skip++; continue; }
        $amount=abs($amt); // store positive; type defines sign in reports
        $pdo->prepare('INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,payee_id,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())')->execute([$uid,$accountId,$type,$amount,$date,$desc,$categoryId,$payeeId,$status]); $ins++; }
    fclose($fh); json(['data'=>['inserted'=>$ins,'skipped'=>$skip]]); });

// Reports
$router->add('GET', '/api/v1/reports/by-category', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $from=$_GET['from']??date('Y-m-01'); $to=$_GET['to']??date('Y-m-t'); $q='SELECT c.name, t.type, SUM(t.amount) total FROM transactions t LEFT JOIN categories c ON c.id=t.category_id WHERE t.user_id=? AND t.date BETWEEN ? AND ? GROUP BY c.name, t.type ORDER BY c.name'; $st=$pdo->prepare($q); $st->execute([$uid,$from,$to]); json(['data'=>$st->fetchAll()]); });
$router->add('GET', '/api/v1/reports/by-payee', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $from=$_GET['from']??date('Y-m-01'); $to=$_GET['to']??date('Y-m-t'); $q='SELECT p.name, t.type, SUM(t.amount) total FROM transactions t LEFT JOIN payees p ON p.id=t.payee_id WHERE t.user_id=? AND t.date BETWEEN ? AND ? GROUP BY p.name, t.type ORDER BY p.name'; $st=$pdo->prepare($q); $st->execute([$uid,$from,$to]); json(['data'=>$st->fetchAll()]); });
$router->add('GET', '/api/v1/reports/by-tag', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $from=$_GET['from']??date('Y-m-01'); $to=$_GET['to']??date('Y-m-t'); $q='SELECT g.name, t.type, SUM(t.amount) total FROM transactions t JOIN transaction_tags tt ON tt.transaction_id=t.id JOIN tags g ON g.id=tt.tag_id WHERE t.user_id=? AND t.date BETWEEN ? AND ? GROUP BY g.name, t.type ORDER BY g.name'; $st=$pdo->prepare($q); $st->execute([$uid,$from,$to]); json(['data'=>$st->fetchAll()]); });

// Recurring run (manual trigger)
$router->add('POST', '/api/v1/recurring/run', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $today=date('Y-m-d'); $st=$pdo->prepare('SELECT * FROM recurring_rules WHERE user_id=? AND next_run<=? AND (end_date IS NULL OR next_run<=end_date)'); $st->execute([$uid,$today]); $rows=$st->fetchAll(); $created=0; foreach($rows as $r){ $pdo->prepare('INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,payee_id,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())')->execute([$uid,$r['account_id'],$r['type'],$r['amount'],$r['next_run'],$r['description'],$r['category_id'],$r['payee_id'],'PENDING']); $created++; $next=$r['next_run']; if($r['interval_unit']==='day'){ $next=date('Y-m-d', strtotime($next.' +'.$r['interval_count'].' days')); } elseif($r['interval_unit']==='week'){ $next=date('Y-m-d', strtotime($next.' +'.$r['interval_count'].' weeks')); } else { $next=date('Y-m-d', strtotime($next.' +'.$r['interval_count'].' months')); } $pdo->prepare('UPDATE recurring_rules SET next_run=? WHERE id=?')->execute([$next,$r['id']]); } json(['data'=>['created'=>$created]]); });

// Budgets CRUD
$router->add('GET', '/api/v1/budgets', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $month=$_GET['month']??date('Y-m-01'); $q='SELECT b.id,b.category_id,b.month,b.amount,c.name as category FROM budgets b JOIN categories c ON c.id=b.category_id WHERE b.user_id=? AND b.month=? ORDER BY c.name'; $st=$pdo->prepare($q); $st->execute([$uid,$month]); json(['data'=>$st->fetchAll()]); });
$router->add('POST', '/api/v1/budgets', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $in=json_decode(file_get_contents('php://input'),true)?:[]; $cat=(int)($in['categoryId']??0); $month=$in['month']??date('Y-m-01'); $amount=(float)($in['amount']??0); if(!$cat||!$month) json(['error'=>['message'=>'Dados inválidos']],422); // upsert
    $st=$pdo->prepare('SELECT id FROM budgets WHERE user_id=? AND category_id=? AND month=?'); $st->execute([$uid,$cat,$month]); $ex=$st->fetchColumn(); if($ex){ $pdo->prepare('UPDATE budgets SET amount=? WHERE id=?')->execute([$amount,$ex]); } else { $pdo->prepare('INSERT INTO budgets (user_id,category_id,month,amount) VALUES (?,?,?,?)')->execute([$uid,$cat,$month,$amount]); }
    json(['data'=>['ok'=>true]]);
});
$router->add('DELETE', '/api/v1/budgets', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $id=(int)($_GET['id']??0); $pdo->prepare('DELETE FROM budgets WHERE id=? AND user_id=?')->execute([$id,$uid]); json(['data'=>['ok'=>true]]); });

// Goals CRUD
$router->add('GET', '/api/v1/goals', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn();
    $hasTargetDate = false; $hasDueDate = false; $hasArchived = false; $hasInitial = false; $hasStrategy = false; $hasAccount = false; $hasCategory = false; $hasPlanned = false; $hasPriority=false;
    try { $stc=$pdo->prepare("SHOW COLUMNS FROM `goals` LIKE 'target_date'"); $stc->execute(); $hasTargetDate = (bool)$stc->fetch(); } catch (\Throwable $e) {}
    try { $stc=$pdo->prepare("SHOW COLUMNS FROM `goals` LIKE 'due_date'"); $stc->execute(); $hasDueDate = (bool)$stc->fetch(); } catch (\Throwable $e) {}
    foreach(['archived_at'=>'hasArchived','initial_amount'=>'hasInitial','strategy'=>'hasStrategy','account_id'=>'hasAccount','category_id'=>'hasCategory','planned_monthly_amount'=>'hasPlanned','priority'=>'hasPriority'] as $col=>$flag){ try{ $c=$pdo->prepare("SHOW COLUMNS FROM `goals` LIKE '$col'"); $c->execute(); $$flag=(bool)$c->fetch(); }catch(\Throwable $e){} }
    $includeArchived = ($_GET['includeArchived'] ?? '0') === '1';
    $q = 'SELECT * FROM goals WHERE user_id=?';
    $args = [$uid];
    if (!$includeArchived && $hasArchived) { $q .= ' AND archived_at IS NULL'; }
    if ($hasTargetDate) {
        $q .= ' ORDER BY target_date IS NULL, target_date, id';
    } elseif ($hasDueDate) {
        $q .= ' ORDER BY due_date IS NULL, due_date, id';
    } else {
        $q .= ' ORDER BY id';
    }
    $st=$pdo->prepare($q); $st->execute($args); $rows=$st->fetchAll();
    $today = new DateTime(date('Y-m-d'));
    // Detect if transactions.goal_id exists to link contributions to goals
    $hasGoalId = false; try { $c=$pdo->query("SHOW COLUMNS FROM `transactions` LIKE 'goal_id'"); $hasGoalId=(bool)$c->fetch(); } catch (\Throwable $e) {}
    foreach($rows as &$g){
        // Compute accumulated
        $initial = (float)($hasInitial? ($g['initial_amount'] ?? 0) : 0);
        $accumulated = $initial;
        $strategy = $hasStrategy? ($g['strategy'] ?? 'linear') : 'linear';
        if ($strategy === 'linear') {
            // Sum only credit (RECEITA) transactions linked to this goal when goal_id is available
            if ($hasGoalId) {
                $st2=$pdo->prepare("SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE user_id=? AND goal_id=? AND type='RECEITA'");
                $st2->execute([$uid,$g['id']]); $accumulated += (float)$st2->fetchColumn();
            }
        } else { // por_alocacao
            $cond=[]; $args2=[$uid];
            if ($hasAccount && !empty($g['account_id'])) { $cond[] = 'account_id=?'; $args2[] = $g['account_id']; }
            if ($hasCategory && !empty($g['category_id'])) { $cond[] = 'category_id=?'; $args2[] = $g['category_id']; }
            if (count($cond)) {
                $st2=$pdo->prepare('SELECT COALESCE(SUM(amount),0) FROM transactions WHERE user_id=? AND type=\'RECEITA\' AND ('.implode(' OR ',$cond).')');
                $st2->execute($args2); $accumulated += (float)$st2->fetchColumn();
            }
        }
        $target = (float)$g['target_amount'];
        $remaining = max(0.0, $target - $accumulated);
        $percent = $target>0 ? min(100.0, ($accumulated/$target)*100.0) : 0.0;
        $months_left = null; $suggested_monthly = null;
        $tgtDate = $hasTargetDate ? ($g['target_date'] ?? null) : ($hasDueDate ? ($g['due_date'] ?? null) : null);
        if (!empty($tgtDate)) {
            try { $due = new DateTime($tgtDate); $diff = $today->diff($due); $m = ($diff->y*12) + $diff->m + ($diff->d>0?1:0); if ($m < 1) $m = 1; $months_left = $m; if ($strategy === 'linear') { $suggested_monthly = (float)ceil($remaining / $m); } } catch (\Throwable $e) {}
        } else {
            if ($hasPlanned && is_null($months_left) && ($g['planned_monthly_amount'] ?? null) !== null) { $suggested_monthly = (float)$g['planned_monthly_amount']; }
        }
        $g['accumulated'] = (float)$accumulated;
        $g['current_amount'] = (float)$accumulated; // Frontend expects current_amount
        $g['remaining'] = (float)$remaining;
        $g['percent'] = (float)$percent;
        $g['months_left'] = $months_left;
        $g['suggested_monthly'] = $suggested_monthly;
        $g['status'] = ($accumulated >= $target) ? 'Concluida' : 'Ativa';
    }
    json(['data'=>$rows]);
});

$router->add('POST', '/api/v1/goals', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn();
    // detect columns for compatibility
    $has = function($col) use ($pdo){ try{ $s=$pdo->prepare("SHOW COLUMNS FROM `goals` LIKE ?"); $s->execute([$col]); return (bool)$s->fetch(); }catch(\Throwable $e){ return false; } };
    $in=json_decode(file_get_contents('php://input'),true)?:[];
    $name=trim($in['name']??'');
    $type=$in['type']??'poupanca'; if(!in_array($type,['poupanca','quitar_divida'])) $type='poupanca';
    $target=(float)($in['target_amount']??0);
    $initial=(float)($in['initial_amount']??0);
    $strategy=$in['strategy']??'linear'; if(!in_array($strategy,['linear','por_alocacao'])) $strategy='linear';
    $account_id=$in['account_id']??null; if($account_id!==null && $account_id!=='' && $account_id!==0) $account_id=(int)$account_id; else $account_id=null;
    $category_id=$in['category_id']??null; if($category_id!==null && $category_id!=='' && $category_id!==0) $category_id=(int)$category_id; else $category_id=null;
    $target_date=$in['target_date']??($in['due_date']??null);
    $planned=$in['planned_monthly_amount']??null; if($planned!==null && $planned!=='' && $planned!==0) $planned=(float)$planned; else $planned=null;
    $rec_day=$in['recurring_day']??null; if($rec_day!==null && $rec_day!=='' && $rec_day!==0) $rec_day=(int)$rec_day; else $rec_day=null;
    $priority=$in['priority']??'media'; if(!in_array($priority,['baixa','media','alta'])) $priority='media';
    // Garantir que priority nunca seja null
    if($priority === null || $priority === '') $priority = 'media';
    // validations
    if(!$name||$target<=0) json(['error'=>['message'=>'Dados inválidos']],422);
    if($target_date && strtotime($target_date) < strtotime(date('Y-m-d'))) json(['error'=>['message'=>'Data-limite no passado']],422);
    if($strategy==='por_alocacao' && !$account_id && !$category_id && $has('strategy')) json(['error'=>['message'=>'Conta ou categoria requerida para por_alocacao']],422);
    // Build dynamic insert per available columns
    $cols=['user_id','name','target_amount','created_at'];
    $vals=[$uid,$name,$target,date('Y-m-d H:i:s')];
    if($has('type')){ $cols[]='type'; $vals[]=$type; }
    if($has('initial_amount')){ $cols[]='initial_amount'; $vals[]=$initial; }
    if($has('strategy')){ $cols[]='strategy'; $vals[]=$strategy; }
    if($has('account_id')){ $cols[]='account_id'; $vals[]=$account_id; }
    if($has('category_id')){ $cols[]='category_id'; $vals[]=$category_id; }
    if($has('target_date')){ $cols[]='target_date'; $vals[]=$target_date; } elseif($has('due_date')) { $cols[]='due_date'; $vals[]=$target_date; }
    if($has('planned_monthly_amount')){ $cols[]='planned_monthly_amount'; $vals[]=$planned; }
    if($has('recurring_day')){ $cols[]='recurring_day'; $vals[]=$rec_day; }
    if($has('priority')){ $cols[]='priority'; $vals[]=$priority; }
    if(!$has('initial_amount') && $has('current_amount')){ $cols[]='current_amount'; $vals[]=$initial; }
    $place = implode(',', array_fill(0,count($cols),'?'));
    $pdo->prepare('INSERT INTO goals ('.implode(',',$cols).') VALUES ('.$place.')')->execute($vals);
    json(['data'=>['ok'=>true]]);
});

$router->add('PUT', '/api/v1/goals', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn();
    $has = function($col) use ($pdo){ try{ $s=$pdo->prepare("SHOW COLUMNS FROM `goals` LIKE ?"); $s->execute([$col]); return (bool)$s->fetch(); }catch(\Throwable $e){ return false; } };
    $in=json_decode(file_get_contents('php://input'),true)?:[]; $gid=(int)($in['id']??0); if(!$gid) json(['error'=>['message'=>'ID requerido']],422);
    $fields=[]; $args=[];
    foreach(['name','type','strategy','priority'] as $k){ if(isset($in[$k]) && $has($k)){ $fields[]="$k=?"; $v=$in[$k]; if($k==='type'&&!in_array($v,['poupanca','quitar_divida'])) $v='poupanca'; if($k==='strategy'&&!in_array($v,['linear','por_alocacao'])) $v='linear'; if($k==='priority'&&!in_array($v,['baixa','media','alta'])) $v='media'; $args[]=$v; } }
    foreach(['target_amount','initial_amount','planned_monthly_amount'] as $k){ if(array_key_exists($k,$in) && $has($k)){ $fields[]="$k=?"; $args[]=$in[$k]!==null && $in[$k]!=='' && $in[$k]!==0 ?(float)$in[$k]:null; } }
    foreach(['account_id','category_id','recurring_day'] as $k){ if(array_key_exists($k,$in) && $has($k)){ $fields[]="$k=?"; $args[]=$in[$k]!==null && $in[$k]!=='' && $in[$k]!==0 ? (int)$in[$k]: null; } }
    if(array_key_exists('target_date',$in) || array_key_exists('due_date',$in)){ if($has('target_date')) { $fields[]='target_date=?'; $args[]=$in['target_date']??($in['due_date']??null); } elseif($has('due_date')) { $fields[]='due_date=?'; $args[]=$in['target_date']??($in['due_date']??null); } }
    if(array_key_exists('archived_at',$in) && $has('archived_at')){ $fields[]='archived_at=?'; $args[]=$in['archived_at']; }
    if(!count($fields)) json(['error'=>['message'=>'Nada a atualizar']],422);
    // validations minimal
    if(isset($in['target_amount']) && (float)$in['target_amount']<=0) json(['error'=>['message'=>'target_amount inválido']],422);
    if(isset($in['strategy']) && $in['strategy']==='por_alocacao' && empty($in['account_id']) && empty($in['category_id']) && $has('strategy')){ /* allow if already set on DB */ }
    $args[]=$gid; $args[]=$uid;
    $pdo->prepare('UPDATE goals SET '.implode(',', $fields).' WHERE id=? AND user_id=?')->execute($args);
    json(['data'=>['ok'=>true]]);
});

$router->add('POST', '/api/v1/goals/contribute', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn();
    $in=json_decode(file_get_contents('php://input'),true)?:[]; $gid=(int)($in['id']??0); $amt=(float)($in['amount']??0); $date=$in['date']??date('Y-m-d');
    if(!$gid||$amt<=0) json(['error'=>['message'=>'Dados inválidos']],422);
    $st=$pdo->prepare('SELECT * FROM goals WHERE id=? AND user_id=?'); $st->execute([$gid,$uid]); $g=$st->fetch(); if(!$g) json(['error'=>['message'=>'Meta não encontrada']],404);
    $accId = isset($in['account_id']) && $in['account_id']!==null && $in['account_id']!=='' ? (int)$in['account_id'] : ($g['account_id']??null);
    if(!$accId) json(['error'=>['message'=>'Conta destino requerida para aporte']],422);
    $sourceAccId = isset($in['source_account_id']) && $in['source_account_id']!==null && $in['source_account_id']!=='' ? (int)$in['source_account_id'] : null;
    if(!$sourceAccId) json(['error'=>['message'=>'Conta origem requerida para aporte']],422);
    if($sourceAccId === $accId) json(['error'=>['message'=>'A conta origem deve ser diferente da conta destino']],422);
    $catId = isset($in['category_id']) && $in['category_id']!==null && $in['category_id']!=='' ? (int)$in['category_id'] : ($g['category_id']??null);
    $hasGoalId = false; try { $c=$pdo->query("SHOW COLUMNS FROM `transactions` LIKE 'goal_id'"); $hasGoalId=(bool)$c->fetch(); } catch (\Throwable $e) {}
    
    // Start transaction
    $pdo->beginTransaction();
    try {
        // Create debit transaction in source account (do NOT link to goal to avoid canceling accumulation)
        $pdo->prepare('INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,status,created_at) VALUES (?,?,?,?,?,?,?,?,NOW())')
            ->execute([$uid,$sourceAccId,'DESPESA',$amt,$date,'Transferência para meta: '.$g['name'],$catId,'CLEARED']);
        
        // Create credit transaction in destination account
        if ($hasGoalId) {
            $pdo->prepare('INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,status,goal_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())')
                ->execute([$uid,$accId,'RECEITA',$amt,$date,'Aporte para meta: '.$g['name'],$catId,'CLEARED',$gid]);
        } else {
            $pdo->prepare('INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,status,created_at) VALUES (?,?,?,?,?,?,?,?,NOW())')
                ->execute([$uid,$accId,'RECEITA',$amt,$date,'Aporte para meta: '.$g['name'],$catId,'CLEARED']);
        }
        
        $pdo->commit();
    } catch (\Exception $e) {
        $pdo->rollback();
        json(['error'=>['message'=>'Erro ao processar transferência']],500);
    }
    json(['data'=>['ok'=>true]]);
});

$router->add('POST', '/api/v1/goals/archive', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn();
    $in=json_decode(file_get_contents('php://input'),true)?:[]; $gid=(int)($in['id']??0); if(!$gid) json(['error'=>['message'=>'ID requerido']],422);
    $hasArchived = false; try { $c=$pdo->query("SHOW COLUMNS FROM `goals` LIKE 'archived_at'"); $hasArchived=(bool)$c->fetch(); } catch (\Throwable $e) {}
    if ($hasArchived) { $pdo->prepare('UPDATE goals SET archived_at=NOW() WHERE id=? AND user_id=?')->execute([$gid,$uid]); }
    else { $pdo->prepare('DELETE FROM goals WHERE id=? AND user_id=?')->execute([$gid,$uid]); }
    json(['data'=>['ok'=>true]]);
});

$router->add('DELETE', '/api/v1/goals', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn();
    $gid=(int)($_GET['id']??0); if(!$gid) json(['error'=>['message'=>'ID requerido']],422);
    // Nullify goal_id on transactions if column exists
    $hasGoalId = false; try { $c=$pdo->query("SHOW COLUMNS FROM `transactions` LIKE 'goal_id'"); $hasGoalId=(bool)$c->fetch(); } catch (\Throwable $e) {}
    if ($hasGoalId) { $pdo->prepare('UPDATE transactions SET goal_id=NULL WHERE user_id=? AND goal_id=?')->execute([$uid,$gid]); }
    $pdo->prepare('DELETE FROM goals WHERE id=? AND user_id=?')->execute([$gid,$uid]);
    json(['data'=>['ok'=>true]]);
});

// Recurring rules CRUD
$router->add('GET', '/api/v1/recurring', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $st=$pdo->prepare('SELECT * FROM recurring_rules WHERE user_id=? ORDER BY next_run'); $st->execute([$uid]); json(['data'=>$st->fetchAll()]); });
$router->add('POST', '/api/v1/recurring', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $in=json_decode(file_get_contents('php://input'),true)?:[]; $acc=(int)($in['account_id']??0); $type=strtoupper($in['type']??''); $amount=(float)($in['amount']??0); $desc=$in['description']??null; $cat=$in['category_id']??null; $payee=$in['payee_id']??null; $unit=$in['interval_unit']??'month'; $cnt=(int)($in['interval_count']??1); $next=$in['next_run']??date('Y-m-d'); $end=$in['end_date']??null; if(!$acc||!in_array($type,['RECEITA','DESPESA'])||$amount<=0) json(['error'=>['message'=>'Dados inválidos']],422); $pdo->prepare('INSERT INTO recurring_rules (user_id,account_id,type,amount,description,category_id,payee_id,interval_unit,interval_count,next_run,end_date,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW())')->execute([$uid,$acc,$type,$amount,$desc,$cat,$payee,$unit,$cnt,$next,$end]); json(['data'=>['ok'=>true]]); });
$router->add('PUT', '/api/v1/recurring', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $in=json_decode(file_get_contents('php://input'),true)?:[]; $rid=(int)($in['id']??0); if(!$rid) json(['error'=>['message'=>'ID requerido']],422); $fields=[];$args=[]; foreach(['account_id','type','amount','description','category_id','payee_id','interval_unit','interval_count','next_run','end_date'] as $k){ if(array_key_exists($k,$in)){ $fields[]="$k=?"; $args[]=$in[$k]; } } if(!count($fields)) json(['error'=>['message'=>'Nada a atualizar']],422); $args[]=$rid; $args[]=$uid; $pdo->prepare('UPDATE recurring_rules SET '.implode(',', $fields).' WHERE id=? AND user_id=?')->execute($args); json(['data'=>['ok'=>true]]); });
$router->add('DELETE', '/api/v1/recurring', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); $rid=(int)($_GET['id']??0); $pdo->prepare('DELETE FROM recurring_rules WHERE id=? AND user_id=?')->execute([$rid,$uid]); json(['data'=>['ok'=>true]]); });

// Debug endpoint to check and fix database schema
$router->add('GET', '/api/v1/debug/schema', function(){
    $pdo=DB::conn();
    $result = [];
    
    try {
        // Check if goal_id column exists
        $stmt = $pdo->query("SHOW COLUMNS FROM transactions LIKE 'goal_id'");
        $hasGoalId = (bool)$stmt->fetch();
        $result['goal_id_exists'] = $hasGoalId;
        
        if (!$hasGoalId) {
            $result['action'] = 'Adding goal_id column...';
            
            // Add the column
            $pdo->exec("ALTER TABLE transactions ADD COLUMN goal_id INT NULL");
            $result['column_added'] = true;
            
            // Add the foreign key constraint
            try {
                $pdo->exec("ALTER TABLE transactions ADD CONSTRAINT fk_tx_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE SET NULL");
                $result['foreign_key_added'] = true;
            } catch (Exception $e) {
                $result['foreign_key_error'] = $e->getMessage();
            }
        }
        
        // Verify the column exists now
        $stmt = $pdo->query("SHOW COLUMNS FROM transactions LIKE 'goal_id'");
        $hasGoalId = (bool)$stmt->fetch();
        $result['final_goal_id_exists'] = $hasGoalId;
        
        // Count transactions with goal_id
        $stmt = $pdo->query("SELECT COUNT(*) FROM transactions WHERE goal_id IS NOT NULL");
        $result['transactions_with_goal_id'] = (int)$stmt->fetchColumn();
        
        // List goals
        $stmt = $pdo->query("SELECT id, name, target_amount, initial_amount FROM goals ORDER BY id");
        $result['goals'] = $stmt->fetchAll();
        
        $result['status'] = 'success';
        
    } catch (Exception $e) {
        $result['error'] = $e->getMessage();
        $result['status'] = 'error';
    }
    
    json(['data' => $result]);
});

// Debug endpoint to list transactions with goal_id
$router->add('GET', '/api/v1/debug/goal-transactions', function(){
    $pdo=DB::conn();
    
    try {
        // Check if goal_id column exists first
        $stmt = $pdo->query("SHOW COLUMNS FROM transactions LIKE 'goal_id'");
        $hasGoalId = (bool)$stmt->fetch();
        
        if (!$hasGoalId) {
            json(['error' => 'goal_id column does not exist'], 400);
            return;
        }
        
        // Get transactions with goal_id
        $stmt = $pdo->query("SELECT t.id, t.type, t.amount, t.date, t.description, t.goal_id, g.name as goal_name FROM transactions t LEFT JOIN goals g ON g.id = t.goal_id WHERE t.goal_id IS NOT NULL ORDER BY t.goal_id, t.date DESC");
        $transactions = $stmt->fetchAll();
        
        json(['data' => $transactions]);
        
    } catch (Exception $e) {
        json(['error' => $e->getMessage()], 500);
    }
});
