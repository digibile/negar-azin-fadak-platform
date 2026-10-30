-- Source: vamcityc_bluvamdb_import_20261028
-- Target database: vamcitydigibilepay_bluvamdb (create/select before import)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `__EFMigrationsHistory` (
  `MigrationId` VARCHAR(75) NOT NULL,
  `ProductVersion` VARCHAR(16) NOT NULL,
  PRIMARY KEY (`MigrationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AffiliateCommissions` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Amount` INT NOT NULL,
  `PaidToUser` INT NOT NULL,
  `Date` DATETIME(6) NULL,
  `__raw_Date` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Description` VARCHAR(250) NULL,
  `UserId` BIGINT NOT NULL,
  `PurchaseId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AgentLoanAuthorizationItem` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `AuthorizationItemId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `LoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AgentLoans` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `AgentId` BIGINT NOT NULL,
  `LoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Percent` DECIMAL(18,2) NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `DefaultCheckoutDays` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `ContactId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `ContactPercent` DECIMAL(18,2) NOT NULL,
  `ProductCheckoutDays` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `ProductPercent` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AppSettings` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '2a18f1fc-57fe-482c-8003-b6ba13b12996',
  `IsOnlinePaymentActive` TINYINT(1) NOT NULL DEFAULT 0,
  `OnlinePaymentGateway` INT NOT NULL DEFAULT 0,
  `Shaba` VARCHAR(25) NULL,
  `ZarinpalMerchantCode` VARCHAR(100) NULL,
  `DueDateRememberSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `DueDatedRememberSmsTime` TIME(6) NULL,
  `__raw_DueDatedRememberSmsTime` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  `SmsCredit` INT NOT NULL DEFAULT 0,
  `ThanksPaymentSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `AppendToWhichInstallment` INT NOT NULL DEFAULT 0,
  `RoundCountNumber` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `OverDueDateSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `OverDueDaysCount` INT NOT NULL DEFAULT 0,
  `SepTerminalId` LONGTEXT NULL,
  `DashboardSettingsJson` LONGTEXT NULL,
  `BeforeDueDaysCount` INT NOT NULL DEFAULT 0,
  `IsDueDateSmsActive` TINYINT(1) NOT NULL DEFAULT 0,
  `IsRememberSmsActive` TINYINT(1) NOT NULL DEFAULT 0,
  `OverDueDayRemeberOnce` TINYINT(1) NOT NULL DEFAULT 0,
  `BeforeDueDateSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `DefaultSmsPanel` INT NOT NULL DEFAULT 0,
  `MelliPayamakConfigJson` LONGTEXT NULL,
  `KaveNegarConfigJson` LONGTEXT NULL,
  `BankInfo` VARCHAR(500) NULL,
  `IceConfigJson` VARCHAR(500) NULL,
  `NextPayApiKey` LONGTEXT NULL,
  `BankAccountsJson` LONGTEXT NULL,
  `IPGParsianLoginAccount` VARCHAR(100) NULL,
  `Address` VARCHAR(250) NULL,
  `Email` LONGTEXT NULL,
  `Phones` VARCHAR(100) NULL,
  `ThemeSettingsJson` VARCHAR(500) NULL,
  `DepositChargeDueDateStatuses` VARCHAR(500) NULL,
  `SponsoreDueDateStatuses` LONGTEXT NULL,
  `LoginSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `RegisterSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `IranValidityConfigJson` LONGTEXT NULL,
  `ApplicationLink` VARCHAR(125) NULL,
  `BusinessTitle` VARCHAR(125) NULL,
  `EnamadLink` VARCHAR(125) NULL,
  `EtehadieLink` VARCHAR(125) NULL,
  `InstagramLink` VARCHAR(125) NULL,
  `RubikaLink` VARCHAR(125) NULL,
  `SamandehiLink` VARCHAR(125) NULL,
  `TelegramLink` VARCHAR(125) NULL,
  `WhatsappLink` VARCHAR(125) NULL,
  `ShopLink` VARCHAR(250) NULL,
  `RegisterOtpSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `AnjomanSenfiLink` VARCHAR(125) NULL,
  `AparatLink` VARCHAR(125) NULL,
  `ShopTitle` VARCHAR(125) NULL,
  `FinnoTechConfigJson` LONGTEXT NULL,
  `KasboKarhayeInternetiTehranLink` VARCHAR(125) NULL,
  `BankGatewayRouterBaseUrl` LONGTEXT NULL,
  `ApiKey` LONGTEXT NULL,
  `ApiPassword` VARCHAR(25) NULL,
  `SadadMerchantId` LONGTEXT NULL,
  `SadadTerminalId` LONGTEXT NULL,
  `SadadMerchantKey` LONGTEXT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AppSms` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Date` DATETIME(6) NULL,
  `__raw_Date` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Text` TEXT NULL,
  `Price` DECIMAL(18,2) NOT NULL,
  `AppSmsType` INT NOT NULL,
  `To` VARCHAR(25) NULL,
  `Status` INT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `EntityId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `EntityType` VARCHAR(25) NULL,
  `SmsPatternTitle` VARCHAR(50) NULL,
  `SmsPanel` INT NOT NULL DEFAULT 0,
  `DeliverCheckRetryCount` INT NOT NULL DEFAULT 0,
  `SMSKey` LONGTEXT NULL,
  `Tag` VARCHAR(50) NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AspNetRoleClaims` (
  `Id` INT NOT NULL AUTO_INCREMENT,
  `RoleId` BIGINT NOT NULL,
  `ClaimType` LONGTEXT NULL,
  `ClaimValue` LONGTEXT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AspNetRoles` (
  `Id` BIGINT NOT NULL AUTO_INCREMENT,
  `Name` VARCHAR(128) NULL,
  `NormalizedName` VARCHAR(128) NULL,
  `ConcurrencyStamp` LONGTEXT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `RoleNameIndex` (`NormalizedName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AspNetUserClaims` (
  `Id` INT NOT NULL AUTO_INCREMENT,
  `UserId` BIGINT NOT NULL,
  `ClaimType` LONGTEXT NULL,
  `ClaimValue` LONGTEXT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AspNetUserLogins` (
  `LoginProvider` VARCHAR(225) NOT NULL,
  `ProviderKey` VARCHAR(225) NOT NULL,
  `ProviderDisplayName` LONGTEXT NULL,
  `UserId` BIGINT NOT NULL,
  PRIMARY KEY (`LoginProvider`, `ProviderKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AspNetUserRoles` (
  `UserId` BIGINT NOT NULL,
  `RoleId` BIGINT NOT NULL,
  PRIMARY KEY (`UserId`, `RoleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AspNetUsers` (
  `Id` BIGINT NOT NULL AUTO_INCREMENT,
  `FirstName` LONGTEXT NULL,
  `LastName` LONGTEXT NULL,
  `Gender` TINYINT(1) NOT NULL,
  `Address` LONGTEXT NULL,
  `Mobile` LONGTEXT NULL,
  `LastLoginDate` DATETIME(6) NULL,
  `__raw_LastLoginDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `IsActive` TINYINT(1) NOT NULL,
  `NationalCode` LONGTEXT NULL,
  `TotalSavedMoney` DECIMAL(18,2) NOT NULL,
  `ViewCount` INT NOT NULL,
  `UserName` VARCHAR(128) NULL,
  `NormalizedUserName` VARCHAR(128) NULL,
  `Email` VARCHAR(128) NULL,
  `NormalizedEmail` VARCHAR(128) NULL,
  `EmailConfirmed` TINYINT(1) NOT NULL,
  `PasswordHash` LONGTEXT NULL,
  `SecurityStamp` LONGTEXT NULL,
  `ConcurrencyStamp` LONGTEXT NULL,
  `PhoneNumber` LONGTEXT NULL,
  `PhoneNumberConfirmed` TINYINT(1) NOT NULL,
  `TwoFactorEnabled` TINYINT(1) NOT NULL,
  `LockoutEnd` VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `LockoutEnabled` TINYINT(1) NOT NULL,
  `AccessFailedCount` INT NOT NULL,
  `RegDate` DATETIME(6) NULL,
  `__raw_RegDate` VARCHAR(40) NOT NULL DEFAULT '0001-01-01T00:00:00.0000000' COMMENT 'Exact original SQL Server temporal value',
  `LastLoginDate2` DATETIME(6) NULL,
  `__raw_LastLoginDate2` VARCHAR(40) NOT NULL DEFAULT '0001-01-01T00:00:00.0000000' COMMENT 'Exact original SQL Server temporal value',
  `RegDate2` DATETIME(6) NULL,
  `__raw_RegDate2` VARCHAR(40) NOT NULL DEFAULT '0001-01-01T00:00:00.0000000' COMMENT 'Exact original SQL Server temporal value',
  `Familiar1FirstName` LONGTEXT NULL,
  `Familiar1LastName` LONGTEXT NULL,
  `Familiar1Mobile` LONGTEXT NULL,
  `Familiar2FirstName` LONGTEXT NULL,
  `Familiar2LastName` LONGTEXT NULL,
  `Familiar2Mobile` LONGTEXT NULL,
  `FatherName` LONGTEXT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `AffiliateCode` LONGTEXT NULL,
  `CommissionPercent` INT NOT NULL DEFAULT 0,
  `Phone` VARCHAR(10) NULL,
  `MobileVerified` TINYINT(1) NOT NULL DEFAULT 0,
  `Otp` INT NOT NULL DEFAULT 0,
  `RegistrationCompleted` TINYINT(1) NOT NULL DEFAULT 0,
  `Credit` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `BusinessName` VARCHAR(25) NULL,
  `AgentId` BIGINT NULL,
  `BankAccountsJson` LONGTEXT NULL,
  `CustomerMarketerId` BIGINT NULL,
  `PostalCode` VARCHAR(10) NULL,
  `Shenasname` VARCHAR(10) NULL,
  `City` VARCHAR(25) NULL,
  `SmsActiveForMembers` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `UserNameIndex` (`NormalizedUserName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AspNetUserTokens` (
  `UserId` BIGINT NOT NULL,
  `LoginProvider` VARCHAR(225) NOT NULL,
  `Name` VARCHAR(225) NOT NULL,
  `Value` LONGTEXT NULL,
  PRIMARY KEY (`UserId`, `LoginProvider`, `Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Assurance` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Description` TEXT NULL,
  `FileName` VARCHAR(100) NULL,
  `FileSize` BIGINT NOT NULL,
  `FileType` VARCHAR(10) NULL,
  `UserLoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AuthorizationItem` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Title` VARCHAR(50) NULL,
  `Description` VARCHAR(500) NULL,
  `SystemType` INT NOT NULL,
  `UseIfAlreadyExist` TINYINT(1) NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Consultants` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Name` VARCHAR(50) NULL,
  `Phone` VARCHAR(10) NULL,
  `Description` VARCHAR(500) NULL,
  `IsSeen` TINYINT(1) NOT NULL,
  `CallResult` VARCHAR(500) NULL,
  `SaveDate` DATETIME(6) NULL,
  `__raw_SaveDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Contacts` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `FullName` VARCHAR(50) NULL,
  `BusinessName` VARCHAR(50) NULL,
  `Phone` VARCHAR(25) NULL,
  `Address` VARCHAR(125) NULL,
  `BankInfo` LONGTEXT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `CustomerMarketerCommissions` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `Date` DATETIME(6) NULL,
  `__raw_Date` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Description` VARCHAR(250) NULL,
  `MarketerId` BIGINT NOT NULL,
  `UserLoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `CustomerPurchasePlan` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `StartDate` DATETIME(6) NULL,
  `__raw_StartDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `EndDate` DATETIME(6) NULL,
  `__raw_EndDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `MaxLoanCount` INT NOT NULL,
  `RemainLoanCount` INT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `PurchaseId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Customers` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Name` LONGTEXT NULL,
  `Mobile` LONGTEXT NULL,
  `Email` LONGTEXT NULL,
  `FirstLoginDone` TINYINT(1) NOT NULL,
  `InitPassword` LONGTEXT NULL,
  `RegDate` DATETIME(6) NULL,
  `__raw_RegDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `ExpireDate` DATETIME(6) NULL,
  `__raw_ExpireDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Permanent` TINYINT(1) NOT NULL DEFAULT 0,
  `Purchased` TINYINT(1) NOT NULL DEFAULT 0,
  `Code` INT NOT NULL AUTO_INCREMENT,
  `AffCode` VARCHAR(10) NULL,
  `ParkDomain` VARCHAR(50) NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_auto_Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Expenses` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `SavedBy` LONGTEXT NULL,
  `Title` LONGTEXT NULL,
  `Comment` LONGTEXT NULL,
  `CostDate` DATETIME(6) NULL,
  `__raw_CostDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `SaveDate` DATETIME(6) NULL,
  `__raw_SaveDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '2a18f1fc-57fe-482c-8003-b6ba13b12996',
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `IceReport` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Date` DATETIME(6) NULL,
  `__raw_Date` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Result` VARCHAR(10) NULL,
  `Price` DECIMAL(18,2) NOT NULL,
  `Url` VARCHAR(250) NULL,
  `ReportID` VARCHAR(25) NULL,
  `Status` VARCHAR(50) NULL,
  `IceReportJson` VARCHAR(500) NULL,
  `Errors` VARCHAR(100) NULL,
  `MemberId` BIGINT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `AttachmentFileName` VARCHAR(100) NULL,
  `ReportPdfFileName` VARCHAR(100) NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `IranValidityReport` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Date` DATETIME(6) NULL,
  `__raw_Date` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Result` VARCHAR(10) NULL,
  `Price` DECIMAL(18,2) NOT NULL,
  `Url` VARCHAR(250) NULL,
  `ReportPdfFileName` VARCHAR(100) NULL,
  `AttachmentFileName` VARCHAR(100) NULL,
  `ReportID` VARCHAR(100) NULL,
  `Status` INT NOT NULL,
  `IranValidityReportJson` VARCHAR(500) NULL,
  `Messages` VARCHAR(100) NULL,
  `MemberId` BIGINT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `GradeNumber` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `LoanAuthorizationItems` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `LoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `AuthorizationItemId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `IsPrimary` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `LoanContacts` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ContactId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `LoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Share` DECIMAL(18,2) NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `LoanRequestStatuses` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Title` VARCHAR(25) NOT NULL,
  `StepCategory` INT NOT NULL,
  `Changable` TINYINT(1) NOT NULL,
  `Order` INT NOT NULL,
  `SmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `SystemRequestStatus` INT NULL,
  `StatusGroup` INT NOT NULL DEFAULT 0,
  `SystemAgentRequestStatus` INT NULL,
  `AllowNewRequest` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Loans` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Title` VARCHAR(50) NULL,
  `Code` INT NOT NULL DEFAULT 0,
  `DelayPercent` DOUBLE NOT NULL DEFAULT 0.0000000000000000e+000,
  `EarlyPercent` DOUBLE NOT NULL DEFAULT 0.0000000000000000e+000,
  `ProfitPercent` DOUBLE NOT NULL DEFAULT 0.0000000000000000e+000,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '2a18f1fc-57fe-482c-8003-b6ba13b12996',
  `IsSponsored` TINYINT(1) NOT NULL DEFAULT 0,
  `IsSmsActive` TINYINT(1) NOT NULL DEFAULT 0,
  `FileName` VARCHAR(50) NULL,
  `IncludePlan` TINYINT(1) NOT NULL DEFAULT 0,
  `PlanHtml` LONGTEXT NULL,
  `PlanShortDescription` VARCHAR(500) NULL,
  `PlanTitle` VARCHAR(50) NULL,
  `MaxAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `MaxMonthGap` INT NOT NULL DEFAULT 0,
  `AllowedInstallments` LONGTEXT NULL,
  `CostsJson` LONGTEXT NULL,
  `Disable` TINYINT(1) NOT NULL DEFAULT 0,
  `DisableText` VARCHAR(50) NULL,
  `HasSponsore` TINYINT(1) NOT NULL DEFAULT 0,
  `DefaultSponsoreCheckoutDays` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `MemberPurchases` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `PaymentStep` INT NOT NULL,
  `OnlinePaymentGateway` INT NOT NULL,
  `UserId` BIGINT NOT NULL,
  `UserLoanPaymentId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `StartDate` DATETIME(6) NULL,
  `__raw_StartDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Description` VARCHAR(100) NULL,
  `IsPaymentSuccess` TINYINT(1) NOT NULL,
  `SepJson` LONGTEXT NULL,
  `ZarinPalJson` LONGTEXT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `MemberPurchaseType` INT NOT NULL DEFAULT 0,
  `NextPayJson` LONGTEXT NULL,
  `Code` INT NOT NULL AUTO_INCREMENT,
  `IPGParsianJson` LONGTEXT NULL,
  `CreatorUserId` BIGINT NULL,
  `SadadJson` LONGTEXT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_auto_Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OffDate` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Date` DATETIME(6) NULL,
  `__raw_Date` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Title` VARCHAR(50) NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OnlineMoneyTransfer` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `SaveDate` DATETIME(6) NULL,
  `__raw_SaveDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `OnlineMoneyTransferStep` INT NOT NULL,
  `From` VARCHAR(25) NULL,
  `To` VARCHAR(25) NULL,
  `OTP` VARCHAR(5) NULL,
  `OTPGenerateDateTime` DATETIME(6) NULL,
  `__raw_OTPGenerateDateTime` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `OurTraceNumber` VARCHAR(25) NULL,
  `Cif` VARCHAR(25) NULL,
  `IsSuccess` TINYINT(1) NOT NULL,
  `EFardaJson` LONGTEXT NULL,
  `TransactionId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `OnlineMoneyTransferPanelId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `ToName` LONGTEXT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Purchases` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ProductType` INT NOT NULL,
  `PaymentStep` INT NOT NULL,
  `PaymentMethod` INT NOT NULL,
  `UserId` BIGINT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `StartDate` DATETIME(6) NULL,
  `__raw_StartDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Description` VARCHAR(100) NULL,
  `ZarinPalAuthority` VARCHAR(25) NULL,
  `ZarinPalStatus` INT NOT NULL,
  `IsPaymentSuccess` TINYINT(1) NOT NULL,
  `AffCode` VARCHAR(10) NULL,
  `LoanCount` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `SmsPatterns` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Title` VARCHAR(100) NULL,
  `Pattern` LONGTEXT NULL,
  `IsSystem` TINYINT(1) NOT NULL,
  `Status` INT NOT NULL,
  `RejectReason` LONGTEXT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `IsPatternBase` TINYINT(1) NOT NULL DEFAULT 0,
  `PatternBaseCode` VARCHAR(10) NULL,
  `SmsPatternPanel` INT NOT NULL DEFAULT 0,
  `Category` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `SubAgentTransactions` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `SaveDate` DATETIME(6) NULL,
  `__raw_SaveDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `PaymentMethod` INT NOT NULL,
  `IsWithdraw` TINYINT(1) NOT NULL,
  `Description` VARCHAR(250) NULL,
  `SavedBy` VARCHAR(50) NULL,
  `FileName` VARCHAR(25) NULL,
  `UserLoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserLoanContact` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserLoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ContactId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Share` DECIMAL(18,2) NOT NULL,
  `DueDate` DATETIME(6) NULL,
  `__raw_DueDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserLoanId1` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserLoanPaymentRequests` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserLoanPaymentId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `RequestDate` DATETIME(6) NULL,
  `__raw_RequestDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `PaymentDate` DATETIME(6) NULL,
  `__raw_PaymentDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Amount` DECIMAL(18,2) NOT NULL,
  `MemberDescription` LONGTEXT NULL,
  `AdminDescription` LONGTEXT NULL,
  `Status` INT NOT NULL,
  `PaymentMethod` INT NOT NULL,
  `TrackNumber` VARCHAR(25) NULL,
  `AdminAcceptorId` BIGINT NULL,
  `AdminAcceptDate` DATETIME(6) NULL,
  `__raw_AdminAcceptDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `AffectOnMainPayment` TINYINT(1) NOT NULL,
  `FileName` VARCHAR(25) NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserLoanPayments` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserLoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `InstallmentNumber` INT NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `SavedBy` LONGTEXT NULL,
  `SaveDate` DATETIME(6) NULL,
  `__raw_SaveDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `FileMonth` LONGTEXT NULL,
  `TargetMonth` DATETIME(6) NULL,
  `__raw_TargetMonth` VARCHAR(40) NOT NULL DEFAULT '0001-01-01T00:00:00.0000000' COMMENT 'Exact original SQL Server temporal value',
  `DelayDay` INT NOT NULL DEFAULT 0,
  `DelayPrice` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `Description` LONGTEXT NULL,
  `GoldRate` DOUBLE NOT NULL DEFAULT 0.0000000000000000e+000,
  `GoldWeight` DOUBLE NOT NULL DEFAULT 0.0000000000000000e+000,
  `PaymentMethod` INT NOT NULL DEFAULT 0,
  `IsGoldCheckouted` TINYINT(1) NOT NULL DEFAULT 0,
  `Code` INT NOT NULL AUTO_INCREMENT,
  `SentDueDateSms` TINYINT(1) NOT NULL DEFAULT 0,
  `InstallmentAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `SentOverDueDateSms` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`),
  KEY `IX_auto_Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserLoanRequestAuthorizationItemAttachments` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserLoanRequestAuthorizationItemId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Attachment` VARCHAR(50) NULL,
  `MemberDescription` VARCHAR(500) NULL,
  `AttachmentByAdmin` TINYINT(1) NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserLoanRequestAuthorizationItems` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserLoanRequestId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `AuthorizationItemId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `CreateDate` DATETIME(6) NULL,
  `__raw_CreateDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `LastChangeDate` DATETIME(6) NULL,
  `__raw_LastChangeDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Attachment` VARCHAR(50) NULL,
  `MemberDescription` VARCHAR(500) NULL,
  `AdminDescription` VARCHAR(500) NULL,
  `Status` INT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `AttachmentByAdmin` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserLoanRequests` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserId` BIGINT NOT NULL,
  `LoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `RequestDate` DATETIME(6) NULL,
  `__raw_RequestDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Amount` DECIMAL(18,2) NOT NULL,
  `Comment` VARCHAR(500) NULL,
  `AdminDescriptionPrivate` VARCHAR(500) NULL,
  `Month` INT NOT NULL,
  `Year` INT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  `InstallmentCount` INT NOT NULL DEFAULT 0,
  `MonthGap` INT NOT NULL DEFAULT 0,
  `AgentId` BIGINT NULL,
  `Code` INT NOT NULL AUTO_INCREMENT,
  `Installment` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `IsPhysicalDocsDelivered` TINYINT(1) NOT NULL DEFAULT 0,
  `AdminDescription` LONGTEXT NULL,
  `SponsoreDueDate` DATETIME(6) NULL,
  `__raw_SponsoreDueDate` VARCHAR(40) NOT NULL DEFAULT '0001-01-01T00:00:00.0000000' COMMENT 'Exact original SQL Server temporal value',
  `StatusId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `AgentStatusId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `ChargeType` INT NOT NULL DEFAULT 0,
  `SponsoreAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `LockedBy` LONGTEXT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_auto_Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserLoanRequestStatusHistories` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserId` BIGINT NOT NULL,
  `UserLoanRequestId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `DateTime` DATETIME(6) NULL,
  `__raw_DateTime` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `FromStatusId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `FromAgentStatusId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `ToStatusId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `ToAgentStatusId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserLoans` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserId` BIGINT NOT NULL,
  `LoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `StartDate` DATETIME(6) NULL,
  `__raw_StartDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Amount` DECIMAL(18,2) NOT NULL,
  `Installment` DECIMAL(18,2) NOT NULL,
  `Month` INT NOT NULL,
  `Paid` DECIMAL(18,2) NOT NULL,
  `Remain` DECIMAL(18,2) NOT NULL,
  `CheckoutDate` DATETIME(6) NULL,
  `__raw_CheckoutDate` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  `IsCheckouted` TINYINT(1) NULL,
  `Code` INT NOT NULL AUTO_INCREMENT,
  `Description` LONGTEXT NULL,
  `MonthGap` INT NOT NULL DEFAULT 1,
  `PayableAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `CustomerPurchasePlanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `AgentId` BIGINT NULL,
  `UserLoanRequestId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `AgentPrice` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `AgentDueDate` DATETIME(6) NULL,
  `__raw_AgentDueDate` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  `SubAgentDueDate` DATETIME(6) NULL,
  `__raw_SubAgentDueDate` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  `SubAgentId` BIGINT NULL,
  `SubAgentPrice` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `DepositChargeDueDate` DATETIME(6) NULL,
  `__raw_DepositChargeDueDate` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  `PreDepositAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  PRIMARY KEY (`Id`),
  KEY `IX_auto_Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserLoanSponsoreDueDate` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserLoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `DueDate` DATETIME(6) NULL,
  `__raw_DueDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Description` VARCHAR(250) NULL,
  `IsCheckouted` TINYINT(1) NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserLoanId1` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserSavedMonies` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `MemberId` BIGINT NOT NULL,
  `Description` LONGTEXT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `SavedBy` LONGTEXT NULL,
  `SaveDate` DATETIME(6) NULL,
  `__raw_SaveDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `FileMonth` LONGTEXT NULL,
  `TargetMonth` DATETIME(6) NULL,
  `__raw_TargetMonth` VARCHAR(40) NOT NULL DEFAULT '0001-01-01T00:00:00.0000000' COMMENT 'Exact original SQL Server temporal value',
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `VisitorLogs` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Date` DATETIME(6) NULL,
  `__raw_Date` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `IpAddress` VARCHAR(25) NULL,
  `UserAgent` VARCHAR(100) NULL,
  `Mrk` LONGTEXT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Withdraws` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `SaveDate` DATETIME(6) NULL,
  `__raw_SaveDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `PaymentMethod` INT NOT NULL,
  `IsWithdraw` TINYINT(1) NOT NULL,
  `IsUnknown` TINYINT(1) NOT NULL,
  `GoldWeight` DOUBLE NOT NULL,
  `GoldRate` DOUBLE NOT NULL,
  `Description` LONGTEXT NULL,
  `SavedBy` LONGTEXT NULL,
  `WeightBalance` DOUBLE NOT NULL DEFAULT 0.0000000000000000e+000,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT '2a18f1fc-57fe-482c-8003-b6ba13b12996',
  `SponsoredLoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `AgentId` BIGINT NULL,
  `UserLoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `ContactId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `UserLoanContactId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `FileName` VARCHAR(25) NULL,
  `SuccessfullOnlineMoneyTransferId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `CustomerMarketerCommissionId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `HangFire__AggregatedCounter` (
  `Key` VARCHAR(50) NOT NULL,
  `Value` BIGINT NOT NULL,
  `ExpireAt` DATETIME(3) NULL,
  `__raw_ExpireAt` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  PRIMARY KEY (`Key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `HangFire__Counter` (
  `Key` VARCHAR(50) NOT NULL,
  `Value` INT NOT NULL,
  `ExpireAt` DATETIME(3) NULL,
  `__raw_ExpireAt` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  `Id` BIGINT NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`Key`, `Id`),
  KEY `IX_auto_Id` (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `HangFire__Hash` (
  `Key` VARCHAR(50) NOT NULL,
  `Field` VARCHAR(50) NOT NULL,
  `Value` LONGTEXT NULL,
  `ExpireAt` DATETIME(6) NULL,
  `__raw_ExpireAt` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  PRIMARY KEY (`Key`, `Field`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `HangFire__Job` (
  `Id` BIGINT NOT NULL AUTO_INCREMENT,
  `StateId` BIGINT NULL,
  `StateName` VARCHAR(10) NULL,
  `InvocationData` LONGTEXT NOT NULL,
  `Arguments` LONGTEXT NOT NULL,
  `CreatedAt` DATETIME(3) NOT NULL,
  `__raw_CreatedAt` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `ExpireAt` DATETIME(3) NULL,
  `__raw_ExpireAt` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `HangFire__JobParameter` (
  `JobId` BIGINT NOT NULL,
  `Name` VARCHAR(20) NOT NULL,
  `Value` LONGTEXT NULL,
  PRIMARY KEY (`JobId`, `Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `HangFire__JobQueue` (
  `Id` BIGINT NOT NULL AUTO_INCREMENT,
  `JobId` BIGINT NOT NULL,
  `Queue` VARCHAR(25) NOT NULL,
  `FetchedAt` DATETIME(3) NULL,
  `__raw_FetchedAt` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  PRIMARY KEY (`Queue`, `Id`),
  KEY `IX_auto_Id` (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `HangFire__List` (
  `Id` BIGINT NOT NULL AUTO_INCREMENT,
  `Key` VARCHAR(50) NOT NULL,
  `Value` LONGTEXT NULL,
  `ExpireAt` DATETIME(3) NULL,
  `__raw_ExpireAt` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  PRIMARY KEY (`Key`, `Id`),
  KEY `IX_auto_Id` (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `HangFire__Schema` (
  `Version` INT NOT NULL,
  PRIMARY KEY (`Version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `HangFire__Server` (
  `Id` VARCHAR(100) NOT NULL,
  `Data` LONGTEXT NULL,
  `LastHeartbeat` DATETIME(3) NOT NULL,
  `__raw_LastHeartbeat` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `HangFire__Set` (
  `Key` VARCHAR(50) NOT NULL,
  `Score` DOUBLE NOT NULL,
  `Value` VARCHAR(128) NOT NULL,
  `ExpireAt` DATETIME(3) NULL,
  `__raw_ExpireAt` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  PRIMARY KEY (`Key`, `Value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `HangFire__State` (
  `Id` BIGINT NOT NULL AUTO_INCREMENT,
  `JobId` BIGINT NOT NULL,
  `Name` VARCHAR(10) NOT NULL,
  `Reason` VARCHAR(50) NULL,
  `CreatedAt` DATETIME(3) NOT NULL,
  `__raw_CreatedAt` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Data` LONGTEXT NULL,
  PRIMARY KEY (`JobId`, `Id`),
  KEY `IX_auto_Id` (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `IX_AffiliateCommissions_PurchaseId` ON `AffiliateCommissions` (`PurchaseId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AffiliateCommissions_UserId` ON `AffiliateCommissions` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoanAuthorizationItem_AuthorizationItemId` ON `AgentLoanAuthorizationItem` (`AuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoanAuthorizationItem_CustomerId` ON `AgentLoanAuthorizationItem` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoanAuthorizationItem_LoanId` ON `AgentLoanAuthorizationItem` (`LoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoans_AgentId` ON `AgentLoans` (`AgentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoans_ContactId` ON `AgentLoans` (`ContactId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoans_CustomerId` ON `AgentLoans` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoans_LoanId` ON `AgentLoans` (`LoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_BeforeDueDateSmsPatternId` ON `AppSettings` (`BeforeDueDateSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_CustomerId` ON `AppSettings` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_DueDateRememberSmsPatternId` ON `AppSettings` (`DueDateRememberSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_LoginSmsPatternId` ON `AppSettings` (`LoginSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_OverDueDateSmsPatternId` ON `AppSettings` (`OverDueDateSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_RegisterOtpSmsPatternId` ON `AppSettings` (`RegisterOtpSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_RegisterSmsPatternId` ON `AppSettings` (`RegisterSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_ThanksPaymentSmsPatternId` ON `AppSettings` (`ThanksPaymentSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSms_CustomerId` ON `AppSms` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetRoleClaims_RoleId` ON `AspNetRoleClaims` (`RoleId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUserClaims_UserId` ON `AspNetUserClaims` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUserLogins_UserId` ON `AspNetUserLogins` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUserRoles_RoleId` ON `AspNetUserRoles` (`RoleId`); -- SQL Server filter: NULL
CREATE INDEX `EmailIndex` ON `AspNetUsers` (`NormalizedEmail`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUsers_AgentId` ON `AspNetUsers` (`AgentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUsers_CustomerId` ON `AspNetUsers` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUsers_CustomerMarketerId` ON `AspNetUsers` (`CustomerMarketerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Assurance_UserLoanId` ON `Assurance` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AuthorizationItem_CustomerId` ON `AuthorizationItem` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Contacts_CustomerId` ON `Contacts` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_CustomerMarketerCommissions_MarketerId` ON `CustomerMarketerCommissions` (`MarketerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_CustomerMarketerCommissions_UserLoanId` ON `CustomerMarketerCommissions` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_CustomerPurchasePlan_CustomerId` ON `CustomerPurchasePlan` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_CustomerPurchasePlan_PurchaseId` ON `CustomerPurchasePlan` (`PurchaseId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Expenses_CustomerId` ON `Expenses` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_IceReport_CustomerId` ON `IceReport` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_IceReport_MemberId` ON `IceReport` (`MemberId`); -- SQL Server filter: NULL
CREATE INDEX `IX_IranValidityReport_CustomerId` ON `IranValidityReport` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_IranValidityReport_MemberId` ON `IranValidityReport` (`MemberId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanAuthorizationItems_AuthorizationItemId` ON `LoanAuthorizationItems` (`AuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanAuthorizationItems_CustomerId` ON `LoanAuthorizationItems` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanAuthorizationItems_LoanId` ON `LoanAuthorizationItems` (`LoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanContacts_ContactId` ON `LoanContacts` (`ContactId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanContacts_CustomerId` ON `LoanContacts` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanContacts_LoanId` ON `LoanContacts` (`LoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanRequestStatuses_CustomerId` ON `LoanRequestStatuses` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanRequestStatuses_SmsPatternId` ON `LoanRequestStatuses` (`SmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Loans_CustomerId` ON `Loans` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_MemberPurchases_CreatorUserId` ON `MemberPurchases` (`CreatorUserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_MemberPurchases_UserId` ON `MemberPurchases` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_MemberPurchases_UserLoanPaymentId` ON `MemberPurchases` (`UserLoanPaymentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_OffDate_CustomerId` ON `OffDate` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_OnlineMoneyTransfer_CustomerId` ON `OnlineMoneyTransfer` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_OnlineMoneyTransfer_TransactionId` ON `OnlineMoneyTransfer` (`TransactionId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Purchases_CustomerId` ON `Purchases` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Purchases_UserId` ON `Purchases` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_SmsPatterns_CustomerId` ON `SmsPatterns` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_SubAgentTransactions_CustomerId` ON `SubAgentTransactions` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_SubAgentTransactions_UserLoanId` ON `SubAgentTransactions` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanContact_ContactId` ON `UserLoanContact` (`ContactId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanContact_CustomerId` ON `UserLoanContact` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanContact_UserLoanId` ON `UserLoanContact` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanContact_UserLoanId1` ON `UserLoanContact` (`UserLoanId1`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanPaymentRequests_AdminAcceptorId` ON `UserLoanPaymentRequests` (`AdminAcceptorId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanPaymentRequests_UserLoanPaymentId` ON `UserLoanPaymentRequests` (`UserLoanPaymentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanPayments_UserLoanId` ON `UserLoanPayments` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestAuthorizationItemAttachments_User_4a91d687` ON `UserLoanRequestAuthorizationItemAttachments` (`UserLoanRequestAuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestAuthorizationItems_AuthorizationItemId` ON `UserLoanRequestAuthorizationItems` (`AuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestAuthorizationItems_UserLoanRequestId` ON `UserLoanRequestAuthorizationItems` (`UserLoanRequestId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequests_AgentId` ON `UserLoanRequests` (`AgentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequests_AgentStatusId` ON `UserLoanRequests` (`AgentStatusId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequests_LoanId` ON `UserLoanRequests` (`LoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequests_StatusId` ON `UserLoanRequests` (`StatusId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequests_UserId` ON `UserLoanRequests` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestStatusHistories_FromAgentStatusId` ON `UserLoanRequestStatusHistories` (`FromAgentStatusId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestStatusHistories_FromStatusId` ON `UserLoanRequestStatusHistories` (`FromStatusId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestStatusHistories_ToAgentStatusId` ON `UserLoanRequestStatusHistories` (`ToAgentStatusId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestStatusHistories_ToStatusId` ON `UserLoanRequestStatusHistories` (`ToStatusId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestStatusHistories_UserId` ON `UserLoanRequestStatusHistories` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestStatusHistories_UserLoanRequestId` ON `UserLoanRequestStatusHistories` (`UserLoanRequestId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoans_AgentId` ON `UserLoans` (`AgentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoans_CustomerPurchasePlanId` ON `UserLoans` (`CustomerPurchasePlanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoans_LoanId` ON `UserLoans` (`LoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoans_SubAgentId` ON `UserLoans` (`SubAgentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoans_UserId` ON `UserLoans` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoans_UserLoanRequestId` ON `UserLoans` (`UserLoanRequestId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanSponsoreDueDate_CustomerId` ON `UserLoanSponsoreDueDate` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanSponsoreDueDate_UserLoanId` ON `UserLoanSponsoreDueDate` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanSponsoreDueDate_UserLoanId1` ON `UserLoanSponsoreDueDate` (`UserLoanId1`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserSavedMonies_MemberId` ON `UserSavedMonies` (`MemberId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Withdraws_AgentId` ON `Withdraws` (`AgentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Withdraws_ContactId` ON `Withdraws` (`ContactId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Withdraws_CustomerId` ON `Withdraws` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Withdraws_CustomerMarketerCommissionId` ON `Withdraws` (`CustomerMarketerCommissionId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Withdraws_SponsoredLoanId` ON `Withdraws` (`SponsoredLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Withdraws_UserLoanContactId` ON `Withdraws` (`UserLoanContactId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Withdraws_UserLoanId` ON `Withdraws` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_HangFire_AggregatedCounter_ExpireAt` ON `HangFire__AggregatedCounter` (`ExpireAt`); -- SQL Server filter: ([ExpireAt] IS NOT NULL)
CREATE INDEX `IX_HangFire_Hash_ExpireAt` ON `HangFire__Hash` (`ExpireAt`); -- SQL Server filter: ([ExpireAt] IS NOT NULL)
CREATE INDEX `IX_HangFire_Job_ExpireAt` ON `HangFire__Job` (`ExpireAt`, `StateName`); -- SQL Server filter: ([ExpireAt] IS NOT NULL)
CREATE INDEX `IX_HangFire_Job_StateName` ON `HangFire__Job` (`StateName`); -- SQL Server filter: ([StateName] IS NOT NULL)
CREATE INDEX `IX_HangFire_List_ExpireAt` ON `HangFire__List` (`ExpireAt`); -- SQL Server filter: ([ExpireAt] IS NOT NULL)
CREATE INDEX `IX_HangFire_Server_LastHeartbeat` ON `HangFire__Server` (`LastHeartbeat`); -- SQL Server filter: NULL
CREATE INDEX `IX_HangFire_Set_ExpireAt` ON `HangFire__Set` (`ExpireAt`); -- SQL Server filter: ([ExpireAt] IS NOT NULL)
CREATE INDEX `IX_HangFire_Set_Score` ON `HangFire__Set` (`Key`, `Score`); -- SQL Server filter: NULL
CREATE INDEX `IX_HangFire_State_CreatedAt` ON `HangFire__State` (`CreatedAt`); -- SQL Server filter: NULL
ALTER TABLE `AffiliateCommissions` ADD CONSTRAINT `FK_AffiliateCommissions_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AffiliateCommissions` ADD CONSTRAINT `FK_AffiliateCommissions_Purchases_PurchaseId` FOREIGN KEY (`PurchaseId`) REFERENCES `Purchases` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AgentLoanAuthorizationItem` ADD CONSTRAINT `FK_AgentLoanAuthorizationItem_AuthorizationItem_Aut_f9f85199` FOREIGN KEY (`AuthorizationItemId`) REFERENCES `AuthorizationItem` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AgentLoanAuthorizationItem` ADD CONSTRAINT `FK_AgentLoanAuthorizationItem_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AgentLoanAuthorizationItem` ADD CONSTRAINT `FK_AgentLoanAuthorizationItem_Loans_LoanId` FOREIGN KEY (`LoanId`) REFERENCES `Loans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AgentLoans` ADD CONSTRAINT `FK_AgentLoans_AspNetUsers_AgentId` FOREIGN KEY (`AgentId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AgentLoans` ADD CONSTRAINT `FK_AgentLoans_Contacts_ContactId` FOREIGN KEY (`ContactId`) REFERENCES `Contacts` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AgentLoans` ADD CONSTRAINT `FK_AgentLoans_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AgentLoans` ADD CONSTRAINT `FK_AgentLoans_Loans_LoanId` FOREIGN KEY (`LoanId`) REFERENCES `Loans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_BeforeDueDateSmsPatternId` FOREIGN KEY (`BeforeDueDateSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_DueDateRememberSmsPatternId` FOREIGN KEY (`DueDateRememberSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_LoginSmsPatternId` FOREIGN KEY (`LoginSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_OverDueDateSmsPatternId` FOREIGN KEY (`OverDueDateSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_RegisterOtpSmsPatternId` FOREIGN KEY (`RegisterOtpSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_RegisterSmsPatternId` FOREIGN KEY (`RegisterSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_ThanksPaymentSmsPatternId` FOREIGN KEY (`ThanksPaymentSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSms` ADD CONSTRAINT `FK_AppSms_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AspNetRoleClaims` ADD CONSTRAINT `FK_AspNetRoleClaims_AspNetRoles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `AspNetRoles` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AspNetUserClaims` ADD CONSTRAINT `FK_AspNetUserClaims_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AspNetUserLogins` ADD CONSTRAINT `FK_AspNetUserLogins_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AspNetUserRoles` ADD CONSTRAINT `FK_AspNetUserRoles_AspNetRoles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `AspNetRoles` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AspNetUserRoles` ADD CONSTRAINT `FK_AspNetUserRoles_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AspNetUsers` ADD CONSTRAINT `FK_AspNetUsers_AspNetUsers_AgentId` FOREIGN KEY (`AgentId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AspNetUsers` ADD CONSTRAINT `FK_AspNetUsers_AspNetUsers_CustomerMarketerId` FOREIGN KEY (`CustomerMarketerId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AspNetUsers` ADD CONSTRAINT `FK_AspNetUsers_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AspNetUserTokens` ADD CONSTRAINT `FK_AspNetUserTokens_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `Assurance` ADD CONSTRAINT `FK_Assurance_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AuthorizationItem` ADD CONSTRAINT `FK_AuthorizationItem_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Contacts` ADD CONSTRAINT `FK_Contacts_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `CustomerMarketerCommissions` ADD CONSTRAINT `FK_CustomerMarketerCommissions_AspNetUsers_MarketerId` FOREIGN KEY (`MarketerId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `CustomerMarketerCommissions` ADD CONSTRAINT `FK_CustomerMarketerCommissions_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `CustomerPurchasePlan` ADD CONSTRAINT `FK_CustomerPurchasePlan_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `CustomerPurchasePlan` ADD CONSTRAINT `FK_CustomerPurchasePlan_Purchases_PurchaseId` FOREIGN KEY (`PurchaseId`) REFERENCES `Purchases` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Expenses` ADD CONSTRAINT `FK_Expenses_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `IceReport` ADD CONSTRAINT `FK_IceReport_AspNetUsers_MemberId` FOREIGN KEY (`MemberId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `IceReport` ADD CONSTRAINT `FK_IceReport_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `IranValidityReport` ADD CONSTRAINT `FK_IranValidityReport_AspNetUsers_MemberId` FOREIGN KEY (`MemberId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `IranValidityReport` ADD CONSTRAINT `FK_IranValidityReport_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `LoanAuthorizationItems` ADD CONSTRAINT `FK_LoanAuthorizationItems_AuthorizationItem_Authori_50b0d37b` FOREIGN KEY (`AuthorizationItemId`) REFERENCES `AuthorizationItem` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `LoanAuthorizationItems` ADD CONSTRAINT `FK_LoanAuthorizationItems_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `LoanAuthorizationItems` ADD CONSTRAINT `FK_LoanAuthorizationItems_Loans_LoanId` FOREIGN KEY (`LoanId`) REFERENCES `Loans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `LoanContacts` ADD CONSTRAINT `FK_LoanContacts_Contacts_ContactId` FOREIGN KEY (`ContactId`) REFERENCES `Contacts` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `LoanContacts` ADD CONSTRAINT `FK_LoanContacts_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `LoanContacts` ADD CONSTRAINT `FK_LoanContacts_Loans_LoanId` FOREIGN KEY (`LoanId`) REFERENCES `Loans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `LoanRequestStatuses` ADD CONSTRAINT `FK_LoanRequestStatuses_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `LoanRequestStatuses` ADD CONSTRAINT `FK_LoanRequestStatuses_SmsPatterns_SmsPatternId` FOREIGN KEY (`SmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Loans` ADD CONSTRAINT `FK_Loans_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `MemberPurchases` ADD CONSTRAINT `FK_MemberPurchases_AspNetUsers_CreatorUserId` FOREIGN KEY (`CreatorUserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `MemberPurchases` ADD CONSTRAINT `FK_MemberPurchases_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `MemberPurchases` ADD CONSTRAINT `FK_MemberPurchases_UserLoanPayments_UserLoanPaymentId` FOREIGN KEY (`UserLoanPaymentId`) REFERENCES `UserLoanPayments` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `OffDate` ADD CONSTRAINT `FK_OffDate_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `OnlineMoneyTransfer` ADD CONSTRAINT `FK_OnlineMoneyTransfer_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `OnlineMoneyTransfer` ADD CONSTRAINT `FK_OnlineMoneyTransfer_Withdraws_TransactionId` FOREIGN KEY (`TransactionId`) REFERENCES `Withdraws` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Purchases` ADD CONSTRAINT `FK_Purchases_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `Purchases` ADD CONSTRAINT `FK_Purchases_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `SmsPatterns` ADD CONSTRAINT `FK_SmsPatterns_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `SubAgentTransactions` ADD CONSTRAINT `FK_SubAgentTransactions_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `SubAgentTransactions` ADD CONSTRAINT `FK_SubAgentTransactions_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanContact` ADD CONSTRAINT `FK_UserLoanContact_Contacts_ContactId` FOREIGN KEY (`ContactId`) REFERENCES `Contacts` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanContact` ADD CONSTRAINT `FK_UserLoanContact_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanContact` ADD CONSTRAINT `FK_UserLoanContact_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanContact` ADD CONSTRAINT `FK_UserLoanContact_UserLoans_UserLoanId1` FOREIGN KEY (`UserLoanId1`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanPaymentRequests` ADD CONSTRAINT `FK_UserLoanPaymentRequests_AspNetUsers_AdminAcceptorId` FOREIGN KEY (`AdminAcceptorId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanPaymentRequests` ADD CONSTRAINT `FK_UserLoanPaymentRequests_UserLoanPayments_UserLoa_bdc17b62` FOREIGN KEY (`UserLoanPaymentId`) REFERENCES `UserLoanPayments` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanPayments` ADD CONSTRAINT `FK_UserLoanPayments_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestAuthorizationItemAttachments` ADD CONSTRAINT `FK_UserLoanRequestAuthorizationItemAttachments_User_78300cdf` FOREIGN KEY (`UserLoanRequestAuthorizationItemId`) REFERENCES `UserLoanRequestAuthorizationItems` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestAuthorizationItems` ADD CONSTRAINT `FK_UserLoanRequestAuthorizationItems_AuthorizationI_94b0f049` FOREIGN KEY (`AuthorizationItemId`) REFERENCES `AuthorizationItem` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestAuthorizationItems` ADD CONSTRAINT `FK_UserLoanRequestAuthorizationItems_UserLoanReques_d1a3046a` FOREIGN KEY (`UserLoanRequestId`) REFERENCES `UserLoanRequests` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequests` ADD CONSTRAINT `FK_UserLoanRequests_AspNetUsers_AgentId` FOREIGN KEY (`AgentId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequests` ADD CONSTRAINT `FK_UserLoanRequests_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequests` ADD CONSTRAINT `FK_UserLoanRequests_LoanRequestStatuses_AgentStatusId` FOREIGN KEY (`AgentStatusId`) REFERENCES `LoanRequestStatuses` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequests` ADD CONSTRAINT `FK_UserLoanRequests_LoanRequestStatuses_StatusId` FOREIGN KEY (`StatusId`) REFERENCES `LoanRequestStatuses` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequests` ADD CONSTRAINT `FK_UserLoanRequests_Loans_LoanId` FOREIGN KEY (`LoanId`) REFERENCES `Loans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestStatusHistories` ADD CONSTRAINT `FK_UserLoanRequestStatusHistories_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestStatusHistories` ADD CONSTRAINT `FK_UserLoanRequestStatusHistories_LoanRequestStatus_e4217390` FOREIGN KEY (`FromAgentStatusId`) REFERENCES `LoanRequestStatuses` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestStatusHistories` ADD CONSTRAINT `FK_UserLoanRequestStatusHistories_LoanRequestStatus_228e7ba5` FOREIGN KEY (`FromStatusId`) REFERENCES `LoanRequestStatuses` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestStatusHistories` ADD CONSTRAINT `FK_UserLoanRequestStatusHistories_LoanRequestStatus_6ed3922b` FOREIGN KEY (`ToAgentStatusId`) REFERENCES `LoanRequestStatuses` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestStatusHistories` ADD CONSTRAINT `FK_UserLoanRequestStatusHistories_LoanRequestStatus_2225aa24` FOREIGN KEY (`ToStatusId`) REFERENCES `LoanRequestStatuses` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestStatusHistories` ADD CONSTRAINT `FK_UserLoanRequestStatusHistories_UserLoanRequests__9e1fc9c7` FOREIGN KEY (`UserLoanRequestId`) REFERENCES `UserLoanRequests` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoans` ADD CONSTRAINT `FK_UserLoans_AspNetUsers_AgentId` FOREIGN KEY (`AgentId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoans` ADD CONSTRAINT `FK_UserLoans_AspNetUsers_SubAgentId` FOREIGN KEY (`SubAgentId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoans` ADD CONSTRAINT `FK_UserLoans_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoans` ADD CONSTRAINT `FK_UserLoans_CustomerPurchasePlan_CustomerPurchasePlanId` FOREIGN KEY (`CustomerPurchasePlanId`) REFERENCES `CustomerPurchasePlan` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoans` ADD CONSTRAINT `FK_UserLoans_Loans_LoanId` FOREIGN KEY (`LoanId`) REFERENCES `Loans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoans` ADD CONSTRAINT `FK_UserLoans_UserLoanRequests_UserLoanRequestId` FOREIGN KEY (`UserLoanRequestId`) REFERENCES `UserLoanRequests` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanSponsoreDueDate` ADD CONSTRAINT `FK_UserLoanSponsoreDueDate_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanSponsoreDueDate` ADD CONSTRAINT `FK_UserLoanSponsoreDueDate_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanSponsoreDueDate` ADD CONSTRAINT `FK_UserLoanSponsoreDueDate_UserLoans_UserLoanId1` FOREIGN KEY (`UserLoanId1`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserSavedMonies` ADD CONSTRAINT `FK_UserSavedMonies_AspNetUsers_MemberId` FOREIGN KEY (`MemberId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_AspNetUsers_AgentId` FOREIGN KEY (`AgentId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_Contacts_ContactId` FOREIGN KEY (`ContactId`) REFERENCES `Contacts` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_CustomerMarketerCommissions_CustomerMa_7f86a044` FOREIGN KEY (`CustomerMarketerCommissionId`) REFERENCES `CustomerMarketerCommissions` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_Loans_SponsoredLoanId` FOREIGN KEY (`SponsoredLoanId`) REFERENCES `Loans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_UserLoanContact_UserLoanContactId` FOREIGN KEY (`UserLoanContactId`) REFERENCES `UserLoanContact` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `HangFire__JobParameter` ADD CONSTRAINT `FK_HangFire_JobParameter_Job` FOREIGN KEY (`JobId`) REFERENCES `HangFire__Job` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `HangFire__State` ADD CONSTRAINT `FK_HangFire_State_Job` FOREIGN KEY (`JobId`) REFERENCES `HangFire__Job` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS=1;
