using Microsoft.Extensions.Options;
using NegarAzinFadak.Application.Documents;
using NegarAzinFadak.Application.Options;

namespace NegarAzinFadak.Api.Configuration;

/// <summary>
/// Publishes the base document type catalogue at startup.
/// </summary>
/// <remarks>
/// <para>
/// This is the only seeding the identity module does, and it is seeding because a document type is structure
/// rather than business data: it says which kinds of paper the platform understands and how many pages each
/// has. No person, no document and no organization appears in it. What the platform will not do is invent
/// the shapes — they come from the <c>Identity:Documents:Types</c> section, and a deployment that declares
/// none starts with an empty catalogue and an operator who builds it.
/// </para>
/// <para>
/// Reconciled on every start, add-only, for the reasons the permission catalog gives: a deployment that adds
/// a document type must be able to roll that out by restarting, and add-only reconciliation means an operator
/// who adjusted a type in the administration surface keeps their adjustment across the restart. A type that is
/// no longer wanted is deactivated through that surface, which records who did it.
/// </para>
/// <para>
/// It runs after <see cref="DatabaseInitializer"/>, which creates the table it writes to.
/// </para>
/// </remarks>
internal sealed class DocumentTypeCatalogInitializer(
    IServiceScopeFactory scopeFactory,
    IOptions<DocumentOptions> options,
    ILogger<DocumentTypeCatalogInitializer> logger) : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
    private readonly DocumentOptions _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
    private readonly ILogger<DocumentTypeCatalogInitializer> _logger = logger ?? throw new ArgumentNullException(nameof(logger));

    /// <inheritdoc />
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (_options.Types.Count is 0)
        {
            // Not an error. A deployment may deliberately run with no document types and rely on operators to
            // define them, and the options validator has already refused a malformed catalogue, so reaching
            // here means the section is empty rather than wrong.
            _logger.LogWarning(
                "The '{Section}:Types' section declares no document types. No document can be submitted until an operator defines one.",
                DocumentOptions.SectionName);
            return;
        }

        await using var scope = _scopeFactory.CreateAsyncScope();
        var service = scope.ServiceProvider.GetRequiredService<DocumentTypeService>();

        var installed = await service.InstallAsync(_options.Types.ToArray(), cancellationToken).ConfigureAwait(false);
        if (installed.IsFailure)
        {
            // A rejected declaration stops the host, exactly as the permission catalog does. Starting with a
            // partial catalogue would surface as "that document type does not exist" in the middle of a
            // customer's onboarding, hours after the mistake that caused it.
            throw new InvalidOperationException(
                $"The '{DocumentOptions.SectionName}:Types' section is invalid: {installed.FirstError.Description}");
        }

        _logger.LogInformation(
            "Base document type catalogue published: {Added} added, {Total} types in total.",
            installed.Value.Added,
            installed.Value.Total);
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}