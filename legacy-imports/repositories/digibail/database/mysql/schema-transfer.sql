-- Source: vamcityc_transferDb_import_20261028
-- Target database: vamcitydigibilepay_transferdb (create/select before import)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

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
