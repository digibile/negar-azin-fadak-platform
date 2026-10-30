using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain.Documents;
using NegarAzinFadak.Identity.Domain.Folders;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// The model must be valid and value objects must survive a round trip: a stored national ID that comes
/// back unvalidated, or a scope that loses its branch, would silently corrupt the central identity.
/// </summary>
public sealed class PersistenceMappingTests
{
    private static readonly Guid OrganizationId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid CompanyId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid BranchId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid OperatorId = Guid.Parse("44444444-4444-4444-4444-444444444444");

    private static TenantScope Scope => new(OrganizationId, CompanyId, branchId: BranchId);

    private static ICurrentUser Operator => new CurrentUser(OperatorId, Scope, ["identity.operator"]);

    [Fact]
    public async Task Creates_the_whole_schema_from_the_domain_model()
    {
        using var factory = new SqliteContextFactory(Scope, Operator);

        Assert.True(await factory.Context.Database.CanConnectAsync());
    }

    [Fact]
    public async Task Round_trips_value_objects_and_scope_through_the_store()
    {
        using var factory = new SqliteContextFactory(Scope, Operator);
        var user = NewUser("+989121112233");
        user.Profile!.ApplyUserConfirmedValues(new Dictionary<IdentityField, string?>
        {
            [IdentityField.NationalId] = "0084575948",
            [IdentityField.FirstName] = "زهرا"
        });

        factory.Context.Users.Add(user);
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        var reloaded = await factory.Context.Users
            .Include(candidate => candidate.Profile)
            .SingleAsync(candidate => candidate.Id == user.Id);

        Assert.Equal("+989121112233", reloaded.Mobile.Value);
        Assert.Equal(OrganizationId, reloaded.Scope.OrganizationId);
        Assert.Equal(CompanyId, reloaded.Scope.CompanyId);
        Assert.Equal(BranchId, reloaded.Scope.BranchId);
        Assert.NotNull(reloaded.Profile);
        Assert.Equal("0084575948", reloaded.Profile!.NationalId!.Value);
        Assert.Equal("زهرا", reloaded.Profile.FirstName);
    }

    [Fact]
    public async Task Stamps_audit_fields_from_the_current_principal()
    {
        using var factory = new SqliteContextFactory(Scope, Operator);
        var user = NewUser("+989121112234");

        factory.Context.Users.Add(user);
        await factory.Context.SaveChangesAsync();

        Assert.Equal(SqliteContextFactory.FixedTime, user.CreatedAt);
        Assert.Equal(OperatorId, user.CreatedBy);

        user.ChangeMobile(MobileNumber.Create("+989121112299"), "شماره جدید");
        await factory.Context.SaveChangesAsync();

        Assert.Equal(SqliteContextFactory.FixedTime, user.ModifiedAt);
        Assert.Equal(OperatorId, user.ModifiedBy);
    }

    [Fact]
    public async Task Regenerates_the_concurrency_stamp_on_every_write()
    {
        using var factory = new SqliteContextFactory(Scope, Operator);
        var user = NewUser("+989121112235");

        factory.Context.Users.Add(user);
        await factory.Context.SaveChangesAsync();

        var firstStamp = user.ConcurrencyStamp;
        Assert.NotEmpty(firstStamp);

        user.ChangeMobile(MobileNumber.Create("+989121112240"), "شماره جدید");
        await factory.Context.SaveChangesAsync();

        Assert.NotEqual(firstStamp, user.ConcurrencyStamp);
    }

    [Fact]
    public async Task Stores_document_state_and_json_maps_as_configured()
    {
        using var factory = new SqliteContextFactory(Scope, Operator);
        var user = NewUser("+989121112236");

        var documentType = new DocumentType(
            Guid.NewGuid(),
            "national_id",
            "National Identity Card",
            "کارت ملی",
            DocumentCategory.Identity,
            requiresBackSide: true,
            defaultValidityDays: 3650,
            isIdentityDocument: true);

        var document = IdentityDocument.Create(
            Guid.NewGuid(),
            user.Id,
            documentType.Id,
            Scope,
            "1234567890");

        document.ApplyNormalizedFields(new Dictionary<IdentityField, string?>
        {
            [IdentityField.NationalId] = "0084575948",
            [IdentityField.LastName] = "احمدی"
        });

        factory.Context.AddRange(user, documentType, document);
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        var reloaded = await factory.Context.IdentityDocuments
            .SingleAsync(candidate => candidate.Id == document.Id);

        Assert.Equal(DocumentStatus.PendingVerification, reloaded.Status);
        Assert.Equal("0084575948", reloaded.NormalizedFields[IdentityField.NationalId]);
        Assert.Equal("1234567890", reloaded.ReferenceNumber);
    }

    [Fact]
    public async Task Rejects_a_second_person_with_the_same_national_id()
    {
        using var factory = new SqliteContextFactory(Scope, Operator);
        var first = NewUser("+989121112241");
        first.Profile!.ApplyUserConfirmedValues(new Dictionary<IdentityField, string?>
        {
            [IdentityField.NationalId] = "0084575948"
        });

        var second = NewUser("+989121112242");
        second.Profile!.ApplyUserConfirmedValues(new Dictionary<IdentityField, string?>
        {
            [IdentityField.NationalId] = "0084575948"
        });

        factory.Context.Users.Add(first);
        await factory.Context.SaveChangesAsync();
        factory.Context.Users.Add(second);

        await Assert.ThrowsAsync<DbUpdateException>(() => factory.Context.SaveChangesAsync());
    }

    [Fact]
    public async Task Round_trips_a_bank_account_iban()
    {
        using var factory = new SqliteContextFactory(Scope, Operator);
        var user = NewUser("+989121112243");
        var account = new BankAccount(
            Guid.NewGuid(),
            user.Id,
            "010",
            "1234567890",
            "IR820540102680020817909002",
            bankName: "بانک ملت");

        factory.Context.AddRange(user, account);
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        var reloaded = await factory.Context.BankAccounts.SingleAsync(candidate => candidate.Id == account.Id);

        Assert.Equal("IR820540102680020817909002", reloaded.Iban.Value);
    }

    [Fact]
    public async Task Round_trips_a_digital_folder()
    {
        using var factory = new SqliteContextFactory(Scope, Operator);
        var user = NewUser("+989121112244");
        var folder = DigitalFolder.CreateFor(user.Id, Scope, SqliteContextFactory.FixedTime);

        factory.Context.AddRange(user, folder);
        await factory.Context.SaveChangesAsync();
        factory.Context.ChangeTracker.Clear();

        var reloaded = await factory.Context.DigitalFolders.SingleAsync(candidate => candidate.Id == folder.Id);

        Assert.Equal(user.Id, reloaded.UserId);
        Assert.Equal(Scope, reloaded.Scope);
    }

    private static User NewUser(string mobile)
        => User.Register(Guid.NewGuid(), Scope, MobileNumber.Create(mobile), UserSource.MobileRegistration);
}
