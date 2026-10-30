using NegarAzinFadak.Core.Results;

namespace NegarAzinFadak.Application.Abstractions.Documents;

/// <summary>Metadata of a stored private file. Bytes are never exposed directly; only through expiring links.</summary>
/// <param name="StorageKey">Opaque key inside private storage.</param>
/// <param name="ContentType">MIME type of the object.</param>
/// <param name="SizeInBytes">Size of the object.</param>
/// <param name="Sha256Hash">Digest of the stored bytes.</param>
public sealed record StoredObject(
    string StorageKey,
    string ContentType,
    long SizeInBytes,
    string Sha256Hash);

/// <summary>A time-limited read grant for a private file. Expires, is single-purpose, and is never a public URL.</summary>
/// <param name="Url">Absolute, expiring URL served by the platform's own authorized endpoint.</param>
/// <param name="ExpiresAt">Instant after which the link stops working.</param>
public sealed record ExpiredFileLink(Uri Url, DateTimeOffset ExpiresAt);

/// <summary>
/// Private document storage. Implementations must never place objects under a publicly servable root and
/// must never return a permanent URL: access is granted only through <see cref="CreateExpiringLinkAsync"/>.
/// </summary>
public interface IDocumentStorage
{
    /// <summary>Stores bytes under a tenant-scoped, non-guessable key and returns its metadata.</summary>
    Task<Result<StoredObject>> StoreAsync(
        Stream content,
        string contentType,
        string fileExtension,
        Guid tenantId,
        Guid ownerId,
        CancellationToken cancellationToken = default);

    /// <summary>Opens a stored object for reading. Fails when the key is unknown to the tenant.</summary>
    Task<Result<Stream>> OpenReadAsync(string storageKey, CancellationToken cancellationToken = default);

    /// <summary>Issues a short-lived read link, for previewing a document in a browser tab.</summary>
    Task<Result<ExpiredFileLink>> CreateExpiringLinkAsync(
        string storageKey,
        TimeSpan lifetime,
        CancellationToken cancellationToken = default);

    /// <summary>Removes an object. Used when a rejected capture is discarded.</summary>
    Task<Result> DeleteAsync(string storageKey, CancellationToken cancellationToken = default);
}
