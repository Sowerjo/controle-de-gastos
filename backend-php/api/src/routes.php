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
        $s=$pdo->prepare('SELECT COALESCE(SUM(CASE WHEN type="RECEITA" THEN amount ELSE -amount END),0) as mv FROM transactions WHERE user_id=? AND account_id=?');
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
    if(isset($_GET['from'])) { $q.=' AND t.date>=?'; $args[]=$_GET['from']; }
    if(isset($_GET['to']))   { $q.=' AND t.date<=?'; $args[]=$_GET['to']; }
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
    $amount=$in['amount']??($in['valor']??null); if ($amount!==null) $amount = (float)$amount;
    $date=$in['date']??($in['data']??null);
    $desc=$in['description']??($in['descricao']??null);
    $cat=$in['categoryId']??($in['categoriaId']??null);
    $acc=$in['accountId']??($in['contaId']??null);
    $payee=$in['payeeId']??null; $payeeName=trim($in['payeeName']??'');
    $status=$in['status']??'CLEARED';
    $tags=$in['tags']??($in['tagIds']??[]); $tagNames=$in['tagNames']??[];
    $splits=$in['splits']??[]; // [{amount, description, categoryId?, payeeId?}]
    if(!$acc||!$type||!$amount||!$date) json(['error'=>['message'=>'Dados incompletos']],422);
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
        $ins=$pdo->prepare('INSERT INTO transaction_splits (transaction_id,amount,description,category_id,payee_id) VALUES (?,?,?,?,?)');
        foreach($splits as $sp){ $amt=(float)($sp['amount']??0); $d=$sp['description']??null; $c=$sp['categoryId']??null; $p=$sp['payeeId']??null; $ins->execute([$txId,$amt,$d,$c,$p]); }
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
    if(array_key_exists('accountId',$in) || array_key_exists('contaId',$in)) { $fields[]='account_id=?'; $args[]=(int)($in['accountId']??$in['contaId']); }
    // type
    if(array_key_exists('type',$in) || array_key_exists('tipo',$in)) { $v=$in['type']??$in['tipo']; if($v==='receita'||$v==='despesa'){ $v=strtoupper($v);} if(!in_array($v,['RECEITA','DESPESA'])) json(['error'=>['message'=>'type inválido']],422); $fields[]='type=?'; $args[]=$v; }
    // amount
    if(array_key_exists('amount',$in) || array_key_exists('valor',$in)) { $amt=(float)($in['amount']??$in['valor']); $fields[]='amount=?'; $args[]=abs($amt); }
    // date
    if(array_key_exists('date',$in) || array_key_exists('data',$in)) { $d=$in['date']??$in['data']; $fields[]='date=?'; $args[]=$d; }
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
    $desc=$in['description']??($in['descricao']??'Transferência');
    if(!$from||!$to||!$amount||!$date||$from===$to) json(['error'=>['message'=>'Dados inválidos']],422);
    $pdo=DB::conn();
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

// Dashboard summary
$router->add('GET', '/api/v1/dashboard/summary', function(){ Middleware::requireAuth();
    $id=$GLOBALS['auth_user_id'];$pdo=DB::conn();
    $from=$_GET['from']??date('Y-m-01'); $to=$_GET['to']??date('Y-m-t');
    $st=$pdo->prepare("SELECT type, SUM(amount) total FROM transactions WHERE user_id=? AND date BETWEEN ? AND ? GROUP BY type");
    $st->execute([$id,$from,$to]); $rows=$st->fetchAll(); $sum=['RECEITA'=>0,'DESPESA'=>0]; foreach($rows as $r){$sum[$r['type']] = (float)$r['total'];}
    $data=['receitas'=>$sum['RECEITA'],'despesas'=>$sum['DESPESA'],'saldo'=>$sum['RECEITA']-$sum['DESPESA']];
    // include aliases expected by frontend
    $data['totalReceitas']=$data['receitas'];
    $data['totalDespesas']=$data['despesas'];
    // per-account balances
    $accs=$pdo->prepare('SELECT id,name,opening_balance FROM accounts WHERE user_id=? AND archived_at IS NULL ORDER BY display_order,name');
    $accs->execute([$id]); $accounts=$accs->fetchAll();
    foreach($accounts as &$a){ $s=$pdo->prepare('SELECT COALESCE(SUM(CASE WHEN type="RECEITA" THEN amount ELSE -amount END),0) FROM transactions WHERE user_id=? AND account_id=?'); $s->execute([$id,$a['id']]); $mv=(float)$s->fetchColumn(); $a['balance']=(float)$a['opening_balance']+$mv; }
    $data['accounts']=$accounts;
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
$router->add('GET', '/api/v1/transactions/export-csv', function(){ Middleware::requireAuth(); $uid=$GLOBALS['auth_user_id']; $pdo=DB::conn(); header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename=transacoes.csv'); $out=fopen('php://output','w'); fputcsv($out,['date','description','type','amount','account_id','category_id','payee_id','status']); $q='SELECT date,description,type,amount,account_id,category_id,payee_id,status FROM transactions WHERE user_id=?'; $args=[$uid]; if(isset($_GET['from'])){$q.=' AND date>=?';$args[]=$_GET['from'];} if(isset($_GET['to'])){$q.=' AND date<=?';$args[]=$_GET['to'];} if(isset($_GET['accountId'])){$q.=' AND account_id=?';$args[]=(int)$_GET['accountId'];} $q.=' ORDER BY date,id'; $st=$pdo->prepare($q); $st->execute($args); while($r=$st->fetch(PDO::FETCH_NUM)){ fputcsv($out,$r); } fclose($out); });

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
    foreach($rows as &$g){
        // Compute accumulated
        $initial = (float)($hasInitial? ($g['initial_amount'] ?? 0) : 0);
        $accumulated = $initial;
        $strategy = $hasStrategy? ($g['strategy'] ?? 'linear') : 'linear';
        if ($strategy === 'linear') {
            // Sum contributions linked to this goal (RECEITA positive, DESPESA negative)
            $st2=$pdo->prepare("SELECT COALESCE(SUM(CASE WHEN type='RECEITA' THEN amount ELSE -amount END),0) AS s FROM transactions WHERE user_id=? AND goal_id=?");
            $st2->execute([$uid,$g['id']]); $accumulated += (float)$st2->fetchColumn();
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
    $account_id=$in['account_id']??null; if($account_id!=='') $account_id=(int)$account_id; else $account_id=null;
    $category_id=$in['category_id']??null; if($category_id!=='') $category_id=(int)$category_id; else $category_id=null;
    $target_date=$in['target_date']??($in['due_date']??null);
    $planned=$in['planned_monthly_amount']??null; if($planned!=='') $planned=$planned!==null?(float)$planned:null;
    $rec_day=$in['recurring_day']??null; if($rec_day!=='') $rec_day=$rec_day!==null?(int)$rec_day:null;
    $priority=$in['priority']??'media'; if(!in_array($priority,['baixa','media','alta'])) $priority='media';
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
    foreach(['target_amount','initial_amount','planned_monthly_amount'] as $k){ if(array_key_exists($k,$in) && $has($k)){ $fields[]="$k=?"; $args[]=$in[$k]!==null?(float)$in[$k]:null; } }
    foreach(['account_id','category_id','recurring_day'] as $k){ if(array_key_exists($k,$in) && $has($k)){ $fields[]="$k=?"; $args[]=$in[$k]!==null? (int)$in[$k]: null; } }
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
    if(!$accId) json(['error'=>['message'=>'Conta requerida para aporte']],422);
    $catId = isset($in['category_id']) && $in['category_id']!==null && $in['category_id']!=='' ? (int)$in['category_id'] : ($g['category_id']??null);
    $hasGoalId = false; try { $c=$pdo->query("SHOW COLUMNS FROM `transactions` LIKE 'goal_id'"); $hasGoalId=(bool)$c->fetch(); } catch (\Throwable $e) {}
    if ($hasGoalId) {
        $pdo->prepare('INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,status,goal_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())')
            ->execute([$uid,$accId,'RECEITA',$amt,$date,'Aporte para meta: '.$g['name'],$catId,'CLEARED',$gid]);
    } else {
        $pdo->prepare('INSERT INTO transactions (user_id,account_id,type,amount,date,description,category_id,status,created_at) VALUES (?,?,?,?,?,?,?,?,NOW())')
            ->execute([$uid,$accId,'RECEITA',$amt,$date,'Aporte para meta: '.$g['name'],$catId,'CLEARED']);
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
