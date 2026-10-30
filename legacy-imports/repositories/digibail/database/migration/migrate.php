<?php
declare(strict_types=1);

/**
 * Resumable VamCity data importer.
 * The schema is created from the reviewed schema-main/bluvamdb/transfer SQL files.
 * Source rows are streamed from SQL Server BCP as JSON and inserted directly into MariaDB.
 * No customer records are written to disk or committed to GitHub.
 * SQL Server source snapshots remain read-only throughout this process.
 * All imported rows are checkpointed by source table for safe restart.
 * Dry-run probes source metadata only; it never connects to or writes the target database.
 * FINAL_JSON_DIAGNOSTICS_NO_RECORD_VALUES
 *
 * Usage:
 *   php database/migration/migrate.php --dry-run
 *   php database/migration/migrate.php --execute
 */

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$execute = in_array('--execute', $argv, true);
$root = dirname(__DIR__, 2);
$configPath = __DIR__ . '/config.php';
$container = 'vamcity-stage-sql';
$batchSize = 500;

$sources = [
    ['source'=>'vamcityc_vamcity_import_20261028','target'=>'vamcitydigibilepay','schema'=>'schema-main.sql'],
    ['source'=>'vamcityc_bluvamdb_import_20261028','target'=>'vamcitydigibilepay_bluvamdb','schema'=>'schema-bluvamdb.sql'],
    ['source'=>'vamcityc_transferDb_import_20261028','target'=>'vamcitydigibilepay_transferdb','schema'=>'schema-transfer.sql'],
];

function logLine(string $s): void { echo '['.date('H:i:s').'] '.$s.PHP_EOL; }
function stopNow(string $s): void { fwrite(STDERR,'ERROR: '.$s.PHP_EOL); exit(1); }
function qi(string $s): string { $b=chr(96); return $b.str_replace($b,$b.$b,$s).$b; }
function qv(mysqli $db, $v): string { return $v===null?'NULL':"'".$db->real_escape_string((string)$v)."'"; }
function shortName(string $s): string {
    return strlen($s)<=60?$s:substr($s,0,51).'_'.substr(hash('sha256',$s),0,8);
}
function mappedTable(string $schema,string $table): string {
    return shortName(strtolower($schema)==='dbo'?$table:$schema.'__'.$table);
}
function dockerBin(): string {
    exec('docker info >/dev/null 2>&1', $x, $r);
    if ($r===0) return 'docker';
    exec('sudo -n docker info >/dev/null 2>&1', $x, $r);
    if ($r===0) return 'sudo -n docker';
    stopNow('Docker access to the isolated SQL Server container is unavailable.');
    return '';
}
function getSourcePassword(string $docker,string $container): string {
    $cmd=$docker.' exec '.escapeshellarg($container).' printenv MSSQL_SA_PASSWORD';
    exec($cmd.' 2>/dev/null',$o,$r);
    if($r!==0 || !trim(implode("\n",$o))){
        $o=[]; $cmd=$docker.' exec '.escapeshellarg($container).' printenv SA_PASSWORD';
        exec($cmd.' 2>/dev/null',$o,$r);
    }
    $p=trim(implode("\n",$o));
    if($r!==0 || $p==='') stopNow('SQL Server source credential is unavailable inside its container.');
    return $p;
}
function sanitizeJsonControlChars(string $json): string {
    $out=''; $inString=false; $escaped=false;
    $length=strlen($json);
    for($i=0;$i<$length;$i++){
        $ch=$json[$i]; $ord=ord($ch);
        if($inString){
            if($escaped){$out.=$ch;$escaped=false;continue;}
            if($ch==='\\'){$out.=$ch;$escaped=true;continue;}
            if($ch==='"'){$out.=$ch;$inString=false;continue;}
            if($ord<32){$out.=sprintf('\\u%04x',$ord);continue;}
            $out.=$ch; continue;
        }
        if($ch==='"')$inString=true;
        $out.=$ch;
    }
    return $out;
}

function bcpJson(string $docker,string $container,string $password,string $dbName,string $query): array {
    $inner='exec 3>&1; exec /opt/mssql-tools18/bin/bcp "$1" queryout /dev/fd/3 -c -C 65001 -u -S localhost -U sa -P "$BCP_PASS" -d "$2" 1>&2';
    $cmd=$docker.' exec -e BCP_PASS='.escapeshellarg($password).' '.escapeshellarg($container)
        .' sh -c '.escapeshellarg($inner).' sh '.escapeshellarg($query).' '.escapeshellarg($dbName).' 2>/dev/null';
    $spec=[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']];
    $p=proc_open($cmd,$spec,$pipes);
    if(!is_resource($p)) stopNow('Could not start BCP process.');
    fclose($pipes[0]);
    $raw=stream_get_contents($pipes[1]); fclose($pipes[1]);
    $err=stream_get_contents($pipes[2]); fclose($pipes[2]);
    $rc=proc_close($p);
    if($rc!==0) stopNow('BCP failed for '.$dbName.': '.trim($err));
    // BCP inserts hard line wraps into long JSON rows; FOR JSON already escapes source newlines. REMOVE_BCP_CRLF_FIX
    $raw=str_replace(["\r","\n"],"",$raw);
    $raw=sanitizeJsonControlChars($raw);
    $data=json_decode($raw,true,512,JSON_BIGINT_AS_STRING);
    if(!is_array($data) || json_last_error()!==JSON_ERROR_NONE) {
        $spec=[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']];
        $py=proc_open("python3 -c 'import sys,json; s=sys.stdin.read();\ntry: json.loads(s); print(\"PY_JSON_OK\")\nexcept json.JSONDecodeError as e: print(\"PY_JSON_ERROR\",e.msg,\"line\",e.lineno,\"column\",e.colno,\"offset\",e.pos,\"near\",repr(s[max(0,e.pos-70):e.pos+70]))'",$spec,$pp);
        $diag='';
        if(is_resource($py)){fwrite($pp[0],$raw);fclose($pp[0]);$diag=stream_get_contents($pp[1]);fclose($pp[1]);fclose($pp[2]);proc_close($py);}
        stopNow('Invalid BCP JSON for '.$dbName.': '.json_last_error_msg().' bytes='.strlen($raw).' '.$diag);
    }
    return $data;
}
function metadata(string $docker,string $container,string $password,string $source): array {
    $q=[
      'tables'=>"SELECT s.name schema_name,t.name table_name,COALESCE(SUM(p.rows),0) row_count FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id LEFT JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN (0,1) WHERE t.is_ms_shipped=0 GROUP BY s.name,t.name ORDER BY s.name,t.name FOR JSON PATH",
      'dbinfo'=>"SELECT DB_NAME() source_database,CONVERT(nvarchar(128),DATABASEPROPERTYEX(DB_NAME(),'Collation')) source_collation,name file_name,type_desc,CAST(size*8.0/1024 AS decimal(18,2)) size_mb FROM sys.database_files FOR JSON PATH",
      'columns'=>"SELECT s.name schema_name,t.name table_name,c.column_id ordinal,c.name column_name,ty.name data_type,c.max_length,c.precision,c.scale,c.is_nullable,c.is_identity,c.is_computed,dc.definition default_definition FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id WHERE t.is_ms_shipped=0 ORDER BY s.name,t.name,c.column_id FOR JSON PATH",
      'keys'=>"SELECT s.name schema_name,t.name table_name,i.name key_name,i.type_desc,i.is_primary_key,i.is_unique_constraint,c.name column_name,ic.key_ordinal FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=t.object_id AND c.column_id=ic.column_id WHERE (i.is_primary_key=1 OR i.is_unique_constraint=1) AND ic.is_included_column=0 ORDER BY s.name,t.name,i.name,ic.key_ordinal FOR JSON PATH",
      'indexes'=>"SELECT s.name schema_name,t.name table_name,i.name index_name,i.type_desc,i.is_unique,i.is_primary_key,i.is_unique_constraint,i.is_disabled,i.has_filter,i.filter_definition,ic.key_ordinal,ic.is_included_column,c.name column_name,ic.is_descending_key,ic.index_column_id FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id JOIN sys.schemas s ON s.schema_id=t.schema_id JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=t.object_id AND c.column_id=ic.column_id WHERE i.index_id>0 AND i.name IS NOT NULL ORDER BY s.name,t.name,i.name,ic.key_ordinal,ic.index_column_id FOR JSON PATH",
      'fks'=>"SELECT ps.name parent_schema,pt.name parent_table,fk.name fk_name,pc.name parent_column,rs.name referenced_schema,rt.name referenced_table,rc.name referenced_column,fkc.constraint_column_id ordinal,fk.delete_referential_action_desc delete_action,fk.update_referential_action_desc update_action,fk.is_disabled,fk.is_not_trusted FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id JOIN sys.tables pt ON pt.object_id=fk.parent_object_id JOIN sys.schemas ps ON ps.schema_id=pt.schema_id JOIN sys.columns pc ON pc.object_id=pt.object_id AND pc.column_id=fkc.parent_column_id JOIN sys.tables rt ON rt.object_id=fk.referenced_object_id JOIN sys.schemas rs ON rs.schema_id=rt.schema_id JOIN sys.columns rc ON rc.object_id=rt.object_id AND rc.column_id=fkc.referenced_column_id ORDER BY ps.name,pt.name,fk.name,fkc.constraint_column_id FOR JSON PATH"
    ];
    $m=[]; foreach($q as $k=>$sql) $m[$k]=bcpJson($docker,$container,$password,$source,$sql);
    return $m;
}
function targetConnect(array $mysql,string $dbName): mysqli {
    try {
        $db=new mysqli($mysql['host']??'localhost',$mysql['user']??'', $mysql['password']??'',
            $dbName,(int)($mysql['port']??3306),$mysql['socket']??null);
    } catch(Throwable $e) { stopNow('Cannot connect to target database '.$dbName.'. Create it in DirectAdmin/cPanel and grant this user full database privileges.'); }
    if($db->connect_errno) stopNow('MariaDB connection failed for '.$dbName.': '.$db->connect_error);
    $db->set_charset('utf8mb4');
    return $db;
}
function installSchema(mysqli $db,string $path): void {
    if(!is_file($path)) stopNow('Schema file not found: '.$path);
    $sql=file_get_contents($path);
    $sql=preg_replace('/^\s*--.*$/m','',$sql);
    $sql=preg_replace('/;\s*--[^\r\n]*/',';',$sql);
    foreach(explode(';',$sql) as $statement) {
        $statement=trim($statement);
        if($statement==='') continue;
        if(!$db->query($statement)) stopNow('Schema installation failed: '.$db->error.' | '.substr($statement,0,160));
    }
}
function ensureState(mysqli $db): void {
    $sql="CREATE TABLE IF NOT EXISTS ".qi('__vamcity_migration_state')." (
      source_schema VARCHAR(128) NOT NULL,
      source_table VARCHAR(128) NOT NULL,
      expected_rows BIGINT UNSIGNED NOT NULL,
      imported_rows BIGINT UNSIGNED NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY(source_schema,source_table)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    if(!$db->query($sql)) stopNow('Could not create migration checkpoint table: '.$db->error);
}
function temporalRaw(array $c): bool {
    return in_array($c['data_type'],['datetime2','datetime'],true)
      || ($c['data_type']==='time' && (int)$c['scale']>6);
}
function temporalValue($v,string $type) {
    if($v===null) return null;
    $s=(string)$v;
    if($type==='datetime2'||$type==='datetime'){
        if((int)substr($s,0,4)<1000) return null;
        $s=str_replace('T',' ',$s);
        $max=$type==='datetime2'?6:3;
        $s=preg_replace('/\.(\d{'.$max.'})\d+(?=$|Z)/','.$1',$s);
        return rtrim($s,'Z');
    }
    if($type==='time') return preg_replace('/\.(\d{6})\d+$/','.$1',$s);
    return $s;
}
function exportRows(string $docker,string $container,string $password,string $source,array $table,array $columns,array $pk,int $offset,int $limit): array {
    $select=[];
    foreach($columns as $c){
        $col='t.['.str_replace(']',']]',$c['column_name']).']';
        $alias='['.str_replace(']',']]',$c['column_name']).']';
        if(in_array($c['data_type'],['decimal','numeric','money','smallmoney'],true)) $select[]='CONVERT(varchar(100),'.$col.') AS '.$alias;
        elseif(in_array($c['data_type'],['float','real'],true)) $select[]='CONVERT(varchar(100),'.$col.',3) AS '.$alias;
        else $select[]=$col;
    }
    $order=$pk?implode(',',array_map(fn($x)=>'t.['.str_replace(']',']]',$x).']',$pk)):'(SELECT NULL)';
    $tn='['.str_replace(']',']]',$table['schema_name']).'].['.str_replace(']',']]',$table['table_name']).']';
    $sql='SELECT '.implode(',',$select).' FROM '.$tn.' AS t ORDER BY '.$order
        .' OFFSET '.$offset.' ROWS FETCH NEXT '.$limit.' ROWS ONLY FOR JSON PATH, INCLUDE_NULL_VALUES';
    return bcpJson($docker,$container,$password,$source,$sql);
}
function insertRows(mysqli $db,string $table,array $columns,array $rows): void {
    if(!$rows) return;
    $names=[];
    foreach($columns as $c){
        $names[]=shortName($c['column_name']);
        if(temporalRaw($c)) $names[]=shortName('__raw_'.$c['column_name']);
    }
    $prefix='INSERT INTO '.qi($table).' ('.implode(',',array_map('qi',$names)).') VALUES ';
    $pending=[]; $bytes=strlen($prefix);
    $flush=function() use (&$pending,&$bytes,$prefix,$db) {
        if(!$pending)return;
        $sql=$prefix.implode(',',$pending);
        if(!$db->query($sql)) stopNow('Data insert failed: '.$db->error);
        $pending=[]; $bytes=strlen($prefix);
    };
    foreach($rows as $row){
        $vals=[];
        foreach($columns as $c){
            $n=$c['column_name']; $v=array_key_exists($n,$row)?$row[$n]:null;
            if(temporalRaw($c)){
                $normal=temporalValue($v,$c['data_type']);
                $vals[]=qv($db,$normal);
                $vals[]=qv($db,$v);
            } else {
                if(is_bool($v))$v=$v?1:0;
                $vals[]=qv($db,$v);
            }
        }
        $tuple='('.implode(',',$vals).')';
        if($pending && $bytes+strlen($tuple)>3000000) $flush();
        $pending[]=$tuple; $bytes+=strlen($tuple)+1;
    }
    $flush();
}

if(!$execute){
    logLine('DRY RUN ONLY. No MariaDB changes will be made.');
    if(!is_file($configPath)) logLine('Config not yet present. Copy config.example.php to config.php and enter target database credentials before --execute.');
} else {
    if(!is_file($configPath)) stopNow('Missing config.php. Copy config.example.php to config.php and enter the database user/password.');
    $config=require $configPath;
    if(empty($config['mysql']['user'])||empty($config['mysql']['password'])) stopNow('MySQL user/password are required in config.php.');
    $batchSize=max(50,min(1000,(int)($config['batch_size']??500)));
}

$docker=dockerBin();
$sourcePassword=getSourcePassword($docker,$container);
$allMeta=[];
foreach($sources as $s){
    $m=metadata($docker,$container,$sourcePassword,$s['source']);
    $allMeta[$s['source']]=$m;
    $rows=array_sum(array_map(fn($t)=>(int)$t['row_count'],$m['tables']));
    $dbInfo=$m['dbinfo'][0]??[];
    $fileMb=array_sum(array_map(fn($x)=>(float)($x['size_mb']??0),$m['dbinfo']));
    logLine($s['source'].' => '.$s['target'].' | tables='.count($m['tables']).' | columns='.count($m['columns']).' | rows='.$rows.' | collation='.($dbInfo['source_collation']??'unknown').' | filesMB='.$fileMb);
}
if(!$execute){logLine('DRY RUN COMPLETE. No data or target schema was changed.');exit(0);}

foreach($sources as $s){
    $source=$s['source'];
    $target=$config['targets'][$source]??$s['target'];
    if(!preg_match('/^[A-Za-z0-9_]+$/',$target)) stopNow('Invalid database name in config.php: '.$target);
    $db=targetConnect($config['mysql'],$target);
    $m=$allMeta[$source];

    $stateCheck=$db->query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=".qv($db,'__vamcity_migration_state'));
    $hasState=(int)$stateCheck->fetch_assoc()['n']>0;
    $tableCheck=$db->query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' AND table_name NOT LIKE '\\_%'");
    $existingTables=(int)$tableCheck->fetch_assoc()['n'];
    if(!$hasState && $existingTables===0){
        logLine('Installing schema for '.$target);
        installSchema($db,__DIR__.'/../mysql/'.$s['schema']);
    } elseif(!$hasState && $existingTables>0) {
        foreach($m['tables'] as $t){
            $tn=mappedTable($t['schema_name'],$t['table_name']);
            $check=$db->query("SELECT COUNT(*) AS n FROM ".qi($tn));
            if(!$check) stopNow('Expected table missing from '.$target.': '.$tn);
            if((int)$check->fetch_assoc()['n']>0) stopNow('Target table already has data without a migration checkpoint: '.$tn);
        }
    }
    ensureState($db);
    $db->query('SET FOREIGN_KEY_CHECKS=0');

    $colsBy=[]; foreach($m['columns'] as $c)$colsBy[$c['schema_name'].'.'.$c['table_name']][]=$c;
    $pkBy=[]; foreach($m['keys'] as $k) if($k['type_desc']==='PRIMARY_KEY_CONSTRAINT')$pkBy[$k['schema_name'].'.'.$k['table_name']][(int)$k['key_ordinal']]=$k['column_name'];

    foreach($m['tables'] as $t){
        $key=$t['schema_name'].'.'.$t['table_name'];
        $tn=mappedTable($t['schema_name'],$t['table_name']);
        $cols=$colsBy[$key]??[];
        $pk=$pkBy[$key]??[]; ksort($pk); $pk=array_values($pk);
        $expected=(int)$t['row_count'];
        $st=$db->query("SELECT expected_rows,imported_rows,status FROM ".qi('__vamcity_migration_state')
            ." WHERE source_schema=".qv($db,$t['schema_name'])." AND source_table=".qv($db,$t['table_name']));
        if($st && $st->num_rows){
            $state=$st->fetch_assoc();
            if((int)$state['expected_rows']!==$expected)stopNow('Source row count changed; refusing resume for '.$key);
            $offset=(int)$state['imported_rows'];
            if($state['status']==='complete' && $offset===$expected){logLine('SKIP '.$key.' '.$expected);continue;}
        }else{
            $count=$db->query('SELECT COUNT(*) AS n FROM '.qi($tn));
            if(!$count)stopNow('Missing target table '.$tn);
            if((int)$count->fetch_assoc()['n']!==0)stopNow('Target table is not empty and has no checkpoint: '.$tn);
            $db->query("INSERT INTO ".qi('__vamcity_migration_state')." (source_schema,source_table,expected_rows,imported_rows,status) VALUES ("
                .qv($db,$t['schema_name']).','.qv($db,$t['table_name']).','.$expected.",0,'pending')");
            $offset=0;
        }
        while($offset<$expected){
            $rows=exportRows($docker,$container,$sourcePassword,$source,$t,$cols,$pk,$offset,$batchSize);
            if(!$rows)stopNow('Source returned no rows before expected count: '.$key.' offset='.$offset);
            $db->begin_transaction();
            insertRows($db,$tn,$cols,$rows);
            $offset+=count($rows);
            $status=$offset>=$expected?'complete':'pending';
            $db->query("UPDATE ".qi('__vamcity_migration_state')." SET imported_rows=".$offset.",status=".qv($db,$status)
                ." WHERE source_schema=".qv($db,$t['schema_name'])." AND source_table=".qv($db,$t['table_name']));
            if(!$db->commit())stopNow('Commit failed for '.$key);
            logLine('IMPORTED '.$key.' '.$offset.'/'.$expected);
            if(count($rows)<$batchSize && $offset<$expected)stopNow('Short batch before expected row count for '.$key);
        }
        if($expected===0)$db->query("INSERT INTO ".qi('__vamcity_migration_state')." (source_schema,source_table,expected_rows,imported_rows,status) VALUES ("
            .qv($db,$t['schema_name']).','.qv($db,$t['table_name']).",0,0,'complete') ON DUPLICATE KEY UPDATE status='complete'");
    }

    logLine('Checking row counts for '.$target);
    foreach($m['tables'] as $t){
        $tn=mappedTable($t['schema_name'],$t['table_name']);
        $q=$db->query('SELECT COUNT(*) AS n FROM '.qi($tn));
        $actual=(int)$q->fetch_assoc()['n']; $expected=(int)$t['row_count'];
        if($actual!==$expected)stopNow('ROW COUNT MISMATCH '.$target.'.'.$tn.' source='.$expected.' target='.$actual);
    }
    $db->query('SET FOREIGN_KEY_CHECKS=1');
    logLine('VALIDATED '.$target.' tables='.count($m['tables']));
    $db->close();
}
logLine('MIGRATION COMPLETE. Original SQL Server databases were not modified.');
