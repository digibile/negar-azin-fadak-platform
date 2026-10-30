using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Identity;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Security;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Infrastructure.Storage;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Identity.Domain.Authentication;
using NegarAzinFadak.Identity.Domain.Users;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// Private documents must be unreadable without a grant, and a storage key must never be able to escape
/// its tenant directory.
/// </summary>
public sealed class FileSystemDocumentStorageTests : IDisposable
{
    private static readonly Guid TenantId = Guid.Parse("dddddddd-0000-0000-0000-00000000000d");
    private static readonly Guid OwnerId = Guid.Parse("eeeeeeee-0000-0000-0000-00000000000e");

    private readonly string _root = Path.Combine(
        Path.GetTempPath(),
        "negar-document-tests",
        Guid.NewGuid().ToString("N"));

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }

    [Fact]
    public async Task A_stored_document_is_hashed_and_never_served_from_a_public_path()
    {
        var storage = CreateStorage();
        var bytes = new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 };

        var stored = await storage.StoreAsync(new MemoryStream(bytes), "image/jpeg", "jpg", TenantId, OwnerId);

        Assert.True(stored.IsSuccess);
        var value = stored.Value!;
        Assert.Equal("image/jpeg", value.ContentType);
        Assert.Equal(bytes.Length, value.SizeInBytes);
        Assert.Equal(64, value.Sha256Hash.Length);

        // The key is laid out tenant/owner/object so a leaked key identifies neither a tenant's
        // directory listing nor another owner's objects, and never traverses upwards.
        Assert.StartsWith($"{TenantId:N}/{OwnerId:N}/", value.StorageKey, StringComparison.Ordinal);
        Assert.EndsWith(".jpg", value.StorageKey, StringComparison.Ordinal);
        Assert.DoesNotContain("..", value.StorageKey, StringComparison.Ordinal);
    }

    [Fact]
    public async Task An_expiring_link_points_at_the_authorized_api_endpoint_and_expires()
    {
        var storage = CreateStorage();
        var stored = (await storage.StoreAsync(new MemoryStream([9, 9, 9]), "image/png", ".png", TenantId, OwnerId)).Value!;

        var link = await storage.CreateExpiringLinkAsync(stored.StorageKey, TimeSpan.FromMinutes(2));

        Assert.True(link.IsSuccess);
        Assert.StartsWith("http://localhost:5000/api/v1/identity/documents/content/", link.Value!.Url.ToString(), StringComparison.Ordinal);
        Assert.Contains("expiresIn=", link.Value.Url.Query, StringComparison.Ordinal);
        Assert.True(link.Value.ExpiresAt > DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task A_traversal_key_is_refused_instead_of_escaping_the_storage_root()
    {
        var storage = CreateStorage();

        var opened = await storage.OpenReadAsync("../../secrets.txt");
        var linked = await storage.CreateExpiringLinkAsync("../outside.png", TimeSpan.FromMinutes(1));

        Assert.Equal(IdentityErrors.DocumentAccessDenied, opened.FirstError!);
        Assert.Equal(IdentityErrors.DocumentAccessDenied, linked.FirstError!);
    }

    [Fact]
    public async Task A_sibling_directory_sharing_the_roots_prefix_is_not_inside_the_root()
    {
        var storage = CreateStorage();

        // A directory beside the storage root whose name merely begins with the root's own characters.
        // A key that reaches it resolves to a path which starts with the root as a string but is not a
        // descendant of it, so a containment test that forgets the trailing separator hands out its files.
        var siblingName = $"{Path.GetFileName(_root)}-private";
        var sibling = Path.Combine(Path.GetDirectoryName(_root)!, siblingName);
        Directory.CreateDirectory(sibling);
        await File.WriteAllTextAsync(Path.Combine(sibling, "other-tenant-document.jpg"), "not yours");

        var escapingKey = $"../{siblingName}/other-tenant-document.jpg";
        var opened = await storage.OpenReadAsync(escapingKey);
        var linked = await storage.CreateExpiringLinkAsync(escapingKey, TimeSpan.FromMinutes(1));

        Assert.Equal(IdentityErrors.DocumentAccessDenied, opened.FirstError!);
        Assert.Equal(IdentityErrors.DocumentAccessDenied, linked.FirstError!);
    }

    [Fact]
    public async Task An_unknown_key_reports_not_found()
    {
        var storage = CreateStorage();

        var opened = await storage.OpenReadAsync("does/not/exist.jpg");

        Assert.Equal(IdentityErrors.DocumentNotFound, opened.FirstError!);
    }

    [Fact]
    public async Task A_deleted_document_can_no_longer_be_opened()
    {
        var storage = CreateStorage();
        var stored = (await storage.StoreAsync(new MemoryStream([1]), "image/jpeg", "jpg", TenantId, OwnerId)).Value!;

        var deleted = await storage.DeleteAsync(stored.StorageKey);
        var reopened = await storage.OpenReadAsync(stored.StorageKey);

        Assert.True(deleted.IsSuccess);
        Assert.Equal(IdentityErrors.DocumentNotFound, reopened.FirstError!);
    }

    [Fact]
    public async Task Rate_limit_counters_increase_inside_the_window_and_reset_after_it()
    {
        using var factory = new SqliteContextFactory();
        var clock = new SteppingClock(new DateTimeOffset(2026, 3, 1, 8, 30, 0, TimeSpan.Zero));
        var store = new DatabaseRateLimitCounterStore(factory.Context, clock);

        Assert.Equal(1, await store.IncrementAsync("otp:issue:Login:+989121110001", TimeSpan.FromHours(1)));
        Assert.Equal(2, await store.IncrementAsync("otp:issue:Login:+989121110001", TimeSpan.FromHours(1)));
        Assert.Equal(2, await store.GetAsync("otp:issue:Login:+989121110001", TimeSpan.FromHours(1)));

        clock.Advance(TimeSpan.FromHours(2));

        Assert.Equal(0, await store.GetAsync("otp:issue:Login:+989121110001", TimeSpan.FromHours(1)));
        Assert.Equal(1, await store.IncrementAsync("otp:issue:Login:+989121110001", TimeSpan.FromHours(1)));
    }

    [Fact]
    public async Task Otp_issuance_is_blocked_once_the_configured_budget_is_spent()
    {
        using var factory = new SqliteContextFactory();
        var clock = new SteppingClock(SqliteContextFactory.FixedTime);
        var rateLimits = new DatabaseRateLimitCounterStore(factory.Context, clock);
        var sms = new RecordingSmsSender();
        var otp = new OtpService(
            sms,
            new TestSecretProtector(),
            rateLimits,
            clock,
            Options.Create(new NegarAzinFadak.Application.Options.OtpOptions
            {
                MaxIssuesPerTargetPerHour = 2
            }),
            NullLogger<OtpService>.Instance);

        var target = NegarAzinFadak.Core.Primitives.MobileNumber.Create("+989121110002");

        var first = otp.CreateChallenge(target, OtpPurpose.Login);
        var second = otp.CreateChallenge(target, OtpPurpose.Login);
        var third = otp.CreateChallenge(target, OtpPurpose.Login);

        var firstDelivery = await otp.DeliverAsync(first.Value!);
        var secondDelivery = await otp.DeliverAsync(second.Value!);
        var thirdDelivery = await otp.DeliverAsync(third.Value!);

        Assert.True(firstDelivery.IsSuccess);
        Assert.True(secondDelivery.IsSuccess);
        Assert.False(thirdDelivery.IsSuccess);
        Assert.Equal(2, sms.Sent.Count);
    }

    private FileSystemDocumentStorage CreateStorage()
        => new(
            Options.Create(new DocumentStorageOptions
            {
                RootPath = _root,
                PublicBaseAddress = "http://localhost:5000",
                LinkLifetime = TimeSpan.FromMinutes(5)
            }),
            NullLogger<FileSystemDocumentStorage>.Instance);

    private sealed class SteppingClock(DateTimeOffset now) : IClock
    {
        public DateTimeOffset UtcNow { get; private set; } = now;

        public DateOnly Today => DateOnly.FromDateTime(UtcNow.UtcDateTime);

        public void Advance(TimeSpan delta) => UtcNow += delta;
    }

    private sealed class RecordingSmsSender : NegarAzinFadak.Application.Abstractions.Notifications.ISmsSender
    {
        public List<string> Sent { get; } = [];

        public string Code => "recording";

        public Task<Result<NegarAzinFadak.Application.Abstractions.Notifications.NotificationDeliveryResult>> SendAsync(
            NegarAzinFadak.Core.Primitives.MobileNumber target,
            string body,
            CancellationToken cancellationToken = default)
        {
            Sent.Add(body);
            return Task.FromResult(Result<NegarAzinFadak.Application.Abstractions.Notifications.NotificationDeliveryResult>.Success(
                new NegarAzinFadak.Application.Abstractions.Notifications.NotificationDeliveryResult(Code, "1", true, null)));
        }
    }

    private sealed class TestSecretProtector : ISecretProtector
    {
        public string Protect(string plainText) => plainText;

        public string Unprotect(string protectedText) => protectedText;

        public string ComputeDigest(string plainText)
            => Convert.ToHexString(
                System.Security.Cryptography.SHA256.HashData(
                    System.Text.Encoding.UTF8.GetBytes(plainText))[..4]).ToLowerInvariant();
    }
}
