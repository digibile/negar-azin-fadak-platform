-- VamCity SQL Server to MariaDB schema conversion
-- Generated from restored SQL Server backups. Customer records are excluded.
-- MariaDB 10.6+ / MySQL 8.0-compatible DDL where noted.
-- Non-dbo schemas map to <schema>__<table>.
-- Exact SQL Server datetime2/datetime/time(7) values are retained in __raw_<column> fields.
-- Filtered indexes are approximated as ordinary indexes; SQL Server INCLUDE columns use covering indexes.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE DATABASE IF NOT EXISTS `vamcitydigibilepay` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `vamcitydigibilepay`;
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

CREATE TABLE `AgentFactorItem` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `AgentFactorId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Product` VARCHAR(125) NULL,
  `Payable` DECIMAL(18,2) NOT NULL,
  `Count` DECIMAL(18,2) NOT NULL,
  `Fee` DECIMAL(18,2) NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AgentFactors` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Code` INT NOT NULL AUTO_INCREMENT,
  `UserCode` VARCHAR(5) NULL,
  `MemberId` BIGINT NOT NULL,
  `AgentId` BIGINT NULL,
  `CreateAt` DATETIME(6) NULL,
  `__raw_CreateAt` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `CheckoutType` INT NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `Description` VARCHAR(500) NULL,
  `AdminDescription` VARCHAR(500) NULL,
  `AdminAcceptStatus` INT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `CheckoutRequestDateTime` DATETIME(6) NULL,
  `__raw_CheckoutRequestDateTime` VARCHAR(40) NOT NULL DEFAULT '0001-01-01T00:00:00.0000000' COMMENT 'Exact original SQL Server temporal value',
  `Commission` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `MemberPurchaseId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `AgentFactorOnlinePaymentMethod` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`),
  KEY `IX_auto_Code` (`Code`)
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
  `OtherPercentsJson` LONGTEXT NULL,
  `CashTitle` VARCHAR(50) NULL,
  `ProductTitle` VARCHAR(50) NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AgentMetaData` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `SignaturesOwnerNames` VARCHAR(100) NULL,
  `ShomareSabt` VARCHAR(50) NULL,
  `ShenaseMelli` VARCHAR(50) NULL,
  `CompanyName` VARCHAR(50) NULL,
  `AgentCategoryActivities` VARCHAR(100) NULL,
  `AgentType` INT NOT NULL,
  `UserId` BIGINT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Status` INT NOT NULL,
  `RejectReason` LONGTEXT NULL,
  `LastAdminChangeDateTime` DATETIME(6) NULL,
  `__raw_LastAdminChangeDateTime` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `CheckedBy` VARCHAR(50) NULL,
  `ThumbnailFileName` LONGTEXT NULL,
  `JavazKasbFileName` LONGTEXT NULL,
  `KartMelliFileName` VARCHAR(50) NULL,
  `EjarenameFileName` VARCHAR(50) NULL,
  `AsasnameFileName` VARCHAR(50) NULL,
  `RoznameRasmiFileName` VARCHAR(50) NULL,
  `IsOnline` TINYINT(1) NOT NULL DEFAULT 0,
  `IsPhysical` TINYINT(1) NOT NULL DEFAULT 0,
  `SiteUrl` VARCHAR(50) NULL,
  `AgentFactorCommission` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `MaxAgentFactorCommission` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `UseDefaultCommission` TINYINT(1) NOT NULL DEFAULT 1,
  `PledgeChequeFileName` LONGTEXT NULL,
  `CanConvertRequestToLoan` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_AgentMetaData_UserId` (`UserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AppEmails` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Date` DATETIME(6) NULL,
  `__raw_Date` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Text` LONGTEXT NULL,
  `AppEmailType` INT NOT NULL,
  `To` VARCHAR(25) NULL,
  `PatternTitle` VARCHAR(50) NULL,
  `EmailPanel` INT NOT NULL,
  `EntityId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `EntityType` VARCHAR(25) NULL,
  `Tag` VARCHAR(50) NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AppInquirys` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Date` DATETIME(6) NULL,
  `__raw_Date` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `InquiryPanel` INT NOT NULL,
  `AppInquiryType` INT NOT NULL,
  `Price` DECIMAL(18,2) NOT NULL,
  `IsSuccess` TINYINT(1) NOT NULL,
  `PanelResultJson` LONGTEXT NULL,
  `Result` LONGTEXT NULL,
  `Key` VARCHAR(50) NULL,
  `Tag` VARCHAR(50) NULL,
  `MemberId` BIGINT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `MemberPrice` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
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
  `WalletChargeSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `AgentOfficePhone` VARCHAR(100) NULL,
  `BeforeDueDateEmailPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `BeforeDueDaysCount_Email` INT NOT NULL DEFAULT 0,
  `DailyReportEmailTime` TIME(6) NULL,
  `__raw_DailyReportEmailTime` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  `DefaultEmailPanel` INT NOT NULL DEFAULT 0,
  `DueDateRememberEmailPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `DueDatedRememberEmailTime` TIME(6) NULL,
  `__raw_DueDatedRememberEmailTime` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  `EmailConfigJson` LONGTEXT NULL,
  `IsDailyReportEmailActive` TINYINT(1) NOT NULL DEFAULT 0,
  `IsDueDateEmailActive` TINYINT(1) NOT NULL DEFAULT 0,
  `IsRememberEmailActive` TINYINT(1) NOT NULL DEFAULT 0,
  `LoginEmailPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `OverDueDateEmailPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `OverDueDayRemeberOnce_Email` TINYINT(1) NOT NULL DEFAULT 0,
  `OverDueDaysCount_Email` INT NOT NULL DEFAULT 0,
  `RegisterEmailPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `RegisterOtpEmailPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `ThanksPaymentEmailPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `WalletChargeEmailPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `RefahBetaConfigJson` LONGTEXT NULL,
  `IPPanelConfigJson` LONGTEXT NULL,
  `SiteTheme` INT NOT NULL DEFAULT 0,
  `NewOrderEmailPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `NewOrderSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `OtpRequiredInManualMemberRegistration` TINYINT(1) NOT NULL DEFAULT 0,
  `WebOneConfigJson` LONGTEXT NULL,
  `PercentOfConsideringAsPaid` TINYINT UNSIGNED NOT NULL DEFAULT 50,
  `ShowSubmitFirstLoanRequestNotifInMemberPanel` TINYINT(1) NOT NULL DEFAULT 1,
  `NewUserLoanSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `PreventCreateLoanNonCurrentDate` TINYINT(1) NOT NULL DEFAULT 0,
  `WalletWithdrawNotificationSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `WalletWithdrawOtpEmailPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `WalletWithdrawOtpSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `CalculatorType` INT NOT NULL DEFAULT 0,
  `AgentFactorCommission` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `AgentFactorOnlinePaymentGateway` INT NOT NULL DEFAULT 0,
  `MaxAgentFactorCommission` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `AgentFactorPaymentLinkSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `SepehrTerminalId` BIGINT NOT NULL DEFAULT 0,
  `ApiIRConfigJson` LONGTEXT NULL,
  `DefaultInquiryPanel` INT NOT NULL DEFAULT 0,
  `InquiryCredit` INT NOT NULL DEFAULT 0,
  `VerifyMobileByNationalCodeInRegister` TINYINT(1) NOT NULL DEFAULT 0,
  `DigitalSignLinkSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `DigitalSignCompleteSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `DigitalSignOtpSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `IsMemberRegistrationDisabled` TINYINT(1) NOT NULL DEFAULT 0,
  `MemberCanChangeProfile` TINYINT(1) NOT NULL DEFAULT 0,
  `BaleConfigJson` LONGTEXT NULL,
  `ThirdPersonDigitalSignCompleteSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `ThirdPersonDigitalSignLinkSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `ThirdPersonDigitalSignOtpSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `InquiryBankInRegister` TINYINT(1) NOT NULL DEFAULT 0,
  `InquiryPersonInfoInRegister` TINYINT(1) NOT NULL DEFAULT 0,
  `InquiryPostalAddressInRegister` TINYINT(1) NOT NULL DEFAULT 0,
  `EmzameConfigJson` LONGTEXT NULL,
  `OverDueDayGapPeriod` INT NOT NULL DEFAULT 0,
  `HafezPayamConfigJson` LONGTEXT NULL,
  `NewLoanRequestNotificationSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `NewLoanRequestNotificationSmsReceiptors` VARCHAR(25) NULL,
  `SendOverDueRememberToGuarantorSmsActive` TINYINT(1) NOT NULL DEFAULT 0,
  `InquirySanaInRegister` TINYINT(1) NOT NULL DEFAULT 0,
  `GuarantorOverDueDateSmsPatternId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `GuarantorOverDueDaysCount` INT NOT NULL DEFAULT 0,
  `ZibalMerchantCode` VARCHAR(50) NULL,
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
  `AgentMetaDataId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `WalletIsLock` TINYINT(1) NOT NULL DEFAULT 0,
  `BirthDate` DATETIME(6) NULL,
  `__raw_BirthDate` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  `ReliabilityId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `UserCode` VARCHAR(25) NULL,
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

CREATE TABLE `AssuranceChequeItem` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `DueDate` DATETIME(6) NULL,
  `__raw_DueDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `FileName` VARCHAR(25) NULL,
  `ChequeNumber` VARCHAR(10) NULL,
  `SayadiId` VARCHAR(12) NULL,
  `Price` DECIMAL(18,2) NOT NULL,
  `AssuranceId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `IsCollected` TINYINT(1) NOT NULL DEFAULT 0,
  `IsReturned` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AssuranceRequirementItems` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Title` VARCHAR(50) NULL,
  `Order` INT NOT NULL,
  `AssuranceRequirementId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AssuranceRequirements` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Title` VARCHAR(50) NULL,
  `Order` INT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Assurances` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Description` TEXT NULL,
  `FileName` VARCHAR(25) NULL,
  `FileSize` BIGINT NOT NULL,
  `FileType` VARCHAR(10) NULL,
  `UserLoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `AssuranceType` INT NOT NULL DEFAULT 0,
  `GoldWeight` DECIMAL(18,4) NOT NULL,
  `IsReturned` TINYINT(1) NOT NULL DEFAULT 0,
  `OrganizationId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `PersonFullName` VARCHAR(25) NULL,
  `PersonNationalCode` VARCHAR(10) NULL,
  `PersonalCode` VARCHAR(25) NULL,
  `ReturnDateTime` DATETIME(6) NULL,
  `__raw_ReturnDateTime` VARCHAR(40) NOT NULL DEFAULT '0001-01-01T00:00:00.0000000' COMMENT 'Exact original SQL Server temporal value',
  `ReturnedToPerson` VARCHAR(25) NULL,
  `MobileVerified` TINYINT(1) NOT NULL DEFAULT 0,
  `PersonMobile` VARCHAR(25) NULL,
  `CoinType` INT NOT NULL DEFAULT 0,
  `ReturnFileName` VARCHAR(25) NULL,
  `ReturnFileSize` BIGINT NOT NULL DEFAULT 0,
  `ReturnFileType` VARCHAR(10) NULL,
  `GuarantorUserId` BIGINT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `AuthorizationItem` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Title` VARCHAR(50) NULL,
  `Description` LONGTEXT NULL,
  `SystemType` INT NOT NULL,
  `UseIfAlreadyExist` TINYINT(1) NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `BusinessAuthorizationItems` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `AuthorizationItemId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Cost` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
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

CREATE TABLE `CustomerOrders` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Name` VARCHAR(50) NULL,
  `NationalCode` VARCHAR(10) NULL,
  `Phone` VARCHAR(10) NULL,
  `ProductName` VARCHAR(100) NULL,
  `Description` VARCHAR(500) NULL,
  `IsSeen` TINYINT(1) NOT NULL,
  `CallResult` VARCHAR(500) NULL,
  `SaveDate` DATETIME(6) NULL,
  `__raw_SaveDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
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

CREATE TABLE `EmzameContractAuthorizationItems` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserLoanRequestAuthorizationItemId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `UserLoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `UserId` BIGINT NULL,
  `ContractJson` LONGTEXT NULL,
  `AuthorizationItemId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Comment` LONGTEXT NULL,
  `Tag` VARCHAR(50) NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_EmzameContractAuthorizationItems_UserLoanRequest_7b8b8c6b` (`UserLoanRequestAuthorizationItemId`)
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

CREATE TABLE `InquirySettings` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `AppInquiryType` INT NOT NULL,
  `ApiIR_PriceFrom` DECIMAL(18,2) NOT NULL,
  `ApiIR_PriceTo` DECIMAL(18,2) NOT NULL,
  `ApiIR_IsActive` TINYINT(1) NOT NULL,
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

CREATE TABLE `LoanAssuranceRequirements` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `AssuranceRequirementsJson` LONGTEXT NULL,
  `LoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
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
  `LoanProfitType` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `LoanTags` (
  `LoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `TagId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`LoanId`, `TagId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `MemberAuthorizationItemAttachments` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `MemberAuthorizationItemId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Attachment` VARCHAR(50) NULL,
  `MemberDescription` VARCHAR(500) NULL,
  `AttachmentByAdmin` TINYINT(1) NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `MemberAuthorizationItems` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `MemberId` BIGINT NOT NULL,
  `AuthorizationItemId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `CreateDate` DATETIME(6) NULL,
  `__raw_CreateDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `LastChangeDate` DATETIME(6) NULL,
  `__raw_LastChangeDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `LastChangeBy` VARCHAR(50) NULL,
  `MemberDescription` LONGTEXT NULL,
  `AdminDescription` VARCHAR(500) NULL,
  `Tag` LONGTEXT NULL,
  `Status` INT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
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
  `AgentFactorId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `SepehrJson` LONGTEXT NULL,
  `ZibalJson` LONGTEXT NULL,
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
  `Provider` INT NOT NULL DEFAULT 0,
  `ShahinJson` LONGTEXT NULL,
  `ShahinResultJson` LONGTEXT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Organization` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Name` VARCHAR(25) NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Product` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Code` VARCHAR(5) NULL,
  `Name` VARCHAR(100) NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
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
  `ZarinPalRefId` LONGTEXT NULL,
  `ZarinPalStatus` INT NOT NULL,
  `IsPaymentSuccess` TINYINT(1) NOT NULL,
  `AffCode` VARCHAR(10) NULL,
  `LoanCount` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Reliability` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Title` VARCHAR(25) NULL,
  `Color` VARCHAR(5) NULL,
  `From` INT NOT NULL,
  `To` INT NOT NULL,
  `RowType` INT NOT NULL,
  `IsNewLoanLock` TINYINT(1) NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Count` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `SiteContents` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Key` VARCHAR(50) NULL,
  `Content` LONGTEXT NULL,
  `IsJson` TINYINT(1) NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
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
  `IppanelKeysJson` LONGTEXT NULL,
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

CREATE TABLE `Tags` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Title` VARCHAR(50) NULL,
  `TagCategory` INT NOT NULL,
  `IsPublic` TINYINT(1) NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ThirdPartySettings` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `DefaultThirdParty` INT NOT NULL,
  `LandaSettingsJson` LONGTEXT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `DigibileSettingsJson` LONGTEXT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ThirdPartyTransfer` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `EntityId` VARCHAR(25) NULL,
  `EntityType` VARCHAR(25) NULL,
  `LandaJson` LONGTEXT NULL,
  `EntityTag` VARCHAR(125) NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `NikanJson` LONGTEXT NULL,
  `DigibileJson` LONGTEXT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ThirdPersonAssuranceAuthorizationItems` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Code` INT NOT NULL AUTO_INCREMENT,
  `UserLoanRequestAuthorizationItemId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `UserLoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `UserId` BIGINT NULL,
  `IsSigned` TINYINT(1) NOT NULL,
  `LastChangeDate` DATETIME(6) NULL,
  `__raw_LastChangeDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `AuthorizationItemId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Comment` LONGTEXT NULL,
  `Tag` LONGTEXT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_auto_Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `TicketResponses` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `CreatedAt` DATETIME(6) NULL,
  `__raw_CreatedAt` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Description` LONGTEXT NULL,
  `FileName` VARCHAR(50) NULL,
  `FromAdmin` TINYINT(1) NOT NULL,
  `IsSeen` TINYINT(1) NOT NULL,
  `TicketId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Role` INT NOT NULL,
  `CreatedById` BIGINT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Tickets` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Code` INT NOT NULL AUTO_INCREMENT,
  `CreatedAt` DATETIME(6) NULL,
  `__raw_CreatedAt` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Title` VARCHAR(125) NULL,
  `Status` INT NOT NULL,
  `Role` INT NOT NULL,
  `ResponseCount` INT NOT NULL,
  `AsMessage` TINYINT(1) NOT NULL,
  `CreatedById` BIGINT NOT NULL,
  `TargetRole` INT NOT NULL,
  `TargetUserId` BIGINT NULL,
  `UserLoanId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `UserLoanRequestId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `LastModifiedAt` DATETIME(6) NULL,
  `__raw_LastModifiedAt` VARCHAR(40) NOT NULL DEFAULT '0001-01-01T00:00:00.0000000' COMMENT 'Exact original SQL Server temporal value',
  PRIMARY KEY (`Id`),
  KEY `IX_auto_Code` (`Code`)
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

CREATE TABLE `UserLoanPaymentOthers` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserLoanPaymentId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `SavedBy` VARCHAR(25) NULL,
  `SaveDate` DATETIME(6) NULL,
  `__raw_SaveDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `PaymentMethod` INT NOT NULL,
  `IsGoldCheckouted` TINYINT(1) NOT NULL,
  `GoldWeight` DOUBLE NOT NULL,
  `GoldRate` DOUBLE NOT NULL,
  `Description` VARCHAR(500) NULL,
  `MemberPurchaseId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
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
  `SentBeforeDueDateEmail` TINYINT(1) NOT NULL DEFAULT 0,
  `SentBeforeDueDateSms` TINYINT(1) NOT NULL DEFAULT 0,
  `SentDueDateEmail` TINYINT(1) NOT NULL DEFAULT 0,
  `SentOverDueDateEmail` TINYINT(1) NOT NULL DEFAULT 0,
  `SumAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `LastOverDueSmsDate` DATETIME(6) NULL,
  `__raw_LastOverDueSmsDate` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  `Discount` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `LastGuarantorOverDueSmsDate` DATETIME(6) NULL,
  `__raw_LastGuarantorOverDueSmsDate` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  PRIMARY KEY (`Id`),
  KEY `IX_auto_Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserLoanProduct` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Price` DECIMAL(18,2) NOT NULL,
  `Count` DECIMAL(18,2) NOT NULL,
  `ProductId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
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
  `MemberDescription` LONGTEXT NULL,
  `AdminDescription` VARCHAR(500) NULL,
  `Status` INT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `AttachmentByAdmin` TINYINT(1) NOT NULL DEFAULT 0,
  `Code` INT NOT NULL AUTO_INCREMENT,
  `Tag` LONGTEXT NULL,
  `EmzameContractAuthorizationItemId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_auto_Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserLoanRequestProduct` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Price` DECIMAL(18,2) NOT NULL,
  `Count` DECIMAL(18,2) NOT NULL,
  `ProductId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
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
  `RefahBetaInquiryAmount` BIGINT NOT NULL DEFAULT 0,
  `RefahBetaOrderId` BIGINT NOT NULL DEFAULT 0,
  `OtherPercent_CheckoutDays` INT NOT NULL DEFAULT 0,
  `OtherPercent_Percent` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `Products` LONGTEXT NULL,
  `LastSponsorComment` VARCHAR(500) NULL,
  `SponsorId` BIGINT NULL,
  `UserLoanSponsorStatus` INT NOT NULL DEFAULT 0,
  `ChargeTypeTitle` VARCHAR(50) NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_auto_Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `UserLoanRequestSponsorHistory` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserId` BIGINT NOT NULL,
  `UserLoanRequestId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `DateTime` DATETIME(6) NULL,
  `__raw_DateTime` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Subject` VARCHAR(50) NULL,
  `Description` VARCHAR(500) NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
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
  `Status` VARCHAR(25) NULL,
  `CustomProfitPercent` DECIMAL(18,2) NULL,
  `CreateAt` DATETIME(6) NULL,
  `__raw_CreateAt` VARCHAR(40) NOT NULL DEFAULT '0001-01-01T00:00:00.0000000' COMMENT 'Exact original SQL Server temporal value',
  `RefahBetaInquiryAmount` BIGINT NOT NULL DEFAULT 0,
  `RefahBetaOrderId` BIGINT NOT NULL DEFAULT 0,
  `Discount` DECIMAL(18,2) NOT NULL DEFAULT 0.0,
  `IsCanceled` TINYINT(1) NOT NULL DEFAULT 0,
  `SecondaryCode` VARCHAR(25) NULL,
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

CREATE TABLE `UserRefahBeta` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ModifiedAt` DATETIME(6) NULL,
  `__raw_ModifiedAt` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Message` VARCHAR(125) NULL,
  `Amount` BIGINT NOT NULL,
  `IsSuccess` TINYINT(1) NOT NULL,
  `UserId` BIGINT NOT NULL,
  `CustomerId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
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

CREATE TABLE `WithdrawAgentFactor` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `WithdrawId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `AgentFactorId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
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
  `FileName2` VARCHAR(25) NULL,
  `FileName3` VARCHAR(25) NULL,
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
CREATE INDEX `IX_AgentFactorItem_AgentFactorId` ON `AgentFactorItem` (`AgentFactorId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentFactorItem_CustomerId` ON `AgentFactorItem` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentFactors_AgentId` ON `AgentFactors` (`AgentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentFactors_CustomerId` ON `AgentFactors` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentFactors_MemberId` ON `AgentFactors` (`MemberId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentFactors_MemberPurchaseId` ON `AgentFactors` (`MemberPurchaseId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoanAuthorizationItem_AuthorizationItemId` ON `AgentLoanAuthorizationItem` (`AuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoanAuthorizationItem_CustomerId` ON `AgentLoanAuthorizationItem` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoanAuthorizationItem_LoanId` ON `AgentLoanAuthorizationItem` (`LoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoans_AgentId` ON `AgentLoans` (`AgentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoans_ContactId` ON `AgentLoans` (`ContactId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoans_CustomerId` ON `AgentLoans` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentLoans_LoanId` ON `AgentLoans` (`LoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AgentMetaData_CustomerId` ON `AgentMetaData` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppEmails_CustomerId` ON `AppEmails` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppInquirys_CustomerId` ON `AppInquirys` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppInquirys_MemberId` ON `AppInquirys` (`MemberId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_AgentFactorPaymentLinkSmsPatternId` ON `AppSettings` (`AgentFactorPaymentLinkSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_BeforeDueDateEmailPatternId` ON `AppSettings` (`BeforeDueDateEmailPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_BeforeDueDateSmsPatternId` ON `AppSettings` (`BeforeDueDateSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_CustomerId` ON `AppSettings` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_DigitalSignCompleteSmsPatternId` ON `AppSettings` (`DigitalSignCompleteSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_DigitalSignLinkSmsPatternId` ON `AppSettings` (`DigitalSignLinkSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_DigitalSignOtpSmsPatternId` ON `AppSettings` (`DigitalSignOtpSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_DueDateRememberEmailPatternId` ON `AppSettings` (`DueDateRememberEmailPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_DueDateRememberSmsPatternId` ON `AppSettings` (`DueDateRememberSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_GuarantorOverDueDateSmsPatternId` ON `AppSettings` (`GuarantorOverDueDateSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_LoginEmailPatternId` ON `AppSettings` (`LoginEmailPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_LoginSmsPatternId` ON `AppSettings` (`LoginSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_NewLoanRequestNotificationSmsPatternId` ON `AppSettings` (`NewLoanRequestNotificationSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_NewOrderEmailPatternId` ON `AppSettings` (`NewOrderEmailPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_NewOrderSmsPatternId` ON `AppSettings` (`NewOrderSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_NewUserLoanSmsPatternId` ON `AppSettings` (`NewUserLoanSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_OverDueDateEmailPatternId` ON `AppSettings` (`OverDueDateEmailPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_OverDueDateSmsPatternId` ON `AppSettings` (`OverDueDateSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_RegisterEmailPatternId` ON `AppSettings` (`RegisterEmailPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_RegisterOtpEmailPatternId` ON `AppSettings` (`RegisterOtpEmailPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_RegisterOtpSmsPatternId` ON `AppSettings` (`RegisterOtpSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_RegisterSmsPatternId` ON `AppSettings` (`RegisterSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_ThanksPaymentEmailPatternId` ON `AppSettings` (`ThanksPaymentEmailPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_ThanksPaymentSmsPatternId` ON `AppSettings` (`ThanksPaymentSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_ThirdPersonDigitalSignCompleteSmsPatternId` ON `AppSettings` (`ThirdPersonDigitalSignCompleteSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_ThirdPersonDigitalSignLinkSmsPatternId` ON `AppSettings` (`ThirdPersonDigitalSignLinkSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_ThirdPersonDigitalSignOtpSmsPatternId` ON `AppSettings` (`ThirdPersonDigitalSignOtpSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_WalletChargeEmailPatternId` ON `AppSettings` (`WalletChargeEmailPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_WalletChargeSmsPatternId` ON `AppSettings` (`WalletChargeSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_WalletWithdrawNotificationSmsPatternId` ON `AppSettings` (`WalletWithdrawNotificationSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_WalletWithdrawOtpEmailPatternId` ON `AppSettings` (`WalletWithdrawOtpEmailPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSettings_WalletWithdrawOtpSmsPatternId` ON `AppSettings` (`WalletWithdrawOtpSmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AppSms_CustomerId` ON `AppSms` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetRoleClaims_RoleId` ON `AspNetRoleClaims` (`RoleId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUserClaims_UserId` ON `AspNetUserClaims` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUserLogins_UserId` ON `AspNetUserLogins` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUserRoles_RoleId` ON `AspNetUserRoles` (`RoleId`); -- SQL Server filter: NULL
CREATE INDEX `EmailIndex` ON `AspNetUsers` (`NormalizedEmail`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUsers_AgentId` ON `AspNetUsers` (`AgentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUsers_CustomerId` ON `AspNetUsers` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUsers_CustomerMarketerId` ON `AspNetUsers` (`CustomerMarketerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUsers_ReliabilityId` ON `AspNetUsers` (`ReliabilityId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AssuranceChequeItem_AssuranceId` ON `AssuranceChequeItem` (`AssuranceId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AssuranceRequirementItems_AssuranceRequirementId` ON `AssuranceRequirementItems` (`AssuranceRequirementId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AssuranceRequirementItems_CustomerId` ON `AssuranceRequirementItems` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AssuranceRequirements_CustomerId` ON `AssuranceRequirements` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Assurances_GuarantorUserId` ON `Assurances` (`GuarantorUserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Assurances_OrganizationId` ON `Assurances` (`OrganizationId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Assurances_UserLoanId` ON `Assurances` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AuthorizationItem_CustomerId` ON `AuthorizationItem` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_BusinessAuthorizationItems_AuthorizationItemId` ON `BusinessAuthorizationItems` (`AuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_BusinessAuthorizationItems_CustomerId` ON `BusinessAuthorizationItems` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Contacts_CustomerId` ON `Contacts` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_CustomerMarketerCommissions_MarketerId` ON `CustomerMarketerCommissions` (`MarketerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_CustomerMarketerCommissions_UserLoanId` ON `CustomerMarketerCommissions` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_CustomerOrders_CustomerId` ON `CustomerOrders` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_CustomerPurchasePlan_CustomerId` ON `CustomerPurchasePlan` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_CustomerPurchasePlan_PurchaseId` ON `CustomerPurchasePlan` (`PurchaseId`); -- SQL Server filter: NULL
CREATE INDEX `IX_EmzameContractAuthorizationItems_AuthorizationItemId` ON `EmzameContractAuthorizationItems` (`AuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_EmzameContractAuthorizationItems_UserId` ON `EmzameContractAuthorizationItems` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_EmzameContractAuthorizationItems_UserLoanId` ON `EmzameContractAuthorizationItems` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Expenses_CustomerId` ON `Expenses` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_IceReport_CustomerId` ON `IceReport` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_IceReport_MemberId` ON `IceReport` (`MemberId`); -- SQL Server filter: NULL
CREATE INDEX `IX_IranValidityReport_CustomerId` ON `IranValidityReport` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_IranValidityReport_MemberId` ON `IranValidityReport` (`MemberId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanAssuranceRequirements_CustomerId` ON `LoanAssuranceRequirements` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanAssuranceRequirements_LoanId` ON `LoanAssuranceRequirements` (`LoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanAuthorizationItems_AuthorizationItemId` ON `LoanAuthorizationItems` (`AuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanAuthorizationItems_CustomerId` ON `LoanAuthorizationItems` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanAuthorizationItems_LoanId` ON `LoanAuthorizationItems` (`LoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanContacts_ContactId` ON `LoanContacts` (`ContactId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanContacts_CustomerId` ON `LoanContacts` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanContacts_LoanId` ON `LoanContacts` (`LoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanRequestStatuses_CustomerId` ON `LoanRequestStatuses` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanRequestStatuses_SmsPatternId` ON `LoanRequestStatuses` (`SmsPatternId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Loans_CustomerId` ON `Loans` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_LoanTags_TagId` ON `LoanTags` (`TagId`); -- SQL Server filter: NULL
CREATE INDEX `IX_MemberAuthorizationItemAttachments_MemberAuthori_03345b8d` ON `MemberAuthorizationItemAttachments` (`MemberAuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_MemberAuthorizationItems_AuthorizationItemId` ON `MemberAuthorizationItems` (`AuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_MemberAuthorizationItems_MemberId` ON `MemberAuthorizationItems` (`MemberId`); -- SQL Server filter: NULL
CREATE INDEX `IX_MemberPurchases_AgentFactorId` ON `MemberPurchases` (`AgentFactorId`); -- SQL Server filter: NULL
CREATE INDEX `IX_MemberPurchases_CreatorUserId` ON `MemberPurchases` (`CreatorUserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_MemberPurchases_UserId` ON `MemberPurchases` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_MemberPurchases_UserLoanPaymentId` ON `MemberPurchases` (`UserLoanPaymentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_OffDate_CustomerId` ON `OffDate` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_OnlineMoneyTransfer_CustomerId` ON `OnlineMoneyTransfer` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_OnlineMoneyTransfer_TransactionId` ON `OnlineMoneyTransfer` (`TransactionId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Organization_CustomerId` ON `Organization` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Product_CustomerId` ON `Product` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Purchases_CustomerId` ON `Purchases` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Purchases_UserId` ON `Purchases` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Reliability_CustomerId` ON `Reliability` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_SiteContents_CustomerId` ON `SiteContents` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_SmsPatterns_CustomerId` ON `SmsPatterns` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_SubAgentTransactions_CustomerId` ON `SubAgentTransactions` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_SubAgentTransactions_UserLoanId` ON `SubAgentTransactions` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Tags_CustomerId` ON `Tags` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_ThirdPartySettings_CustomerId` ON `ThirdPartySettings` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_ThirdPartyTransfer_CustomerId` ON `ThirdPartyTransfer` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_ThirdPersonAssuranceAuthorizationItems_Authoriza_00ff0c13` ON `ThirdPersonAssuranceAuthorizationItems` (`AuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_ThirdPersonAssuranceAuthorizationItems_UserId` ON `ThirdPersonAssuranceAuthorizationItems` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_ThirdPersonAssuranceAuthorizationItems_UserLoanId` ON `ThirdPersonAssuranceAuthorizationItems` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_ThirdPersonAssuranceAuthorizationItems_UserLoanR_8fc62ae1` ON `ThirdPersonAssuranceAuthorizationItems` (`UserLoanRequestAuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_TicketResponses_CreatedById` ON `TicketResponses` (`CreatedById`); -- SQL Server filter: NULL
CREATE INDEX `IX_TicketResponses_CustomerId` ON `TicketResponses` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_TicketResponses_TicketId` ON `TicketResponses` (`TicketId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Tickets_CreatedById` ON `Tickets` (`CreatedById`); -- SQL Server filter: NULL
CREATE INDEX `IX_Tickets_CustomerId` ON `Tickets` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Tickets_TargetUserId` ON `Tickets` (`TargetUserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Tickets_UserLoanId` ON `Tickets` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Tickets_UserLoanRequestId` ON `Tickets` (`UserLoanRequestId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanContact_ContactId` ON `UserLoanContact` (`ContactId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanContact_CustomerId` ON `UserLoanContact` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanContact_UserLoanId` ON `UserLoanContact` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanContact_UserLoanId1` ON `UserLoanContact` (`UserLoanId1`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanPaymentOthers_MemberPurchaseId` ON `UserLoanPaymentOthers` (`MemberPurchaseId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanPaymentOthers_UserLoanPaymentId` ON `UserLoanPaymentOthers` (`UserLoanPaymentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanPaymentRequests_AdminAcceptorId` ON `UserLoanPaymentRequests` (`AdminAcceptorId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanPaymentRequests_UserLoanPaymentId` ON `UserLoanPaymentRequests` (`UserLoanPaymentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanPayments_UserLoanId` ON `UserLoanPayments` (`UserLoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanProduct_CustomerId` ON `UserLoanProduct` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanProduct_ProductId` ON `UserLoanProduct` (`ProductId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestAuthorizationItemAttachments_User_4a91d687` ON `UserLoanRequestAuthorizationItemAttachments` (`UserLoanRequestAuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestAuthorizationItems_AuthorizationItemId` ON `UserLoanRequestAuthorizationItems` (`AuthorizationItemId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestAuthorizationItems_UserLoanRequestId` ON `UserLoanRequestAuthorizationItems` (`UserLoanRequestId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestProduct_CustomerId` ON `UserLoanRequestProduct` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestProduct_ProductId` ON `UserLoanRequestProduct` (`ProductId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequests_AgentId` ON `UserLoanRequests` (`AgentId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequests_AgentStatusId` ON `UserLoanRequests` (`AgentStatusId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequests_LoanId` ON `UserLoanRequests` (`LoanId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequests_SponsorId` ON `UserLoanRequests` (`SponsorId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequests_StatusId` ON `UserLoanRequests` (`StatusId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequests_UserId` ON `UserLoanRequests` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestSponsorHistory_UserId` ON `UserLoanRequestSponsorHistory` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserLoanRequestSponsorHistory_UserLoanRequestId` ON `UserLoanRequestSponsorHistory` (`UserLoanRequestId`); -- SQL Server filter: NULL
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
CREATE INDEX `IX_UserRefahBeta_CustomerId` ON `UserRefahBeta` (`CustomerId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserRefahBeta_UserId` ON `UserRefahBeta` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_UserSavedMonies_MemberId` ON `UserSavedMonies` (`MemberId`); -- SQL Server filter: NULL
CREATE INDEX `IX_WithdrawAgentFactor_AgentFactorId` ON `WithdrawAgentFactor` (`AgentFactorId`); -- SQL Server filter: NULL
CREATE INDEX `IX_WithdrawAgentFactor_WithdrawId` ON `WithdrawAgentFactor` (`WithdrawId`); -- SQL Server filter: NULL
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
ALTER TABLE `AgentFactorItem` ADD CONSTRAINT `FK_AgentFactorItem_AgentFactors_AgentFactorId` FOREIGN KEY (`AgentFactorId`) REFERENCES `AgentFactors` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AgentFactorItem` ADD CONSTRAINT `FK_AgentFactorItem_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AgentFactors` ADD CONSTRAINT `FK_AgentFactors_AspNetUsers_AgentId` FOREIGN KEY (`AgentId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AgentFactors` ADD CONSTRAINT `FK_AgentFactors_AspNetUsers_MemberId` FOREIGN KEY (`MemberId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AgentFactors` ADD CONSTRAINT `FK_AgentFactors_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AgentFactors` ADD CONSTRAINT `FK_AgentFactors_MemberPurchases_MemberPurchaseId` FOREIGN KEY (`MemberPurchaseId`) REFERENCES `MemberPurchases` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AgentLoanAuthorizationItem` ADD CONSTRAINT `FK_AgentLoanAuthorizationItem_AuthorizationItem_Aut_f9f85199` FOREIGN KEY (`AuthorizationItemId`) REFERENCES `AuthorizationItem` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AgentLoanAuthorizationItem` ADD CONSTRAINT `FK_AgentLoanAuthorizationItem_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AgentLoanAuthorizationItem` ADD CONSTRAINT `FK_AgentLoanAuthorizationItem_Loans_LoanId` FOREIGN KEY (`LoanId`) REFERENCES `Loans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AgentLoans` ADD CONSTRAINT `FK_AgentLoans_AspNetUsers_AgentId` FOREIGN KEY (`AgentId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AgentLoans` ADD CONSTRAINT `FK_AgentLoans_Contacts_ContactId` FOREIGN KEY (`ContactId`) REFERENCES `Contacts` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AgentLoans` ADD CONSTRAINT `FK_AgentLoans_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AgentLoans` ADD CONSTRAINT `FK_AgentLoans_Loans_LoanId` FOREIGN KEY (`LoanId`) REFERENCES `Loans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AgentMetaData` ADD CONSTRAINT `FK_AgentMetaData_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AgentMetaData` ADD CONSTRAINT `FK_AgentMetaData_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppEmails` ADD CONSTRAINT `FK_AppEmails_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppInquirys` ADD CONSTRAINT `FK_AppInquirys_AspNetUsers_MemberId` FOREIGN KEY (`MemberId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppInquirys` ADD CONSTRAINT `FK_AppInquirys_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_AgentFactorPaymentLinkSm_893069b7` FOREIGN KEY (`AgentFactorPaymentLinkSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_BeforeDueDateEmailPatternId` FOREIGN KEY (`BeforeDueDateEmailPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_BeforeDueDateSmsPatternId` FOREIGN KEY (`BeforeDueDateSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_DigitalSignCompleteSmsPatternId` FOREIGN KEY (`DigitalSignCompleteSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_DigitalSignLinkSmsPatternId` FOREIGN KEY (`DigitalSignLinkSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_DigitalSignOtpSmsPatternId` FOREIGN KEY (`DigitalSignOtpSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_DueDateRememberEmailPatternId` FOREIGN KEY (`DueDateRememberEmailPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_DueDateRememberSmsPatternId` FOREIGN KEY (`DueDateRememberSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_GuarantorOverDueDateSmsPatternId` FOREIGN KEY (`GuarantorOverDueDateSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_LoginEmailPatternId` FOREIGN KEY (`LoginEmailPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_LoginSmsPatternId` FOREIGN KEY (`LoginSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_NewLoanRequestNotificati_27306b11` FOREIGN KEY (`NewLoanRequestNotificationSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_NewOrderEmailPatternId` FOREIGN KEY (`NewOrderEmailPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_NewOrderSmsPatternId` FOREIGN KEY (`NewOrderSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_NewUserLoanSmsPatternId` FOREIGN KEY (`NewUserLoanSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_OverDueDateEmailPatternId` FOREIGN KEY (`OverDueDateEmailPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_OverDueDateSmsPatternId` FOREIGN KEY (`OverDueDateSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_RegisterEmailPatternId` FOREIGN KEY (`RegisterEmailPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_RegisterOtpEmailPatternId` FOREIGN KEY (`RegisterOtpEmailPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_RegisterOtpSmsPatternId` FOREIGN KEY (`RegisterOtpSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_RegisterSmsPatternId` FOREIGN KEY (`RegisterSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_ThanksPaymentEmailPatternId` FOREIGN KEY (`ThanksPaymentEmailPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_ThanksPaymentSmsPatternId` FOREIGN KEY (`ThanksPaymentSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_ThirdPersonDigitalSignCo_9f0c1fb5` FOREIGN KEY (`ThirdPersonDigitalSignCompleteSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_ThirdPersonDigitalSignLi_4a658aca` FOREIGN KEY (`ThirdPersonDigitalSignLinkSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_ThirdPersonDigitalSignOt_a5c6e547` FOREIGN KEY (`ThirdPersonDigitalSignOtpSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_WalletChargeEmailPatternId` FOREIGN KEY (`WalletChargeEmailPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_WalletChargeSmsPatternId` FOREIGN KEY (`WalletChargeSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_WalletWithdrawNotificati_4de9ab87` FOREIGN KEY (`WalletWithdrawNotificationSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_WalletWithdrawOtpEmailPatternId` FOREIGN KEY (`WalletWithdrawOtpEmailPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSettings` ADD CONSTRAINT `FK_AppSettings_SmsPatterns_WalletWithdrawOtpSmsPatternId` FOREIGN KEY (`WalletWithdrawOtpSmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AppSms` ADD CONSTRAINT `FK_AppSms_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AspNetRoleClaims` ADD CONSTRAINT `FK_AspNetRoleClaims_AspNetRoles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `AspNetRoles` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AspNetUserClaims` ADD CONSTRAINT `FK_AspNetUserClaims_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AspNetUserLogins` ADD CONSTRAINT `FK_AspNetUserLogins_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AspNetUserRoles` ADD CONSTRAINT `FK_AspNetUserRoles_AspNetRoles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `AspNetRoles` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AspNetUserRoles` ADD CONSTRAINT `FK_AspNetUserRoles_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AspNetUsers` ADD CONSTRAINT `FK_AspNetUsers_AspNetUsers_AgentId` FOREIGN KEY (`AgentId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AspNetUsers` ADD CONSTRAINT `FK_AspNetUsers_AspNetUsers_CustomerMarketerId` FOREIGN KEY (`CustomerMarketerId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AspNetUsers` ADD CONSTRAINT `FK_AspNetUsers_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AspNetUsers` ADD CONSTRAINT `FK_AspNetUsers_Reliability_ReliabilityId` FOREIGN KEY (`ReliabilityId`) REFERENCES `Reliability` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AspNetUserTokens` ADD CONSTRAINT `FK_AspNetUserTokens_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AssuranceChequeItem` ADD CONSTRAINT `FK_AssuranceChequeItem_Assurances_AssuranceId` FOREIGN KEY (`AssuranceId`) REFERENCES `Assurances` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AssuranceRequirementItems` ADD CONSTRAINT `FK_AssuranceRequirementItems_AssuranceRequirements__800ad989` FOREIGN KEY (`AssuranceRequirementId`) REFERENCES `AssuranceRequirements` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `AssuranceRequirementItems` ADD CONSTRAINT `FK_AssuranceRequirementItems_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AssuranceRequirements` ADD CONSTRAINT `FK_AssuranceRequirements_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Assurances` ADD CONSTRAINT `FK_Assurances_AspNetUsers_GuarantorUserId` FOREIGN KEY (`GuarantorUserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Assurances` ADD CONSTRAINT `FK_Assurances_Organization_OrganizationId` FOREIGN KEY (`OrganizationId`) REFERENCES `Organization` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Assurances` ADD CONSTRAINT `FK_Assurances_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `AuthorizationItem` ADD CONSTRAINT `FK_AuthorizationItem_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `BusinessAuthorizationItems` ADD CONSTRAINT `FK_BusinessAuthorizationItems_AuthorizationItem_Aut_acef41ff` FOREIGN KEY (`AuthorizationItemId`) REFERENCES `AuthorizationItem` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `BusinessAuthorizationItems` ADD CONSTRAINT `FK_BusinessAuthorizationItems_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Contacts` ADD CONSTRAINT `FK_Contacts_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `CustomerMarketerCommissions` ADD CONSTRAINT `FK_CustomerMarketerCommissions_AspNetUsers_MarketerId` FOREIGN KEY (`MarketerId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `CustomerMarketerCommissions` ADD CONSTRAINT `FK_CustomerMarketerCommissions_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `CustomerOrders` ADD CONSTRAINT `FK_CustomerOrders_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `CustomerPurchasePlan` ADD CONSTRAINT `FK_CustomerPurchasePlan_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `CustomerPurchasePlan` ADD CONSTRAINT `FK_CustomerPurchasePlan_Purchases_PurchaseId` FOREIGN KEY (`PurchaseId`) REFERENCES `Purchases` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `EmzameContractAuthorizationItems` ADD CONSTRAINT `FK_EmzameContractAuthorizationItems_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `EmzameContractAuthorizationItems` ADD CONSTRAINT `FK_EmzameContractAuthorizationItems_AuthorizationIt_ef1aacb6` FOREIGN KEY (`AuthorizationItemId`) REFERENCES `AuthorizationItem` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `EmzameContractAuthorizationItems` ADD CONSTRAINT `FK_EmzameContractAuthorizationItems_UserLoanRequest_02934c87` FOREIGN KEY (`UserLoanRequestAuthorizationItemId`) REFERENCES `UserLoanRequestAuthorizationItems` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `EmzameContractAuthorizationItems` ADD CONSTRAINT `FK_EmzameContractAuthorizationItems_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Expenses` ADD CONSTRAINT `FK_Expenses_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `IceReport` ADD CONSTRAINT `FK_IceReport_AspNetUsers_MemberId` FOREIGN KEY (`MemberId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `IceReport` ADD CONSTRAINT `FK_IceReport_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `IranValidityReport` ADD CONSTRAINT `FK_IranValidityReport_AspNetUsers_MemberId` FOREIGN KEY (`MemberId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `IranValidityReport` ADD CONSTRAINT `FK_IranValidityReport_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `LoanAssuranceRequirements` ADD CONSTRAINT `FK_LoanAssuranceRequirements_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `LoanAssuranceRequirements` ADD CONSTRAINT `FK_LoanAssuranceRequirements_Loans_LoanId` FOREIGN KEY (`LoanId`) REFERENCES `Loans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `LoanAuthorizationItems` ADD CONSTRAINT `FK_LoanAuthorizationItems_AuthorizationItem_Authori_50b0d37b` FOREIGN KEY (`AuthorizationItemId`) REFERENCES `AuthorizationItem` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `LoanAuthorizationItems` ADD CONSTRAINT `FK_LoanAuthorizationItems_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `LoanAuthorizationItems` ADD CONSTRAINT `FK_LoanAuthorizationItems_Loans_LoanId` FOREIGN KEY (`LoanId`) REFERENCES `Loans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `LoanContacts` ADD CONSTRAINT `FK_LoanContacts_Contacts_ContactId` FOREIGN KEY (`ContactId`) REFERENCES `Contacts` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `LoanContacts` ADD CONSTRAINT `FK_LoanContacts_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `LoanContacts` ADD CONSTRAINT `FK_LoanContacts_Loans_LoanId` FOREIGN KEY (`LoanId`) REFERENCES `Loans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `LoanRequestStatuses` ADD CONSTRAINT `FK_LoanRequestStatuses_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `LoanRequestStatuses` ADD CONSTRAINT `FK_LoanRequestStatuses_SmsPatterns_SmsPatternId` FOREIGN KEY (`SmsPatternId`) REFERENCES `SmsPatterns` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Loans` ADD CONSTRAINT `FK_Loans_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `LoanTags` ADD CONSTRAINT `FK_LoanTags_Loans_LoanId` FOREIGN KEY (`LoanId`) REFERENCES `Loans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `LoanTags` ADD CONSTRAINT `FK_LoanTags_Tags_TagId` FOREIGN KEY (`TagId`) REFERENCES `Tags` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `MemberAuthorizationItemAttachments` ADD CONSTRAINT `FK_MemberAuthorizationItemAttachments_MemberAuthori_235c4105` FOREIGN KEY (`MemberAuthorizationItemId`) REFERENCES `MemberAuthorizationItems` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `MemberAuthorizationItems` ADD CONSTRAINT `FK_MemberAuthorizationItems_AspNetUsers_MemberId` FOREIGN KEY (`MemberId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `MemberAuthorizationItems` ADD CONSTRAINT `FK_MemberAuthorizationItems_AuthorizationItem_Autho_a60dc34b` FOREIGN KEY (`AuthorizationItemId`) REFERENCES `AuthorizationItem` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `MemberPurchases` ADD CONSTRAINT `FK_MemberPurchases_AgentFactors_AgentFactorId` FOREIGN KEY (`AgentFactorId`) REFERENCES `AgentFactors` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `MemberPurchases` ADD CONSTRAINT `FK_MemberPurchases_AspNetUsers_CreatorUserId` FOREIGN KEY (`CreatorUserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `MemberPurchases` ADD CONSTRAINT `FK_MemberPurchases_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `MemberPurchases` ADD CONSTRAINT `FK_MemberPurchases_UserLoanPayments_UserLoanPaymentId` FOREIGN KEY (`UserLoanPaymentId`) REFERENCES `UserLoanPayments` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `OffDate` ADD CONSTRAINT `FK_OffDate_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `OnlineMoneyTransfer` ADD CONSTRAINT `FK_OnlineMoneyTransfer_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `OnlineMoneyTransfer` ADD CONSTRAINT `FK_OnlineMoneyTransfer_Withdraws_TransactionId` FOREIGN KEY (`TransactionId`) REFERENCES `Withdraws` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Organization` ADD CONSTRAINT `FK_Organization_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `Product` ADD CONSTRAINT `FK_Product_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Purchases` ADD CONSTRAINT `FK_Purchases_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `Purchases` ADD CONSTRAINT `FK_Purchases_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Reliability` ADD CONSTRAINT `FK_Reliability_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `SiteContents` ADD CONSTRAINT `FK_SiteContents_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `SmsPatterns` ADD CONSTRAINT `FK_SmsPatterns_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `SubAgentTransactions` ADD CONSTRAINT `FK_SubAgentTransactions_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `SubAgentTransactions` ADD CONSTRAINT `FK_SubAgentTransactions_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Tags` ADD CONSTRAINT `FK_Tags_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ThirdPartySettings` ADD CONSTRAINT `FK_ThirdPartySettings_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `ThirdPartyTransfer` ADD CONSTRAINT `FK_ThirdPartyTransfer_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `ThirdPersonAssuranceAuthorizationItems` ADD CONSTRAINT `FK_ThirdPersonAssuranceAuthorizationItems_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ThirdPersonAssuranceAuthorizationItems` ADD CONSTRAINT `FK_ThirdPersonAssuranceAuthorizationItems_Authoriza_6df73568` FOREIGN KEY (`AuthorizationItemId`) REFERENCES `AuthorizationItem` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `ThirdPersonAssuranceAuthorizationItems` ADD CONSTRAINT `FK_ThirdPersonAssuranceAuthorizationItems_UserLoanR_5aa17799` FOREIGN KEY (`UserLoanRequestAuthorizationItemId`) REFERENCES `UserLoanRequestAuthorizationItems` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `ThirdPersonAssuranceAuthorizationItems` ADD CONSTRAINT `FK_ThirdPersonAssuranceAuthorizationItems_UserLoans_61aa4fdd` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `TicketResponses` ADD CONSTRAINT `FK_TicketResponses_AspNetUsers_CreatedById` FOREIGN KEY (`CreatedById`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `TicketResponses` ADD CONSTRAINT `FK_TicketResponses_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `TicketResponses` ADD CONSTRAINT `FK_TicketResponses_Tickets_TicketId` FOREIGN KEY (`TicketId`) REFERENCES `Tickets` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `Tickets` ADD CONSTRAINT `FK_Tickets_AspNetUsers_CreatedById` FOREIGN KEY (`CreatedById`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Tickets` ADD CONSTRAINT `FK_Tickets_AspNetUsers_TargetUserId` FOREIGN KEY (`TargetUserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Tickets` ADD CONSTRAINT `FK_Tickets_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Tickets` ADD CONSTRAINT `FK_Tickets_UserLoanRequests_UserLoanRequestId` FOREIGN KEY (`UserLoanRequestId`) REFERENCES `UserLoanRequests` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Tickets` ADD CONSTRAINT `FK_Tickets_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanContact` ADD CONSTRAINT `FK_UserLoanContact_Contacts_ContactId` FOREIGN KEY (`ContactId`) REFERENCES `Contacts` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanContact` ADD CONSTRAINT `FK_UserLoanContact_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanContact` ADD CONSTRAINT `FK_UserLoanContact_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanContact` ADD CONSTRAINT `FK_UserLoanContact_UserLoans_UserLoanId1` FOREIGN KEY (`UserLoanId1`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanPaymentOthers` ADD CONSTRAINT `FK_UserLoanPaymentOthers_MemberPurchases_MemberPurchaseId` FOREIGN KEY (`MemberPurchaseId`) REFERENCES `MemberPurchases` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanPaymentOthers` ADD CONSTRAINT `FK_UserLoanPaymentOthers_UserLoanPayments_UserLoanPaymentId` FOREIGN KEY (`UserLoanPaymentId`) REFERENCES `UserLoanPayments` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanPaymentRequests` ADD CONSTRAINT `FK_UserLoanPaymentRequests_AspNetUsers_AdminAcceptorId` FOREIGN KEY (`AdminAcceptorId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanPaymentRequests` ADD CONSTRAINT `FK_UserLoanPaymentRequests_UserLoanPayments_UserLoa_bdc17b62` FOREIGN KEY (`UserLoanPaymentId`) REFERENCES `UserLoanPayments` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanPayments` ADD CONSTRAINT `FK_UserLoanPayments_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanProduct` ADD CONSTRAINT `FK_UserLoanProduct_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanProduct` ADD CONSTRAINT `FK_UserLoanProduct_Product_ProductId` FOREIGN KEY (`ProductId`) REFERENCES `Product` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestAuthorizationItemAttachments` ADD CONSTRAINT `FK_UserLoanRequestAuthorizationItemAttachments_User_78300cdf` FOREIGN KEY (`UserLoanRequestAuthorizationItemId`) REFERENCES `UserLoanRequestAuthorizationItems` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestAuthorizationItems` ADD CONSTRAINT `FK_UserLoanRequestAuthorizationItems_AuthorizationI_94b0f049` FOREIGN KEY (`AuthorizationItemId`) REFERENCES `AuthorizationItem` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestAuthorizationItems` ADD CONSTRAINT `FK_UserLoanRequestAuthorizationItems_UserLoanReques_d1a3046a` FOREIGN KEY (`UserLoanRequestId`) REFERENCES `UserLoanRequests` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestProduct` ADD CONSTRAINT `FK_UserLoanRequestProduct_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestProduct` ADD CONSTRAINT `FK_UserLoanRequestProduct_Product_ProductId` FOREIGN KEY (`ProductId`) REFERENCES `Product` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequests` ADD CONSTRAINT `FK_UserLoanRequests_AspNetUsers_AgentId` FOREIGN KEY (`AgentId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequests` ADD CONSTRAINT `FK_UserLoanRequests_AspNetUsers_SponsorId` FOREIGN KEY (`SponsorId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequests` ADD CONSTRAINT `FK_UserLoanRequests_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequests` ADD CONSTRAINT `FK_UserLoanRequests_LoanRequestStatuses_AgentStatusId` FOREIGN KEY (`AgentStatusId`) REFERENCES `LoanRequestStatuses` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequests` ADD CONSTRAINT `FK_UserLoanRequests_LoanRequestStatuses_StatusId` FOREIGN KEY (`StatusId`) REFERENCES `LoanRequestStatuses` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequests` ADD CONSTRAINT `FK_UserLoanRequests_Loans_LoanId` FOREIGN KEY (`LoanId`) REFERENCES `Loans` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestSponsorHistory` ADD CONSTRAINT `FK_UserLoanRequestSponsorHistory_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `UserLoanRequestSponsorHistory` ADD CONSTRAINT `FK_UserLoanRequestSponsorHistory_UserLoanRequests_U_636fdf45` FOREIGN KEY (`UserLoanRequestId`) REFERENCES `UserLoanRequests` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
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
ALTER TABLE `UserRefahBeta` ADD CONSTRAINT `FK_UserRefahBeta_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserRefahBeta` ADD CONSTRAINT `FK_UserRefahBeta_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `UserSavedMonies` ADD CONSTRAINT `FK_UserSavedMonies_AspNetUsers_MemberId` FOREIGN KEY (`MemberId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `WithdrawAgentFactor` ADD CONSTRAINT `FK_WithdrawAgentFactor_AgentFactors_AgentFactorId` FOREIGN KEY (`AgentFactorId`) REFERENCES `AgentFactors` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `WithdrawAgentFactor` ADD CONSTRAINT `FK_WithdrawAgentFactor_Withdraws_WithdrawId` FOREIGN KEY (`WithdrawId`) REFERENCES `Withdraws` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_AspNetUsers_AgentId` FOREIGN KEY (`AgentId`) REFERENCES `AspNetUsers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_Contacts_ContactId` FOREIGN KEY (`ContactId`) REFERENCES `Contacts` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_CustomerMarketerCommissions_CustomerMa_7f86a044` FOREIGN KEY (`CustomerMarketerCommissionId`) REFERENCES `CustomerMarketerCommissions` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_Customers_CustomerId` FOREIGN KEY (`CustomerId`) REFERENCES `Customers` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_Loans_SponsoredLoanId` FOREIGN KEY (`SponsoredLoanId`) REFERENCES `Loans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_UserLoanContact_UserLoanContactId` FOREIGN KEY (`UserLoanContactId`) REFERENCES `UserLoanContact` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `Withdraws` ADD CONSTRAINT `FK_Withdraws_UserLoans_UserLoanId` FOREIGN KEY (`UserLoanId`) REFERENCES `UserLoans` (`Id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE `HangFire__JobParameter` ADD CONSTRAINT `FK_HangFire_JobParameter_Job` FOREIGN KEY (`JobId`) REFERENCES `HangFire__Job` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `HangFire__State` ADD CONSTRAINT `FK_HangFire_State_Job` FOREIGN KEY (`JobId`) REFERENCES `HangFire__Job` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE;


CREATE DATABASE IF NOT EXISTS `vamcitydigibilepay_bluvamdb` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `vamcitydigibilepay_bluvamdb`;
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


CREATE DATABASE IF NOT EXISTS `vamcitydigibilepay_transferdb` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `vamcitydigibilepay_transferdb`;
CREATE TABLE `OnlineMoneyTransfer____EFMigrationsHistory` (
  `MigrationId` VARCHAR(75) NOT NULL,
  `ProductVersion` VARCHAR(16) NOT NULL,
  PRIMARY KEY (`MigrationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OnlineMoneyTransfer__AspNetRoleClaims` (
  `Id` INT NOT NULL AUTO_INCREMENT,
  `RoleId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ClaimType` LONGTEXT NULL,
  `ClaimValue` LONGTEXT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OnlineMoneyTransfer__AspNetRoles` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `DisplayName` VARCHAR(25) NULL,
  `IsSystem` TINYINT(1) NOT NULL,
  `Name` VARCHAR(128) NULL,
  `NormalizedName` VARCHAR(128) NULL,
  `ConcurrencyStamp` LONGTEXT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `RoleNameIndex` (`NormalizedName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OnlineMoneyTransfer__AspNetUserClaims` (
  `Id` INT NOT NULL AUTO_INCREMENT,
  `UserId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `ClaimType` LONGTEXT NULL,
  `ClaimValue` LONGTEXT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OnlineMoneyTransfer__AspNetUserLogins` (
  `LoginProvider` VARCHAR(225) NOT NULL,
  `ProviderKey` VARCHAR(225) NOT NULL,
  `ProviderDisplayName` LONGTEXT NULL,
  `UserId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`LoginProvider`, `ProviderKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OnlineMoneyTransfer__AspNetUserRoles` (
  `UserId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `RoleId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`UserId`, `RoleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OnlineMoneyTransfer__AspNetUsers` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `FirstName` VARCHAR(50) NULL,
  `LastName` VARCHAR(50) NULL,
  `IsActive` TINYINT(1) NOT NULL,
  `ImageFileName` LONGTEXT NULL,
  `NationalCode` VARCHAR(5) NULL,
  `UserName` VARCHAR(128) NULL,
  `NormalizedUserName` VARCHAR(128) NULL,
  `Email` VARCHAR(128) NULL,
  `NormalizedEmail` VARCHAR(128) NULL,
  `EmailConfirmed` TINYINT(1) NOT NULL,
  `PasswordHash` LONGTEXT NULL,
  `SecurityStamp` LONGTEXT NULL,
  `ConcurrencyStamp` LONGTEXT NULL,
  `PhoneNumber` VARCHAR(10) NULL,
  `PhoneNumberConfirmed` TINYINT(1) NOT NULL,
  `TwoFactorEnabled` TINYINT(1) NOT NULL,
  `LockoutEnd` VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `LockoutEnabled` TINYINT(1) NOT NULL,
  `AccessFailedCount` INT NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `UserNameIndex` (`NormalizedUserName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OnlineMoneyTransfer__AspNetUserTokens` (
  `UserId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `LoginProvider` VARCHAR(225) NOT NULL,
  `Name` VARCHAR(225) NOT NULL,
  `Value` LONGTEXT NULL,
  PRIMARY KEY (`UserId`, `LoginProvider`, `Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OnlineMoneyTransfer__Client` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Name` VARCHAR(50) NULL,
  `ValidIps` VARCHAR(100) NULL,
  `ValidMobile` VARCHAR(25) NULL,
  `UserName` VARCHAR(25) NULL,
  `PasswordHash` VARCHAR(250) NULL,
  `IsActive` TINYINT(1) NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OnlineMoneyTransfer__RefreshToken` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `UserId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Token` VARCHAR(225) NULL,
  `Expires` DATETIME(6) NULL,
  `__raw_Expires` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Created` DATETIME(6) NULL,
  `__raw_Created` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `Revoked` DATETIME(6) NULL,
  `__raw_Revoked` VARCHAR(40) NULL COMMENT 'Exact original SQL Server temporal value',
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_RefreshToken_Token` (`Token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OnlineMoneyTransfer__Settings` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Key` LONGTEXT NULL,
  `Value` LONGTEXT NULL,
  `ApplicationType` INT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OnlineMoneyTransfer__Transfer` (
  `Id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `Amount` DECIMAL(18,2) NOT NULL,
  `CreateDate` DATETIME(6) NULL,
  `__raw_CreateDate` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `From` VARCHAR(25) NULL,
  `To` VARCHAR(25) NULL,
  `ToName` LONGTEXT NULL,
  `OTP` VARCHAR(5) NULL,
  `OTPGenerateDateTime` DATETIME(6) NULL,
  `__raw_OTPGenerateDateTime` VARCHAR(40) NOT NULL COMMENT 'Exact original SQL Server temporal value',
  `TransferStep` INT NOT NULL,
  `ClientTraceNumber` VARCHAR(25) NULL,
  `Cif` VARCHAR(25) NULL,
  `IsSuccess` TINYINT(1) NOT NULL,
  `EFardaJson` LONGTEXT NULL,
  `RequestFromIp` VARCHAR(25) NULL,
  `ClientId` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX `IX_AspNetRoleClaims_RoleId` ON `OnlineMoneyTransfer__AspNetRoleClaims` (`RoleId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUserClaims_UserId` ON `OnlineMoneyTransfer__AspNetUserClaims` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUserLogins_UserId` ON `OnlineMoneyTransfer__AspNetUserLogins` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_AspNetUserRoles_RoleId` ON `OnlineMoneyTransfer__AspNetUserRoles` (`RoleId`); -- SQL Server filter: NULL
CREATE INDEX `EmailIndex` ON `OnlineMoneyTransfer__AspNetUsers` (`NormalizedEmail`); -- SQL Server filter: NULL
CREATE INDEX `IX_RefreshToken_UserId` ON `OnlineMoneyTransfer__RefreshToken` (`UserId`); -- SQL Server filter: NULL
CREATE INDEX `IX_Transfer_ClientId` ON `OnlineMoneyTransfer__Transfer` (`ClientId`); -- SQL Server filter: NULL
ALTER TABLE `OnlineMoneyTransfer__AspNetRoleClaims` ADD CONSTRAINT `FK_AspNetRoleClaims_AspNetRoles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `OnlineMoneyTransfer__AspNetRoles` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `OnlineMoneyTransfer__AspNetUserClaims` ADD CONSTRAINT `FK_AspNetUserClaims_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `OnlineMoneyTransfer__AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `OnlineMoneyTransfer__AspNetUserLogins` ADD CONSTRAINT `FK_AspNetUserLogins_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `OnlineMoneyTransfer__AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `OnlineMoneyTransfer__AspNetUserRoles` ADD CONSTRAINT `FK_AspNetUserRoles_AspNetRoles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `OnlineMoneyTransfer__AspNetRoles` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `OnlineMoneyTransfer__AspNetUserRoles` ADD CONSTRAINT `FK_AspNetUserRoles_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `OnlineMoneyTransfer__AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `OnlineMoneyTransfer__AspNetUserTokens` ADD CONSTRAINT `FK_AspNetUserTokens_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `OnlineMoneyTransfer__AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `OnlineMoneyTransfer__RefreshToken` ADD CONSTRAINT `FK_RefreshToken_AspNetUsers_UserId` FOREIGN KEY (`UserId`) REFERENCES `OnlineMoneyTransfer__AspNetUsers` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE `OnlineMoneyTransfer__Transfer` ADD CONSTRAINT `FK_Transfer_Client_ClientId` FOREIGN KEY (`ClientId`) REFERENCES `OnlineMoneyTransfer__Client` (`Id`) ON DELETE CASCADE ON UPDATE RESTRICT;


SET FOREIGN_KEY_CHECKS=1;
