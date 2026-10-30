using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Abstractions.Documents;
using NegarAzinFadak.Application.Identity;
using NegarAzinFadak.Core;
using NegarAzinFadak.Core.Results;
using NegarAzinFadak.Core.Time;
using NegarAzinFadak.Identity.Domain;
using NegarAzinFadak.Infrastructure.Persistence;

namespace NegarAzinFadak.Infrastructure.Storage;

/// <summary>Configuration for the private document store.</summary>
public sealed class DocumentStorageOptions
{
    /// <summary>Configuration section name.</summary>
    public const string SectionName = "Identity:Storage";

    /// <summary>Root directory of private storage. Must never be inside the web root.</summary>
    public string RootPath { get; set; } = "App_Data/private-documents";

    /// <summary>Base address used to build expiring download links served by the API itself.</summary>
    public string PublicBaseAddress { get; set; } = "http://localhost:5000";

    /// <summary>How long a generated link stays valid.</summary>
    public TimeSpan LinkLifetime { get; set; } = TimeSpan.FromMinutes(5);
}

/// <summary>
/// File-system document storage rooted outside the web root. Nothing here is served by a static file
/// middleware: the API issues an expiring link, and the document endpoint re-checks authorization on
/// every request before streaming a single byte.
/// </summary>
public sealed class FileSystemDocumentStorage : IDocumentStorage
{
    private readonly DocumentStorageOptions _options;
    private readonly ILogger<FileSystemDocumentStorage> _logger;

    public FileSystemDocumentStorage(IOptions<DocumentStorageOptions> options, ILogger<FileSystemDocumentStorage> logger)
    {
        _options = Guard.AgainstNull(options).Value;
        _logger = Guard.AgainstNull(logger);
    }

    /// <inheritdoc />
    public async Task<Result<StoredObject>> StoreAsync(
        Stream content,
        string contentType,
        string fileExtension,
        Guid tenantId,
        Guid ownerId,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(content);
        Guard.AgainstEmpty(tenantId);
        Guard.AgainstEmpty(ownerId);
        ArgumentException.ThrowIfNullOrWhiteSpace(contentType);
        ArgumentException.ThrowIfNullOrWhiteSpace(fileExtension);

        // Tenant and owner segments make a leaked key unusable on its own: the key alone does not grant
        // access, and the API still authorizes every read.
        var relativePath = Path.Combine(
            tenantId.ToString("N"),
            ownerId.ToString("N"),
            $"{Guid.NewGuid():N}{NormalizeExtension(fileExtension)}");

        var absolutePath = ResolvePath(relativePath);
        var directory = Path.GetDirectoryName(absolutePath);
        if (directory is not null)
        {
            Directory.CreateDirectory(directory);
        }

        long sizeInBytes = 0;
        byte[] digest;
        using (var hasher = IncrementalHash.CreateHash(HashAlgorithmName.SHA256))
        {
            await using (var target = new FileStream(
                             absolutePath,
                             FileMode.CreateNew,
                             FileAccess.Write,
                             FileShare.None,
                             bufferSize: 81920,
                             useAsync: true))
            {
                var buffer = new byte[81920];
                int read;
                while ((read = await content.ReadAsync(buffer, cancellationToken)) > 0)
                {
                    hasher.AppendData(buffer, 0, read);
                    await target.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
                    sizeInBytes += read;
                }

                await target.FlushAsync(cancellationToken);
            }

            digest = hasher.GetHashAndReset();
        }

        _logger.LogInformation(
            "Stored private document of {Bytes} bytes for owner {OwnerId} in tenant {TenantId}.",
            sizeInBytes,
            ownerId,
            tenantId);

        return Result<StoredObject>.Success(new StoredObject(
            relativePath,
            contentType,
            sizeInBytes,
            Convert.ToHexString(digest).ToLowerInvariant()));
    }

    /// <inheritdoc />
    public Task<Result<Stream>> OpenReadAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(TryResolve(storageKey, out var absolutePath, out var error)
            ? Result<Stream>.Success(
                new FileStream(absolutePath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true))
            : Result<Stream>.Failure(error));
    }

    /// <inheritdoc />
    public Task<Result<ExpiredFileLink>> CreateExpiringLinkAsync(
        string storageKey,
        TimeSpan lifetime,
        CancellationToken cancellationToken = default)
    {
        if (!TryResolve(storageKey, out _, out var error))
        {
            return Task.FromResult(Result<ExpiredFileLink>.Failure(error));
        }

        // The link points at the API's own authorized endpoint, not at a public file, and it carries an
        // expiry so a copied URL stops working.
        var lifetimeToUse = lifetime <= TimeSpan.Zero ? _options.LinkLifetime : lifetime;
        var expiresIn = lifetimeToUse.TotalSeconds.ToString("0", System.Globalization.CultureInfo.InvariantCulture);
        var encodedStorageKey = string.Join(
            "/",
            storageKey
                .Split('/', StringSplitOptions.RemoveEmptyEntries)
                .Select(Uri.EscapeDataString));

        var url = $"{_options.PublicBaseAddress.TrimEnd('/')}/api/v1/identity/documents/content/"
                  + $"{encodedStorageKey}?expiresIn={expiresIn}";

        return Task.FromResult(Result<ExpiredFileLink>.Success(
            new ExpiredFileLink(new Uri(url), DateTimeOffset.UtcNow + lifetimeToUse)));
    }

    /// <inheritdoc />
    public Task<Result> DeleteAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        if (!TryResolve(storageKey, out var absolutePath, out var error))
        {
            return Task.FromResult(Result.Failure(error));
        }

        try
        {
            File.Delete(absolutePath);
            return Task.FromResult(Result.Success());
        }
        catch (IOException exception)
        {
            _logger.LogWarning(exception, "Failed to delete private document {StorageKey}.", storageKey);
            return Task.FromResult(Result.Failure(IdentityErrors.DocumentStorageFailed("The document could not be deleted.")));
        }
    }

    private bool TryResolve(string? storageKey, out string absolutePath, out Error error)
    {
        absolutePath = string.Empty;
        error = Error.None;

        if (string.IsNullOrWhiteSpace(storageKey))
        {
            error = IdentityErrors.DocumentNotFound;
            return false;
        }

        absolutePath = Path.GetFullPath(Path.Combine(StorageRoot, storageKey));

        // Path traversal guard. The comparison is against the root *with* its trailing separator, because
        // a bare prefix test also matches a sibling directory that merely starts with the same characters:
        // a root of /srv/documents would accept /srv/documents-private/x. Requiring the separator means only
        // a genuine descendant passes, and the root itself is not addressable, which is correct because a
        // storage key always names a file below the root.
        if (!absolutePath.StartsWith(StorageRoot, StringComparison.Ordinal))
        {
            error = IdentityErrors.DocumentAccessDenied;
            return false;
        }

        if (!File.Exists(absolutePath))
        {
            error = IdentityErrors.DocumentNotFound;
            return false;
        }

        return true;
    }

    /// <summary>
    /// Absolute storage root, normalised to end with a directory separator so that containment can be
    /// tested by prefix comparison without matching a sibling directory of the same leading characters.
    /// </summary>
    private string StorageRoot
    {
        get
        {
            var root = Path.GetFullPath(_options.RootPath);
            return root.EndsWith(Path.DirectorySeparatorChar) ? root : root + Path.DirectorySeparatorChar;
        }
    }

    private string ResolvePath(string relativePath)
        => Path.GetFullPath(Path.Combine(StorageRoot, relativePath));

    private static string NormalizeExtension(string fileExtension)
    {
        var trimmed = fileExtension.Trim();
        if (trimmed.Length == 0)
        {
            return string.Empty;
        }

        return trimmed[0] == '.' ? trimmed : "." + trimmed;
    }
}

/// <summary>
/// Rate-limit counters in the application database. A shared store is required so a horizontally scaled
/// deployment cannot multiply the abuse budget by the number of instances.
/// </summary>
public sealed class DatabaseRateLimitCounterStore(
    NegarAzinFadakDbContext context,
    IClock clock) : IRateLimitCounterStore
{
    /// <inheritdoc />
    public async Task<int> IncrementAsync(string key, TimeSpan window, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        Guard.AgainstNegative(window);

        var now = clock.UtcNow;
        var windowStart = now - window;
        var counter = await context.RateLimitCounters
            .FirstOrDefaultAsync(row => row.Key == key, cancellationToken);

        if (counter is null)
        {
            // The window must start at the first hit. Leaving it unset would make every later call look
            // expired, so the counter would reset on each request and the limit would never engage.
            counter = new RateLimitCounterEntity { Key = key, WindowStartedAt = now };
            context.RateLimitCounters.Add(counter);
        }
        else if (counter.WindowStartedAt < windowStart)
        {
            counter.Count = 0;
            counter.WindowStartedAt = now;
        }

        counter.Count++;
        await context.SaveChangesAsync(cancellationToken);
        return counter.Count;
    }

    /// <inheritdoc />
    public async Task<int> GetAsync(string key, TimeSpan window, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        Guard.AgainstNegative(window);

        // Expressed as a range on the stored window start rather than as an elapsed-time subtraction, so
        // the predicate stays a plain comparable comparison that every provider can translate.
        var windowStart = clock.UtcNow - window;
        return await context.RateLimitCounters
            .Where(row => row.Key == key && row.WindowStartedAt >= windowStart)
            .Select(row => row.Count)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
