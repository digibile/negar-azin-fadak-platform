import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 5000 });
try {
  const requestResult = await pool.query(`    WITH status_lookup AS (
      SELECT replace(source_table,'.LoanRequestStatuses','.UserLoanRequests') AS request_source,
        payload->>'Id' AS id, payload->>'Title' AS title,
        ROW_NUMBER() OVER (PARTITION BY replace(source_table,'.LoanRequestStatuses','.UserLoanRequests'),payload->>'Id' ORDER BY legacy_id) AS rn
      FROM legacy_source_data
      WHERE source_table ~* '^vamcityc_(vamcity|bluvamdb)_import_[0-9]{8}[.]dbo[.]LoanRequestStatuses$'
    ), src AS (
      SELECT source_table, legacy_id, payload,
        COALESCE(payload->>'CreatedAt',payload->>'CreatedOn',payload->>'CreationDate',payload->>'DateCreated',payload->>'RequestDate',payload->>'CreateDate',payload->>'Created',payload->>'SubmissionDate',payload->>'InsertDate',payload->>'DateTime',payload->>'RequestDate') AS raw_date,
        COALESCE(NULLIF(payload->>'FullName',''),NULLIF(payload->>'ApplicantName',''),NULLIF(payload->>'Name',''),NULLIF(payload->>'CustomerName',''),NULLIF(payload->>'UserFullName',''),trim(concat_ws(' ',NULLIF(payload->>'FirstName',''),NULLIF(payload->>'LastName','')))) AS full_name,
        COALESCE(payload->>'Mobile',payload->>'PhoneNumber',payload->>'Phone',payload->>'UserMobile',payload->>'CellPhone',payload->>'ContactNumber','') AS phone,
        COALESCE(payload->>'NationalCode',payload->>'NationalId',payload->>'NationalID',payload->>'NCode',payload->>'IdentityCode','') AS ncode,
        COALESCE(payload->>'StatusTitle',payload->>'StatusName',payload->>'LoanRequestStatus',payload->>'LoanRequestStatusTitle',payload->>'Status',payload->>'State',payload->>'LoanStatus',payload->>'StatusId',payload->>'LoanRequestStatusId','') AS state,
        COALESCE(payload->>'Amount',payload->>'LoanAmount',payload->>'RequestedAmount',payload->>'RequestAmount',payload->>'LoanRequestedAmount',payload->>'Price','') AS raw_amount
      FROM legacy_source_data
      WHERE source_table ~* '^vamcityc_(vamcity|bluvamdb)_import_[0-9]{8}[.]dbo[.]UserLoanRequests$'
    )
    INSERT INTO loan_requests(request_key,source_table,legacy_id,applicant_name,mobile,national_code,status,amount,created_at,payload)
    SELECT source_table || ':' || legacy_id,source_table,legacy_id,COALESCE(full_name,''),COALESCE(phone,''),COALESCE(ncode,''),COALESCE(status_lookup.title,state,''),
      CASE WHEN regexp_replace(raw_amount,'[ ,٬ ]','','g') ~ '^-?[0-9]+([.][0-9]+)?$' THEN regexp_replace(raw_amount,'[ ,٬ ]','','g')::numeric ELSE NULL END,
      CASE
        WHEN raw_date ~ '^/Date\(-?[0-9]+\)/$' THEN to_timestamp(regexp_replace(raw_date,'[^0-9-]','','g')::numeric / 1000)
        WHEN raw_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN raw_date::timestamptz
        WHEN raw_date ~ '^[0-9]{10,13}$' THEN to_timestamp(raw_date::numeric / CASE WHEN length(raw_date)=13 THEN 1000 ELSE 1 END)
        ELSE NULL
      END,
      payload
    FROM src LEFT JOIN status_lookup ON status_lookup.request_source=src.source_table AND status_lookup.id=src.state AND status_lookup.rn=1
    ON CONFLICT(source_table,legacy_id) DO UPDATE SET
      applicant_name=EXCLUDED.applicant_name,mobile=EXCLUDED.mobile,national_code=EXCLUDED.national_code,
      status=EXCLUDED.status,amount=EXCLUDED.amount,created_at=EXCLUDED.created_at,payload=EXCLUDED.payload,imported_at=NOW()`);
  console.log("LOAN_REQUESTS_BACKFILL_ROWS=" + Number(requestResult.rowCount || 0));
  const historyResult = await pool.query(`
    WITH status_lookup AS (
      SELECT source_table,payload->>'Id' AS status_id,payload->>'Title' AS title,
        ROW_NUMBER() OVER (PARTITION BY source_table,payload->>'Id' ORDER BY legacy_id) AS rn
      FROM legacy_source_data
      WHERE source_table ~* '^vamcityc_(vamcity|bluvamdb)_import_[0-9]{8}[.]dbo[.]LoanRequestStatuses$'
    ), user_lookup AS (
      SELECT source_table,payload->>'Id' AS user_id,
        COALESCE(NULLIF(payload->>'FullName',''),NULLIF(payload->>'DisplayName',''),
          NULLIF(trim(concat_ws(' ',NULLIF(payload->>'FirstName',''),NULLIF(payload->>'LastName',''))),''),
          NULLIF(payload->>'UserName',''),NULLIF(payload->>'Username','')) AS display_name
      FROM legacy_source_data
      WHERE source_table ~* '^vamcityc_(vamcity|bluvamdb)_import_[0-9]{8}[.]dbo[.]AspNetUsers$'
    ), src AS (
      SELECT h.source_table,h.legacy_id,h.payload,
        replace(h.source_table,'.UserLoanRequestStatusHistories','.UserLoanRequests') AS request_source,
        h.payload->>'UserLoanRequestId' AS request_id,
        h.payload->>'FromStatusId' AS from_status_id,
        h.payload->>'ToStatusId' AS to_status_id,
        h.payload->>'UserId' AS user_id,
        COALESCE(h.payload->>'DateTime',h.payload->>'CreatedAt',h.payload->>'CreatedOn') AS raw_date
      FROM legacy_source_data h
      WHERE h.source_table ~* '^vamcityc_(vamcity|bluvamdb)_import_[0-9]{8}[.]dbo[.]UserLoanRequestStatusHistories$'
    ), mapped AS (
      SELECT src.source_table,src.legacy_id,lr.id AS loan_request_id,
        COALESCE(NULLIF(fs.title,''),src.from_status_id,'') AS old_status,
        COALESCE(NULLIF(ts.title,''),src.to_status_id,'') AS new_status,
        CASE WHEN src.user_id ~ '^[0-9]+$' THEN src.user_id::bigint ELSE NULL END AS changed_by,
        COALESCE(user_lookup.display_name,'') AS changed_by_name,
        CASE
          WHEN src.raw_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN src.raw_date::timestamptz
          WHEN src.raw_date ~ '^/Date\\(-?[0-9]+\\)/$' THEN to_timestamp(regexp_replace(src.raw_date,'[^0-9-]','','g')::numeric/1000)
          WHEN src.raw_date ~ '^[0-9]{10,13}$' THEN to_timestamp(src.raw_date::numeric/CASE WHEN length(src.raw_date)=13 THEN 1000 ELSE 1 END)
          ELSE NULL
        END AS changed_at
      FROM src
      JOIN loan_requests lr ON lr.source_table=src.request_source AND lr.payload->>'Id'=src.request_id
      LEFT JOIN status_lookup fs ON fs.source_table=replace(src.source_table,'.UserLoanRequestStatusHistories','.LoanRequestStatuses') AND fs.status_id=src.from_status_id AND fs.rn=1
      LEFT JOIN status_lookup ts ON ts.source_table=replace(src.source_table,'.UserLoanRequestStatusHistories','.LoanRequestStatuses') AND ts.status_id=src.to_status_id AND ts.rn=1
      LEFT JOIN user_lookup ON user_lookup.source_table=replace(src.source_table,'.UserLoanRequestStatusHistories','.AspNetUsers') AND user_lookup.user_id=src.user_id
    )
    INSERT INTO loan_request_status_history(loan_request_id,old_status,new_status,note,changed_by,changed_by_name,changed_at,legacy_source_table,legacy_id)
    SELECT loan_request_id,old_status,new_status,'',changed_by,changed_by_name,COALESCE(changed_at,NOW()),source_table,legacy_id
    FROM mapped
    WHERE loan_request_id IS NOT NULL AND (old_status<>'' OR new_status<>'')
    ON CONFLICT DO NOTHING
  `);
  console.log("LOAN_REQUEST_STATUS_HISTORY_BACKFILL_ROWS=" + Number(historyResult.rowCount || 0));
  const registrantResult = await pool.query(`
    WITH agent_lookup AS (
      SELECT replace(source_table,'.dbo.Agents','.dbo.UserLoanRequests') AS request_source,
        payload->>'Id' AS entity_id,
        COALESCE(NULLIF(payload->>'FullName',''),NULLIF(payload->>'DisplayName',''),NULLIF(payload->>'Name',''),NULLIF(trim(concat_ws(' ',NULLIF(payload->>'FirstName',''),NULLIF(payload->>'LastName',''))),''),NULLIF(payload->>'UserName',''),NULLIF(payload->>'Username','')) AS name
      FROM legacy_source_data WHERE lower(source_table) LIKE '%.dbo.agents'
    ), user_lookup AS (
      SELECT replace(source_table,'.dbo.AspNetUsers','.dbo.UserLoanRequests') AS request_source,
        payload->>'Id' AS entity_id,
        COALESCE(NULLIF(payload->>'FullName',''),NULLIF(payload->>'DisplayName',''),NULLIF(trim(concat_ws(' ',NULLIF(payload->>'FirstName',''),NULLIF(payload->>'LastName',''))),''),NULLIF(payload->>'UserName',''),NULLIF(payload->>'Username','')) AS name
      FROM legacy_source_data WHERE lower(source_table) LIKE '%.dbo.aspnetusers'
    ), customer_lookup AS (
      SELECT replace(source_table,'.dbo.Customers','.dbo.UserLoanRequests') AS request_source,
        payload->>'Id' AS entity_id,
        COALESCE(NULLIF(payload->>'Name',''),NULLIF(payload->>'FullName',''),NULLIF(payload->>'CustomerName',''),NULLIF(payload->>'Title','')) AS name
      FROM legacy_source_data WHERE lower(source_table) LIKE '%.dbo.customers'
    ), resolved AS (
      SELECT lr.id, COALESCE(agent_lookup.name, user_lookup_agent.name, user_lookup.name, customer_lookup.name) AS registrar_name
      FROM loan_requests lr
      LEFT JOIN agent_lookup ON agent_lookup.request_source=lr.source_table AND agent_lookup.entity_id=NULLIF(lr.payload->>'AgentId','')
      LEFT JOIN user_lookup AS user_lookup_agent ON user_lookup_agent.request_source=lr.source_table AND user_lookup_agent.entity_id=NULLIF(lr.payload->>'AgentId','')
      LEFT JOIN user_lookup ON user_lookup.request_source=lr.source_table AND user_lookup.entity_id=NULLIF(lr.payload->>'UserId','')
      LEFT JOIN customer_lookup ON customer_lookup.request_source=lr.source_table AND customer_lookup.entity_id=NULLIF(lr.payload->>'CustomerId','')
      WHERE COALESCE(
        NULLIF(lr.payload->>'CreatedByName',''),NULLIF(lr.payload->>'CreatedByFullName',''),NULLIF(lr.payload->>'CreatedByDisplayName',''),
        NULLIF(lr.payload->>'CreatorName',''),NULLIF(lr.payload->>'RegisteredByName',''),NULLIF(lr.payload->>'RegisteredByFullName',''),
        NULLIF(lr.payload->>'RegisterByName',''),NULLIF(lr.payload->>'RegistererFullName',''),NULLIF(lr.payload->>'CreatedByUserName',''),
        NULLIF(lr.payload->>'CreatorUserName',''),NULLIF(lr.payload->>'RegisteredByUserName',''),NULLIF(lr.payload->>'RegistererName',''),
        NULLIF(lr.payload->>'RegistrarName',''),NULLIF(lr.payload->>'RegistrarFullName',''),NULLIF(lr.payload->>'CreateUserName',''),
        NULLIF(lr.payload->>'InsertUserName',''),NULLIF(lr.payload->>'CreatedByUser',''),NULLIF(lr.payload->>'RegisteredBy',''),
        NULLIF(lr.payload->>'RegisterBy',''),NULLIF(lr.payload->>'AdminName',''),NULLIF(lr.payload->>'OperatorName','')
      ) IS NULL
    )
    UPDATE loan_requests lr
    SET payload=jsonb_set(lr.payload,'{CreatedByName}',to_jsonb(resolved.registrar_name),TRUE)
    FROM resolved
    WHERE resolved.id=lr.id AND NULLIF(resolved.registrar_name,'') IS NOT NULL
  `);
  console.log("LOAN_REQUEST_REGISTRANTS_RESOLVED=" + Number(registrantResult.rowCount || 0));
  const result = await pool.query(`
    WITH src AS (
      SELECT source_table,legacy_id,payload,COALESCE(NULLIF(payload->>'Id',''),legacy_id) AS raw_id,
        COALESCE(NULLIF(payload->>'FullName',''),NULLIF(payload->>'DisplayName',''),NULLIF(payload->>'Name',''),NULLIF(trim(concat_ws(' ',NULLIF(payload->>'FirstName',''),NULLIF(payload->>'LastName',''))),''),NULLIF(payload->>'UserName',''),NULLIF(payload->>'Username',''),NULLIF(payload->>'Email','')) AS display_name,
        COALESCE(NULLIF(payload->>'PhoneNumber',''),NULLIF(payload->>'Mobile',''),NULLIF(payload->>'Phone',''),NULLIF(payload->>'CellPhone','')) AS phone,
        COALESCE(NULLIF(payload->>'Email',''),NULLIF(payload->>'EmailAddress','')) AS email_address,
        COALESCE(NULLIF(payload->>'UserName',''),NULLIF(payload->>'Username','')) AS username,
        COALESCE(NULLIF(payload->>'Roles',''),NULLIF(payload->>'Role',''),NULLIF(payload->>'UserType','')) AS role_text,
        COALESCE(payload->>'CreatedAt',payload->>'CreatedOn',payload->>'CreationDate',payload->>'RegisterDate',payload->>'RegistrationDate',payload->>'DateCreated',payload->>'CreateDate') AS raw_date
      FROM legacy_source_data WHERE lower(source_table) LIKE '%.dbo.aspnetusers'
    ), ranked AS (
      SELECT src.*,
        ROW_NUMBER() OVER (
          PARTITION BY CASE
            WHEN length(raw_id)=36 AND substring(raw_id from 9 for 1)='-' AND substring(raw_id from 14 for 1)='-' AND substring(raw_id from 19 for 1)='-' AND substring(raw_id from 24 for 1)='-' AND translate(replace(raw_id,'-',''),'0123456789abcdefABCDEF','')='' THEN lower(raw_id)
            ELSE source_table||':'||raw_id
          END
          ORDER BY CASE WHEN lower(source_table) LIKE '%vamcity_import%' THEN 0 ELSE 1 END,source_table,legacy_id
        ) AS source_rank
      FROM src WHERE raw_id IS NOT NULL AND raw_id<>''
    )
    INSERT INTO legacy_customers(legacy_id,name,mobile,email,registered_at,legacy_username,account_type,legacy_source_table)
    SELECT CASE WHEN length(raw_id)=36 AND substring(raw_id from 9 for 1)='-' AND substring(raw_id from 14 for 1)='-' AND substring(raw_id from 19 for 1)='-' AND substring(raw_id from 24 for 1)='-' AND translate(replace(raw_id,'-',''),'0123456789abcdefABCDEF','')='' THEN raw_id::uuid ELSE (substr(md5(source_table||':'||raw_id),1,8)||'-'||substr(md5(source_table||':'||raw_id),9,4)||'-'||substr(md5(source_table||':'||raw_id),13,4)||'-'||substr(md5(source_table||':'||raw_id),17,4)||'-'||substr(md5(source_table||':'||raw_id),21,12))::uuid END,
      COALESCE(display_name,''),COALESCE(phone,''),COALESCE(email_address,''),
      CASE WHEN left(raw_date,6)='/Date(' AND right(raw_date,2)=')/' THEN to_timestamp(regexp_replace(raw_date,'[^0-9-]','','g')::numeric/1000) WHEN raw_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN raw_date::timestamptz WHEN length(raw_date) IN (10,13) AND raw_date ~ '^[0-9]+' THEN to_timestamp(raw_date::numeric/CASE WHEN length(raw_date)=13 THEN 1000 ELSE 1 END) ELSE NULL END,
      COALESCE(username,''),CASE WHEN lower(COALESCE(role_text,'')) LIKE '%admin%' OR lower(COALESCE(role_text,'')) LIKE '%مدیر%' THEN 'کاربر مدیریتی منتقل‌شده' ELSE 'مشتری / کاربر منتقل‌شده' END,source_table
    FROM ranked WHERE source_rank=1
    ON CONFLICT(legacy_id) DO UPDATE SET name=COALESCE(NULLIF(EXCLUDED.name,''),legacy_customers.name),mobile=COALESCE(NULLIF(EXCLUDED.mobile,''),legacy_customers.mobile),email=COALESCE(NULLIF(EXCLUDED.email,''),legacy_customers.email),registered_at=COALESCE(EXCLUDED.registered_at,legacy_customers.registered_at),legacy_username=COALESCE(NULLIF(EXCLUDED.legacy_username,''),legacy_customers.legacy_username),account_type=COALESCE(NULLIF(EXCLUDED.account_type,''),legacy_customers.account_type),legacy_source_table=COALESCE(EXCLUDED.legacy_source_table,legacy_customers.legacy_source_table)`);
  // Also materialize the original business customer directory (dbo.Customers), not only login accounts (AspNetUsers).
  // Upsert by stable UUID and merge populated fields; never delete or replace existing customer records.
  const sourceCustomers = await pool.query(`
    WITH src AS (
      SELECT source_table,legacy_id,payload,
        COALESCE(NULLIF(payload->>'Id',''),legacy_id) AS raw_id,
        COALESCE(NULLIF(payload->>'Name',''),NULLIF(payload->>'FullName',''),NULLIF(payload->>'CustomerName',''),NULLIF(payload->>'Title','')) AS display_name,
        COALESCE(NULLIF(payload->>'Mobile',''),NULLIF(payload->>'Phone',''),NULLIF(payload->>'PhoneNumber','')) AS phone,
        COALESCE(NULLIF(payload->>'Email',''),NULLIF(payload->>'EmailAddress','')) AS email_address,
        COALESCE(NULLIF(payload->>'Code',''),NULLIF(payload->>'CustomerCode',''),NULLIF(payload->>'CustomerNumber','')) AS code,
        COALESCE(payload->>'RegDate',payload->>'RegisteredAt',payload->>'CreatedAt',payload->>'CreatedOn',payload->>'RegisterDate',payload->>'RegistrationDate') AS raw_registered,
        COALESCE(payload->>'ExpireDate',payload->>'ExpiresAt',payload->>'ExpireAt') AS raw_expires,
        COALESCE(payload->>'Permanent',payload->>'IsPermanent','false') AS raw_permanent,
        COALESCE(payload->>'Purchased',payload->>'HasPurchased','false') AS raw_purchased,
        COALESCE(NULLIF(payload->>'AffCode',''),NULLIF(payload->>'AffiliateCode','')) AS aff_code,
        COALESCE(NULLIF(payload->>'ParkDomain',''),NULLIF(payload->>'ParkedDomain','')) AS park_domain
      FROM legacy_source_data
      WHERE lower(source_table) LIKE '%.dbo.customers'
    ), ranked AS (
      SELECT src.*,
        ROW_NUMBER() OVER (
          PARTITION BY CASE
            WHEN length(raw_id)=36 AND substring(raw_id from 9 for 1)='-' AND substring(raw_id from 14 for 1)='-' AND substring(raw_id from 19 for 1)='-' AND substring(raw_id from 24 for 1)='-' AND translate(replace(raw_id,'-',''),'0123456789abcdefABCDEF','')='' THEN lower(raw_id)
            ELSE source_table||':'||raw_id
          END
          ORDER BY
            ((CASE WHEN display_name IS NOT NULL THEN 1 ELSE 0 END) +
             (CASE WHEN phone IS NOT NULL THEN 1 ELSE 0 END) +
             (CASE WHEN email_address IS NOT NULL THEN 1 ELSE 0 END) +
             (CASE WHEN code IS NOT NULL THEN 1 ELSE 0 END) +
             (CASE WHEN raw_registered IS NOT NULL THEN 1 ELSE 0 END) +
             (CASE WHEN aff_code IS NOT NULL THEN 1 ELSE 0 END) +
             (CASE WHEN park_domain IS NOT NULL THEN 1 ELSE 0 END)) DESC,
            CASE WHEN lower(source_table) LIKE '%vamcity_import%' THEN 0 ELSE 1 END,
            source_table,legacy_id
        ) AS source_rank
      FROM src WHERE raw_id IS NOT NULL AND raw_id<>''
    )
    INSERT INTO legacy_customers(legacy_id,name,mobile,email,customer_code,registered_at,expires_at,is_permanent,purchased,affiliate_code,parked_domain,account_type,legacy_source_table)
    SELECT CASE
      WHEN length(raw_id)=36 AND substring(raw_id from 9 for 1)='-' AND substring(raw_id from 14 for 1)='-' AND substring(raw_id from 19 for 1)='-' AND substring(raw_id from 24 for 1)='-' AND translate(replace(raw_id,'-',''),'0123456789abcdefABCDEF','')='' THEN raw_id::uuid
      ELSE (substr(md5(source_table||':'||raw_id),1,8)||'-'||substr(md5(source_table||':'||raw_id),9,4)||'-'||substr(md5(source_table||':'||raw_id),13,4)||'-'||substr(md5(source_table||':'||raw_id),17,4)||'-'||substr(md5(source_table||':'||raw_id),21,12))::uuid
    END,COALESCE(display_name,''),COALESCE(phone,''),COALESCE(email_address,''),CASE WHEN code ~ '^-?[0-9]+$' AND length(code)<10 THEN code::integer ELSE NULL END,
      CASE WHEN left(raw_registered,6)='/Date(' AND right(raw_registered,2)=')/' THEN to_timestamp(regexp_replace(raw_registered,'[^0-9-]','','g')::numeric/1000) WHEN raw_registered ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN raw_registered::timestamptz WHEN length(raw_registered) IN (10,13) AND raw_registered ~ '^[0-9]+' THEN to_timestamp(raw_registered::numeric/CASE WHEN length(raw_registered)=13 THEN 1000 ELSE 1 END) ELSE NULL END,
      CASE WHEN left(raw_expires,6)='/Date(' AND right(raw_expires,2)=')/' THEN to_timestamp(regexp_replace(raw_expires,'[^0-9-]','','g')::numeric/1000) WHEN raw_expires ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN raw_expires::timestamptz WHEN length(raw_expires) IN (10,13) AND raw_expires ~ '^[0-9]+' THEN to_timestamp(raw_expires::numeric/CASE WHEN length(raw_expires)=13 THEN 1000 ELSE 1 END) ELSE NULL END,
      lower(raw_permanent) IN ('true','1','yes','y'),lower(raw_purchased) IN ('true','1','yes','y'),COALESCE(aff_code,''),COALESCE(park_domain,''),'مشتری منتقل‌شده از فهرست اصلی',source_table
    FROM ranked WHERE source_rank=1
    ON CONFLICT(legacy_id) DO UPDATE SET
      name=COALESCE(NULLIF(EXCLUDED.name,''),legacy_customers.name),
      mobile=COALESCE(NULLIF(EXCLUDED.mobile,''),legacy_customers.mobile),
      email=COALESCE(NULLIF(EXCLUDED.email,''),legacy_customers.email),
      customer_code=COALESCE(EXCLUDED.customer_code,legacy_customers.customer_code),
      registered_at=COALESCE(EXCLUDED.registered_at,legacy_customers.registered_at),
      expires_at=COALESCE(EXCLUDED.expires_at,legacy_customers.expires_at),
      is_permanent=legacy_customers.is_permanent OR EXCLUDED.is_permanent,
      purchased=legacy_customers.purchased OR EXCLUDED.purchased,
      affiliate_code=COALESCE(NULLIF(EXCLUDED.affiliate_code,''),legacy_customers.affiliate_code),
      parked_domain=COALESCE(NULLIF(EXCLUDED.parked_domain,''),legacy_customers.parked_domain),
      legacy_source_table=COALESCE(EXCLUDED.legacy_source_table,legacy_customers.legacy_source_table)`);
  console.log("BUSINESS_CUSTOMERS_BACKFILL_ROWS=" + Number(sourceCustomers.rowCount || 0));
  await pool.query("ANALYZE legacy_customers");
  const count = await pool.query("SELECT COUNT(*)::int AS total FROM legacy_customers");
  const sourceCounts = await pool.query("SELECT COUNT(*) FILTER (WHERE lower(COALESCE(legacy_source_table,'')) LIKE '%.dbo.customers')::int AS business_customers, COUNT(*) FILTER (WHERE lower(COALESCE(legacy_source_table,'')) LIKE '%.dbo.aspnetusers')::int AS login_accounts FROM legacy_customers");
  console.log("LEGACY_BUSINESS_CUSTOMERS_TOTAL=" + Number(sourceCounts.rows[0]?.business_customers || 0));
  console.log("LEGACY_LOGIN_ACCOUNTS_TOTAL=" + Number(sourceCounts.rows[0]?.login_accounts || 0));
  console.log("LEGACY_RECORD_BACKFILL_COMPLETE=1");
  console.log("LEGACY_CUSTOMERS_TOTAL=" + Number(count.rows[0]?.total || 0));
  console.log("LEGACY_CUSTOMER_UPSERT_ROWS=" + Number(result.rowCount || 0));
} catch (error) {
  console.error("LEGACY_CUSTOMER_BACKFILL_FAILED=" + String(error.code || error.name || "unknown"));
  process.exitCode = 1;
} finally {
  await pool.end();
}
