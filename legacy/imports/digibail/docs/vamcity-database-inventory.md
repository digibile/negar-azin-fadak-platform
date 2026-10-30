# فهرست استخراج‌شده ساختار دیتابیس‌های VamCity

> استخراج فقط از متادیتای بکاپ‌های SQL Server بازیابی‌شده در محیط ایزوله انجام شده است. هیچ رکورد شخصی یا مالی در این سند درج نشده و هیچ دیتابیس عملیاتی تغییر نکرده است.

**مخزن:** `digibile/digibail`  
**اجرای استخراج متادیتا:** `40982494929`  
**وضعیت:** موفق

## وام و کاربران اصلی

- دیتابیس: `vamcityc_vamcity_import_20261028`
- جدول‌ها: **88**
- ستون‌ها: **957**
- رکوردها: **531,172**
- قیود PK/Unique: **88** نام قید، 100 ستون کلید
- قیود FK: **188** نام قید، 188 ستون رابطه
- ایندکس‌ها: **283** نام ایندکس، 297 ردیف ستون ایندکس
- View/Procedure/Function/Trigger: **0**
- Check constraints: **0**
- Sequences/User types: **0**
- Database triggers: **0**

### جدول‌ها و تعداد رکورد

| Schema | Table | Rows |
| --- | --- | --- |
| dbo | __EFMigrationsHistory | 225 |
| dbo | AffiliateCommissions | 0 |
| dbo | AgentFactorItem | 23 |
| dbo | AgentFactors | 25 |
| dbo | AgentLoanAuthorizationItem | 141 |
| dbo | AgentLoans | 924 |
| dbo | AgentMetaData | 160 |
| dbo | AppEmails | 5946 |
| dbo | AppInquirys | 606 |
| dbo | AppSettings | 2 |
| dbo | AppSms | 138573 |
| dbo | AspNetRoleClaims | 0 |
| dbo | AspNetRoles | 8 |
| dbo | AspNetUserClaims | 222 |
| dbo | AspNetUserLogins | 0 |
| dbo | AspNetUserRoles | 54625 |
| dbo | AspNetUsers | 54628 |
| dbo | AspNetUserTokens | 0 |
| dbo | AssuranceChequeItem | 7 |
| dbo | AssuranceRequirementItems | 16 |
| dbo | AssuranceRequirements | 4 |
| dbo | Assurances | 161 |
| dbo | AuthorizationItem | 80 |
| dbo | BusinessAuthorizationItems | 0 |
| dbo | Consultants | 1 |
| dbo | Contacts | 0 |
| dbo | CustomerMarketerCommissions | 23 |
| dbo | CustomerOrders | 548 |
| dbo | CustomerPurchasePlan | 2 |
| dbo | Customers | 2 |
| dbo | EmzameContractAuthorizationItems | 0 |
| dbo | Expenses | 0 |
| dbo | IceReport | 56 |
| dbo | InquirySettings | 0 |
| dbo | IranValidityReport | 2762 |
| dbo | LoanAssuranceRequirements | 9 |
| dbo | LoanAuthorizationItems | 276 |
| dbo | LoanContacts | 0 |
| dbo | LoanRequestStatuses | 121 |
| dbo | Loans | 112 |
| dbo | LoanTags | 9 |
| dbo | MemberAuthorizationItemAttachments | 0 |
| dbo | MemberAuthorizationItems | 0 |
| dbo | MemberPurchases | 6937 |
| dbo | OffDate | 197 |
| dbo | OnlineMoneyTransfer | 271 |
| dbo | Organization | 3 |
| dbo | Product | 0 |
| dbo | Purchases | 2 |
| dbo | Reliability | 0 |
| dbo | SiteContents | 0 |
| dbo | SmsPatterns | 55 |
| dbo | SubAgentTransactions | 1 |
| dbo | Tags | 9 |
| dbo | ThirdPartySettings | 1 |
| dbo | ThirdPartyTransfer | 1963 |
| dbo | ThirdPersonAssuranceAuthorizationItems | 0 |
| dbo | TicketResponses | 54661 |
| dbo | Tickets | 54197 |
| dbo | UserLoanContact | 0 |
| dbo | UserLoanPaymentOthers | 223 |
| dbo | UserLoanPaymentRequests | 133 |
| dbo | UserLoanPayments | 29220 |
| dbo | UserLoanProduct | 0 |
| dbo | UserLoanRequestAuthorizationItemAttachments | 19347 |
| dbo | UserLoanRequestAuthorizationItems | 19576 |
| dbo | UserLoanRequestProduct | 0 |
| dbo | UserLoanRequests | 17255 |
| dbo | UserLoanRequestSponsorHistory | 0 |
| dbo | UserLoanRequestStatusHistories | 49156 |
| dbo | UserLoans | 1407 |
| dbo | UserLoanSponsoreDueDate | 13 |
| dbo | UserRefahBeta | 70 |
| dbo | UserSavedMonies | 0 |
| dbo | VisitorLogs | 11308 |
| dbo | WithdrawAgentFactor | 11 |
| dbo | Withdraws | 1494 |
| HangFire | AggregatedCounter | 43 |
| HangFire | Counter | 0 |
| HangFire | Hash | 31 |
| HangFire | Job | 97 |
| HangFire | JobParameter | 364 |
| HangFire | JobQueue | 0 |
| HangFire | List | 0 |
| HangFire | Schema | 1 |
| HangFire | Server | 1 |
| HangFire | Set | 4 |
| HangFire | State | 2824 |

### تمام ستون‌ها

| Schema | Table | Ord | Column | SQL type | Max length | Precision | Scale | Nullable | Identity | Computed | Default | Computed expression |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dbo | __EFMigrationsHistory | 1 | MigrationId | nvarchar | 150 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | __EFMigrationsHistory | 2 | ProductVersion | nvarchar | 32 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 2 | Amount | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 3 | PaidToUser | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 4 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 5 | Description | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 6 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 7 | PurchaseId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactorItem | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactorItem | 2 | AgentFactorId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactorItem | 3 | Product | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentFactorItem | 4 | Payable | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactorItem | 5 | Count | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactorItem | 6 | Fee | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactorItem | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactors | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactors | 2 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | AgentFactors | 3 | UserCode | nvarchar | 10 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentFactors | 4 | MemberId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactors | 5 | AgentId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentFactors | 6 | CreateAt | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactors | 7 | CheckoutType | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactors | 8 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactors | 9 | Description | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentFactors | 10 | AdminDescription | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentFactors | 11 | AdminAcceptStatus | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactors | 12 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentFactors | 13 | CheckoutRequestDateTime | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | AgentFactors | 14 | Commission | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | AgentFactors | 15 | MemberPurchaseId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentFactors | 16 | AgentFactorOnlinePaymentMethod | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AgentLoanAuthorizationItem | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoanAuthorizationItem | 2 | AuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoanAuthorizationItem | 3 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoanAuthorizationItem | 4 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 2 | AgentId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 3 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 4 | Percent | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 5 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 6 | DefaultCheckoutDays | tinyint | 1 | 3 | 0 | 0 | 0 | 0 | (CONVERT([tinyint],(0))) | NULL |
| dbo | AgentLoans | 7 | ContactId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 8 | ContactPercent | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 11 | ProductCheckoutDays | tinyint | 1 | 3 | 0 | 0 | 0 | 0 | (CONVERT([tinyint],(0))) | NULL |
| dbo | AgentLoans | 12 | ProductPercent | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | AgentLoans | 13 | OtherPercentsJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 14 | CashTitle | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 15 | ProductTitle | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 2 | SignaturesOwnerNames | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 3 | ShomareSabt | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 4 | ShenaseMelli | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 5 | CompanyName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 6 | AgentCategoryActivities | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 7 | AgentType | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 8 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 9 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 10 | Status | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 11 | RejectReason | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 12 | LastAdminChangeDateTime | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 13 | CheckedBy | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 14 | ThumbnailFileName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 15 | JavazKasbFileName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 16 | KartMelliFileName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 17 | EjarenameFileName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 18 | AsasnameFileName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 19 | RoznameRasmiFileName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 20 | IsOnline | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AgentMetaData | 21 | IsPhysical | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AgentMetaData | 22 | SiteUrl | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 23 | AgentFactorCommission | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | AgentMetaData | 24 | MaxAgentFactorCommission | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | AgentMetaData | 25 | UseDefaultCommission | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(1))) | NULL |
| dbo | AgentMetaData | 26 | PledgeChequeFileName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentMetaData | 27 | CanConvertRequestToLoan | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppEmails | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppEmails | 2 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppEmails | 3 | Text | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppEmails | 4 | AppEmailType | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppEmails | 5 | To | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppEmails | 6 | PatternTitle | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppEmails | 7 | EmailPanel | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppEmails | 8 | EntityId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppEmails | 9 | EntityType | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppEmails | 10 | Tag | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppEmails | 11 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppInquirys | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppInquirys | 2 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppInquirys | 3 | InquiryPanel | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppInquirys | 4 | AppInquiryType | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppInquirys | 5 | Price | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppInquirys | 6 | IsSuccess | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppInquirys | 7 | PanelResultJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppInquirys | 8 | Result | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppInquirys | 9 | Key | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppInquirys | 10 | Tag | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppInquirys | 11 | MemberId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppInquirys | 12 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppInquirys | 13 | MemberPrice | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | AppSettings | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 5 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('2a18f1fc-57fe-482c-8003-b6ba13b12996') | NULL |
| dbo | AppSettings | 6 | IsOnlinePaymentActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 7 | OnlinePaymentGateway | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 8 | Shaba | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 9 | ZarinpalMerchantCode | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 10 | DueDateRememberSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 11 | DueDatedRememberSmsTime | time | 5 | 16 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 12 | SmsCredit | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 13 | ThanksPaymentSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 14 | AppendToWhichInstallment | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 15 | RoundCountNumber | tinyint | 1 | 3 | 0 | 0 | 0 | 0 | (CONVERT([tinyint],(0))) | NULL |
| dbo | AppSettings | 16 | OverDueDateSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 17 | OverDueDaysCount | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 18 | SepTerminalId | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 19 | DashboardSettingsJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 20 | BeforeDueDaysCount | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 21 | IsDueDateSmsActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 22 | IsRememberSmsActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 23 | OverDueDayRemeberOnce | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 24 | BeforeDueDateSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 25 | DefaultSmsPanel | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 26 | MelliPayamakConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 27 | KaveNegarConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 28 | BankInfo | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 29 | IceConfigJson | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 30 | NextPayApiKey | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 31 | BankAccountsJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 32 | IPGParsianLoginAccount | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 33 | Address | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 34 | Email | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 35 | Phones | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 36 | ThemeSettingsJson | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 37 | DepositChargeDueDateStatuses | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 38 | SponsoreDueDateStatuses | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 39 | LoginSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 40 | RegisterSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 41 | IranValidityConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 42 | ApplicationLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 43 | BusinessTitle | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 44 | EnamadLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 45 | EtehadieLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 46 | InstagramLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 47 | RubikaLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 48 | SamandehiLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 49 | TelegramLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 50 | WhatsappLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 51 | ShopLink | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 52 | RegisterOtpSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 53 | AnjomanSenfiLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 54 | AparatLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 55 | ShopTitle | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 56 | FinnoTechConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 57 | KasboKarhayeInternetiTehranLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 58 | BankGatewayRouterBaseUrl | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 59 | ApiKey | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 60 | ApiPassword | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 61 | SadadMerchantId | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 62 | SadadTerminalId | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 63 | SadadMerchantKey | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 64 | WalletChargeSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 65 | AgentOfficePhone | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 66 | BeforeDueDateEmailPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 67 | BeforeDueDaysCount_Email | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 68 | DailyReportEmailTime | time | 5 | 16 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 69 | DefaultEmailPanel | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 70 | DueDateRememberEmailPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 71 | DueDatedRememberEmailTime | time | 5 | 16 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 72 | EmailConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 73 | IsDailyReportEmailActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 74 | IsDueDateEmailActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 75 | IsRememberEmailActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 76 | LoginEmailPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 77 | OverDueDateEmailPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 78 | OverDueDayRemeberOnce_Email | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 79 | OverDueDaysCount_Email | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 80 | RegisterEmailPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 81 | RegisterOtpEmailPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 82 | ThanksPaymentEmailPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 83 | WalletChargeEmailPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 84 | RefahBetaConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 85 | IPPanelConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 86 | SiteTheme | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 87 | NewOrderEmailPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 88 | NewOrderSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 89 | OtpRequiredInManualMemberRegistration | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 90 | WebOneConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 91 | PercentOfConsideringAsPaid | tinyint | 1 | 3 | 0 | 0 | 0 | 0 | (CONVERT([tinyint],(50))) | NULL |
| dbo | AppSettings | 92 | ShowSubmitFirstLoanRequestNotifInMemberPanel | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(1))) | NULL |
| dbo | AppSettings | 93 | NewUserLoanSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 94 | PreventCreateLoanNonCurrentDate | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 95 | WalletWithdrawNotificationSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 96 | WalletWithdrawOtpEmailPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 97 | WalletWithdrawOtpSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 98 | CalculatorType | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 99 | AgentFactorCommission | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | AppSettings | 100 | AgentFactorOnlinePaymentGateway | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 101 | MaxAgentFactorCommission | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | AppSettings | 102 | AgentFactorPaymentLinkSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 103 | SepehrTerminalId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | (CONVERT([bigint],(0))) | NULL |
| dbo | AppSettings | 104 | ApiIRConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 105 | DefaultInquiryPanel | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 106 | InquiryCredit | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 107 | VerifyMobileByNationalCodeInRegister | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 108 | DigitalSignLinkSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 109 | DigitalSignCompleteSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 110 | DigitalSignOtpSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 111 | IsMemberRegistrationDisabled | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 112 | MemberCanChangeProfile | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 113 | BaleConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 114 | ThirdPersonDigitalSignCompleteSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 115 | ThirdPersonDigitalSignLinkSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 116 | ThirdPersonDigitalSignOtpSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 117 | InquiryBankInRegister | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 118 | InquiryPersonInfoInRegister | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 119 | InquiryPostalAddressInRegister | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 120 | EmzameConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 121 | OverDueDayGapPeriod | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 122 | HafezPayamConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 123 | NewLoanRequestNotificationSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 124 | NewLoanRequestNotificationSmsReceiptors | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 125 | SendOverDueRememberToGuarantorSmsActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 126 | InquirySanaInRegister | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 127 | GuarantorOverDueDateSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 128 | GuarantorOverDueDaysCount | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 129 | ZibalMerchantCode | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 2 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 3 | Text | nvarchar | 1500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 4 | Price | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 5 | AppSmsType | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 6 | To | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 7 | Status | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 8 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 9 | EntityId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('00000000-0000-0000-0000-000000000000') | NULL |
| dbo | AppSms | 10 | EntityType | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 11 | SmsPatternTitle | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 12 | SmsPanel | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSms | 13 | DeliverCheckRetryCount | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSms | 14 | SMSKey | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 15 | Tag | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetRoleClaims | 1 | Id | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | AspNetRoleClaims | 2 | RoleId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetRoleClaims | 3 | ClaimType | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetRoleClaims | 4 | ClaimValue | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetRoles | 1 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | AspNetRoles | 2 | Name | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetRoles | 3 | NormalizedName | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetRoles | 4 | ConcurrencyStamp | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserClaims | 1 | Id | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | AspNetUserClaims | 2 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserClaims | 3 | ClaimType | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserClaims | 4 | ClaimValue | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserLogins | 1 | LoginProvider | nvarchar | 450 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserLogins | 2 | ProviderKey | nvarchar | 450 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserLogins | 3 | ProviderDisplayName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserLogins | 4 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserRoles | 1 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserRoles | 2 | RoleId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 1 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | AspNetUsers | 2 | FirstName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 3 | LastName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 4 | Gender | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 5 | Address | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 6 | Mobile | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 7 | LastLoginDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 8 | IsActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 10 | NationalCode | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 15 | TotalSavedMoney | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 16 | ViewCount | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 17 | UserName | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 18 | NormalizedUserName | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 19 | Email | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 20 | NormalizedEmail | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 21 | EmailConfirmed | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 22 | PasswordHash | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 23 | SecurityStamp | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 24 | ConcurrencyStamp | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 25 | PhoneNumber | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 26 | PhoneNumberConfirmed | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 27 | TwoFactorEnabled | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 28 | LockoutEnd | datetimeoffset | 10 | 34 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 29 | LockoutEnabled | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 30 | AccessFailedCount | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 31 | RegDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | AspNetUsers | 32 | LastLoginDate2 | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | AspNetUsers | 33 | RegDate2 | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | AspNetUsers | 34 | Familiar1FirstName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 35 | Familiar1LastName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 36 | Familiar1Mobile | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 37 | Familiar2FirstName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 38 | Familiar2LastName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 39 | Familiar2Mobile | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 40 | FatherName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 41 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 42 | AffiliateCode | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 43 | CommissionPercent | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AspNetUsers | 44 | Phone | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 45 | MobileVerified | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AspNetUsers | 46 | Otp | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AspNetUsers | 47 | RegistrationCompleted | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AspNetUsers | 48 | Credit | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | AspNetUsers | 49 | BusinessName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 50 | AgentId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 53 | BankAccountsJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 54 | CustomerMarketerId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 55 | PostalCode | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 56 | Shenasname | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 57 | City | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 58 | SmsActiveForMembers | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(1))) | NULL |
| dbo | AspNetUsers | 59 | AgentMetaDataId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 60 | WalletIsLock | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AspNetUsers | 61 | BirthDate | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 62 | ReliabilityId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 63 | UserCode | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserTokens | 1 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserTokens | 2 | LoginProvider | nvarchar | 450 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserTokens | 3 | Name | nvarchar | 450 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserTokens | 4 | Value | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AssuranceChequeItem | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AssuranceChequeItem | 2 | DueDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | AssuranceChequeItem | 3 | FileName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AssuranceChequeItem | 4 | ChequeNumber | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AssuranceChequeItem | 5 | SayadiId | nvarchar | 25 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AssuranceChequeItem | 6 | Price | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AssuranceChequeItem | 7 | AssuranceId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AssuranceChequeItem | 8 | IsCollected | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AssuranceChequeItem | 9 | IsReturned | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AssuranceRequirementItems | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AssuranceRequirementItems | 2 | Title | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AssuranceRequirementItems | 3 | Order | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AssuranceRequirementItems | 4 | AssuranceRequirementId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AssuranceRequirementItems | 5 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AssuranceRequirements | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AssuranceRequirements | 2 | Title | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AssuranceRequirements | 3 | Order | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AssuranceRequirements | 4 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 2 | Description | nvarchar | 2000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 3 | FileName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 4 | FileSize | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 5 | FileType | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 6 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 7 | AssuranceType | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | Assurances | 8 | GoldWeight | decimal | 9 | 18 | 4 | 0 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 9 | IsReturned | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Assurances | 10 | OrganizationId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 11 | PersonFullName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 12 | PersonNationalCode | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 13 | PersonalCode | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 14 | ReturnDateTime | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | Assurances | 15 | ReturnedToPerson | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 16 | MobileVerified | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Assurances | 17 | PersonMobile | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 18 | CoinType | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | Assurances | 19 | ReturnFileName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 20 | ReturnFileSize | bigint | 8 | 19 | 0 | 0 | 0 | 0 | (CONVERT([bigint],(0))) | NULL |
| dbo | Assurances | 21 | ReturnFileType | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurances | 22 | GuarantorUserId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AuthorizationItem | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AuthorizationItem | 2 | Title | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AuthorizationItem | 3 | Description | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AuthorizationItem | 4 | SystemType | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AuthorizationItem | 5 | UseIfAlreadyExist | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AuthorizationItem | 6 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | BusinessAuthorizationItems | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | BusinessAuthorizationItems | 2 | AuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | BusinessAuthorizationItems | 3 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | BusinessAuthorizationItems | 4 | Cost | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | Consultants | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Consultants | 2 | Name | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Consultants | 3 | Phone | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Consultants | 4 | Description | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Consultants | 5 | IsSeen | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Consultants | 6 | CallResult | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Consultants | 7 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 2 | FullName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 3 | BusinessName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 4 | Phone | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 5 | Address | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 6 | BankInfo | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerMarketerCommissions | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerMarketerCommissions | 2 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerMarketerCommissions | 3 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerMarketerCommissions | 4 | Description | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | CustomerMarketerCommissions | 5 | MarketerId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerMarketerCommissions | 6 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerOrders | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerOrders | 2 | Name | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | CustomerOrders | 3 | NationalCode | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | CustomerOrders | 4 | Phone | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | CustomerOrders | 5 | ProductName | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | CustomerOrders | 6 | Description | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | CustomerOrders | 7 | IsSeen | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerOrders | 8 | CallResult | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | CustomerOrders | 9 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerOrders | 10 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 2 | StartDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 3 | EndDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 4 | MaxLoanCount | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 5 | RemainLoanCount | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 6 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 7 | PurchaseId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Customers | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Customers | 2 | Name | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Customers | 3 | Mobile | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Customers | 4 | Email | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Customers | 5 | FirstLoginDone | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Customers | 6 | InitPassword | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Customers | 7 | RegDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Customers | 8 | ExpireDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Customers | 9 | Permanent | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Customers | 10 | Purchased | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Customers | 11 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | Customers | 12 | AffCode | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Customers | 13 | ParkDomain | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | EmzameContractAuthorizationItems | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | EmzameContractAuthorizationItems | 2 | UserLoanRequestAuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | EmzameContractAuthorizationItems | 3 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | EmzameContractAuthorizationItems | 4 | UserId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | EmzameContractAuthorizationItems | 5 | ContractJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | EmzameContractAuthorizationItems | 6 | AuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | EmzameContractAuthorizationItems | 7 | Comment | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | EmzameContractAuthorizationItems | 8 | Tag | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | EmzameContractAuthorizationItems | 9 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 2 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 3 | SavedBy | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 4 | Title | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 5 | Comment | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 6 | CostDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 7 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 8 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('2a18f1fc-57fe-482c-8003-b6ba13b12996') | NULL |
| dbo | IceReport | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 2 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 3 | Result | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 4 | Price | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 5 | Url | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 6 | ReportID | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 7 | Status | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 8 | IceReportJson | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 9 | Errors | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 10 | MemberId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 11 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 12 | AttachmentFileName | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 13 | ReportPdfFileName | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | InquirySettings | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | InquirySettings | 2 | AppInquiryType | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | InquirySettings | 3 | ApiIR_PriceFrom | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | InquirySettings | 4 | ApiIR_PriceTo | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | InquirySettings | 5 | ApiIR_IsActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 2 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 3 | Result | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 4 | Price | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 5 | Url | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 6 | ReportPdfFileName | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 7 | AttachmentFileName | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 8 | ReportID | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 9 | Status | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 10 | IranValidityReportJson | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 11 | Messages | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 12 | MemberId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 13 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 14 | GradeNumber | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | LoanAssuranceRequirements | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanAssuranceRequirements | 2 | AssuranceRequirementsJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | LoanAssuranceRequirements | 3 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanAssuranceRequirements | 4 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanAuthorizationItems | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanAuthorizationItems | 6 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanAuthorizationItems | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanAuthorizationItems | 8 | AuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('00000000-0000-0000-0000-000000000000') | NULL |
| dbo | LoanAuthorizationItems | 9 | IsPrimary | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | LoanContacts | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanContacts | 2 | ContactId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanContacts | 3 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanContacts | 4 | Share | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanContacts | 5 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 2 | Title | nvarchar | 50 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 3 | StepCategory | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 4 | Changable | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 5 | Order | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 6 | SmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 8 | SystemRequestStatus | int | 4 | 10 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 9 | StatusGroup | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | LoanRequestStatuses | 10 | SystemAgentRequestStatus | int | 4 | 10 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 11 | AllowNewRequest | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Loans | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Loans | 2 | Title | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 3 | Code | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | Loans | 4 | DelayPercent | float | 8 | 53 | 0 | 0 | 0 | 0 | ((0.0000000000000000e+000)) | NULL |
| dbo | Loans | 5 | EarlyPercent | float | 8 | 53 | 0 | 0 | 0 | 0 | ((0.0000000000000000e+000)) | NULL |
| dbo | Loans | 6 | ProfitPercent | float | 8 | 53 | 0 | 0 | 0 | 0 | ((0.0000000000000000e+000)) | NULL |
| dbo | Loans | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('2a18f1fc-57fe-482c-8003-b6ba13b12996') | NULL |
| dbo | Loans | 8 | IsSponsored | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Loans | 10 | IsSmsActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Loans | 11 | FileName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 12 | IncludePlan | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Loans | 13 | PlanHtml | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 14 | PlanShortDescription | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 15 | PlanTitle | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 18 | MaxAmount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | Loans | 19 | MaxMonthGap | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | Loans | 20 | AllowedInstallments | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 21 | CostsJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 22 | Disable | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Loans | 23 | DisableText | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 24 | HasSponsore | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Loans | 25 | DefaultSponsoreCheckoutDays | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | Loans | 26 | LoanProfitType | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | LoanTags | 1 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanTags | 2 | TagId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanTags | 3 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItemAttachments | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItemAttachments | 2 | MemberAuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItemAttachments | 3 | Attachment | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItemAttachments | 4 | MemberDescription | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItemAttachments | 5 | AttachmentByAdmin | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItemAttachments | 6 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItems | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItems | 2 | MemberId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItems | 3 | AuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItems | 4 | CreateDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItems | 5 | LastChangeDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItems | 6 | LastChangeBy | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItems | 7 | MemberDescription | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItems | 8 | AdminDescription | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItems | 9 | Tag | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItems | 10 | Status | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberAuthorizationItems | 11 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 2 | PaymentStep | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 3 | OnlinePaymentGateway | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 4 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 5 | UserLoanPaymentId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 6 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 7 | StartDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 8 | Description | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 13 | IsPaymentSuccess | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 14 | SepJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 15 | ZarinPalJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 16 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('00000000-0000-0000-0000-000000000000') | NULL |
| dbo | MemberPurchases | 17 | MemberPurchaseType | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | MemberPurchases | 18 | NextPayJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 19 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | MemberPurchases | 20 | IPGParsianJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 21 | CreatorUserId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 22 | SadadJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 23 | AgentFactorId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 24 | SepehrJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 25 | ZibalJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OffDate | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | OffDate | 2 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | OffDate | 3 | Title | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OffDate | 4 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 2 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 3 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 4 | OnlineMoneyTransferStep | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 5 | From | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 6 | To | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 7 | OTP | nvarchar | 10 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 8 | OTPGenerateDateTime | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 9 | OurTraceNumber | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 10 | Cif | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 11 | IsSuccess | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 12 | EFardaJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 13 | TransactionId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 14 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 15 | OnlineMoneyTransferPanelId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 16 | ToName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 17 | Provider | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | OnlineMoneyTransfer | 18 | ShahinJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 19 | ShahinResultJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Organization | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Organization | 2 | Name | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Organization | 3 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Product | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Product | 2 | Code | nvarchar | 10 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Product | 3 | Name | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Product | 4 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 2 | ProductType | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 3 | PaymentStep | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 4 | PaymentMethod | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 5 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 6 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 7 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 8 | StartDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 9 | Description | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 10 | ZarinPalAuthority | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 11 | ZarinPalRefId | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 12 | ZarinPalStatus | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 13 | IsPaymentSuccess | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 14 | AffCode | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 15 | LoanCount | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | Reliability | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Reliability | 2 | Title | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Reliability | 3 | Color | nvarchar | 10 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Reliability | 4 | From | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Reliability | 5 | To | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Reliability | 6 | RowType | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Reliability | 7 | IsNewLoanLock | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Reliability | 8 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Reliability | 9 | Count | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | SiteContents | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SiteContents | 2 | Key | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SiteContents | 3 | Content | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SiteContents | 4 | IsJson | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SiteContents | 5 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 2 | Title | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 3 | Pattern | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 4 | IsSystem | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 5 | Status | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 6 | RejectReason | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 8 | IsPatternBase | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | SmsPatterns | 9 | PatternBaseCode | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 10 | SmsPatternPanel | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | SmsPatterns | 11 | Category | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | SmsPatterns | 12 | IppanelKeysJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 2 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 3 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 4 | PaymentMethod | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 5 | IsWithdraw | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 6 | Description | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 7 | SavedBy | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 8 | FileName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 9 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 11 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Tags | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Tags | 2 | Title | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Tags | 3 | TagCategory | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Tags | 4 | IsPublic | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Tags | 5 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | ThirdPartySettings | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | ThirdPartySettings | 2 | DefaultThirdParty | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | ThirdPartySettings | 3 | LandaSettingsJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | ThirdPartySettings | 4 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | ThirdPartySettings | 5 | DigibileSettingsJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | ThirdPartyTransfer | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | ThirdPartyTransfer | 2 | EntityId | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | ThirdPartyTransfer | 3 | EntityType | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | ThirdPartyTransfer | 4 | LandaJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | ThirdPartyTransfer | 5 | EntityTag | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | ThirdPartyTransfer | 6 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | ThirdPartyTransfer | 7 | NikanJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | ThirdPartyTransfer | 8 | DigibileJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | ThirdPersonAssuranceAuthorizationItems | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | ThirdPersonAssuranceAuthorizationItems | 2 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | ThirdPersonAssuranceAuthorizationItems | 3 | UserLoanRequestAuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | ThirdPersonAssuranceAuthorizationItems | 4 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | ThirdPersonAssuranceAuthorizationItems | 5 | UserId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | ThirdPersonAssuranceAuthorizationItems | 6 | IsSigned | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | ThirdPersonAssuranceAuthorizationItems | 7 | LastChangeDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | ThirdPersonAssuranceAuthorizationItems | 8 | AuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | ThirdPersonAssuranceAuthorizationItems | 9 | Comment | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | ThirdPersonAssuranceAuthorizationItems | 10 | Tag | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | ThirdPersonAssuranceAuthorizationItems | 11 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | TicketResponses | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | TicketResponses | 2 | CreatedAt | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | TicketResponses | 3 | Description | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | TicketResponses | 4 | FileName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | TicketResponses | 5 | FromAdmin | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | TicketResponses | 6 | IsSeen | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | TicketResponses | 7 | TicketId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | TicketResponses | 8 | Role | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | TicketResponses | 9 | CreatedById | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | TicketResponses | 10 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 2 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | Tickets | 3 | CreatedAt | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 4 | Title | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 5 | Status | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 6 | Role | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 7 | ResponseCount | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 8 | AsMessage | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 9 | CreatedById | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 10 | TargetRole | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 11 | TargetUserId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 12 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 13 | UserLoanRequestId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 14 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Tickets | 15 | LastModifiedAt | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | UserLoanContact | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanContact | 2 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanContact | 3 | ContactId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanContact | 4 | Share | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanContact | 5 | DueDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanContact | 6 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanContact | 7 | UserLoanId1 | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentOthers | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentOthers | 2 | UserLoanPaymentId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentOthers | 3 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentOthers | 4 | SavedBy | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentOthers | 5 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentOthers | 6 | PaymentMethod | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentOthers | 7 | IsGoldCheckouted | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentOthers | 8 | GoldWeight | float | 8 | 53 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentOthers | 9 | GoldRate | float | 8 | 53 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentOthers | 10 | Description | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentOthers | 11 | MemberPurchaseId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 2 | UserLoanPaymentId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 3 | RequestDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 4 | PaymentDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 5 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 6 | MemberDescription | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 7 | AdminDescription | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 8 | Status | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 9 | PaymentMethod | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 10 | TrackNumber | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 11 | AdminAcceptorId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 12 | AdminAcceptDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 13 | AffectOnMainPayment | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 14 | FileName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 2 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 3 | InstallmentNumber | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 4 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 5 | SavedBy | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 6 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 7 | FileMonth | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 8 | TargetMonth | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | UserLoanPayments | 9 | DelayDay | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | UserLoanPayments | 10 | DelayPrice | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoanPayments | 11 | Description | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 12 | GoldRate | float | 8 | 53 | 0 | 0 | 0 | 0 | ((0.0000000000000000e+000)) | NULL |
| dbo | UserLoanPayments | 13 | GoldWeight | float | 8 | 53 | 0 | 0 | 0 | 0 | ((0.0000000000000000e+000)) | NULL |
| dbo | UserLoanPayments | 14 | PaymentMethod | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | UserLoanPayments | 15 | IsGoldCheckouted | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoanPayments | 16 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 17 | SentDueDateSms | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoanPayments | 18 | InstallmentAmount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoanPayments | 20 | SentBeforeDueDateEmail | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoanPayments | 21 | SentBeforeDueDateSms | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoanPayments | 22 | SentDueDateEmail | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoanPayments | 23 | SentOverDueDateEmail | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoanPayments | 24 | SumAmount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoanPayments | 25 | LastOverDueSmsDate | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 26 | Discount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoanPayments | 27 | LastGuarantorOverDueSmsDate | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanProduct | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanProduct | 2 | Price | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanProduct | 3 | Count | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanProduct | 4 | ProductId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanProduct | 5 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItemAttachments | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItemAttachments | 2 | UserLoanRequestAuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItemAttachments | 3 | Attachment | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItemAttachments | 4 | MemberDescription | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItemAttachments | 5 | AttachmentByAdmin | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItemAttachments | 6 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 2 | UserLoanRequestId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 3 | AuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 4 | CreateDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 5 | LastChangeDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 6 | Attachment | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 7 | MemberDescription | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 8 | AdminDescription | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 9 | Status | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 10 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 11 | AttachmentByAdmin | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoanRequestAuthorizationItems | 12 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 13 | Tag | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 15 | EmzameContractAuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestProduct | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestProduct | 2 | Price | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestProduct | 3 | Count | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestProduct | 4 | ProductId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestProduct | 5 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 2 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 3 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 4 | RequestDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 5 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 6 | Comment | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 7 | AdminDescriptionPrivate | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 9 | Month | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 10 | Year | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 11 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('00000000-0000-0000-0000-000000000000') | NULL |
| dbo | UserLoanRequests | 12 | InstallmentCount | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | UserLoanRequests | 13 | MonthGap | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | UserLoanRequests | 14 | AgentId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 15 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 16 | Installment | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoanRequests | 18 | IsPhysicalDocsDelivered | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoanRequests | 19 | AdminDescription | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 20 | SponsoreDueDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | UserLoanRequests | 21 | StatusId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 22 | AgentStatusId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 23 | ChargeType | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | UserLoanRequests | 24 | SponsoreAmount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoanRequests | 25 | LockedBy | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 26 | RefahBetaInquiryAmount | bigint | 8 | 19 | 0 | 0 | 0 | 0 | (CONVERT([bigint],(0))) | NULL |
| dbo | UserLoanRequests | 27 | RefahBetaOrderId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | (CONVERT([bigint],(0))) | NULL |
| dbo | UserLoanRequests | 28 | OtherPercent_CheckoutDays | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | UserLoanRequests | 29 | OtherPercent_Percent | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoanRequests | 30 | Products | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 31 | LastSponsorComment | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 32 | SponsorId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 33 | UserLoanSponsorStatus | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | UserLoanRequests | 34 | ChargeTypeTitle | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestSponsorHistory | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestSponsorHistory | 2 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestSponsorHistory | 3 | UserLoanRequestId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestSponsorHistory | 4 | DateTime | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestSponsorHistory | 5 | Subject | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestSponsorHistory | 6 | Description | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestSponsorHistory | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 2 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 3 | UserLoanRequestId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 4 | DateTime | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 5 | FromStatusId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 6 | FromAgentStatusId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 7 | ToStatusId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 8 | ToAgentStatusId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 9 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 2 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 3 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 4 | StartDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 5 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 6 | Installment | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 7 | Month | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 8 | Paid | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 9 | Remain | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 10 | CheckoutDate | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 11 | IsCheckouted | bit | 1 | 1 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 12 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | UserLoans | 13 | Description | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 14 | MonthGap | int | 4 | 10 | 0 | 0 | 0 | 0 | ((1)) | NULL |
| dbo | UserLoans | 15 | PayableAmount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoans | 16 | CustomerPurchasePlanId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 17 | AgentId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 18 | UserLoanRequestId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 19 | AgentPrice | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoans | 20 | AgentDueDate | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 21 | SubAgentDueDate | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 22 | SubAgentId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 23 | SubAgentPrice | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoans | 24 | DepositChargeDueDate | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 25 | PreDepositAmount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoans | 26 | Status | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 27 | CustomProfitPercent | decimal | 9 | 18 | 2 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 28 | CreateAt | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | UserLoans | 29 | RefahBetaInquiryAmount | bigint | 8 | 19 | 0 | 0 | 0 | 0 | (CONVERT([bigint],(0))) | NULL |
| dbo | UserLoans | 30 | RefahBetaOrderId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | (CONVERT([bigint],(0))) | NULL |
| dbo | UserLoans | 31 | Discount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoans | 32 | IsCanceled | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoans | 33 | SecondaryCode | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 2 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 3 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 4 | DueDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 5 | Description | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 6 | IsCheckouted | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 8 | UserLoanId1 | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserRefahBeta | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserRefahBeta | 2 | ModifiedAt | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserRefahBeta | 3 | Message | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserRefahBeta | 4 | Amount | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserRefahBeta | 5 | IsSuccess | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserRefahBeta | 6 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserRefahBeta | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 2 | MemberId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 3 | Description | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 4 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 5 | SavedBy | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 6 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 7 | FileMonth | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 8 | TargetMonth | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | VisitorLogs | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | VisitorLogs | 2 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | VisitorLogs | 3 | IpAddress | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | VisitorLogs | 4 | UserAgent | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | VisitorLogs | 5 | Mrk | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | WithdrawAgentFactor | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | WithdrawAgentFactor | 2 | WithdrawId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | WithdrawAgentFactor | 3 | AgentFactorId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 2 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 3 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 4 | PaymentMethod | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 5 | IsWithdraw | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 6 | IsUnknown | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 7 | GoldWeight | float | 8 | 53 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 8 | GoldRate | float | 8 | 53 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 9 | Description | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 10 | SavedBy | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 11 | WeightBalance | float | 8 | 53 | 0 | 0 | 0 | 0 | ((0.0000000000000000e+000)) | NULL |
| dbo | Withdraws | 12 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('2a18f1fc-57fe-482c-8003-b6ba13b12996') | NULL |
| dbo | Withdraws | 13 | SponsoredLoanId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 14 | AgentId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 15 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 16 | ContactId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 17 | UserLoanContactId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 18 | FileName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 19 | SuccessfullOnlineMoneyTransferId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 20 | CustomerMarketerCommissionId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 21 | FileName2 | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 22 | FileName3 | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | AggregatedCounter | 2 | Key | nvarchar | 100 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | AggregatedCounter | 3 | Value | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | AggregatedCounter | 4 | ExpireAt | datetime | 8 | 23 | 3 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Counter | 2 | Key | nvarchar | 100 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Counter | 3 | Value | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Counter | 4 | ExpireAt | datetime | 8 | 23 | 3 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Counter | 5 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| HangFire | Hash | 2 | Key | nvarchar | 100 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Hash | 3 | Field | nvarchar | 100 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Hash | 4 | Value | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Hash | 5 | ExpireAt | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Job | 1 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| HangFire | Job | 2 | StateId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Job | 3 | StateName | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Job | 4 | InvocationData | nvarchar | -1 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Job | 5 | Arguments | nvarchar | -1 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Job | 6 | CreatedAt | datetime | 8 | 23 | 3 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Job | 7 | ExpireAt | datetime | 8 | 23 | 3 | 1 | 0 | 0 | NULL | NULL |
| HangFire | JobParameter | 2 | JobId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | JobParameter | 3 | Name | nvarchar | 40 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | JobParameter | 4 | Value | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | JobQueue | 1 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| HangFire | JobQueue | 2 | JobId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | JobQueue | 3 | Queue | nvarchar | 50 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | JobQueue | 4 | FetchedAt | datetime | 8 | 23 | 3 | 1 | 0 | 0 | NULL | NULL |
| HangFire | List | 1 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| HangFire | List | 2 | Key | nvarchar | 100 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | List | 3 | Value | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | List | 4 | ExpireAt | datetime | 8 | 23 | 3 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Schema | 1 | Version | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Server | 1 | Id | nvarchar | 200 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Server | 2 | Data | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Server | 3 | LastHeartbeat | datetime | 8 | 23 | 3 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Set | 2 | Key | nvarchar | 100 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Set | 3 | Score | float | 8 | 53 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Set | 4 | Value | nvarchar | 256 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Set | 5 | ExpireAt | datetime | 8 | 23 | 3 | 1 | 0 | 0 | NULL | NULL |
| HangFire | State | 1 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| HangFire | State | 2 | JobId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | State | 3 | Name | nvarchar | 20 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | State | 4 | Reason | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | State | 5 | CreatedAt | datetime | 8 | 23 | 3 | 0 | 0 | 0 | NULL | NULL |
| HangFire | State | 6 | Data | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |

### کلیدهای اصلی و یکتا

| Schema | Table | Constraint | Type | Column | Ordinal |
| --- | --- | --- | --- | --- | --- |
| dbo | __EFMigrationsHistory | PK___EFMigrationsHistory | PRIMARY_KEY_CONSTRAINT | MigrationId | 1 |
| dbo | AffiliateCommissions | PK_AffiliateCommissions | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AgentFactorItem | PK_AgentFactorItem | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AgentFactors | PK_AgentFactors | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AgentLoanAuthorizationItem | PK_AgentLoanAuthorizationItem | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AgentLoans | PK_AgentLoans | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AgentMetaData | PK_AgentMetaData | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AppEmails | PK_AppEmails | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AppInquirys | PK_AppInquirys | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AppSettings | PK_AppSettings | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AppSms | PK_AppSms | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AspNetRoleClaims | PK_AspNetRoleClaims | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AspNetRoles | PK_AspNetRoles | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AspNetUserClaims | PK_AspNetUserClaims | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AspNetUserLogins | PK_AspNetUserLogins | PRIMARY_KEY_CONSTRAINT | LoginProvider | 1 |
| dbo | AspNetUserLogins | PK_AspNetUserLogins | PRIMARY_KEY_CONSTRAINT | ProviderKey | 2 |
| dbo | AspNetUserRoles | PK_AspNetUserRoles | PRIMARY_KEY_CONSTRAINT | UserId | 1 |
| dbo | AspNetUserRoles | PK_AspNetUserRoles | PRIMARY_KEY_CONSTRAINT | RoleId | 2 |
| dbo | AspNetUsers | PK_AspNetUsers | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AspNetUserTokens | PK_AspNetUserTokens | PRIMARY_KEY_CONSTRAINT | UserId | 1 |
| dbo | AspNetUserTokens | PK_AspNetUserTokens | PRIMARY_KEY_CONSTRAINT | LoginProvider | 2 |
| dbo | AspNetUserTokens | PK_AspNetUserTokens | PRIMARY_KEY_CONSTRAINT | Name | 3 |
| dbo | AssuranceChequeItem | PK_AssuranceChequeItem | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AssuranceRequirementItems | PK_AssuranceRequirementItems | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AssuranceRequirements | PK_AssuranceRequirements | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Assurances | PK_Assurances | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AuthorizationItem | PK_AuthorizationItem | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | BusinessAuthorizationItems | PK_BusinessAuthorizationItems | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Consultants | PK_Consultants | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Contacts | PK_Contacts | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | CustomerMarketerCommissions | PK_CustomerMarketerCommissions | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | CustomerOrders | PK_CustomerOrders | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | CustomerPurchasePlan | PK_CustomerPurchasePlan | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Customers | PK_Customers | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | EmzameContractAuthorizationItems | PK_EmzameContractAuthorizationItems | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Expenses | PK_Expenses | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | IceReport | PK_IceReport | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | InquirySettings | PK_InquirySettings | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | IranValidityReport | PK_IranValidityReport | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | LoanAssuranceRequirements | PK_LoanAssuranceRequirements | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | LoanAuthorizationItems | PK_LoanAuthorizationItems | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | LoanContacts | PK_LoanContacts | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | LoanRequestStatuses | PK_LoanRequestStatuses | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Loans | PK_Loans | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | LoanTags | PK_LoanTags | PRIMARY_KEY_CONSTRAINT | LoanId | 1 |
| dbo | LoanTags | PK_LoanTags | PRIMARY_KEY_CONSTRAINT | TagId | 2 |
| dbo | MemberAuthorizationItemAttachments | PK_MemberAuthorizationItemAttachments | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | MemberAuthorizationItems | PK_MemberAuthorizationItems | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | MemberPurchases | PK_MemberPurchases | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | OffDate | PK_OffDate | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | OnlineMoneyTransfer | PK_OnlineMoneyTransfer | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Organization | PK_Organization | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Product | PK_Product | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Purchases | PK_Purchases | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Reliability | PK_Reliability | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | SiteContents | PK_SiteContents | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | SmsPatterns | PK_SmsPatterns | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | SubAgentTransactions | PK_SubAgentTransactions | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Tags | PK_Tags | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | ThirdPartySettings | PK_ThirdPartySettings | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | ThirdPartyTransfer | PK_ThirdPartyTransfer | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | ThirdPersonAssuranceAuthorizationItems | PK_ThirdPersonAssuranceAuthorizationItems | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | TicketResponses | PK_TicketResponses | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Tickets | PK_Tickets | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanContact | PK_UserLoanContact | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanPaymentOthers | PK_UserLoanPaymentOthers | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanPaymentRequests | PK_UserLoanPaymentRequests | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanPayments | PK_UserLoanPayments | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanProduct | PK_UserLoanProduct | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanRequestAuthorizationItemAttachments | PK_UserLoanRequestAuthorizationItemAttachments | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanRequestAuthorizationItems | PK_UserLoanRequestAuthorizationItems | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanRequestProduct | PK_UserLoanRequestProduct | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanRequests | PK_UserLoanRequests | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanRequestSponsorHistory | PK_UserLoanRequestSponsorHistory | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanRequestStatusHistories | PK_UserLoanRequestStatusHistories | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoans | PK_UserLoans | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanSponsoreDueDate | PK_UserLoanSponsoreDueDate | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserRefahBeta | PK_UserRefahBeta | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserSavedMonies | PK_UserSavedMonies | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | VisitorLogs | PK_VisitorLogs | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | WithdrawAgentFactor | PK_WithdrawAgentFactor | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Withdraws | PK_Withdraws | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| HangFire | AggregatedCounter | PK_HangFire_CounterAggregated | PRIMARY_KEY_CONSTRAINT | Key | 1 |
| HangFire | Counter | PK_HangFire_Counter | PRIMARY_KEY_CONSTRAINT | Key | 1 |
| HangFire | Counter | PK_HangFire_Counter | PRIMARY_KEY_CONSTRAINT | Id | 2 |
| HangFire | Hash | PK_HangFire_Hash | PRIMARY_KEY_CONSTRAINT | Key | 1 |
| HangFire | Hash | PK_HangFire_Hash | PRIMARY_KEY_CONSTRAINT | Field | 2 |
| HangFire | Job | PK_HangFire_Job | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| HangFire | JobParameter | PK_HangFire_JobParameter | PRIMARY_KEY_CONSTRAINT | JobId | 1 |
| HangFire | JobParameter | PK_HangFire_JobParameter | PRIMARY_KEY_CONSTRAINT | Name | 2 |
| HangFire | JobQueue | PK_HangFire_JobQueue | PRIMARY_KEY_CONSTRAINT | Queue | 1 |
| HangFire | JobQueue | PK_HangFire_JobQueue | PRIMARY_KEY_CONSTRAINT | Id | 2 |
| HangFire | List | PK_HangFire_List | PRIMARY_KEY_CONSTRAINT | Key | 1 |
| HangFire | List | PK_HangFire_List | PRIMARY_KEY_CONSTRAINT | Id | 2 |
| HangFire | Schema | PK_HangFire_Schema | PRIMARY_KEY_CONSTRAINT | Version | 1 |
| HangFire | Server | PK_HangFire_Server | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| HangFire | Set | PK_HangFire_Set | PRIMARY_KEY_CONSTRAINT | Key | 1 |
| HangFire | Set | PK_HangFire_Set | PRIMARY_KEY_CONSTRAINT | Value | 2 |
| HangFire | State | PK_HangFire_State | PRIMARY_KEY_CONSTRAINT | JobId | 1 |
| HangFire | State | PK_HangFire_State | PRIMARY_KEY_CONSTRAINT | Id | 2 |

### کلیدهای خارجی

| Parent schema | Parent table | FK | Parent column | Referenced schema | Referenced table | Referenced column | Ordinal | On delete | On update | Disabled | Untrusted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dbo | AffiliateCommissions | FK_AffiliateCommissions_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AffiliateCommissions | FK_AffiliateCommissions_Purchases_PurchaseId | PurchaseId | dbo | Purchases | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AgentFactorItem | FK_AgentFactorItem_AgentFactors_AgentFactorId | AgentFactorId | dbo | AgentFactors | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AgentFactorItem | FK_AgentFactorItem_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AgentFactors | FK_AgentFactors_AspNetUsers_AgentId | AgentId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AgentFactors | FK_AgentFactors_AspNetUsers_MemberId | MemberId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AgentFactors | FK_AgentFactors_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AgentFactors | FK_AgentFactors_MemberPurchases_MemberPurchaseId | MemberPurchaseId | dbo | MemberPurchases | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AgentLoanAuthorizationItem | FK_AgentLoanAuthorizationItem_AuthorizationItem_AuthorizationItemId | AuthorizationItemId | dbo | AuthorizationItem | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AgentLoanAuthorizationItem | FK_AgentLoanAuthorizationItem_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AgentLoanAuthorizationItem | FK_AgentLoanAuthorizationItem_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AgentLoans | FK_AgentLoans_AspNetUsers_AgentId | AgentId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AgentLoans | FK_AgentLoans_Contacts_ContactId | ContactId | dbo | Contacts | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AgentLoans | FK_AgentLoans_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AgentLoans | FK_AgentLoans_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AgentMetaData | FK_AgentMetaData_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AgentMetaData | FK_AgentMetaData_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppEmails | FK_AppEmails_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppInquirys | FK_AppInquirys_AspNetUsers_MemberId | MemberId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppInquirys | FK_AppInquirys_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_AgentFactorPaymentLinkSmsPatternId | AgentFactorPaymentLinkSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_BeforeDueDateEmailPatternId | BeforeDueDateEmailPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_BeforeDueDateSmsPatternId | BeforeDueDateSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_DigitalSignCompleteSmsPatternId | DigitalSignCompleteSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_DigitalSignLinkSmsPatternId | DigitalSignLinkSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_DigitalSignOtpSmsPatternId | DigitalSignOtpSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_DueDateRememberEmailPatternId | DueDateRememberEmailPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_DueDateRememberSmsPatternId | DueDateRememberSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_GuarantorOverDueDateSmsPatternId | GuarantorOverDueDateSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_LoginEmailPatternId | LoginEmailPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_LoginSmsPatternId | LoginSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_NewLoanRequestNotificationSmsPatternId | NewLoanRequestNotificationSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_NewOrderEmailPatternId | NewOrderEmailPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_NewOrderSmsPatternId | NewOrderSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_NewUserLoanSmsPatternId | NewUserLoanSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_OverDueDateEmailPatternId | OverDueDateEmailPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_OverDueDateSmsPatternId | OverDueDateSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_RegisterEmailPatternId | RegisterEmailPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_RegisterOtpEmailPatternId | RegisterOtpEmailPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_RegisterOtpSmsPatternId | RegisterOtpSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_RegisterSmsPatternId | RegisterSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_ThanksPaymentEmailPatternId | ThanksPaymentEmailPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_ThanksPaymentSmsPatternId | ThanksPaymentSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_ThirdPersonDigitalSignCompleteSmsPatternId | ThirdPersonDigitalSignCompleteSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_ThirdPersonDigitalSignLinkSmsPatternId | ThirdPersonDigitalSignLinkSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_ThirdPersonDigitalSignOtpSmsPatternId | ThirdPersonDigitalSignOtpSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_WalletChargeEmailPatternId | WalletChargeEmailPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_WalletChargeSmsPatternId | WalletChargeSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_WalletWithdrawNotificationSmsPatternId | WalletWithdrawNotificationSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_WalletWithdrawOtpEmailPatternId | WalletWithdrawOtpEmailPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_WalletWithdrawOtpSmsPatternId | WalletWithdrawOtpSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSms | FK_AppSms_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AspNetRoleClaims | FK_AspNetRoleClaims_AspNetRoles_RoleId | RoleId | dbo | AspNetRoles | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AspNetUserClaims | FK_AspNetUserClaims_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AspNetUserLogins | FK_AspNetUserLogins_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AspNetUserRoles | FK_AspNetUserRoles_AspNetRoles_RoleId | RoleId | dbo | AspNetRoles | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AspNetUserRoles | FK_AspNetUserRoles_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AspNetUsers | FK_AspNetUsers_AspNetUsers_AgentId | AgentId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AspNetUsers | FK_AspNetUsers_AspNetUsers_CustomerMarketerId | CustomerMarketerId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AspNetUsers | FK_AspNetUsers_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AspNetUsers | FK_AspNetUsers_Reliability_ReliabilityId | ReliabilityId | dbo | Reliability | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AspNetUserTokens | FK_AspNetUserTokens_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AssuranceChequeItem | FK_AssuranceChequeItem_Assurances_AssuranceId | AssuranceId | dbo | Assurances | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AssuranceRequirementItems | FK_AssuranceRequirementItems_AssuranceRequirements_AssuranceRequirementId | AssuranceRequirementId | dbo | AssuranceRequirements | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AssuranceRequirementItems | FK_AssuranceRequirementItems_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AssuranceRequirements | FK_AssuranceRequirements_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Assurances | FK_Assurances_AspNetUsers_GuarantorUserId | GuarantorUserId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Assurances | FK_Assurances_Organization_OrganizationId | OrganizationId | dbo | Organization | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Assurances | FK_Assurances_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AuthorizationItem | FK_AuthorizationItem_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | BusinessAuthorizationItems | FK_BusinessAuthorizationItems_AuthorizationItem_AuthorizationItemId | AuthorizationItemId | dbo | AuthorizationItem | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | BusinessAuthorizationItems | FK_BusinessAuthorizationItems_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Contacts | FK_Contacts_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | CustomerMarketerCommissions | FK_CustomerMarketerCommissions_AspNetUsers_MarketerId | MarketerId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | CustomerMarketerCommissions | FK_CustomerMarketerCommissions_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | CustomerOrders | FK_CustomerOrders_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | CustomerPurchasePlan | FK_CustomerPurchasePlan_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | CustomerPurchasePlan | FK_CustomerPurchasePlan_Purchases_PurchaseId | PurchaseId | dbo | Purchases | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | EmzameContractAuthorizationItems | FK_EmzameContractAuthorizationItems_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | EmzameContractAuthorizationItems | FK_EmzameContractAuthorizationItems_AuthorizationItem_AuthorizationItemId | AuthorizationItemId | dbo | AuthorizationItem | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | EmzameContractAuthorizationItems | FK_EmzameContractAuthorizationItems_UserLoanRequestAuthorizationItems_UserLoanRequestAuthorizationItemId | UserLoanRequestAuthorizationItemId | dbo | UserLoanRequestAuthorizationItems | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | EmzameContractAuthorizationItems | FK_EmzameContractAuthorizationItems_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Expenses | FK_Expenses_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | IceReport | FK_IceReport_AspNetUsers_MemberId | MemberId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | IceReport | FK_IceReport_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | IranValidityReport | FK_IranValidityReport_AspNetUsers_MemberId | MemberId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | IranValidityReport | FK_IranValidityReport_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | LoanAssuranceRequirements | FK_LoanAssuranceRequirements_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | LoanAssuranceRequirements | FK_LoanAssuranceRequirements_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | LoanAuthorizationItems | FK_LoanAuthorizationItems_AuthorizationItem_AuthorizationItemId | AuthorizationItemId | dbo | AuthorizationItem | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | LoanAuthorizationItems | FK_LoanAuthorizationItems_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | LoanAuthorizationItems | FK_LoanAuthorizationItems_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | LoanContacts | FK_LoanContacts_Contacts_ContactId | ContactId | dbo | Contacts | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | LoanContacts | FK_LoanContacts_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | LoanContacts | FK_LoanContacts_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | LoanRequestStatuses | FK_LoanRequestStatuses_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | LoanRequestStatuses | FK_LoanRequestStatuses_SmsPatterns_SmsPatternId | SmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Loans | FK_Loans_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | LoanTags | FK_LoanTags_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | LoanTags | FK_LoanTags_Tags_TagId | TagId | dbo | Tags | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | MemberAuthorizationItemAttachments | FK_MemberAuthorizationItemAttachments_MemberAuthorizationItems_MemberAuthorizationItemId | MemberAuthorizationItemId | dbo | MemberAuthorizationItems | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | MemberAuthorizationItems | FK_MemberAuthorizationItems_AspNetUsers_MemberId | MemberId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | MemberAuthorizationItems | FK_MemberAuthorizationItems_AuthorizationItem_AuthorizationItemId | AuthorizationItemId | dbo | AuthorizationItem | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | MemberPurchases | FK_MemberPurchases_AgentFactors_AgentFactorId | AgentFactorId | dbo | AgentFactors | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | MemberPurchases | FK_MemberPurchases_AspNetUsers_CreatorUserId | CreatorUserId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | MemberPurchases | FK_MemberPurchases_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | MemberPurchases | FK_MemberPurchases_UserLoanPayments_UserLoanPaymentId | UserLoanPaymentId | dbo | UserLoanPayments | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | OffDate | FK_OffDate_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | OnlineMoneyTransfer | FK_OnlineMoneyTransfer_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | OnlineMoneyTransfer | FK_OnlineMoneyTransfer_Withdraws_TransactionId | TransactionId | dbo | Withdraws | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Organization | FK_Organization_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | Product | FK_Product_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Purchases | FK_Purchases_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | Purchases | FK_Purchases_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Reliability | FK_Reliability_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | SiteContents | FK_SiteContents_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | SmsPatterns | FK_SmsPatterns_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | SubAgentTransactions | FK_SubAgentTransactions_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | SubAgentTransactions | FK_SubAgentTransactions_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Tags | FK_Tags_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | ThirdPartySettings | FK_ThirdPartySettings_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | ThirdPartyTransfer | FK_ThirdPartyTransfer_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | ThirdPersonAssuranceAuthorizationItems | FK_ThirdPersonAssuranceAuthorizationItems_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | ThirdPersonAssuranceAuthorizationItems | FK_ThirdPersonAssuranceAuthorizationItems_AuthorizationItem_AuthorizationItemId | AuthorizationItemId | dbo | AuthorizationItem | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | ThirdPersonAssuranceAuthorizationItems | FK_ThirdPersonAssuranceAuthorizationItems_UserLoanRequestAuthorizationItems_UserLoanRequestAuthorizationItemId | UserLoanRequestAuthorizationItemId | dbo | UserLoanRequestAuthorizationItems | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | ThirdPersonAssuranceAuthorizationItems | FK_ThirdPersonAssuranceAuthorizationItems_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | TicketResponses | FK_TicketResponses_AspNetUsers_CreatedById | CreatedById | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | TicketResponses | FK_TicketResponses_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | TicketResponses | FK_TicketResponses_Tickets_TicketId | TicketId | dbo | Tickets | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | Tickets | FK_Tickets_AspNetUsers_CreatedById | CreatedById | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Tickets | FK_Tickets_AspNetUsers_TargetUserId | TargetUserId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Tickets | FK_Tickets_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Tickets | FK_Tickets_UserLoanRequests_UserLoanRequestId | UserLoanRequestId | dbo | UserLoanRequests | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Tickets | FK_Tickets_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanContact | FK_UserLoanContact_Contacts_ContactId | ContactId | dbo | Contacts | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanContact | FK_UserLoanContact_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanContact | FK_UserLoanContact_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanContact | FK_UserLoanContact_UserLoans_UserLoanId1 | UserLoanId1 | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanPaymentOthers | FK_UserLoanPaymentOthers_MemberPurchases_MemberPurchaseId | MemberPurchaseId | dbo | MemberPurchases | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanPaymentOthers | FK_UserLoanPaymentOthers_UserLoanPayments_UserLoanPaymentId | UserLoanPaymentId | dbo | UserLoanPayments | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanPaymentRequests | FK_UserLoanPaymentRequests_AspNetUsers_AdminAcceptorId | AdminAcceptorId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanPaymentRequests | FK_UserLoanPaymentRequests_UserLoanPayments_UserLoanPaymentId | UserLoanPaymentId | dbo | UserLoanPayments | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanPayments | FK_UserLoanPayments_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanProduct | FK_UserLoanProduct_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanProduct | FK_UserLoanProduct_Product_ProductId | ProductId | dbo | Product | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestAuthorizationItemAttachments | FK_UserLoanRequestAuthorizationItemAttachments_UserLoanRequestAuthorizationItems_UserLoanRequestAuthorizationItemId | UserLoanRequestAuthorizationItemId | dbo | UserLoanRequestAuthorizationItems | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestAuthorizationItems | FK_UserLoanRequestAuthorizationItems_AuthorizationItem_AuthorizationItemId | AuthorizationItemId | dbo | AuthorizationItem | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestAuthorizationItems | FK_UserLoanRequestAuthorizationItems_UserLoanRequests_UserLoanRequestId | UserLoanRequestId | dbo | UserLoanRequests | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestProduct | FK_UserLoanRequestProduct_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestProduct | FK_UserLoanRequestProduct_Product_ProductId | ProductId | dbo | Product | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequests | FK_UserLoanRequests_AspNetUsers_AgentId | AgentId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequests | FK_UserLoanRequests_AspNetUsers_SponsorId | SponsorId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequests | FK_UserLoanRequests_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequests | FK_UserLoanRequests_LoanRequestStatuses_AgentStatusId | AgentStatusId | dbo | LoanRequestStatuses | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequests | FK_UserLoanRequests_LoanRequestStatuses_StatusId | StatusId | dbo | LoanRequestStatuses | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequests | FK_UserLoanRequests_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestSponsorHistory | FK_UserLoanRequestSponsorHistory_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestSponsorHistory | FK_UserLoanRequestSponsorHistory_UserLoanRequests_UserLoanRequestId | UserLoanRequestId | dbo | UserLoanRequests | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestStatusHistories | FK_UserLoanRequestStatusHistories_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestStatusHistories | FK_UserLoanRequestStatusHistories_LoanRequestStatuses_FromAgentStatusId | FromAgentStatusId | dbo | LoanRequestStatuses | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestStatusHistories | FK_UserLoanRequestStatusHistories_LoanRequestStatuses_FromStatusId | FromStatusId | dbo | LoanRequestStatuses | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestStatusHistories | FK_UserLoanRequestStatusHistories_LoanRequestStatuses_ToAgentStatusId | ToAgentStatusId | dbo | LoanRequestStatuses | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestStatusHistories | FK_UserLoanRequestStatusHistories_LoanRequestStatuses_ToStatusId | ToStatusId | dbo | LoanRequestStatuses | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestStatusHistories | FK_UserLoanRequestStatusHistories_UserLoanRequests_UserLoanRequestId | UserLoanRequestId | dbo | UserLoanRequests | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoans | FK_UserLoans_AspNetUsers_AgentId | AgentId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoans | FK_UserLoans_AspNetUsers_SubAgentId | SubAgentId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoans | FK_UserLoans_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoans | FK_UserLoans_CustomerPurchasePlan_CustomerPurchasePlanId | CustomerPurchasePlanId | dbo | CustomerPurchasePlan | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoans | FK_UserLoans_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoans | FK_UserLoans_UserLoanRequests_UserLoanRequestId | UserLoanRequestId | dbo | UserLoanRequests | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanSponsoreDueDate | FK_UserLoanSponsoreDueDate_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanSponsoreDueDate | FK_UserLoanSponsoreDueDate_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanSponsoreDueDate | FK_UserLoanSponsoreDueDate_UserLoans_UserLoanId1 | UserLoanId1 | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserRefahBeta | FK_UserRefahBeta_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserRefahBeta | FK_UserRefahBeta_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserSavedMonies | FK_UserSavedMonies_AspNetUsers_MemberId | MemberId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | WithdrawAgentFactor | FK_WithdrawAgentFactor_AgentFactors_AgentFactorId | AgentFactorId | dbo | AgentFactors | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | WithdrawAgentFactor | FK_WithdrawAgentFactor_Withdraws_WithdrawId | WithdrawId | dbo | Withdraws | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_AspNetUsers_AgentId | AgentId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_Contacts_ContactId | ContactId | dbo | Contacts | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_CustomerMarketerCommissions_CustomerMarketerCommissionId | CustomerMarketerCommissionId | dbo | CustomerMarketerCommissions | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_Loans_SponsoredLoanId | SponsoredLoanId | dbo | Loans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_UserLoanContact_UserLoanContactId | UserLoanContactId | dbo | UserLoanContact | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| HangFire | JobParameter | FK_HangFire_JobParameter_Job | JobId | HangFire | Job | Id | 1 | CASCADE | CASCADE | 0 | 0 |
| HangFire | State | FK_HangFire_State_Job | JobId | HangFire | Job | Id | 1 | CASCADE | CASCADE | 0 | 0 |

### ایندکس‌ها

| Schema | Table | Index | Type | Unique | PK | Unique constraint | Disabled | Filtered | Filter | Key ordinal | Included | Column |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dbo | __EFMigrationsHistory | PK___EFMigrationsHistory | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | MigrationId |
| dbo | AffiliateCommissions | IX_AffiliateCommissions_PurchaseId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | PurchaseId |
| dbo | AffiliateCommissions | IX_AffiliateCommissions_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | AffiliateCommissions | PK_AffiliateCommissions | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AgentFactorItem | IX_AgentFactorItem_AgentFactorId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentFactorId |
| dbo | AgentFactorItem | IX_AgentFactorItem_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AgentFactorItem | PK_AgentFactorItem | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AgentFactors | IX_AgentFactors_AgentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentId |
| dbo | AgentFactors | IX_AgentFactors_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AgentFactors | IX_AgentFactors_MemberId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MemberId |
| dbo | AgentFactors | IX_AgentFactors_MemberPurchaseId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MemberPurchaseId |
| dbo | AgentFactors | PK_AgentFactors | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AgentLoanAuthorizationItem | IX_AgentLoanAuthorizationItem_AuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AuthorizationItemId |
| dbo | AgentLoanAuthorizationItem | IX_AgentLoanAuthorizationItem_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AgentLoanAuthorizationItem | IX_AgentLoanAuthorizationItem_LoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | AgentLoanAuthorizationItem | PK_AgentLoanAuthorizationItem | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AgentLoans | IX_AgentLoans_AgentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentId |
| dbo | AgentLoans | IX_AgentLoans_ContactId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ContactId |
| dbo | AgentLoans | IX_AgentLoans_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AgentLoans | IX_AgentLoans_LoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | AgentLoans | PK_AgentLoans | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AgentMetaData | IX_AgentMetaData_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AgentMetaData | IX_AgentMetaData_UserId | NONCLUSTERED | 1 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | AgentMetaData | PK_AgentMetaData | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AppEmails | IX_AppEmails_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AppEmails | PK_AppEmails | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AppInquirys | IX_AppInquirys_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AppInquirys | IX_AppInquirys_MemberId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MemberId |
| dbo | AppInquirys | PK_AppInquirys | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AppSettings | IX_AppSettings_AgentFactorPaymentLinkSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentFactorPaymentLinkSmsPatternId |
| dbo | AppSettings | IX_AppSettings_BeforeDueDateEmailPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | BeforeDueDateEmailPatternId |
| dbo | AppSettings | IX_AppSettings_BeforeDueDateSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | BeforeDueDateSmsPatternId |
| dbo | AppSettings | IX_AppSettings_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AppSettings | IX_AppSettings_DigitalSignCompleteSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | DigitalSignCompleteSmsPatternId |
| dbo | AppSettings | IX_AppSettings_DigitalSignLinkSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | DigitalSignLinkSmsPatternId |
| dbo | AppSettings | IX_AppSettings_DigitalSignOtpSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | DigitalSignOtpSmsPatternId |
| dbo | AppSettings | IX_AppSettings_DueDateRememberEmailPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | DueDateRememberEmailPatternId |
| dbo | AppSettings | IX_AppSettings_DueDateRememberSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | DueDateRememberSmsPatternId |
| dbo | AppSettings | IX_AppSettings_GuarantorOverDueDateSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | GuarantorOverDueDateSmsPatternId |
| dbo | AppSettings | IX_AppSettings_LoginEmailPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoginEmailPatternId |
| dbo | AppSettings | IX_AppSettings_LoginSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoginSmsPatternId |
| dbo | AppSettings | IX_AppSettings_NewLoanRequestNotificationSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | NewLoanRequestNotificationSmsPatternId |
| dbo | AppSettings | IX_AppSettings_NewOrderEmailPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | NewOrderEmailPatternId |
| dbo | AppSettings | IX_AppSettings_NewOrderSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | NewOrderSmsPatternId |
| dbo | AppSettings | IX_AppSettings_NewUserLoanSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | NewUserLoanSmsPatternId |
| dbo | AppSettings | IX_AppSettings_OverDueDateEmailPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | OverDueDateEmailPatternId |
| dbo | AppSettings | IX_AppSettings_OverDueDateSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | OverDueDateSmsPatternId |
| dbo | AppSettings | IX_AppSettings_RegisterEmailPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | RegisterEmailPatternId |
| dbo | AppSettings | IX_AppSettings_RegisterOtpEmailPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | RegisterOtpEmailPatternId |
| dbo | AppSettings | IX_AppSettings_RegisterOtpSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | RegisterOtpSmsPatternId |
| dbo | AppSettings | IX_AppSettings_RegisterSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | RegisterSmsPatternId |
| dbo | AppSettings | IX_AppSettings_ThanksPaymentEmailPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ThanksPaymentEmailPatternId |
| dbo | AppSettings | IX_AppSettings_ThanksPaymentSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ThanksPaymentSmsPatternId |
| dbo | AppSettings | IX_AppSettings_ThirdPersonDigitalSignCompleteSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ThirdPersonDigitalSignCompleteSmsPatternId |
| dbo | AppSettings | IX_AppSettings_ThirdPersonDigitalSignLinkSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ThirdPersonDigitalSignLinkSmsPatternId |
| dbo | AppSettings | IX_AppSettings_ThirdPersonDigitalSignOtpSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ThirdPersonDigitalSignOtpSmsPatternId |
| dbo | AppSettings | IX_AppSettings_WalletChargeEmailPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | WalletChargeEmailPatternId |
| dbo | AppSettings | IX_AppSettings_WalletChargeSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | WalletChargeSmsPatternId |
| dbo | AppSettings | IX_AppSettings_WalletWithdrawNotificationSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | WalletWithdrawNotificationSmsPatternId |
| dbo | AppSettings | IX_AppSettings_WalletWithdrawOtpEmailPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | WalletWithdrawOtpEmailPatternId |
| dbo | AppSettings | IX_AppSettings_WalletWithdrawOtpSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | WalletWithdrawOtpSmsPatternId |
| dbo | AppSettings | PK_AppSettings | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AppSms | IX_AppSms_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AppSms | PK_AppSms | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AspNetRoleClaims | IX_AspNetRoleClaims_RoleId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | RoleId |
| dbo | AspNetRoleClaims | PK_AspNetRoleClaims | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AspNetRoles | PK_AspNetRoles | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AspNetRoles | RoleNameIndex | NONCLUSTERED | 1 | 0 | 0 | 0 | 1 | ([NormalizedName] IS NOT NULL) | 1 | 0 | NormalizedName |
| dbo | AspNetUserClaims | IX_AspNetUserClaims_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | AspNetUserClaims | PK_AspNetUserClaims | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AspNetUserLogins | IX_AspNetUserLogins_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | AspNetUserLogins | PK_AspNetUserLogins | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | LoginProvider |
| dbo | AspNetUserLogins | PK_AspNetUserLogins | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | ProviderKey |
| dbo | AspNetUserRoles | IX_AspNetUserRoles_RoleId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | RoleId |
| dbo | AspNetUserRoles | PK_AspNetUserRoles | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | AspNetUserRoles | PK_AspNetUserRoles | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | RoleId |
| dbo | AspNetUsers | EmailIndex | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | NormalizedEmail |
| dbo | AspNetUsers | IX_AspNetUsers_AgentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentId |
| dbo | AspNetUsers | IX_AspNetUsers_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AspNetUsers | IX_AspNetUsers_CustomerMarketerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerMarketerId |
| dbo | AspNetUsers | IX_AspNetUsers_ReliabilityId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ReliabilityId |
| dbo | AspNetUsers | PK_AspNetUsers | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AspNetUsers | UserNameIndex | NONCLUSTERED | 1 | 0 | 0 | 0 | 1 | ([NormalizedUserName] IS NOT NULL) | 1 | 0 | NormalizedUserName |
| dbo | AspNetUserTokens | PK_AspNetUserTokens | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | AspNetUserTokens | PK_AspNetUserTokens | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | LoginProvider |
| dbo | AspNetUserTokens | PK_AspNetUserTokens | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 3 | 0 | Name |
| dbo | AssuranceChequeItem | IX_AssuranceChequeItem_AssuranceId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AssuranceId |
| dbo | AssuranceChequeItem | PK_AssuranceChequeItem | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AssuranceRequirementItems | IX_AssuranceRequirementItems_AssuranceRequirementId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AssuranceRequirementId |
| dbo | AssuranceRequirementItems | IX_AssuranceRequirementItems_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AssuranceRequirementItems | PK_AssuranceRequirementItems | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AssuranceRequirements | IX_AssuranceRequirements_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AssuranceRequirements | PK_AssuranceRequirements | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Assurances | IX_Assurances_GuarantorUserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | GuarantorUserId |
| dbo | Assurances | IX_Assurances_OrganizationId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | OrganizationId |
| dbo | Assurances | IX_Assurances_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | Assurances | PK_Assurances | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AuthorizationItem | IX_AuthorizationItem_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AuthorizationItem | PK_AuthorizationItem | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | BusinessAuthorizationItems | IX_BusinessAuthorizationItems_AuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AuthorizationItemId |
| dbo | BusinessAuthorizationItems | IX_BusinessAuthorizationItems_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | BusinessAuthorizationItems | PK_BusinessAuthorizationItems | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Consultants | PK_Consultants | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Contacts | IX_Contacts_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Contacts | PK_Contacts | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | CustomerMarketerCommissions | IX_CustomerMarketerCommissions_MarketerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MarketerId |
| dbo | CustomerMarketerCommissions | IX_CustomerMarketerCommissions_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | CustomerMarketerCommissions | PK_CustomerMarketerCommissions | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | CustomerOrders | IX_CustomerOrders_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | CustomerOrders | PK_CustomerOrders | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | CustomerPurchasePlan | IX_CustomerPurchasePlan_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | CustomerPurchasePlan | IX_CustomerPurchasePlan_PurchaseId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | PurchaseId |
| dbo | CustomerPurchasePlan | PK_CustomerPurchasePlan | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Customers | PK_Customers | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | EmzameContractAuthorizationItems | IX_EmzameContractAuthorizationItems_AuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AuthorizationItemId |
| dbo | EmzameContractAuthorizationItems | IX_EmzameContractAuthorizationItems_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | EmzameContractAuthorizationItems | IX_EmzameContractAuthorizationItems_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | EmzameContractAuthorizationItems | IX_EmzameContractAuthorizationItems_UserLoanRequestAuthorizationItemId | NONCLUSTERED | 1 | 0 | 0 | 0 | 1 | ([UserLoanRequestAuthorizationItemId] IS NOT NULL) | 1 | 0 | UserLoanRequestAuthorizationItemId |
| dbo | EmzameContractAuthorizationItems | PK_EmzameContractAuthorizationItems | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Expenses | IX_Expenses_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Expenses | PK_Expenses | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | IceReport | IX_IceReport_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | IceReport | IX_IceReport_MemberId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MemberId |
| dbo | IceReport | PK_IceReport | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | InquirySettings | PK_InquirySettings | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | IranValidityReport | IX_IranValidityReport_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | IranValidityReport | IX_IranValidityReport_MemberId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MemberId |
| dbo | IranValidityReport | PK_IranValidityReport | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | LoanAssuranceRequirements | IX_LoanAssuranceRequirements_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | LoanAssuranceRequirements | IX_LoanAssuranceRequirements_LoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | LoanAssuranceRequirements | PK_LoanAssuranceRequirements | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | LoanAuthorizationItems | IX_LoanAuthorizationItems_AuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AuthorizationItemId |
| dbo | LoanAuthorizationItems | IX_LoanAuthorizationItems_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | LoanAuthorizationItems | IX_LoanAuthorizationItems_LoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | LoanAuthorizationItems | PK_LoanAuthorizationItems | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | LoanContacts | IX_LoanContacts_ContactId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ContactId |
| dbo | LoanContacts | IX_LoanContacts_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | LoanContacts | IX_LoanContacts_LoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | LoanContacts | PK_LoanContacts | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | LoanRequestStatuses | IX_LoanRequestStatuses_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | LoanRequestStatuses | IX_LoanRequestStatuses_SmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | SmsPatternId |
| dbo | LoanRequestStatuses | PK_LoanRequestStatuses | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Loans | IX_Loans_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Loans | PK_Loans | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | LoanTags | IX_LoanTags_TagId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | TagId |
| dbo | LoanTags | PK_LoanTags | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | LoanTags | PK_LoanTags | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | TagId |
| dbo | MemberAuthorizationItemAttachments | IX_MemberAuthorizationItemAttachments_MemberAuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MemberAuthorizationItemId |
| dbo | MemberAuthorizationItemAttachments | PK_MemberAuthorizationItemAttachments | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | MemberAuthorizationItems | IX_MemberAuthorizationItems_AuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AuthorizationItemId |
| dbo | MemberAuthorizationItems | IX_MemberAuthorizationItems_MemberId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MemberId |
| dbo | MemberAuthorizationItems | PK_MemberAuthorizationItems | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | MemberPurchases | IX_MemberPurchases_AgentFactorId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentFactorId |
| dbo | MemberPurchases | IX_MemberPurchases_CreatorUserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CreatorUserId |
| dbo | MemberPurchases | IX_MemberPurchases_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | MemberPurchases | IX_MemberPurchases_UserLoanPaymentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanPaymentId |
| dbo | MemberPurchases | PK_MemberPurchases | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | OffDate | IX_OffDate_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | OffDate | PK_OffDate | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | OnlineMoneyTransfer | IX_OnlineMoneyTransfer_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | OnlineMoneyTransfer | IX_OnlineMoneyTransfer_TransactionId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | TransactionId |
| dbo | OnlineMoneyTransfer | PK_OnlineMoneyTransfer | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Organization | IX_Organization_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Organization | PK_Organization | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Product | IX_Product_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Product | PK_Product | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Purchases | IX_Purchases_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Purchases | IX_Purchases_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | Purchases | PK_Purchases | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Reliability | IX_Reliability_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Reliability | PK_Reliability | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | SiteContents | IX_SiteContents_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | SiteContents | PK_SiteContents | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | SmsPatterns | IX_SmsPatterns_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | SmsPatterns | PK_SmsPatterns | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | SubAgentTransactions | IX_SubAgentTransactions_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | SubAgentTransactions | IX_SubAgentTransactions_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | SubAgentTransactions | PK_SubAgentTransactions | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Tags | IX_Tags_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Tags | PK_Tags | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | ThirdPartySettings | IX_ThirdPartySettings_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | ThirdPartySettings | PK_ThirdPartySettings | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | ThirdPartyTransfer | IX_ThirdPartyTransfer_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | ThirdPartyTransfer | PK_ThirdPartyTransfer | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | ThirdPersonAssuranceAuthorizationItems | IX_ThirdPersonAssuranceAuthorizationItems_AuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AuthorizationItemId |
| dbo | ThirdPersonAssuranceAuthorizationItems | IX_ThirdPersonAssuranceAuthorizationItems_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | ThirdPersonAssuranceAuthorizationItems | IX_ThirdPersonAssuranceAuthorizationItems_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | ThirdPersonAssuranceAuthorizationItems | IX_ThirdPersonAssuranceAuthorizationItems_UserLoanRequestAuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanRequestAuthorizationItemId |
| dbo | ThirdPersonAssuranceAuthorizationItems | PK_ThirdPersonAssuranceAuthorizationItems | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | TicketResponses | IX_TicketResponses_CreatedById | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CreatedById |
| dbo | TicketResponses | IX_TicketResponses_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | TicketResponses | IX_TicketResponses_TicketId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | TicketId |
| dbo | TicketResponses | PK_TicketResponses | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Tickets | IX_Tickets_CreatedById | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CreatedById |
| dbo | Tickets | IX_Tickets_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Tickets | IX_Tickets_TargetUserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | TargetUserId |
| dbo | Tickets | IX_Tickets_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | Tickets | IX_Tickets_UserLoanRequestId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanRequestId |
| dbo | Tickets | PK_Tickets | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanContact | IX_UserLoanContact_ContactId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ContactId |
| dbo | UserLoanContact | IX_UserLoanContact_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | UserLoanContact | IX_UserLoanContact_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | UserLoanContact | IX_UserLoanContact_UserLoanId1 | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId1 |
| dbo | UserLoanContact | PK_UserLoanContact | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanPaymentOthers | IX_UserLoanPaymentOthers_MemberPurchaseId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MemberPurchaseId |
| dbo | UserLoanPaymentOthers | IX_UserLoanPaymentOthers_UserLoanPaymentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanPaymentId |
| dbo | UserLoanPaymentOthers | PK_UserLoanPaymentOthers | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanPaymentRequests | IX_UserLoanPaymentRequests_AdminAcceptorId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AdminAcceptorId |
| dbo | UserLoanPaymentRequests | IX_UserLoanPaymentRequests_UserLoanPaymentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanPaymentId |
| dbo | UserLoanPaymentRequests | PK_UserLoanPaymentRequests | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanPayments | IX_UserLoanPayments_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | UserLoanPayments | PK_UserLoanPayments | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanProduct | IX_UserLoanProduct_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | UserLoanProduct | IX_UserLoanProduct_ProductId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ProductId |
| dbo | UserLoanProduct | PK_UserLoanProduct | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanRequestAuthorizationItemAttachments | IX_UserLoanRequestAuthorizationItemAttachments_UserLoanRequestAuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanRequestAuthorizationItemId |
| dbo | UserLoanRequestAuthorizationItemAttachments | PK_UserLoanRequestAuthorizationItemAttachments | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanRequestAuthorizationItems | IX_UserLoanRequestAuthorizationItems_AuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AuthorizationItemId |
| dbo | UserLoanRequestAuthorizationItems | IX_UserLoanRequestAuthorizationItems_UserLoanRequestId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanRequestId |
| dbo | UserLoanRequestAuthorizationItems | PK_UserLoanRequestAuthorizationItems | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanRequestProduct | IX_UserLoanRequestProduct_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | UserLoanRequestProduct | IX_UserLoanRequestProduct_ProductId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ProductId |
| dbo | UserLoanRequestProduct | PK_UserLoanRequestProduct | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanRequests | IX_UserLoanRequests_AgentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentId |
| dbo | UserLoanRequests | IX_UserLoanRequests_AgentStatusId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentStatusId |
| dbo | UserLoanRequests | IX_UserLoanRequests_LoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | UserLoanRequests | IX_UserLoanRequests_SponsorId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | SponsorId |
| dbo | UserLoanRequests | IX_UserLoanRequests_StatusId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | StatusId |
| dbo | UserLoanRequests | IX_UserLoanRequests_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | UserLoanRequests | PK_UserLoanRequests | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanRequestSponsorHistory | IX_UserLoanRequestSponsorHistory_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | UserLoanRequestSponsorHistory | IX_UserLoanRequestSponsorHistory_UserLoanRequestId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanRequestId |
| dbo | UserLoanRequestSponsorHistory | PK_UserLoanRequestSponsorHistory | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanRequestStatusHistories | IX_UserLoanRequestStatusHistories_FromAgentStatusId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | FromAgentStatusId |
| dbo | UserLoanRequestStatusHistories | IX_UserLoanRequestStatusHistories_FromStatusId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | FromStatusId |
| dbo | UserLoanRequestStatusHistories | IX_UserLoanRequestStatusHistories_ToAgentStatusId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ToAgentStatusId |
| dbo | UserLoanRequestStatusHistories | IX_UserLoanRequestStatusHistories_ToStatusId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ToStatusId |
| dbo | UserLoanRequestStatusHistories | IX_UserLoanRequestStatusHistories_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | UserLoanRequestStatusHistories | IX_UserLoanRequestStatusHistories_UserLoanRequestId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanRequestId |
| dbo | UserLoanRequestStatusHistories | PK_UserLoanRequestStatusHistories | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoans | IX_UserLoans_AgentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentId |
| dbo | UserLoans | IX_UserLoans_CustomerPurchasePlanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerPurchasePlanId |
| dbo | UserLoans | IX_UserLoans_LoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | UserLoans | IX_UserLoans_SubAgentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | SubAgentId |
| dbo | UserLoans | IX_UserLoans_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | UserLoans | IX_UserLoans_UserLoanRequestId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanRequestId |
| dbo | UserLoans | PK_UserLoans | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanSponsoreDueDate | IX_UserLoanSponsoreDueDate_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | UserLoanSponsoreDueDate | IX_UserLoanSponsoreDueDate_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | UserLoanSponsoreDueDate | IX_UserLoanSponsoreDueDate_UserLoanId1 | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId1 |
| dbo | UserLoanSponsoreDueDate | PK_UserLoanSponsoreDueDate | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserRefahBeta | IX_UserRefahBeta_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | UserRefahBeta | IX_UserRefahBeta_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | UserRefahBeta | PK_UserRefahBeta | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserSavedMonies | IX_UserSavedMonies_MemberId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MemberId |
| dbo | UserSavedMonies | PK_UserSavedMonies | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | VisitorLogs | PK_VisitorLogs | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | WithdrawAgentFactor | IX_WithdrawAgentFactor_AgentFactorId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentFactorId |
| dbo | WithdrawAgentFactor | IX_WithdrawAgentFactor_WithdrawId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | WithdrawId |
| dbo | WithdrawAgentFactor | PK_WithdrawAgentFactor | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Withdraws | IX_Withdraws_AgentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentId |
| dbo | Withdraws | IX_Withdraws_ContactId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ContactId |
| dbo | Withdraws | IX_Withdraws_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Withdraws | IX_Withdraws_CustomerMarketerCommissionId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerMarketerCommissionId |
| dbo | Withdraws | IX_Withdraws_SponsoredLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | SponsoredLoanId |
| dbo | Withdraws | IX_Withdraws_UserLoanContactId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanContactId |
| dbo | Withdraws | IX_Withdraws_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | Withdraws | PK_Withdraws | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| HangFire | AggregatedCounter | IX_HangFire_AggregatedCounter_ExpireAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([ExpireAt] IS NOT NULL) | 1 | 0 | ExpireAt |
| HangFire | AggregatedCounter | PK_HangFire_CounterAggregated | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Key |
| HangFire | Counter | PK_HangFire_Counter | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Key |
| HangFire | Counter | PK_HangFire_Counter | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Id |
| HangFire | Hash | IX_HangFire_Hash_ExpireAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([ExpireAt] IS NOT NULL) | 1 | 0 | ExpireAt |
| HangFire | Hash | PK_HangFire_Hash | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Key |
| HangFire | Hash | PK_HangFire_Hash | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Field |
| HangFire | Job | IX_HangFire_Job_ExpireAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([ExpireAt] IS NOT NULL) | 0 | 1 | StateName |
| HangFire | Job | IX_HangFire_Job_ExpireAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([ExpireAt] IS NOT NULL) | 1 | 0 | ExpireAt |
| HangFire | Job | IX_HangFire_Job_StateName | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([StateName] IS NOT NULL) | 1 | 0 | StateName |
| HangFire | Job | PK_HangFire_Job | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| HangFire | JobParameter | PK_HangFire_JobParameter | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | JobId |
| HangFire | JobParameter | PK_HangFire_JobParameter | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Name |
| HangFire | JobQueue | PK_HangFire_JobQueue | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Queue |
| HangFire | JobQueue | PK_HangFire_JobQueue | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Id |
| HangFire | List | IX_HangFire_List_ExpireAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([ExpireAt] IS NOT NULL) | 1 | 0 | ExpireAt |
| HangFire | List | PK_HangFire_List | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Key |
| HangFire | List | PK_HangFire_List | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Id |
| HangFire | Schema | PK_HangFire_Schema | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Version |
| HangFire | Server | IX_HangFire_Server_LastHeartbeat | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LastHeartbeat |
| HangFire | Server | PK_HangFire_Server | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| HangFire | Set | IX_HangFire_Set_ExpireAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([ExpireAt] IS NOT NULL) | 1 | 0 | ExpireAt |
| HangFire | Set | IX_HangFire_Set_Score | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | Key |
| HangFire | Set | IX_HangFire_Set_Score | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 2 | 0 | Score |
| HangFire | Set | PK_HangFire_Set | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Key |
| HangFire | Set | PK_HangFire_Set | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Value |
| HangFire | State | IX_HangFire_State_CreatedAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CreatedAt |
| HangFire | State | PK_HangFire_State | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | JobId |
| HangFire | State | PK_HangFire_State | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Id |

### سایر اشیا

**View/Procedure/Function/Trigger:** _موردی ثبت نشده است._

**Check constraints:** _موردی ثبت نشده است._

**Sequences/User types:** _موردی ثبت نشده است._

**Database triggers:** _موردی ثبت نشده است._

## پایگاه جانبی BlueVam

- دیتابیس: `vamcityc_bluvamdb_import_20261028`
- جدول‌ها: **56**
- ستون‌ها: **573**
- رکوردها: **286,597**
- قیود PK/Unique: **56** نام قید، 67 ستون کلید
- قیود FK: **99** نام قید، 99 ستون رابطه
- ایندکس‌ها: **163** نام ایندکس، 176 ردیف ستون ایندکس
- View/Procedure/Function/Trigger: **0**
- Check constraints: **0**
- Sequences/User types: **0**
- Database triggers: **0**

### جدول‌ها و تعداد رکورد

| Schema | Table | Rows |
| --- | --- | --- |
| dbo | __EFMigrationsHistory | 140 |
| dbo | AffiliateCommissions | 0 |
| dbo | AgentLoanAuthorizationItem | 24 |
| dbo | AgentLoans | 688 |
| dbo | AppSettings | 1 |
| dbo | AppSms | 87389 |
| dbo | AspNetRoleClaims | 0 |
| dbo | AspNetRoles | 6 |
| dbo | AspNetUserClaims | 23 |
| dbo | AspNetUserLogins | 0 |
| dbo | AspNetUserRoles | 49864 |
| dbo | AspNetUsers | 49867 |
| dbo | AspNetUserTokens | 0 |
| dbo | Assurance | 1 |
| dbo | AuthorizationItem | 40 |
| dbo | Consultants | 1 |
| dbo | Contacts | 3 |
| dbo | CustomerMarketerCommissions | 21 |
| dbo | CustomerPurchasePlan | 2 |
| dbo | Customers | 2 |
| dbo | Expenses | 0 |
| dbo | IceReport | 56 |
| dbo | IranValidityReport | 865 |
| dbo | LoanAuthorizationItems | 83 |
| dbo | LoanContacts | 1 |
| dbo | LoanRequestStatuses | 89 |
| dbo | Loans | 45 |
| dbo | MemberPurchases | 2418 |
| dbo | OffDate | 140 |
| dbo | OnlineMoneyTransfer | 121 |
| dbo | Purchases | 0 |
| dbo | SmsPatterns | 43 |
| dbo | SubAgentTransactions | 0 |
| dbo | UserLoanContact | 4 |
| dbo | UserLoanPaymentRequests | 86 |
| dbo | UserLoanPayments | 14180 |
| dbo | UserLoanRequestAuthorizationItemAttachments | 10117 |
| dbo | UserLoanRequestAuthorizationItems | 9992 |
| dbo | UserLoanRequests | 12232 |
| dbo | UserLoanRequestStatusHistories | 35663 |
| dbo | UserLoans | 713 |
| dbo | UserLoanSponsoreDueDate | 4 |
| dbo | UserSavedMonies | 0 |
| dbo | VisitorLogs | 11157 |
| dbo | Withdraws | 514 |
| HangFire | AggregatedCounter | 1 |
| HangFire | Counter | 0 |
| HangFire | Hash | 0 |
| HangFire | Job | 0 |
| HangFire | JobParameter | 0 |
| HangFire | JobQueue | 0 |
| HangFire | List | 0 |
| HangFire | Schema | 1 |
| HangFire | Server | 0 |
| HangFire | Set | 0 |
| HangFire | State | 0 |

### تمام ستون‌ها

| Schema | Table | Ord | Column | SQL type | Max length | Precision | Scale | Nullable | Identity | Computed | Default | Computed expression |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dbo | __EFMigrationsHistory | 1 | MigrationId | nvarchar | 150 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | __EFMigrationsHistory | 2 | ProductVersion | nvarchar | 32 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 2 | Amount | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 3 | PaidToUser | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 4 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 5 | Description | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 6 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AffiliateCommissions | 7 | PurchaseId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoanAuthorizationItem | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoanAuthorizationItem | 2 | AuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoanAuthorizationItem | 3 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoanAuthorizationItem | 4 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 2 | AgentId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 3 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 4 | Percent | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 5 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 6 | DefaultCheckoutDays | tinyint | 1 | 3 | 0 | 0 | 0 | 0 | (CONVERT([tinyint],(0))) | NULL |
| dbo | AgentLoans | 7 | ContactId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 8 | ContactPercent | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AgentLoans | 11 | ProductCheckoutDays | tinyint | 1 | 3 | 0 | 0 | 0 | 0 | (CONVERT([tinyint],(0))) | NULL |
| dbo | AgentLoans | 12 | ProductPercent | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | AppSettings | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 5 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('2a18f1fc-57fe-482c-8003-b6ba13b12996') | NULL |
| dbo | AppSettings | 6 | IsOnlinePaymentActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 7 | OnlinePaymentGateway | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 8 | Shaba | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 9 | ZarinpalMerchantCode | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 10 | DueDateRememberSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 11 | DueDatedRememberSmsTime | time | 5 | 16 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 12 | SmsCredit | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 13 | ThanksPaymentSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 14 | AppendToWhichInstallment | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 15 | RoundCountNumber | tinyint | 1 | 3 | 0 | 0 | 0 | 0 | (CONVERT([tinyint],(0))) | NULL |
| dbo | AppSettings | 16 | OverDueDateSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 17 | OverDueDaysCount | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 18 | SepTerminalId | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 19 | DashboardSettingsJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 20 | BeforeDueDaysCount | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 21 | IsDueDateSmsActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 22 | IsRememberSmsActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 23 | OverDueDayRemeberOnce | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AppSettings | 24 | BeforeDueDateSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 25 | DefaultSmsPanel | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSettings | 26 | MelliPayamakConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 27 | KaveNegarConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 28 | BankInfo | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 29 | IceConfigJson | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 30 | NextPayApiKey | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 31 | BankAccountsJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 32 | IPGParsianLoginAccount | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 33 | Address | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 34 | Email | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 35 | Phones | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 36 | ThemeSettingsJson | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 37 | DepositChargeDueDateStatuses | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 38 | SponsoreDueDateStatuses | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 39 | LoginSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 40 | RegisterSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 41 | IranValidityConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 42 | ApplicationLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 43 | BusinessTitle | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 44 | EnamadLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 45 | EtehadieLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 46 | InstagramLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 47 | RubikaLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 48 | SamandehiLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 49 | TelegramLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 50 | WhatsappLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 51 | ShopLink | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 52 | RegisterOtpSmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 53 | AnjomanSenfiLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 54 | AparatLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 55 | ShopTitle | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 56 | FinnoTechConfigJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 57 | KasboKarhayeInternetiTehranLink | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 58 | BankGatewayRouterBaseUrl | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 59 | ApiKey | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 60 | ApiPassword | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 61 | SadadMerchantId | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 62 | SadadTerminalId | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSettings | 63 | SadadMerchantKey | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 2 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 3 | Text | nvarchar | 1500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 4 | Price | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 5 | AppSmsType | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 6 | To | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 7 | Status | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 8 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 9 | EntityId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('00000000-0000-0000-0000-000000000000') | NULL |
| dbo | AppSms | 10 | EntityType | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 11 | SmsPatternTitle | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 12 | SmsPanel | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSms | 13 | DeliverCheckRetryCount | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AppSms | 14 | SMSKey | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AppSms | 15 | Tag | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetRoleClaims | 1 | Id | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | AspNetRoleClaims | 2 | RoleId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetRoleClaims | 3 | ClaimType | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetRoleClaims | 4 | ClaimValue | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetRoles | 1 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | AspNetRoles | 2 | Name | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetRoles | 3 | NormalizedName | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetRoles | 4 | ConcurrencyStamp | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserClaims | 1 | Id | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | AspNetUserClaims | 2 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserClaims | 3 | ClaimType | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserClaims | 4 | ClaimValue | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserLogins | 1 | LoginProvider | nvarchar | 450 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserLogins | 2 | ProviderKey | nvarchar | 450 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserLogins | 3 | ProviderDisplayName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserLogins | 4 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserRoles | 1 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserRoles | 2 | RoleId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 1 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | AspNetUsers | 2 | FirstName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 3 | LastName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 4 | Gender | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 5 | Address | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 6 | Mobile | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 7 | LastLoginDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 8 | IsActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 10 | NationalCode | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 15 | TotalSavedMoney | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 16 | ViewCount | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 17 | UserName | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 18 | NormalizedUserName | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 19 | Email | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 20 | NormalizedEmail | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 21 | EmailConfirmed | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 22 | PasswordHash | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 23 | SecurityStamp | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 24 | ConcurrencyStamp | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 25 | PhoneNumber | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 26 | PhoneNumberConfirmed | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 27 | TwoFactorEnabled | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 28 | LockoutEnd | datetimeoffset | 10 | 34 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 29 | LockoutEnabled | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 30 | AccessFailedCount | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 31 | RegDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | AspNetUsers | 32 | LastLoginDate2 | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | AspNetUsers | 33 | RegDate2 | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | AspNetUsers | 34 | Familiar1FirstName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 35 | Familiar1LastName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 36 | Familiar1Mobile | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 37 | Familiar2FirstName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 38 | Familiar2LastName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 39 | Familiar2Mobile | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 40 | FatherName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 41 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 42 | AffiliateCode | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 43 | CommissionPercent | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AspNetUsers | 44 | Phone | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 45 | MobileVerified | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AspNetUsers | 46 | Otp | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | AspNetUsers | 47 | RegistrationCompleted | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | AspNetUsers | 48 | Credit | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | AspNetUsers | 49 | BusinessName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 50 | AgentId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 53 | BankAccountsJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 54 | CustomerMarketerId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 55 | PostalCode | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 56 | Shenasname | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 57 | City | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AspNetUsers | 58 | SmsActiveForMembers | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(1))) | NULL |
| dbo | AspNetUserTokens | 1 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserTokens | 2 | LoginProvider | nvarchar | 450 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserTokens | 3 | Name | nvarchar | 450 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AspNetUserTokens | 4 | Value | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurance | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Assurance | 2 | Description | nvarchar | 2000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurance | 3 | FileName | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurance | 4 | FileSize | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Assurance | 5 | FileType | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Assurance | 6 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AuthorizationItem | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AuthorizationItem | 2 | Title | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AuthorizationItem | 3 | Description | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | AuthorizationItem | 4 | SystemType | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AuthorizationItem | 5 | UseIfAlreadyExist | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | AuthorizationItem | 6 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Consultants | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Consultants | 2 | Name | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Consultants | 3 | Phone | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Consultants | 4 | Description | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Consultants | 5 | IsSeen | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Consultants | 6 | CallResult | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Consultants | 7 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 2 | FullName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 3 | BusinessName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 4 | Phone | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 5 | Address | nvarchar | 250 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 6 | BankInfo | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Contacts | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerMarketerCommissions | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerMarketerCommissions | 2 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerMarketerCommissions | 3 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerMarketerCommissions | 4 | Description | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | CustomerMarketerCommissions | 5 | MarketerId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerMarketerCommissions | 6 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 2 | StartDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 3 | EndDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 4 | MaxLoanCount | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 5 | RemainLoanCount | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 6 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | CustomerPurchasePlan | 7 | PurchaseId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Customers | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Customers | 2 | Name | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Customers | 3 | Mobile | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Customers | 4 | Email | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Customers | 5 | FirstLoginDone | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Customers | 6 | InitPassword | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Customers | 7 | RegDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Customers | 8 | ExpireDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Customers | 9 | Permanent | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Customers | 10 | Purchased | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Customers | 11 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | Customers | 12 | AffCode | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Customers | 13 | ParkDomain | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 2 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 3 | SavedBy | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 4 | Title | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 5 | Comment | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 6 | CostDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 7 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Expenses | 8 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('2a18f1fc-57fe-482c-8003-b6ba13b12996') | NULL |
| dbo | IceReport | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 2 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 3 | Result | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 4 | Price | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 5 | Url | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 6 | ReportID | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 7 | Status | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 8 | IceReportJson | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 9 | Errors | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 10 | MemberId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 11 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 12 | AttachmentFileName | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IceReport | 13 | ReportPdfFileName | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 2 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 3 | Result | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 4 | Price | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 5 | Url | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 6 | ReportPdfFileName | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 7 | AttachmentFileName | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 8 | ReportID | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 9 | Status | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 10 | IranValidityReportJson | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 11 | Messages | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 12 | MemberId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 13 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | IranValidityReport | 14 | GradeNumber | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | LoanAuthorizationItems | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanAuthorizationItems | 6 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanAuthorizationItems | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanAuthorizationItems | 8 | AuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('00000000-0000-0000-0000-000000000000') | NULL |
| dbo | LoanAuthorizationItems | 9 | IsPrimary | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | LoanContacts | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanContacts | 2 | ContactId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanContacts | 3 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanContacts | 4 | Share | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanContacts | 5 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 2 | Title | nvarchar | 50 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 3 | StepCategory | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 4 | Changable | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 5 | Order | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 6 | SmsPatternId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 8 | SystemRequestStatus | int | 4 | 10 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 9 | StatusGroup | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | LoanRequestStatuses | 10 | SystemAgentRequestStatus | int | 4 | 10 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | LoanRequestStatuses | 11 | AllowNewRequest | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Loans | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Loans | 2 | Title | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 3 | Code | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | Loans | 4 | DelayPercent | float | 8 | 53 | 0 | 0 | 0 | 0 | ((0.0000000000000000e+000)) | NULL |
| dbo | Loans | 5 | EarlyPercent | float | 8 | 53 | 0 | 0 | 0 | 0 | ((0.0000000000000000e+000)) | NULL |
| dbo | Loans | 6 | ProfitPercent | float | 8 | 53 | 0 | 0 | 0 | 0 | ((0.0000000000000000e+000)) | NULL |
| dbo | Loans | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('2a18f1fc-57fe-482c-8003-b6ba13b12996') | NULL |
| dbo | Loans | 8 | IsSponsored | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Loans | 10 | IsSmsActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Loans | 11 | FileName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 12 | IncludePlan | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Loans | 13 | PlanHtml | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 14 | PlanShortDescription | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 15 | PlanTitle | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 18 | MaxAmount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | Loans | 19 | MaxMonthGap | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | Loans | 20 | AllowedInstallments | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 21 | CostsJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 22 | Disable | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Loans | 23 | DisableText | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Loans | 24 | HasSponsore | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | Loans | 25 | DefaultSponsoreCheckoutDays | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | MemberPurchases | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 2 | PaymentStep | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 3 | OnlinePaymentGateway | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 4 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 5 | UserLoanPaymentId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 6 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 7 | StartDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 8 | Description | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 13 | IsPaymentSuccess | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 14 | SepJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 15 | ZarinPalJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 16 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('00000000-0000-0000-0000-000000000000') | NULL |
| dbo | MemberPurchases | 17 | MemberPurchaseType | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | MemberPurchases | 18 | NextPayJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 19 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | MemberPurchases | 20 | IPGParsianJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 21 | CreatorUserId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | MemberPurchases | 22 | SadadJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OffDate | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | OffDate | 2 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | OffDate | 3 | Title | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OffDate | 4 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 2 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 3 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 4 | OnlineMoneyTransferStep | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 5 | From | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 6 | To | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 7 | OTP | nvarchar | 10 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 8 | OTPGenerateDateTime | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 9 | OurTraceNumber | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 10 | Cif | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 11 | IsSuccess | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 12 | EFardaJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 13 | TransactionId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 14 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 15 | OnlineMoneyTransferPanelId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | OnlineMoneyTransfer | 16 | ToName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 2 | ProductType | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 3 | PaymentStep | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 4 | PaymentMethod | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 5 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 6 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 7 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 8 | StartDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 9 | Description | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 10 | ZarinPalAuthority | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 12 | ZarinPalStatus | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 13 | IsPaymentSuccess | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 14 | AffCode | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Purchases | 15 | LoanCount | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | SmsPatterns | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 2 | Title | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 3 | Pattern | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 4 | IsSystem | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 5 | Status | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 6 | RejectReason | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 8 | IsPatternBase | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | SmsPatterns | 9 | PatternBaseCode | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SmsPatterns | 10 | SmsPatternPanel | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | SmsPatterns | 11 | Category | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | SubAgentTransactions | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 2 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 3 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 4 | PaymentMethod | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 5 | IsWithdraw | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 6 | Description | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 7 | SavedBy | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 8 | FileName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 9 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | SubAgentTransactions | 11 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanContact | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanContact | 2 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanContact | 3 | ContactId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanContact | 4 | Share | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanContact | 5 | DueDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanContact | 6 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanContact | 7 | UserLoanId1 | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 2 | UserLoanPaymentId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 3 | RequestDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 4 | PaymentDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 5 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 6 | MemberDescription | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 7 | AdminDescription | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 8 | Status | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 9 | PaymentMethod | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 10 | TrackNumber | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 11 | AdminAcceptorId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 12 | AdminAcceptDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 13 | AffectOnMainPayment | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPaymentRequests | 14 | FileName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 2 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 3 | InstallmentNumber | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 4 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 5 | SavedBy | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 6 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 7 | FileMonth | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 8 | TargetMonth | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | UserLoanPayments | 9 | DelayDay | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | UserLoanPayments | 10 | DelayPrice | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoanPayments | 11 | Description | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 12 | GoldRate | float | 8 | 53 | 0 | 0 | 0 | 0 | ((0.0000000000000000e+000)) | NULL |
| dbo | UserLoanPayments | 13 | GoldWeight | float | 8 | 53 | 0 | 0 | 0 | 0 | ((0.0000000000000000e+000)) | NULL |
| dbo | UserLoanPayments | 14 | PaymentMethod | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | UserLoanPayments | 15 | IsGoldCheckouted | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoanPayments | 16 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | UserLoanPayments | 17 | SentDueDateSms | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoanPayments | 18 | InstallmentAmount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoanPayments | 19 | SentOverDueDateSms | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoanRequestAuthorizationItemAttachments | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItemAttachments | 2 | UserLoanRequestAuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItemAttachments | 3 | Attachment | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItemAttachments | 4 | MemberDescription | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItemAttachments | 5 | AttachmentByAdmin | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItemAttachments | 6 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 2 | UserLoanRequestId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 3 | AuthorizationItemId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 4 | CreateDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 5 | LastChangeDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 6 | Attachment | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 7 | MemberDescription | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 8 | AdminDescription | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 9 | Status | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 10 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestAuthorizationItems | 11 | AttachmentByAdmin | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoanRequests | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 2 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 3 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 4 | RequestDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 5 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 6 | Comment | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 7 | AdminDescriptionPrivate | nvarchar | 1000 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 9 | Month | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 10 | Year | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 11 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('00000000-0000-0000-0000-000000000000') | NULL |
| dbo | UserLoanRequests | 12 | InstallmentCount | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | UserLoanRequests | 13 | MonthGap | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | UserLoanRequests | 14 | AgentId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 15 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 16 | Installment | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoanRequests | 18 | IsPhysicalDocsDelivered | bit | 1 | 1 | 0 | 0 | 0 | 0 | (CONVERT([bit],(0))) | NULL |
| dbo | UserLoanRequests | 19 | AdminDescription | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 20 | SponsoreDueDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | UserLoanRequests | 21 | StatusId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 22 | AgentStatusId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequests | 23 | ChargeType | int | 4 | 10 | 0 | 0 | 0 | 0 | ((0)) | NULL |
| dbo | UserLoanRequests | 24 | SponsoreAmount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoanRequests | 25 | LockedBy | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 2 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 3 | UserLoanRequestId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 4 | DateTime | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 5 | FromStatusId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 6 | FromAgentStatusId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 7 | ToStatusId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 8 | ToAgentStatusId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanRequestStatusHistories | 9 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 2 | UserId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 3 | LoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 4 | StartDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 5 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 6 | Installment | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 7 | Month | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 8 | Paid | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 9 | Remain | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 10 | CheckoutDate | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 11 | IsCheckouted | bit | 1 | 1 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 12 | Code | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| dbo | UserLoans | 13 | Description | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 14 | MonthGap | int | 4 | 10 | 0 | 0 | 0 | 0 | ((1)) | NULL |
| dbo | UserLoans | 15 | PayableAmount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoans | 16 | CustomerPurchasePlanId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 17 | AgentId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 18 | UserLoanRequestId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 19 | AgentPrice | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoans | 20 | AgentDueDate | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 21 | SubAgentDueDate | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 22 | SubAgentId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 23 | SubAgentPrice | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoans | 24 | DepositChargeDueDate | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoans | 25 | PreDepositAmount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | ((0.0)) | NULL |
| dbo | UserLoanSponsoreDueDate | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 2 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 3 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 4 | DueDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 5 | Description | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 6 | IsCheckouted | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 7 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserLoanSponsoreDueDate | 8 | UserLoanId1 | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 2 | MemberId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 3 | Description | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 4 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 5 | SavedBy | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 6 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 7 | FileMonth | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | UserSavedMonies | 8 | TargetMonth | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | ('0001-01-01T00:00:00.0000000') | NULL |
| dbo | VisitorLogs | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | VisitorLogs | 2 | Date | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | VisitorLogs | 3 | IpAddress | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | VisitorLogs | 4 | UserAgent | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | VisitorLogs | 5 | Mrk | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 2 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 3 | SaveDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 4 | PaymentMethod | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 5 | IsWithdraw | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 6 | IsUnknown | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 7 | GoldWeight | float | 8 | 53 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 8 | GoldRate | float | 8 | 53 | 0 | 0 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 9 | Description | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 10 | SavedBy | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 11 | WeightBalance | float | 8 | 53 | 0 | 0 | 0 | 0 | ((0.0000000000000000e+000)) | NULL |
| dbo | Withdraws | 12 | CustomerId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | ('2a18f1fc-57fe-482c-8003-b6ba13b12996') | NULL |
| dbo | Withdraws | 13 | SponsoredLoanId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 14 | AgentId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 15 | UserLoanId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 16 | ContactId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 17 | UserLoanContactId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 18 | FileName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 19 | SuccessfullOnlineMoneyTransferId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| dbo | Withdraws | 20 | CustomerMarketerCommissionId | uniqueidentifier | 16 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | AggregatedCounter | 2 | Key | nvarchar | 100 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | AggregatedCounter | 3 | Value | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | AggregatedCounter | 4 | ExpireAt | datetime | 8 | 23 | 3 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Counter | 2 | Key | nvarchar | 100 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Counter | 3 | Value | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Counter | 4 | ExpireAt | datetime | 8 | 23 | 3 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Counter | 5 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| HangFire | Hash | 2 | Key | nvarchar | 100 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Hash | 3 | Field | nvarchar | 100 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Hash | 4 | Value | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Hash | 5 | ExpireAt | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Job | 1 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| HangFire | Job | 2 | StateId | bigint | 8 | 19 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Job | 3 | StateName | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Job | 4 | InvocationData | nvarchar | -1 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Job | 5 | Arguments | nvarchar | -1 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Job | 6 | CreatedAt | datetime | 8 | 23 | 3 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Job | 7 | ExpireAt | datetime | 8 | 23 | 3 | 1 | 0 | 0 | NULL | NULL |
| HangFire | JobParameter | 2 | JobId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | JobParameter | 3 | Name | nvarchar | 40 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | JobParameter | 4 | Value | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | JobQueue | 1 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| HangFire | JobQueue | 2 | JobId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | JobQueue | 3 | Queue | nvarchar | 50 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | JobQueue | 4 | FetchedAt | datetime | 8 | 23 | 3 | 1 | 0 | 0 | NULL | NULL |
| HangFire | List | 1 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| HangFire | List | 2 | Key | nvarchar | 100 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | List | 3 | Value | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | List | 4 | ExpireAt | datetime | 8 | 23 | 3 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Schema | 1 | Version | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Server | 1 | Id | nvarchar | 200 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Server | 2 | Data | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | Server | 3 | LastHeartbeat | datetime | 8 | 23 | 3 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Set | 2 | Key | nvarchar | 100 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Set | 3 | Score | float | 8 | 53 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Set | 4 | Value | nvarchar | 256 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | Set | 5 | ExpireAt | datetime | 8 | 23 | 3 | 1 | 0 | 0 | NULL | NULL |
| HangFire | State | 1 | Id | bigint | 8 | 19 | 0 | 0 | 1 | 0 | NULL | NULL |
| HangFire | State | 2 | JobId | bigint | 8 | 19 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | State | 3 | Name | nvarchar | 20 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| HangFire | State | 4 | Reason | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| HangFire | State | 5 | CreatedAt | datetime | 8 | 23 | 3 | 0 | 0 | 0 | NULL | NULL |
| HangFire | State | 6 | Data | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |

### کلیدهای اصلی و یکتا

| Schema | Table | Constraint | Type | Column | Ordinal |
| --- | --- | --- | --- | --- | --- |
| dbo | __EFMigrationsHistory | PK___EFMigrationsHistory | PRIMARY_KEY_CONSTRAINT | MigrationId | 1 |
| dbo | AffiliateCommissions | PK_AffiliateCommissions | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AgentLoanAuthorizationItem | PK_AgentLoanAuthorizationItem | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AgentLoans | PK_AgentLoans | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AppSettings | PK_AppSettings | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AppSms | PK_AppSms | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AspNetRoleClaims | PK_AspNetRoleClaims | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AspNetRoles | PK_AspNetRoles | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AspNetUserClaims | PK_AspNetUserClaims | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AspNetUserLogins | PK_AspNetUserLogins | PRIMARY_KEY_CONSTRAINT | LoginProvider | 1 |
| dbo | AspNetUserLogins | PK_AspNetUserLogins | PRIMARY_KEY_CONSTRAINT | ProviderKey | 2 |
| dbo | AspNetUserRoles | PK_AspNetUserRoles | PRIMARY_KEY_CONSTRAINT | UserId | 1 |
| dbo | AspNetUserRoles | PK_AspNetUserRoles | PRIMARY_KEY_CONSTRAINT | RoleId | 2 |
| dbo | AspNetUsers | PK_AspNetUsers | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AspNetUserTokens | PK_AspNetUserTokens | PRIMARY_KEY_CONSTRAINT | UserId | 1 |
| dbo | AspNetUserTokens | PK_AspNetUserTokens | PRIMARY_KEY_CONSTRAINT | LoginProvider | 2 |
| dbo | AspNetUserTokens | PK_AspNetUserTokens | PRIMARY_KEY_CONSTRAINT | Name | 3 |
| dbo | Assurance | PK_Assurance | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | AuthorizationItem | PK_AuthorizationItem | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Consultants | PK_Consultants | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Contacts | PK_Contacts | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | CustomerMarketerCommissions | PK_CustomerMarketerCommissions | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | CustomerPurchasePlan | PK_CustomerPurchasePlan | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Customers | PK_Customers | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Expenses | PK_Expenses | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | IceReport | PK_IceReport | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | IranValidityReport | PK_IranValidityReport | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | LoanAuthorizationItems | PK_LoanAuthorizationItems | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | LoanContacts | PK_LoanContacts | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | LoanRequestStatuses | PK_LoanRequestStatuses | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Loans | PK_Loans | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | MemberPurchases | PK_MemberPurchases | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | OffDate | PK_OffDate | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | OnlineMoneyTransfer | PK_OnlineMoneyTransfer | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Purchases | PK_Purchases | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | SmsPatterns | PK_SmsPatterns | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | SubAgentTransactions | PK_SubAgentTransactions | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanContact | PK_UserLoanContact | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanPaymentRequests | PK_UserLoanPaymentRequests | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanPayments | PK_UserLoanPayments | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanRequestAuthorizationItemAttachments | PK_UserLoanRequestAuthorizationItemAttachments | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanRequestAuthorizationItems | PK_UserLoanRequestAuthorizationItems | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanRequests | PK_UserLoanRequests | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanRequestStatusHistories | PK_UserLoanRequestStatusHistories | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoans | PK_UserLoans | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserLoanSponsoreDueDate | PK_UserLoanSponsoreDueDate | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | UserSavedMonies | PK_UserSavedMonies | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | VisitorLogs | PK_VisitorLogs | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| dbo | Withdraws | PK_Withdraws | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| HangFire | AggregatedCounter | PK_HangFire_CounterAggregated | PRIMARY_KEY_CONSTRAINT | Key | 1 |
| HangFire | Counter | PK_HangFire_Counter | PRIMARY_KEY_CONSTRAINT | Key | 1 |
| HangFire | Counter | PK_HangFire_Counter | PRIMARY_KEY_CONSTRAINT | Id | 2 |
| HangFire | Hash | PK_HangFire_Hash | PRIMARY_KEY_CONSTRAINT | Key | 1 |
| HangFire | Hash | PK_HangFire_Hash | PRIMARY_KEY_CONSTRAINT | Field | 2 |
| HangFire | Job | PK_HangFire_Job | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| HangFire | JobParameter | PK_HangFire_JobParameter | PRIMARY_KEY_CONSTRAINT | JobId | 1 |
| HangFire | JobParameter | PK_HangFire_JobParameter | PRIMARY_KEY_CONSTRAINT | Name | 2 |
| HangFire | JobQueue | PK_HangFire_JobQueue | PRIMARY_KEY_CONSTRAINT | Queue | 1 |
| HangFire | JobQueue | PK_HangFire_JobQueue | PRIMARY_KEY_CONSTRAINT | Id | 2 |
| HangFire | List | PK_HangFire_List | PRIMARY_KEY_CONSTRAINT | Key | 1 |
| HangFire | List | PK_HangFire_List | PRIMARY_KEY_CONSTRAINT | Id | 2 |
| HangFire | Schema | PK_HangFire_Schema | PRIMARY_KEY_CONSTRAINT | Version | 1 |
| HangFire | Server | PK_HangFire_Server | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| HangFire | Set | PK_HangFire_Set | PRIMARY_KEY_CONSTRAINT | Key | 1 |
| HangFire | Set | PK_HangFire_Set | PRIMARY_KEY_CONSTRAINT | Value | 2 |
| HangFire | State | PK_HangFire_State | PRIMARY_KEY_CONSTRAINT | JobId | 1 |
| HangFire | State | PK_HangFire_State | PRIMARY_KEY_CONSTRAINT | Id | 2 |

### کلیدهای خارجی

| Parent schema | Parent table | FK | Parent column | Referenced schema | Referenced table | Referenced column | Ordinal | On delete | On update | Disabled | Untrusted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dbo | AffiliateCommissions | FK_AffiliateCommissions_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AffiliateCommissions | FK_AffiliateCommissions_Purchases_PurchaseId | PurchaseId | dbo | Purchases | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AgentLoanAuthorizationItem | FK_AgentLoanAuthorizationItem_AuthorizationItem_AuthorizationItemId | AuthorizationItemId | dbo | AuthorizationItem | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AgentLoanAuthorizationItem | FK_AgentLoanAuthorizationItem_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AgentLoanAuthorizationItem | FK_AgentLoanAuthorizationItem_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AgentLoans | FK_AgentLoans_AspNetUsers_AgentId | AgentId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AgentLoans | FK_AgentLoans_Contacts_ContactId | ContactId | dbo | Contacts | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AgentLoans | FK_AgentLoans_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AgentLoans | FK_AgentLoans_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_BeforeDueDateSmsPatternId | BeforeDueDateSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_DueDateRememberSmsPatternId | DueDateRememberSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_LoginSmsPatternId | LoginSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_OverDueDateSmsPatternId | OverDueDateSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_RegisterOtpSmsPatternId | RegisterOtpSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_RegisterSmsPatternId | RegisterSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSettings | FK_AppSettings_SmsPatterns_ThanksPaymentSmsPatternId | ThanksPaymentSmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AppSms | FK_AppSms_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AspNetRoleClaims | FK_AspNetRoleClaims_AspNetRoles_RoleId | RoleId | dbo | AspNetRoles | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AspNetUserClaims | FK_AspNetUserClaims_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AspNetUserLogins | FK_AspNetUserLogins_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AspNetUserRoles | FK_AspNetUserRoles_AspNetRoles_RoleId | RoleId | dbo | AspNetRoles | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AspNetUserRoles | FK_AspNetUserRoles_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | AspNetUsers | FK_AspNetUsers_AspNetUsers_AgentId | AgentId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AspNetUsers | FK_AspNetUsers_AspNetUsers_CustomerMarketerId | CustomerMarketerId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AspNetUsers | FK_AspNetUsers_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AspNetUserTokens | FK_AspNetUserTokens_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | Assurance | FK_Assurance_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | AuthorizationItem | FK_AuthorizationItem_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Contacts | FK_Contacts_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | CustomerMarketerCommissions | FK_CustomerMarketerCommissions_AspNetUsers_MarketerId | MarketerId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | CustomerMarketerCommissions | FK_CustomerMarketerCommissions_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | CustomerPurchasePlan | FK_CustomerPurchasePlan_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | CustomerPurchasePlan | FK_CustomerPurchasePlan_Purchases_PurchaseId | PurchaseId | dbo | Purchases | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Expenses | FK_Expenses_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | IceReport | FK_IceReport_AspNetUsers_MemberId | MemberId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | IceReport | FK_IceReport_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | IranValidityReport | FK_IranValidityReport_AspNetUsers_MemberId | MemberId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | IranValidityReport | FK_IranValidityReport_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | LoanAuthorizationItems | FK_LoanAuthorizationItems_AuthorizationItem_AuthorizationItemId | AuthorizationItemId | dbo | AuthorizationItem | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | LoanAuthorizationItems | FK_LoanAuthorizationItems_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | LoanAuthorizationItems | FK_LoanAuthorizationItems_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | LoanContacts | FK_LoanContacts_Contacts_ContactId | ContactId | dbo | Contacts | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | LoanContacts | FK_LoanContacts_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | LoanContacts | FK_LoanContacts_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | LoanRequestStatuses | FK_LoanRequestStatuses_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | LoanRequestStatuses | FK_LoanRequestStatuses_SmsPatterns_SmsPatternId | SmsPatternId | dbo | SmsPatterns | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Loans | FK_Loans_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | MemberPurchases | FK_MemberPurchases_AspNetUsers_CreatorUserId | CreatorUserId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | MemberPurchases | FK_MemberPurchases_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | MemberPurchases | FK_MemberPurchases_UserLoanPayments_UserLoanPaymentId | UserLoanPaymentId | dbo | UserLoanPayments | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | OffDate | FK_OffDate_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | OnlineMoneyTransfer | FK_OnlineMoneyTransfer_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | OnlineMoneyTransfer | FK_OnlineMoneyTransfer_Withdraws_TransactionId | TransactionId | dbo | Withdraws | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Purchases | FK_Purchases_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | Purchases | FK_Purchases_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | SmsPatterns | FK_SmsPatterns_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | SubAgentTransactions | FK_SubAgentTransactions_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | SubAgentTransactions | FK_SubAgentTransactions_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanContact | FK_UserLoanContact_Contacts_ContactId | ContactId | dbo | Contacts | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanContact | FK_UserLoanContact_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanContact | FK_UserLoanContact_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanContact | FK_UserLoanContact_UserLoans_UserLoanId1 | UserLoanId1 | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanPaymentRequests | FK_UserLoanPaymentRequests_AspNetUsers_AdminAcceptorId | AdminAcceptorId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanPaymentRequests | FK_UserLoanPaymentRequests_UserLoanPayments_UserLoanPaymentId | UserLoanPaymentId | dbo | UserLoanPayments | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanPayments | FK_UserLoanPayments_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestAuthorizationItemAttachments | FK_UserLoanRequestAuthorizationItemAttachments_UserLoanRequestAuthorizationItems_UserLoanRequestAuthorizationItemId | UserLoanRequestAuthorizationItemId | dbo | UserLoanRequestAuthorizationItems | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestAuthorizationItems | FK_UserLoanRequestAuthorizationItems_AuthorizationItem_AuthorizationItemId | AuthorizationItemId | dbo | AuthorizationItem | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestAuthorizationItems | FK_UserLoanRequestAuthorizationItems_UserLoanRequests_UserLoanRequestId | UserLoanRequestId | dbo | UserLoanRequests | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequests | FK_UserLoanRequests_AspNetUsers_AgentId | AgentId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequests | FK_UserLoanRequests_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequests | FK_UserLoanRequests_LoanRequestStatuses_AgentStatusId | AgentStatusId | dbo | LoanRequestStatuses | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequests | FK_UserLoanRequests_LoanRequestStatuses_StatusId | StatusId | dbo | LoanRequestStatuses | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequests | FK_UserLoanRequests_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestStatusHistories | FK_UserLoanRequestStatusHistories_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestStatusHistories | FK_UserLoanRequestStatusHistories_LoanRequestStatuses_FromAgentStatusId | FromAgentStatusId | dbo | LoanRequestStatuses | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestStatusHistories | FK_UserLoanRequestStatusHistories_LoanRequestStatuses_FromStatusId | FromStatusId | dbo | LoanRequestStatuses | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestStatusHistories | FK_UserLoanRequestStatusHistories_LoanRequestStatuses_ToAgentStatusId | ToAgentStatusId | dbo | LoanRequestStatuses | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestStatusHistories | FK_UserLoanRequestStatusHistories_LoanRequestStatuses_ToStatusId | ToStatusId | dbo | LoanRequestStatuses | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanRequestStatusHistories | FK_UserLoanRequestStatusHistories_UserLoanRequests_UserLoanRequestId | UserLoanRequestId | dbo | UserLoanRequests | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoans | FK_UserLoans_AspNetUsers_AgentId | AgentId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoans | FK_UserLoans_AspNetUsers_SubAgentId | SubAgentId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoans | FK_UserLoans_AspNetUsers_UserId | UserId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoans | FK_UserLoans_CustomerPurchasePlan_CustomerPurchasePlanId | CustomerPurchasePlanId | dbo | CustomerPurchasePlan | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoans | FK_UserLoans_Loans_LoanId | LoanId | dbo | Loans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoans | FK_UserLoans_UserLoanRequests_UserLoanRequestId | UserLoanRequestId | dbo | UserLoanRequests | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanSponsoreDueDate | FK_UserLoanSponsoreDueDate_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserLoanSponsoreDueDate | FK_UserLoanSponsoreDueDate_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | UserLoanSponsoreDueDate | FK_UserLoanSponsoreDueDate_UserLoans_UserLoanId1 | UserLoanId1 | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | UserSavedMonies | FK_UserSavedMonies_AspNetUsers_MemberId | MemberId | dbo | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_AspNetUsers_AgentId | AgentId | dbo | AspNetUsers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_Contacts_ContactId | ContactId | dbo | Contacts | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_CustomerMarketerCommissions_CustomerMarketerCommissionId | CustomerMarketerCommissionId | dbo | CustomerMarketerCommissions | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_Customers_CustomerId | CustomerId | dbo | Customers | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_Loans_SponsoredLoanId | SponsoredLoanId | dbo | Loans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_UserLoanContact_UserLoanContactId | UserLoanContactId | dbo | UserLoanContact | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| dbo | Withdraws | FK_Withdraws_UserLoans_UserLoanId | UserLoanId | dbo | UserLoans | Id | 1 | NO_ACTION | NO_ACTION | 0 | 0 |
| HangFire | JobParameter | FK_HangFire_JobParameter_Job | JobId | HangFire | Job | Id | 1 | CASCADE | CASCADE | 0 | 0 |
| HangFire | State | FK_HangFire_State_Job | JobId | HangFire | Job | Id | 1 | CASCADE | CASCADE | 0 | 0 |

### ایندکس‌ها

| Schema | Table | Index | Type | Unique | PK | Unique constraint | Disabled | Filtered | Filter | Key ordinal | Included | Column |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dbo | __EFMigrationsHistory | PK___EFMigrationsHistory | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | MigrationId |
| dbo | AffiliateCommissions | IX_AffiliateCommissions_PurchaseId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | PurchaseId |
| dbo | AffiliateCommissions | IX_AffiliateCommissions_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | AffiliateCommissions | PK_AffiliateCommissions | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AgentLoanAuthorizationItem | IX_AgentLoanAuthorizationItem_AuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AuthorizationItemId |
| dbo | AgentLoanAuthorizationItem | IX_AgentLoanAuthorizationItem_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AgentLoanAuthorizationItem | IX_AgentLoanAuthorizationItem_LoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | AgentLoanAuthorizationItem | PK_AgentLoanAuthorizationItem | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AgentLoans | IX_AgentLoans_AgentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentId |
| dbo | AgentLoans | IX_AgentLoans_ContactId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ContactId |
| dbo | AgentLoans | IX_AgentLoans_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AgentLoans | IX_AgentLoans_LoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | AgentLoans | PK_AgentLoans | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AppSettings | IX_AppSettings_BeforeDueDateSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | BeforeDueDateSmsPatternId |
| dbo | AppSettings | IX_AppSettings_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AppSettings | IX_AppSettings_DueDateRememberSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | DueDateRememberSmsPatternId |
| dbo | AppSettings | IX_AppSettings_LoginSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoginSmsPatternId |
| dbo | AppSettings | IX_AppSettings_OverDueDateSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | OverDueDateSmsPatternId |
| dbo | AppSettings | IX_AppSettings_RegisterOtpSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | RegisterOtpSmsPatternId |
| dbo | AppSettings | IX_AppSettings_RegisterSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | RegisterSmsPatternId |
| dbo | AppSettings | IX_AppSettings_ThanksPaymentSmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ThanksPaymentSmsPatternId |
| dbo | AppSettings | PK_AppSettings | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AppSms | IX_AppSms_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AppSms | PK_AppSms | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AspNetRoleClaims | IX_AspNetRoleClaims_RoleId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | RoleId |
| dbo | AspNetRoleClaims | PK_AspNetRoleClaims | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AspNetRoles | PK_AspNetRoles | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AspNetRoles | RoleNameIndex | NONCLUSTERED | 1 | 0 | 0 | 0 | 1 | ([NormalizedName] IS NOT NULL) | 1 | 0 | NormalizedName |
| dbo | AspNetUserClaims | IX_AspNetUserClaims_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | AspNetUserClaims | PK_AspNetUserClaims | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AspNetUserLogins | IX_AspNetUserLogins_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | AspNetUserLogins | PK_AspNetUserLogins | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | LoginProvider |
| dbo | AspNetUserLogins | PK_AspNetUserLogins | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | ProviderKey |
| dbo | AspNetUserRoles | IX_AspNetUserRoles_RoleId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | RoleId |
| dbo | AspNetUserRoles | PK_AspNetUserRoles | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | AspNetUserRoles | PK_AspNetUserRoles | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | RoleId |
| dbo | AspNetUsers | EmailIndex | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | NormalizedEmail |
| dbo | AspNetUsers | IX_AspNetUsers_AgentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentId |
| dbo | AspNetUsers | IX_AspNetUsers_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AspNetUsers | IX_AspNetUsers_CustomerMarketerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerMarketerId |
| dbo | AspNetUsers | PK_AspNetUsers | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AspNetUsers | UserNameIndex | NONCLUSTERED | 1 | 0 | 0 | 0 | 1 | ([NormalizedUserName] IS NOT NULL) | 1 | 0 | NormalizedUserName |
| dbo | AspNetUserTokens | PK_AspNetUserTokens | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | AspNetUserTokens | PK_AspNetUserTokens | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | LoginProvider |
| dbo | AspNetUserTokens | PK_AspNetUserTokens | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 3 | 0 | Name |
| dbo | Assurance | IX_Assurance_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | Assurance | PK_Assurance | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | AuthorizationItem | IX_AuthorizationItem_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | AuthorizationItem | PK_AuthorizationItem | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Consultants | PK_Consultants | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Contacts | IX_Contacts_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Contacts | PK_Contacts | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | CustomerMarketerCommissions | IX_CustomerMarketerCommissions_MarketerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MarketerId |
| dbo | CustomerMarketerCommissions | IX_CustomerMarketerCommissions_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | CustomerMarketerCommissions | PK_CustomerMarketerCommissions | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | CustomerPurchasePlan | IX_CustomerPurchasePlan_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | CustomerPurchasePlan | IX_CustomerPurchasePlan_PurchaseId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | PurchaseId |
| dbo | CustomerPurchasePlan | PK_CustomerPurchasePlan | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Customers | PK_Customers | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Expenses | IX_Expenses_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Expenses | PK_Expenses | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | IceReport | IX_IceReport_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | IceReport | IX_IceReport_MemberId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MemberId |
| dbo | IceReport | PK_IceReport | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | IranValidityReport | IX_IranValidityReport_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | IranValidityReport | IX_IranValidityReport_MemberId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MemberId |
| dbo | IranValidityReport | PK_IranValidityReport | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | LoanAuthorizationItems | IX_LoanAuthorizationItems_AuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AuthorizationItemId |
| dbo | LoanAuthorizationItems | IX_LoanAuthorizationItems_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | LoanAuthorizationItems | IX_LoanAuthorizationItems_LoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | LoanAuthorizationItems | PK_LoanAuthorizationItems | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | LoanContacts | IX_LoanContacts_ContactId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ContactId |
| dbo | LoanContacts | IX_LoanContacts_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | LoanContacts | IX_LoanContacts_LoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | LoanContacts | PK_LoanContacts | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | LoanRequestStatuses | IX_LoanRequestStatuses_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | LoanRequestStatuses | IX_LoanRequestStatuses_SmsPatternId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | SmsPatternId |
| dbo | LoanRequestStatuses | PK_LoanRequestStatuses | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Loans | IX_Loans_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Loans | PK_Loans | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | MemberPurchases | IX_MemberPurchases_CreatorUserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CreatorUserId |
| dbo | MemberPurchases | IX_MemberPurchases_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | MemberPurchases | IX_MemberPurchases_UserLoanPaymentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanPaymentId |
| dbo | MemberPurchases | PK_MemberPurchases | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | OffDate | IX_OffDate_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | OffDate | PK_OffDate | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | OnlineMoneyTransfer | IX_OnlineMoneyTransfer_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | OnlineMoneyTransfer | IX_OnlineMoneyTransfer_TransactionId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | TransactionId |
| dbo | OnlineMoneyTransfer | PK_OnlineMoneyTransfer | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Purchases | IX_Purchases_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Purchases | IX_Purchases_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | Purchases | PK_Purchases | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | SmsPatterns | IX_SmsPatterns_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | SmsPatterns | PK_SmsPatterns | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | SubAgentTransactions | IX_SubAgentTransactions_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | SubAgentTransactions | IX_SubAgentTransactions_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | SubAgentTransactions | PK_SubAgentTransactions | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanContact | IX_UserLoanContact_ContactId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ContactId |
| dbo | UserLoanContact | IX_UserLoanContact_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | UserLoanContact | IX_UserLoanContact_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | UserLoanContact | IX_UserLoanContact_UserLoanId1 | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId1 |
| dbo | UserLoanContact | PK_UserLoanContact | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanPaymentRequests | IX_UserLoanPaymentRequests_AdminAcceptorId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AdminAcceptorId |
| dbo | UserLoanPaymentRequests | IX_UserLoanPaymentRequests_UserLoanPaymentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanPaymentId |
| dbo | UserLoanPaymentRequests | PK_UserLoanPaymentRequests | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanPayments | IX_UserLoanPayments_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | UserLoanPayments | PK_UserLoanPayments | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanRequestAuthorizationItemAttachments | IX_UserLoanRequestAuthorizationItemAttachments_UserLoanRequestAuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanRequestAuthorizationItemId |
| dbo | UserLoanRequestAuthorizationItemAttachments | PK_UserLoanRequestAuthorizationItemAttachments | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanRequestAuthorizationItems | IX_UserLoanRequestAuthorizationItems_AuthorizationItemId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AuthorizationItemId |
| dbo | UserLoanRequestAuthorizationItems | IX_UserLoanRequestAuthorizationItems_UserLoanRequestId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanRequestId |
| dbo | UserLoanRequestAuthorizationItems | PK_UserLoanRequestAuthorizationItems | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanRequests | IX_UserLoanRequests_AgentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentId |
| dbo | UserLoanRequests | IX_UserLoanRequests_AgentStatusId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentStatusId |
| dbo | UserLoanRequests | IX_UserLoanRequests_LoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | UserLoanRequests | IX_UserLoanRequests_StatusId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | StatusId |
| dbo | UserLoanRequests | IX_UserLoanRequests_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | UserLoanRequests | PK_UserLoanRequests | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanRequestStatusHistories | IX_UserLoanRequestStatusHistories_FromAgentStatusId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | FromAgentStatusId |
| dbo | UserLoanRequestStatusHistories | IX_UserLoanRequestStatusHistories_FromStatusId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | FromStatusId |
| dbo | UserLoanRequestStatusHistories | IX_UserLoanRequestStatusHistories_ToAgentStatusId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ToAgentStatusId |
| dbo | UserLoanRequestStatusHistories | IX_UserLoanRequestStatusHistories_ToStatusId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ToStatusId |
| dbo | UserLoanRequestStatusHistories | IX_UserLoanRequestStatusHistories_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | UserLoanRequestStatusHistories | IX_UserLoanRequestStatusHistories_UserLoanRequestId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanRequestId |
| dbo | UserLoanRequestStatusHistories | PK_UserLoanRequestStatusHistories | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoans | IX_UserLoans_AgentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentId |
| dbo | UserLoans | IX_UserLoans_CustomerPurchasePlanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerPurchasePlanId |
| dbo | UserLoans | IX_UserLoans_LoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LoanId |
| dbo | UserLoans | IX_UserLoans_SubAgentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | SubAgentId |
| dbo | UserLoans | IX_UserLoans_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| dbo | UserLoans | IX_UserLoans_UserLoanRequestId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanRequestId |
| dbo | UserLoans | PK_UserLoans | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserLoanSponsoreDueDate | IX_UserLoanSponsoreDueDate_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | UserLoanSponsoreDueDate | IX_UserLoanSponsoreDueDate_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | UserLoanSponsoreDueDate | IX_UserLoanSponsoreDueDate_UserLoanId1 | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId1 |
| dbo | UserLoanSponsoreDueDate | PK_UserLoanSponsoreDueDate | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | UserSavedMonies | IX_UserSavedMonies_MemberId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | MemberId |
| dbo | UserSavedMonies | PK_UserSavedMonies | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | VisitorLogs | PK_VisitorLogs | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| dbo | Withdraws | IX_Withdraws_AgentId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | AgentId |
| dbo | Withdraws | IX_Withdraws_ContactId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ContactId |
| dbo | Withdraws | IX_Withdraws_CustomerId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerId |
| dbo | Withdraws | IX_Withdraws_CustomerMarketerCommissionId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CustomerMarketerCommissionId |
| dbo | Withdraws | IX_Withdraws_SponsoredLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | SponsoredLoanId |
| dbo | Withdraws | IX_Withdraws_UserLoanContactId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanContactId |
| dbo | Withdraws | IX_Withdraws_UserLoanId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserLoanId |
| dbo | Withdraws | PK_Withdraws | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| HangFire | AggregatedCounter | IX_HangFire_AggregatedCounter_ExpireAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([ExpireAt] IS NOT NULL) | 1 | 0 | ExpireAt |
| HangFire | AggregatedCounter | PK_HangFire_CounterAggregated | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Key |
| HangFire | Counter | PK_HangFire_Counter | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Key |
| HangFire | Counter | PK_HangFire_Counter | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Id |
| HangFire | Hash | IX_HangFire_Hash_ExpireAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([ExpireAt] IS NOT NULL) | 1 | 0 | ExpireAt |
| HangFire | Hash | PK_HangFire_Hash | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Key |
| HangFire | Hash | PK_HangFire_Hash | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Field |
| HangFire | Job | IX_HangFire_Job_ExpireAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([ExpireAt] IS NOT NULL) | 0 | 1 | StateName |
| HangFire | Job | IX_HangFire_Job_ExpireAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([ExpireAt] IS NOT NULL) | 1 | 0 | ExpireAt |
| HangFire | Job | IX_HangFire_Job_StateName | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([StateName] IS NOT NULL) | 1 | 0 | StateName |
| HangFire | Job | PK_HangFire_Job | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| HangFire | JobParameter | PK_HangFire_JobParameter | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | JobId |
| HangFire | JobParameter | PK_HangFire_JobParameter | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Name |
| HangFire | JobQueue | PK_HangFire_JobQueue | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Queue |
| HangFire | JobQueue | PK_HangFire_JobQueue | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Id |
| HangFire | List | IX_HangFire_List_ExpireAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([ExpireAt] IS NOT NULL) | 1 | 0 | ExpireAt |
| HangFire | List | PK_HangFire_List | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Key |
| HangFire | List | PK_HangFire_List | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Id |
| HangFire | Schema | PK_HangFire_Schema | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Version |
| HangFire | Server | IX_HangFire_Server_LastHeartbeat | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | LastHeartbeat |
| HangFire | Server | PK_HangFire_Server | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| HangFire | Set | IX_HangFire_Set_ExpireAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 1 | ([ExpireAt] IS NOT NULL) | 1 | 0 | ExpireAt |
| HangFire | Set | IX_HangFire_Set_Score | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | Key |
| HangFire | Set | IX_HangFire_Set_Score | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 2 | 0 | Score |
| HangFire | Set | PK_HangFire_Set | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Key |
| HangFire | Set | PK_HangFire_Set | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Value |
| HangFire | State | IX_HangFire_State_CreatedAt | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | CreatedAt |
| HangFire | State | PK_HangFire_State | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | JobId |
| HangFire | State | PK_HangFire_State | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | Id |

### سایر اشیا

**View/Procedure/Function/Trigger:** _موردی ثبت نشده است._

**Check constraints:** _موردی ثبت نشده است._

**Sequences/User types:** _موردی ثبت نشده است._

**Database triggers:** _موردی ثبت نشده است._

## انتقال وجه

- دیتابیس: `vamcityc_transferDb_import_20261028`
- جدول‌ها: **12**
- ستون‌ها: **78**
- رکوردها: **29**
- قیود PK/Unique: **12** نام قید، 16 ستون کلید
- قیود FK: **8** نام قید، 8 ستون رابطه
- ایندکس‌ها: **22** نام ایندکس، 26 ردیف ستون ایندکس
- View/Procedure/Function/Trigger: **0**
- Check constraints: **0**
- Sequences/User types: **0**
- Database triggers: **0**

### جدول‌ها و تعداد رکورد

| Schema | Table | Rows |
| --- | --- | --- |
| OnlineMoneyTransfer | __EFMigrationsHistory | 1 |
| OnlineMoneyTransfer | AspNetRoleClaims | 0 |
| OnlineMoneyTransfer | AspNetRoles | 1 |
| OnlineMoneyTransfer | AspNetUserClaims | 0 |
| OnlineMoneyTransfer | AspNetUserLogins | 0 |
| OnlineMoneyTransfer | AspNetUserRoles | 1 |
| OnlineMoneyTransfer | AspNetUsers | 1 |
| OnlineMoneyTransfer | AspNetUserTokens | 0 |
| OnlineMoneyTransfer | Client | 1 |
| OnlineMoneyTransfer | RefreshToken | 1 |
| OnlineMoneyTransfer | Settings | 0 |
| OnlineMoneyTransfer | Transfer | 23 |

### تمام ستون‌ها

| Schema | Table | Ord | Column | SQL type | Max length | Precision | Scale | Nullable | Identity | Computed | Default | Computed expression |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OnlineMoneyTransfer | __EFMigrationsHistory | 1 | MigrationId | nvarchar | 150 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | __EFMigrationsHistory | 2 | ProductVersion | nvarchar | 32 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetRoleClaims | 1 | Id | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetRoleClaims | 2 | RoleId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetRoleClaims | 3 | ClaimType | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetRoleClaims | 4 | ClaimValue | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetRoles | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetRoles | 2 | DisplayName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetRoles | 3 | IsSystem | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetRoles | 4 | Name | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetRoles | 5 | NormalizedName | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetRoles | 6 | ConcurrencyStamp | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserClaims | 1 | Id | int | 4 | 10 | 0 | 0 | 1 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserClaims | 2 | UserId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserClaims | 3 | ClaimType | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserClaims | 4 | ClaimValue | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserLogins | 1 | LoginProvider | nvarchar | 450 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserLogins | 2 | ProviderKey | nvarchar | 450 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserLogins | 3 | ProviderDisplayName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserLogins | 4 | UserId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserRoles | 1 | UserId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserRoles | 2 | RoleId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 2 | FirstName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 3 | LastName | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 4 | IsActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 5 | ImageFileName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 6 | NationalCode | nvarchar | 10 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 7 | UserName | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 8 | NormalizedUserName | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 9 | Email | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 10 | NormalizedEmail | nvarchar | 256 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 11 | EmailConfirmed | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 12 | PasswordHash | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 13 | SecurityStamp | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 14 | ConcurrencyStamp | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 15 | PhoneNumber | nvarchar | 20 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 16 | PhoneNumberConfirmed | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 17 | TwoFactorEnabled | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 18 | LockoutEnd | datetimeoffset | 10 | 34 | 7 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 19 | LockoutEnabled | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUsers | 20 | AccessFailedCount | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserTokens | 1 | UserId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserTokens | 2 | LoginProvider | nvarchar | 450 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserTokens | 3 | Name | nvarchar | 450 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | AspNetUserTokens | 4 | Value | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Client | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Client | 2 | Name | nvarchar | 100 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Client | 3 | ValidIps | nvarchar | 200 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Client | 4 | ValidMobile | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Client | 5 | UserName | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Client | 6 | PasswordHash | nvarchar | 500 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Client | 7 | IsActive | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | RefreshToken | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | RefreshToken | 2 | UserId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | RefreshToken | 3 | Token | nvarchar | 450 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | RefreshToken | 4 | Expires | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | RefreshToken | 5 | Created | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | RefreshToken | 6 | Revoked | datetime2 | 8 | 27 | 7 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Settings | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Settings | 2 | Key | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Settings | 3 | Value | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Settings | 4 | ApplicationType | int | 4 | 10 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 1 | Id | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 2 | Amount | decimal | 9 | 18 | 2 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 3 | CreateDate | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 4 | From | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 5 | To | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 6 | ToName | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 7 | OTP | nvarchar | 10 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 8 | OTPGenerateDateTime | datetime2 | 8 | 27 | 7 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 9 | TransferStep | int | 4 | 10 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 10 | ClientTraceNumber | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 11 | Cif | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 12 | IsSuccess | bit | 1 | 1 | 0 | 0 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 13 | EFardaJson | nvarchar | -1 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 14 | RequestFromIp | nvarchar | 50 | 0 | 0 | 1 | 0 | 0 | NULL | NULL |
| OnlineMoneyTransfer | Transfer | 15 | ClientId | uniqueidentifier | 16 | 0 | 0 | 0 | 0 | 0 | NULL | NULL |

### کلیدهای اصلی و یکتا

| Schema | Table | Constraint | Type | Column | Ordinal |
| --- | --- | --- | --- | --- | --- |
| OnlineMoneyTransfer | __EFMigrationsHistory | PK___EFMigrationsHistory | PRIMARY_KEY_CONSTRAINT | MigrationId | 1 |
| OnlineMoneyTransfer | AspNetRoleClaims | PK_AspNetRoleClaims | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| OnlineMoneyTransfer | AspNetRoles | PK_AspNetRoles | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| OnlineMoneyTransfer | AspNetUserClaims | PK_AspNetUserClaims | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| OnlineMoneyTransfer | AspNetUserLogins | PK_AspNetUserLogins | PRIMARY_KEY_CONSTRAINT | LoginProvider | 1 |
| OnlineMoneyTransfer | AspNetUserLogins | PK_AspNetUserLogins | PRIMARY_KEY_CONSTRAINT | ProviderKey | 2 |
| OnlineMoneyTransfer | AspNetUserRoles | PK_AspNetUserRoles | PRIMARY_KEY_CONSTRAINT | UserId | 1 |
| OnlineMoneyTransfer | AspNetUserRoles | PK_AspNetUserRoles | PRIMARY_KEY_CONSTRAINT | RoleId | 2 |
| OnlineMoneyTransfer | AspNetUsers | PK_AspNetUsers | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| OnlineMoneyTransfer | AspNetUserTokens | PK_AspNetUserTokens | PRIMARY_KEY_CONSTRAINT | UserId | 1 |
| OnlineMoneyTransfer | AspNetUserTokens | PK_AspNetUserTokens | PRIMARY_KEY_CONSTRAINT | LoginProvider | 2 |
| OnlineMoneyTransfer | AspNetUserTokens | PK_AspNetUserTokens | PRIMARY_KEY_CONSTRAINT | Name | 3 |
| OnlineMoneyTransfer | Client | PK_Client | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| OnlineMoneyTransfer | RefreshToken | PK_RefreshToken | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| OnlineMoneyTransfer | Settings | PK_Settings | PRIMARY_KEY_CONSTRAINT | Id | 1 |
| OnlineMoneyTransfer | Transfer | PK_Transfer | PRIMARY_KEY_CONSTRAINT | Id | 1 |

### کلیدهای خارجی

| Parent schema | Parent table | FK | Parent column | Referenced schema | Referenced table | Referenced column | Ordinal | On delete | On update | Disabled | Untrusted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OnlineMoneyTransfer | AspNetRoleClaims | FK_AspNetRoleClaims_AspNetRoles_RoleId | RoleId | OnlineMoneyTransfer | AspNetRoles | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| OnlineMoneyTransfer | AspNetUserClaims | FK_AspNetUserClaims_AspNetUsers_UserId | UserId | OnlineMoneyTransfer | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| OnlineMoneyTransfer | AspNetUserLogins | FK_AspNetUserLogins_AspNetUsers_UserId | UserId | OnlineMoneyTransfer | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| OnlineMoneyTransfer | AspNetUserRoles | FK_AspNetUserRoles_AspNetRoles_RoleId | RoleId | OnlineMoneyTransfer | AspNetRoles | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| OnlineMoneyTransfer | AspNetUserRoles | FK_AspNetUserRoles_AspNetUsers_UserId | UserId | OnlineMoneyTransfer | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| OnlineMoneyTransfer | AspNetUserTokens | FK_AspNetUserTokens_AspNetUsers_UserId | UserId | OnlineMoneyTransfer | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| OnlineMoneyTransfer | RefreshToken | FK_RefreshToken_AspNetUsers_UserId | UserId | OnlineMoneyTransfer | AspNetUsers | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |
| OnlineMoneyTransfer | Transfer | FK_Transfer_Client_ClientId | ClientId | OnlineMoneyTransfer | Client | Id | 1 | CASCADE | NO_ACTION | 0 | 0 |

### ایندکس‌ها

| Schema | Table | Index | Type | Unique | PK | Unique constraint | Disabled | Filtered | Filter | Key ordinal | Included | Column |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OnlineMoneyTransfer | __EFMigrationsHistory | PK___EFMigrationsHistory | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | MigrationId |
| OnlineMoneyTransfer | AspNetRoleClaims | IX_AspNetRoleClaims_RoleId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | RoleId |
| OnlineMoneyTransfer | AspNetRoleClaims | PK_AspNetRoleClaims | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| OnlineMoneyTransfer | AspNetRoles | PK_AspNetRoles | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| OnlineMoneyTransfer | AspNetRoles | RoleNameIndex | NONCLUSTERED | 1 | 0 | 0 | 0 | 1 | ([NormalizedName] IS NOT NULL) | 1 | 0 | NormalizedName |
| OnlineMoneyTransfer | AspNetUserClaims | IX_AspNetUserClaims_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| OnlineMoneyTransfer | AspNetUserClaims | PK_AspNetUserClaims | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| OnlineMoneyTransfer | AspNetUserLogins | IX_AspNetUserLogins_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| OnlineMoneyTransfer | AspNetUserLogins | PK_AspNetUserLogins | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | LoginProvider |
| OnlineMoneyTransfer | AspNetUserLogins | PK_AspNetUserLogins | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | ProviderKey |
| OnlineMoneyTransfer | AspNetUserRoles | IX_AspNetUserRoles_RoleId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | RoleId |
| OnlineMoneyTransfer | AspNetUserRoles | PK_AspNetUserRoles | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| OnlineMoneyTransfer | AspNetUserRoles | PK_AspNetUserRoles | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | RoleId |
| OnlineMoneyTransfer | AspNetUsers | EmailIndex | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | NormalizedEmail |
| OnlineMoneyTransfer | AspNetUsers | PK_AspNetUsers | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| OnlineMoneyTransfer | AspNetUsers | UserNameIndex | NONCLUSTERED | 1 | 0 | 0 | 0 | 1 | ([NormalizedUserName] IS NOT NULL) | 1 | 0 | NormalizedUserName |
| OnlineMoneyTransfer | AspNetUserTokens | PK_AspNetUserTokens | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| OnlineMoneyTransfer | AspNetUserTokens | PK_AspNetUserTokens | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 2 | 0 | LoginProvider |
| OnlineMoneyTransfer | AspNetUserTokens | PK_AspNetUserTokens | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 3 | 0 | Name |
| OnlineMoneyTransfer | Client | PK_Client | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| OnlineMoneyTransfer | RefreshToken | IX_RefreshToken_Token | NONCLUSTERED | 1 | 0 | 0 | 0 | 1 | ([Token] IS NOT NULL) | 1 | 0 | Token |
| OnlineMoneyTransfer | RefreshToken | IX_RefreshToken_UserId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | UserId |
| OnlineMoneyTransfer | RefreshToken | PK_RefreshToken | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| OnlineMoneyTransfer | Settings | PK_Settings | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |
| OnlineMoneyTransfer | Transfer | IX_Transfer_ClientId | NONCLUSTERED | 0 | 0 | 0 | 0 | 0 | NULL | 1 | 0 | ClientId |
| OnlineMoneyTransfer | Transfer | PK_Transfer | CLUSTERED | 1 | 1 | 0 | 0 | 0 | NULL | 1 | 0 | Id |

### سایر اشیا

**View/Procedure/Function/Trigger:** _موردی ثبت نشده است._

**Check constraints:** _موردی ثبت نشده است._

**Sequences/User types:** _موردی ثبت نشده است._

**Database triggers:** _موردی ثبت نشده است._

## ملاحظات مهاجرت

- فایل بکاپ قدیمی `vamcityc_aqayevamdb_2026-10-11_15-51-44.zip` در مسیر قبلی Roofixo موجود نبود؛ جست‌وجوی `/home` سه بکاپ جدیدتر را در مسیر `digebail.ir` یافت.
- دیتابیس آزمایشی `vamcity_stage` با ۸۸ جدول و ۱٬۶۹۱ رکورد با بکاپ اصلی یکسان نیست و مبنای مهاجرت نیست.
- در مقایسه، اختلاف‌هایی بین دیتابیس آزمایشی و بکاپ اصلی در ستون‌های `Assurances`, `AgentLoans`, `UserLoanPayments`, `UserLoanRequests`, `AppSettings` و `MemberPurchases` ثبت شده است.
- مجموع سه منبع: **156 جدول، 1,608 ستون و 817,798 رکورد**.
- فایل‌های ساختار MySQL در `database/mysql/schema.sql` و سه فایل تفکیک‌شده ساخته شده‌اند. ساختار هر سه فایل و بسته یکپارچه روی MariaDB 10.6 آزمایش و با موفقیت نصب شد.
- فایل `database/migration/migrate.php` انتقال جریانی و قابل‌ادامه را انجام می‌دهد؛ ابتدا `--dry-run` و پس از تنظیم دسترسی مقصد `--execute`. اجرای آزمایشی فقط متادیتا را خواند و هیچ نوشتنی در MariaDB انجام نداد.
- برای حفظ دقت زمان، ستون‌های `datetime2`، `datetime` و `time(7)` علاوه بر مقدار قابل‌استفاده در MariaDB، مقدار دقیق اصلی را در ستون کمکی `__raw_...` نگه می‌دارند. مقادیر سال کمتر از 1000 در ستون زمانی قابل‌استفاده به NULL تبدیل می‌شوند و متن دقیق آن‌ها در ستون کمکی حفظ می‌شود.
- ایندکس‌های فیلترشده SQL Server به ایندکس عادی تبدیل شده‌اند؛ برای ایندکس‌های دارای INCLUDE، ایندکس پوششی جداگانه ساخته شده است. رفتار فیلترها و INCLUDE در MariaDB عیناً معادل SQL Server نیست و در مستند مهاجرت توضیح داده می‌شود.
- هر سه منبع SQL Server از collation برابر `SQL_Latin1_General_CP1_CI_AS` استفاده می‌کنند. سرور مقصد MariaDB 10.6.17 است و collation متناظرِ case-insensitive/accent-sensitive از خانواده `utf8mb4_*_as_ci` در آن موجود نیست. ساختار فعلی از `utf8mb4_unicode_ci` استفاده می‌کند؛ بنابراین مقایسه متنی accent-insensitive است و عین رفتار collation منبع تضمین نشده است. برای نزدیک‌تر شدن به رفتار مبدأ می‌توان MySQL 8 با `utf8mb4_0900_as_ci` یا منطق مقایسه سفارشی را بررسی کرد.
- داده‌های واقعی کاربران، احراز هویت، درخواست و پرداخت در مخزن عمومی GitHub قرار نمی‌گیرند. انتقال داده مستقیماً از SQL Server به MariaDB انجام می‌شود و فایل داده عمومی ساخته نمی‌شود.
- اندازه فایل‌های دیتابیس مبدأ در SQL Server حدود **559.94MB + 218.69MB + 80MB** است. فضای آزاد سرور در آخرین بررسی **2.1GB** و مصرف دیسک **98%** بود؛ پیش از ورود داده باید فضای آزاد بیشتری تأمین شود تا سرویس در میانه انتقال با کمبود دیسک مواجه نشود.
- هنوز هیچ داده‌ای به پایگاه مقصد منتقل نشده است. کاربر SSH استقرار دسترسی مدیریتی MariaDB ندارد؛ برای اجرای واقعی باید سه پایگاه مقصد در DirectAdmin/cPanel ساخته و یک کاربر MySQL با دسترسی کامل به هر سه پایگاه معرفی شود. نام‌ها در فایل پیکربندی قابل تغییرند.
