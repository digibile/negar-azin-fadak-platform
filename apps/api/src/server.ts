import express from "express";
import cors from "cors";
import "dotenv/config";
import {pool,query} from "./db.js";
import {ensureAdmin,hashPassword,verifyPassword,issueSession,clearSession,requireAuth,requireCsrf,requirePermission} from "./auth.js";
import {asyncHandler,errorHandler,notFound} from "./http.js";
import {loginIdentifierSchema,userCreateSchema,formSchema,pageSchema,menuUpdateSchema} from "./validation.js";
import {normalizeIranMobile,createOtpCode,otpDigest,verifyOtpDigest,sendKavenegarOtp} from "./otp.js";
import {isValidIranianNationalCode} from "./iranian-validation.js";
import {domainFinanceRouter} from "./domain-finance.js";
import {dynamicMenuRouter} from "./dynamic-menu.js";
import {accountingRouter} from "./accounting.js";
import {dashboardOverviewRouter} from "./dashboard-overview.js";
import {dashboardWorkspaceRouter} from "./dashboard-workspace.js";
import {organizationManagementRouter} from "./organization-management.js";
import {securityManagementRouter} from "./security-management.js";
import {identityRouter} from "./identity.js";
import {masterDataRouter} from "./master-data.js";
import {customer360Router} from "./customer-360.js";
import {smartCalendarRouter} from "./smart-calendar.js";
import {businessRulesRouter} from "./business-rules.js";
import {slaRouter} from "./sla.js";
import {accountingFinanceRouter} from "./accounting-finance.js";
import {accountingFinanceOperationsRouter} from "./accounting-finance-operations.js";
import {financeCoreRouter} from "./finance-core.js";
import {treasuryBankRouter} from "./treasury-bank.js";
import {treasuryChecksRouter} from "./treasury-checks.js";
import {salesRouter} from "./sales-revenue.js";
import {purchasingSupplyRouter} from "./purchasing-supply.js";
import {inventoryRouter} from "./inventory.js";
import {logisticsRouter} from "./logistics.js";
import {walletLedgerRouter} from "./wallet-ledger.js";
import {centralSettingsRouter} from "./central-settings.js";
import {domainCommerceRouter} from "./domain-commerce.js";
import {domainCommunicationRouter} from "./domain-communication.js";
import {domainDocumentsRouter} from "./domain-documents.js";
import {domainOrganizationRouter} from "./domain-organization.js";
import {domainCommandPlatformRouter} from "./domain-command-platform.js";
import {domainMarketplaceRouter} from "./domain-marketplace.js";
import {getDigikalaCatalog} from "./digikala-catalog.js";
import {platformOperationsRouter} from "./platform-operations.js";
import {sellerSurfaceRouter} from "./seller-surface.js";
import {tenantContentRouter} from "./tenant-content.js";
import {checkoutRouter} from "./domain-checkout.js";
import {settlementRouter} from "./domain-settlement.js";
import {resolveTenant,resolvePublicTenant} from "./tenant-context.js";
import {platformEnginesRouter,sweepSlaCases} from "./platform-engines.js";
import {platformUpdatesRouter} from "./platform-updates.js";
import {platformExperienceRouter} from "./platform-experience.js";
import {lendtechRouter} from "./lendtech.js";
import {lendtechContractRouter} from "./lendtech-contract-documents.js";
import {enterpriseInteractionRouter} from "./enterprise-interaction.js";
import {commerceIntelligenceRouter} from "./commerce-intelligence.js";
import {merchantRouter} from "./merchant-management.js";
import {formBuilderRouter} from "./form-builder.js";
import {aiTemplateStudioRouter} from "./ai-template-studio.js";
import {aiWorkshopRouter} from "./ai-workshop.js";
import {issueHumanCheck,verifyHumanCheck} from "./human-check.js";
import "./payment-provider.js";

const app=express();

const resolveRequestTenant=async(req:any)=>resolveTenant(req,(req as any).user);

const requireModulePermission=async(user:any,moduleId:number,action:"read"|"write"|"delete")=>{
 if(user.role==="admin") return true;
 const p=await query(
  "select 1 from role_permissions rp join module_permissions mp on mp.permission=rp.permission where rp.role=$1 and mp.module_id=$2 and mp.permission='modules:'||(select code from platform_modules where id=$2)||':'||$3",
  [user.role,moduleId,action]
 );
 return Boolean(p.rowCount);
};
const allowedOrigins=[...new Set([...(process.env.CORS_ORIGIN||"http://localhost:3000").split(",").map(x=>x.trim()).filter(Boolean),"https://digibile.ir","https://www.digibile.ir"])];
app.disable("x-powered-by");
app.use(cors({origin:(origin,callback)=>{if(!origin||allowedOrigins.includes(origin))return callback(null,true);callback(new Error("مبدأ درخواست مجاز نیست"))},credentials:true}));
app.use(express.json({limit:"12mb",verify:(req,_,buf)=>{(req as any).rawBody=Buffer.from(buf)}}));
app.use(express.urlencoded({extended:false,limit:"2mb"}));
app.use("/api/public/media",express.static(process.env.MEDIA_ROOT||"/app/media",{dotfiles:"deny",index:false,immutable:true,maxAge:"365d",setHeaders:(res)=>res.setHeader("X-Content-Type-Options","nosniff")}));
app.use((req,res,next)=>{if(["GET","HEAD","OPTIONS"].includes(req.method)||(req.path==="/api/auth/login"||req.path==="/api/auth/register")||(req.method==="POST"&&/^\/api\/payment-gateways\/[^/]+\/webhook$/.test(req.path)))return next();return requireCsrf(req,res,next);});

app.get("/health",asyncHandler(async(_req,res)=>{await query("select 1");res.json({status:"ok",database:"ok"});}));

// Public endpoint exposes validated published settings only; writes stay behind authenticated module permissions.
app.get("/api/public/digikala-catalog",asyncHandler(async(_req,res)=>{
 const catalog=await getDigikalaCatalog(false);
 res.setHeader("Cache-Control","public, max-age=60, stale-while-revalidate=240");
 res.setHeader("X-Catalog-Source","digikala-live");
 if(!catalog.products.length) return res.status(503).json({source:"digikala",sourceStatus:"unavailable",fetchedAt:catalog.fetchedAt,products:[],message:"در حال حاضر دریافت فهرست زنده کالاها از منبع اصلی ممکن نیست."});
 res.json({source:"digikala",sourceStatus:catalog.sourceStatus,fetchedAt:catalog.fetchedAt,categories:catalog.categories,products:catalog.products});
}));

app.get("/api/public/storefront-theme",asyncHandler(async(req,res)=>{
 const tenant=await resolvePublicTenant({hostname:String(req.headers["x-forwarded-host"]||req.hostname||"").trim().toLowerCase().split(":")[0]},typeof req.query.tenant==="string"?req.query.tenant:"");
 res.setHeader("Cache-Control","no-store, max-age=0");
 if(!tenant)return res.json({tenant:null,theme:null});
 const r=await query("select data from module_records mr join platform_modules m on m.id=mr.module_id where mr.tenant_id=$1 and m.code='36-page-templates' and mr.record_type='page-template' and mr.status='فعال' and (mr.data->>'template-key'='auto-marketplace' or mr.data->>'template-code'='auto-marketplace' or mr.data->>'template-type' in ('فروشگاهی','بازارگاه','بازارگاه خودرو')) order by case when mr.data->>'template-key'='auto-marketplace' or mr.data->>'template-code'='auto-marketplace' then 0 else 1 end,mr.updated_at desc limit 1",[tenant.id]);
 const d=(r.rows[0]?.data||{}) as Record<string,any>;
 const color=(value:unknown,fallback:string)=>typeof value==="string"&&/^#[0-9a-fA-F]{6}$/.test(value)?value:fallback;
 const columns=Number(d.productColumns);
 res.json({tenant:{name:tenant.name,code:tenant.code},theme:r.rowCount?{
  key:String(d["template-key"]||""),
  primaryColor:color(d.primaryColor,"#0f766e"),
  accentColor:color(d.accentColor,"#14b8a6"),
  canvasColor:color(d.canvasColor,"#f7f8fa"),
  surfaceColor:color(d.surfaceColor,"#ffffff"),
  productColumns:Number.isInteger(columns)&&columns>=2&&columns<=6?columns:4,
  productCard:["rounded","bordered","flat","elevated"].includes(d.productCard)?d.productCard:"rounded",
  productImageRatio:["square","portrait","landscape"].includes(d.productImageRatio)?d.productImageRatio:"square",
  showHero:d.showHero!==false,
  showCategories:d.showCategories!==false,
  headerMode:["استاندارد","فشرده","بدون هدر"].includes(d["header-mode"])?d["header-mode"]:"استاندارد",
  footerMode:["استاندارد","فشرده","بدون فوتر"].includes(d["footer-mode"])?d["footer-mode"]:"استاندارد",
  sectionOrder:(()=>{const allowed=["hero","benefits","categories","products"];const requested=String(d.sectionOrder||"").split(",").map((x:string)=>x.trim()).filter((x:string)=>allowed.includes(x));return [...new Set([...requested,...allowed])].join(",")})(),
  showcaseSlides:(()=>{const raw=Array.isArray(d.showcaseSlides)?d.showcaseSlides.slice(0,8):[];return raw.filter((x:any)=>x&&typeof x.title==="string"&&typeof x.text==="string"&&typeof x.button==="string").map((x:any)=>({title:x.title.slice(0,140),text:x.text.slice(0,300),button:x.button.slice(0,40),image:typeof x.image==="string"&&x.image.startsWith("https://")?x.image:"https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80"}))})()
 }:null});
}));
app.use(dynamicMenuRouter);
app.use(accountingRouter);
app.use(dashboardOverviewRouter);
app.use(dashboardWorkspaceRouter);
app.use(organizationManagementRouter);
app.use(securityManagementRouter);
app.use(identityRouter);
app.use(masterDataRouter);
app.use(customer360Router);
app.use(smartCalendarRouter);
app.use(businessRulesRouter);
app.use(slaRouter);
app.use(accountingFinanceRouter);
app.use(accountingFinanceOperationsRouter);
app.use(financeCoreRouter);
app.use(treasuryBankRouter);
app.use(treasuryChecksRouter);
app.use(salesRouter);
app.use(purchasingSupplyRouter);
app.use(inventoryRouter);
app.use(logisticsRouter);
app.use(walletLedgerRouter);
app.use(centralSettingsRouter);
app.use("/api/domain",domainFinanceRouter);
app.use("/api/domain",domainCommerceRouter);
app.use("/api/domain",domainCommunicationRouter);
app.use("/api/domain",domainDocumentsRouter);
app.use("/api/domain",domainOrganizationRouter);
app.use("/api/domain",domainCommandPlatformRouter);
app.use(domainMarketplaceRouter);
app.use(merchantRouter);
app.use(formBuilderRouter);
app.use(aiTemplateStudioRouter);
app.use(aiWorkshopRouter);
app.use(sellerSurfaceRouter);
app.use("/api/content",tenantContentRouter);
app.use(checkoutRouter);
app.use(settlementRouter);
app.use(platformEnginesRouter);
app.use(platformOperationsRouter);
app.use(platformUpdatesRouter);
app.use(platformExperienceRouter);
app.use(lendtechRouter);
app.use(lendtechContractRouter);
app.use(enterpriseInteractionRouter);
app.use(commerceIntelligenceRouter);

app.get("/api/auth/human-check",(_req,res)=>res.json(issueHumanCheck()));
app.post("/api/auth/otp/request",asyncHandler(async(req,res)=>{
 const phone=normalizeIranMobile(req.body?.phone);
 if(!phone)return res.status(400).json({error:"شماره موبایل معتبر نیست"});
 if(!verifyHumanCheck(String(req.body?.humanCheck||""),String(req.body?.humanAnswer||"")))return res.status(400).json({error:"کد امنیتی نادرست یا منقضی شده است"});
 if((process.env.OTP_PEPPER||"").length<24||(process.env.KAVENEGAR_API_KEY||"").trim()==="")return res.status(503).json({error:"سرویس ورود پیامکی هنوز پیکربندی نشده است"});
 const ip=req.ip||"127.0.0.1";
 const rate=await query("select count(*) filter(where phone=$1)::int as phone_count,count(*) filter(where requested_ip=$2::inet)::int as ip_count from otp_challenges where created_at>now()-interval '1 hour'",[phone,ip]);
 if(Number(rate.rows[0]?.phone_count||0)>=5)return res.status(429).json({error:"برای این شماره در یک ساعت بیش از حد درخواست ثبت شده است"});
 if(Number(rate.rows[0]?.ip_count||0)>=20)return res.status(429).json({error:"تعداد درخواست از این شبکه زیاد است؛ بعداً تلاش کنید"});
 const latest=await query("select expires_at,resend_at from otp_challenges where phone=$1 and purpose='login' order by created_at desc limit 1",[phone]);
 if(latest.rowCount&&new Date(latest.rows[0].resend_at).getTime()>Date.now())return res.status(429).json({error:"ارسال مجدد هنوز ممکن نیست",expiresIn:Math.max(0,Math.floor((new Date(latest.rows[0].expires_at).getTime()-Date.now())/1000)),resendIn:Math.max(0,Math.ceil((new Date(latest.rows[0].resend_at).getTime()-Date.now())/1000))});
 const variants=[phone,"98"+phone.slice(1),"0098"+phone.slice(1)];
 const users=await query("select u.id,u.email,u.full_name,u.role from users u join user_contact_methods c on c.user_id=u.id where u.status='active' and c.channel='sms' and c.status='active' and c.verified_at is not null and regexp_replace(translate(c.value,'۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩','01234567890123456789'),'[^0-9]','','g')=any($1::text[]) order by c.is_primary desc limit 2",[variants]);
 if(users.rowCount!==1){
  const dummy=otpDigest(phone,createOtpCode());
  await query("insert into otp_challenges(phone,purpose,code_hash,requested_ip,send_status,send_info,expires_at,resend_at,consumed_at) values($1,'login',$2,$3::inet,'failed','account_not_eligible',now()+interval '120 seconds',now()+interval '120 seconds',now())",[phone,dummy,ip]);
  return res.status(202).json({message:"اگر شماره متعلق به حساب فعال و تأییدشده باشد، کد ورود ارسال می‌شود"});
 }
 const code=createOtpCode(),digest=otpDigest(phone,code),ttl=120,resend=120;
 await query("update otp_challenges set consumed_at=now() where phone=$1 and purpose='login' and consumed_at is null",[phone]);
 const created=await query("insert into otp_challenges(phone,purpose,code_hash,requested_ip,expires_at,resend_at) values($1,'login',$2,$3::inet,now()+($4 * interval '1 second'),now()+($5 * interval '1 second')) returning id",[phone,digest,ip,ttl,resend]);
 const sent=await sendKavenegarOtp(phone,code,"سوکار");
 await query("update otp_challenges set send_status=$1,send_info=$2,consumed_at=case when $1='failed' then now() else consumed_at end where id=$3",[sent.ok?"sent":"failed",sent.info,created.rows[0].id]);
 if(!sent.ok)return res.status(502).json({error:"ارسال پیامک انجام نشد؛ تنظیمات درگاه پیامک را بررسی کنید"});
 res.status(202).json({message:"کد ورود ارسال شد",expiresIn:ttl,resendIn:resend});
}));

app.post("/api/auth/otp/verify",asyncHandler(async(req,res)=>{
 const phone=normalizeIranMobile(req.body?.phone);
 const code=String(req.body?.code??"").replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g,"");
 if(!phone||!/^\d{6}$/.test(code))return res.status(400).json({error:"شماره موبایل یا کد شش‌رقمی معتبر نیست"});
 const verifyIp=req.ip||"127.0.0.1";
 await query("insert into otp_verification_attempts(requested_ip,phone) values($1::inet,$2)",[verifyIp,phone]);
 const ipAttempts=await query("select count(*)::int as total from otp_verification_attempts where requested_ip=$1::inet and attempted_at>now()-interval '15 minutes'",[verifyIp]);
 if(Number(ipAttempts.rows[0]?.total||0)>40)return res.status(429).json({error:"تلاش‌های زیاد از این شبکه؛ کمی بعد دوباره امتحان کنید"});
 const client=await pool.connect();
 let user:any=null;
 try{
  await client.query("begin");
  const challenge=await client.query("select id,code_hash,attempts,expires_at from otp_challenges where phone=$1 and purpose='login' and consumed_at is null and send_status='sent' order by created_at desc limit 1 for update",[phone]);
  if(!challenge.rowCount||new Date(challenge.rows[0].expires_at).getTime()<Date.now()){
   await client.query("rollback");return res.status(400).json({error:"کد منقضی شده یا پیدا نشد؛ کد جدید بگیرید"});
  }
  const current=challenge.rows[0];
  if(Number(current.attempts)>=5){
   await client.query("update otp_challenges set consumed_at=now() where id=$1",[current.id]);
   await client.query("commit");return res.status(429).json({error:"تعداد تلاش بیش از حد است؛ کد جدید بگیرید"});
  }
  const valid=verifyOtpDigest(current.code_hash,phone,code);
  await client.query("update otp_challenges set attempts=attempts+1,consumed_at=case when $2::boolean then now() when attempts+1>=5 then now() else consumed_at end where id=$1",[current.id,valid]);
  if(!valid){await client.query("commit");return res.status(400).json({error:"کد ورود نادرست است"});}
  const variants=[phone,"98"+phone.slice(1),"0098"+phone.slice(1)];
  const found=await client.query("select u.id,u.email,u.full_name,u.role from users u join user_contact_methods c on c.user_id=u.id where u.status='active' and c.channel='sms' and c.status='active' and c.verified_at is not null and regexp_replace(translate(c.value,'۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩','01234567890123456789'),'[^0-9]','','g')=any($1::text[]) order by c.is_primary desc limit 2 for update of u",[variants]);
  if(found.rowCount===1)user=found.rows[0];
  await client.query("commit");
 }catch(error){await client.query("rollback");throw error;}finally{client.release();}
 if(!user)return res.status(401).json({error:"حساب فعال و تأییدشده‌ای برای این شماره پیدا نشد"});
 await issueSession(req,res,{id:user.id,email:user.email,role:user.role});
 await query("insert into security_login_events(user_id,email,ip_address,user_agent,success) values($1,$2,$3::inet,$4,true)",[user.id,user.email,req.ip||null,String(req.headers["user-agent"]||"").slice(0,1000)||null]);
 res.json({user:{id:user.id,email:user.email,fullName:user.full_name,role:user.role}});
}));

app.post("/api/auth/login",asyncHandler(async(req,res)=>{
 const method=req.body?.method==="mobile"?"mobile":req.body?.method==="nationalId"?"nationalId":"email";
 const rawIdentifier=String(req.body?.identifier??req.body?.email??"").trim();
 const normalizeDigits=(value:string)=>value.replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
 const identifier=method==="mobile"?normalizeDigits(rawIdentifier).replace(/[\s()+-]/g,""):method==="nationalId"?normalizeDigits(rawIdentifier).replace(/[\s]/g,""):rawIdentifier.toLowerCase();
 const input=loginIdentifierSchema.parse({email:identifier,password:req.body?.password});
 if(method==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))return res.status(400).json({error:"آدرس ایمیل معتبر نیست"});
 if(method==="mobile"&&!/^[0-9]{8,15}$/.test(identifier.replace(/^\+/,"")))return res.status(400).json({error:"شماره موبایل معتبر نیست"});
 if(method==="nationalId"&&!isValidIranianNationalCode(identifier))return res.status(400).json({error:"کد ملی معتبر نیست"});
 if(!verifyHumanCheck(String(req.body?.humanCheck||""),String(req.body?.humanAnswer||"")))return res.status(400).json({error:"تأیید انسانی نامعتبر یا منقضی شده است"});
 const r=method==="mobile"
  ?await query("select id,email,password_hash,full_name,role from users where status='active' and exists (select 1 from user_contact_methods c where c.user_id=users.id and c.channel='sms' and c.status='active' and c.verified_at is not null and regexp_replace(translate(c.value,'۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩','01234567890123456789'),'[^0-9]','','g')=$1) limit 2",[identifier])
  :method==="nationalId"
   ?await query("select id,email,password_hash,full_name,role from users where national_id=$1 and status='active'",[identifier])
   :await query("select id,email,password_hash,full_name,role from users where lower(email)=$1 and status='active'",[identifier]);
 if(!r.rowCount||r.rowCount!==1||!(await verifyPassword(input.password,r.rows[0].password_hash))){
  await query("insert into security_login_events(user_id,email,ip_address,user_agent,success,failure_reason) values($1,$2,$3::inet,$4,false,$5)",[r.rows[0]?.id||null,method==="email"?identifier:(r.rows[0]?.email||identifier),req.ip||null,String(req.headers["user-agent"]||"").slice(0,1000)||null,"invalid_credentials_or_inactive_account"]);
  return res.status(401).json({error:"اطلاعات ورود نادرست است"});
 }
 const u=r.rows[0];
 await issueSession(req,res,{id:u.id,email:u.email,role:u.role});
 await query("insert into security_login_events(user_id,email,ip_address,user_agent,success) values($1,$2,$3::inet,$4,true)",[u.id,u.email,req.ip||null,String(req.headers["user-agent"]||"").slice(0,1000)||null]);
 res.json({user:{id:u.id,email:u.email,fullName:u.full_name,role:u.role}});
}));

app.post("/api/auth/register",asyncHandler(async(req,res)=>{
 const email=String(req.body?.email||"").trim().toLowerCase();
 const fullName=String(req.body?.fullName||"").trim();
 const password=String(req.body?.password||"");
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>320)return res.status(400).json({error:"آدرس ایمیل معتبر نیست"});
 if(fullName.length<2||fullName.length>200)return res.status(400).json({error:"نام و نام خانوادگی را کامل وارد کنید"});
 if(password.length<8||password.length>200)return res.status(400).json({error:"رمز عبور باید حداقل ۸ و حداکثر ۲۰۰ نویسه باشد"});
 if(!verifyHumanCheck(String(req.body?.humanCheck||""),String(req.body?.humanAnswer||"")))return res.status(400).json({error:"تأیید انسانی نامعتبر یا منقضی شده است"});
 const passwordHash=await hashPassword(password);
 const created=await query("insert into users(email,password_hash,full_name,role,status) values($1,$2,$3,'viewer','active') on conflict (email) do nothing returning id,email,full_name,role",[email,passwordHash,fullName]);
 if(!created.rowCount)return res.status(409).json({error:"با این ایمیل قبلاً حساب ساخته شده است؛ وارد شوید"});
 const user=created.rows[0];
 await issueSession(req,res,{id:user.id,email:user.email,role:user.role});
 res.status(201).json({user:{id:user.id,email:user.email,fullName:user.full_name,role:user.role}});
}));
 
app.get("/api/auth/me",requireAuth,(req,res)=>res.json({user:(req as any).user}));
app.post("/api/auth/logout",requireAuth,asyncHandler(async(req,res)=>{const user=(req as any).user;if(user.sessionId)await query("update security_sessions set revoked_at=now() where id=$1 and user_id=$2 and revoked_at is null",[user.sessionId,user.id]);clearSession(res);res.status(204).end();}));

app.get("/api/admin/users",requireAuth,requirePermission("users:manage"),asyncHandler(async(_req,res)=>res.json((await query("select id,email,full_name,role,status,created_at from users order by created_at desc")).rows)));
app.post("/api/admin/users",requireAuth,requirePermission("users:manage"),asyncHandler(async(req,res)=>{
 const input=userCreateSchema.parse(req.body),hash=await hashPassword(input.password);
 const r=await query("insert into users(email,password_hash,full_name,role) values($1,$2,$3,$4) returning id,email,full_name,role,status",[input.email.toLowerCase(),hash,input.fullName,input.role]);
 res.status(201).json(r.rows[0]);
}));

app.get("/api/content/forms",requireAuth,requirePermission("templates:manage"),asyncHandler(async(_req,res)=>res.json((await query("select * from form_definitions order by updated_at desc")).rows)));
app.post("/api/content/forms",requireAuth,requirePermission("templates:manage"),asyncHandler(async(req,res)=>{const input=formSchema.parse(req.body);const r=await query("insert into form_definitions(name,slug,module_key,schema) values($1,$2,$3,$4) returning *",[input.name,input.slug,input.moduleKey,input.schema]);res.status(201).json(r.rows[0]);}));
app.put("/api/content/forms/:id",requireAuth,requirePermission("templates:manage"),asyncHandler(async(req,res)=>{const input=formSchema.parse(req.body);const r=await query("update form_definitions set name=$1,module_key=$2,schema=$3,updated_at=now() where id=$4 returning *",[input.name,input.moduleKey,input.schema,req.params.id]);if(!r.rowCount)return res.status(404).json({error:"فرم پیدا نشد"});res.json(r.rows[0]);}));

app.get("/api/content/pages",requireAuth,requirePermission("frontend:manage"),asyncHandler(async(_req,res)=>res.json((await query("select * from page_definitions order by updated_at desc")).rows)));
app.post("/api/content/pages",requireAuth,requirePermission("frontend:manage"),asyncHandler(async(req,res)=>{const input=pageSchema.parse(req.body);const r=await query("insert into page_definitions(name,slug,module_key,definition) values($1,$2,$3,$4) returning *",[input.name,input.slug,input.moduleKey,input.definition]);res.status(201).json(r.rows[0]);}));
app.put("/api/content/pages/:id",requireAuth,requirePermission("frontend:manage"),asyncHandler(async(req,res)=>{const input=pageSchema.parse(req.body);const r=await query("update page_definitions set name=$1,module_key=$2,definition=$3,updated_at=now() where id=$4 returning *",[input.name,input.moduleKey,input.definition,req.params.id]);if(!r.rowCount)return res.status(404).json({error:"صفحه پیدا نشد"});res.json(r.rows[0]);}));

app.get("/api/content/menus",requireAuth,requirePermission("menus:manage"),asyncHandler(async(_req,res)=>res.json((await query("select * from menu_items order by sort_order,id")).rows)));
app.put("/api/content/menus/:id",requireAuth,requirePermission("menus:manage"),asyncHandler(async(req,res)=>{const input=menuUpdateSchema.parse(req.body);const r=await query("update menu_items set title=$1,path=$2,permission=$3,updated_at=now() where id=$4 returning *",[input.title,input.path,input.permission??null,req.params.id]);if(!r.rowCount)return res.status(404).json({error:"آیتم منو پیدا نشد"});res.json(r.rows[0]);}));

app.get("/api/platform/modules",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user;
 const params:any[]=[user.role];
 const access=user.role==="admin"?"":"and exists (select 1 from role_permissions rp join module_permissions mp on mp.permission=rp.permission where rp.role=$1 and mp.module_id=m.id)";
 const sql="select m.id,m.code,m.title,m.core,m.parent_id,m.sort_order,m.is_active,coalesce(rt.lifecycle,'planned') as lifecycle,rt.route,rt.api_prefix,rt.owner_team,rt.description,coalesce(rc.record_count,0)::int as record_count from platform_modules m left join module_runtime rt on rt.module_id=m.id left join (select module_id,count(*)::int as record_count from module_records group by module_id) rc on rc.module_id=m.id where m.is_active=true "+access+" order by m.sort_order";
 const r=await query(sql,access?params:[]);
 res.json({items:r.rows,total:r.rowCount});
}));

app.get("/api/platform/modules/:code",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user;
 const r=await query("select m.id,m.code,m.title,m.core,m.parent_id,m.sort_order,m.is_active,rt.lifecycle,rt.route,rt.api_prefix,rt.owner_team,rt.description from platform_modules m left join module_runtime rt on rt.module_id=m.id where m.code=$1 and m.is_active=true",[req.params.code]);
 if(!r.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 const moduleRow=r.rows[0];
 if(user.role!=="admin"){
  const p=await query("select 1 from role_permissions rp join module_permissions mp on mp.permission=rp.permission where rp.role=$1 and mp.module_id=$2",[user.role,moduleRow.id]);
  if(!p.rowCount)return res.status(403).json({error:"دسترسی به ماژول مجاز نیست"});
 }
 const actions=await query("select id,action_code,title,permission,is_active from module_actions where module_id=$1 and is_active=true order by id",[moduleRow.id]);
 res.json({...moduleRow,actions:actions.rows});
}));

app.get("/api/platform/modules/:code/actions",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user;
 const r=await query("select m.id from platform_modules m where m.code=$1 and m.is_active=true",[req.params.code]);
 if(!r.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 const p=await query("select 1 from role_permissions rp join module_permissions mp on mp.permission=rp.permission where rp.role=$1 and mp.module_id=$2",[user.role,r.rows[0].id]);
 if(user.role!=="admin"&&!p.rowCount)return res.status(403).json({error:"دسترسی مجاز نیست"});
 const actions=await query("select id,action_code,title,permission,is_active from module_actions where module_id=$1 and is_active=true order by id",[r.rows[0].id]);
 res.json(actions.rows);
}));


// // Persistent module record runtime, always scoped to the authenticated tenant.
app.get("/api/platform/modules/:code/schema",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user,t=await resolveRequestTenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const m=await query("select id,code,title from platform_modules where code=$1 and is_active=true",[req.params.code]);
 if(!m.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 if(!(await requireModulePermission(user,m.rows[0].id,"read")))return res.status(403).json({error:"دسترسی مشاهده مجاز نیست"});
 const recordType=typeof req.query.recordType==="string"&&req.query.recordType.trim()?req.query.recordType.trim():"default";
 const r=await query("select field_key,title,field_type,required,sort_order,options from module_field_definitions where module_id=$1 and record_type=$2 order by sort_order,id",[m.rows[0].id,recordType]);res.json({module:m.rows[0],fields:r.rows,recordType});
}));
app.get("/api/platform/modules/:code/records",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user,t=await resolveRequestTenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const m=await query("select id,code,title from platform_modules where code=$1 and is_active=true",[req.params.code]);if(!m.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 if(!(await requireModulePermission(user,m.rows[0].id,"read")))return res.status(403).json({error:"دسترسی مشاهده مجاز نیست"});
 const page=Math.max(1,Number(req.query.page)||1),pageSize=Math.min(100,Math.max(1,Number(req.query.pageSize)||20)),q=typeof req.query.q==="string"?req.query.q.trim():"",status=typeof req.query.status==="string"?req.query.status.trim():"",recordType=typeof req.query.recordType==="string"?req.query.recordType.trim():"";
 const where=["tenant_id=$1","module_id=$2"],params:any[]=[t.id,m.rows[0].id];
 if(recordType){params.push(recordType);where.push("record_type=$"+params.length)}
 if(q){params.push("%"+q+"%");where.push("(title ilike $"+params.length+" or record_type ilike $"+params.length+" or data::text ilike $"+params.length+")")}if(status){params.push(status);where.push("status=$"+params.length)}
 const count=await query("select count(*)::int total from module_records where "+where.join(" and "),params),total=count.rows[0].total,offset=(page-1)*pageSize;params.push(pageSize,offset);
 const r=await query("select id,record_type,title,status,data,created_by,created_at,updated_at from module_records where "+where.join(" and ")+" order by updated_at desc limit $"+(params.length-1)+" offset $"+params.length,params);
 res.json({items:r.rows,page,pageSize,total,totalPages:Math.ceil(total/pageSize)});
}));
app.post("/api/platform/modules/:code/records",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user,t=await resolveRequestTenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const m=await query("select id from platform_modules where code=$1 and is_active=true",[req.params.code]);if(!m.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 if(!(await requireModulePermission(user,m.rows[0].id,"write")))return res.status(403).json({error:"دسترسی ثبت و ویرایش مجاز نیست"});
 const {recordType,title,status="active",data={}}=req.body||{};if(typeof recordType!=="string"||typeof title!=="string"||!data||typeof data!=="object"||Array.isArray(data))return res.status(400).json({error:"ساختار رکورد نامعتبر است"});
 const r=await query("insert into module_records(tenant_id,module_id,record_type,title,status,data,created_by,updated_by) values($1,$2,$3,$4,$5,$6,$7,$7) returning *",[t.id,m.rows[0].id,recordType,title,status,data,user.id]);res.status(201).json(r.rows[0]);
}));
app.patch("/api/platform/modules/:code/records/:id",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user,t=await resolveRequestTenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const m=await query("select id from platform_modules where code=$1 and is_active=true",[req.params.code]);if(!m.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 if(!(await requireModulePermission(user,m.rows[0].id,"write")))return res.status(403).json({error:"دسترسی ویرایش مجاز نیست"});
 const {title,status,data}=req.body||{};const r=await query("update module_records set title=coalesce($1,title),status=coalesce($2,status),data=coalesce($3,data),updated_by=$6,updated_at=now() where id=$4 and module_id=$5 and tenant_id=$7 returning *",[title,status,data,req.params.id,m.rows[0].id,user.id,t.id]);if(!r.rowCount)return res.status(404).json({error:"رکورد پیدا نشد"});res.json(r.rows[0]);
}));
app.delete("/api/platform/modules/:code/records/:id",requireAuth,asyncHandler(async(req,res)=>{
 const user=(req as any).user,t=await resolveRequestTenant(req);if(!t)return res.status(403).json({error:"محدوده سازمانی معتبر پیدا نشد"});
 const m=await query("select id from platform_modules where code=$1 and is_active=true",[req.params.code]);if(!m.rowCount)return res.status(404).json({error:"ماژول پیدا نشد"});
 if(!(await requireModulePermission(user,m.rows[0].id,"delete")))return res.status(403).json({error:"دسترسی حذف مجاز نیست"});
 const r=await query("delete from module_records where id=$1 and module_id=$2 and tenant_id=$3 returning id",[req.params.id,m.rows[0].id,t.id]);if(!r.rowCount)return res.status(404).json({error:"رکورد پیدا نشد"});res.status(204).end();
}));

app.use(notFound);
app.use(errorHandler);

const port=Number(process.env.PORT||4000);
const server=app.listen(port,()=>console.log("NAF API listening on",port));
const shutdown=async()=>{server.close();const {pool}=await import("./db.js");await pool.end();process.exit(0)};
process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
const slaSweep=setInterval(()=>sweepSlaCases().catch(console.error),60000);
slaSweep.unref();
void getDigikalaCatalog(true).catch(error=>console.error("Digikala catalog warm-up failed",error));
const digikalaCatalogSweep=setInterval(()=>getDigikalaCatalog(true).catch(error=>console.error("Digikala catalog refresh failed",error)),5*60*1000);
digikalaCatalogSweep.unref();
if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD)ensureAdmin(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD).catch(console.error);
