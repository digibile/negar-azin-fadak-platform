<?php
/**
 * Copy this file to config.php and enter the MySQL database credentials
 * created in DirectAdmin or cPanel. Never commit config.php.
 */
return [
    'mysql' => [
        'host' => 'localhost',
        'port' => 3306,
        'user' => 'YOUR_DATABASE_USER',
        'password' => 'YOUR_DATABASE_PASSWORD',
        'socket' => '/var/lib/mysql/mysql.sock',
    ],
    'targets' => [
        'vamcityc_vamcity_import_20261028' => 'vamcitydigibilepay',
        'vamcityc_bluvamdb_import_20261028' => 'vamcitydigibilepay_bluvamdb',
        'vamcityc_transferDb_import_20261028' => 'vamcitydigibilepay_transferdb',
    ],
    'batch_size' => 500,
];
