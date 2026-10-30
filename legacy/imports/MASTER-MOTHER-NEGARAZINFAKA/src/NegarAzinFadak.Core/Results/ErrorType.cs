namespace NegarAzinFadak.Core.Results;

/// <summary>Classification of a failure, used by the API layer to map to a transport-level status code.</summary>
public enum ErrorType
{
    /// <summary>No failure. Only present so that <see cref="Error.None"/> is well-typed.</summary>
    None = 0,

    /// <summary>Input failed structural or semantic validation. Maps to HTTP 400.</summary>
    Validation = 1,

    /// <summary>Caller is not authenticated. Maps to HTTP 401.</summary>
    Unauthorized = 2,

    /// <summary>Caller is authenticated but not permitted. Maps to HTTP 403.</summary>
    Forbidden = 3,

    /// <summary>Requested aggregate or resource does not exist. Maps to HTTP 404.</summary>
    NotFound = 4,

    /// <summary>Operation conflicts with current state, e.g. uniqueness or concurrency.</summary>
    Conflict = 5,

    /// <summary>Caller exceeded a rate or quota limit. Maps to HTTP 429.</summary>
    RateLimited = 6,

    /// <summary>Caller attempted an operation the domain forbids, e.g. an illegal state transition.</summary>
    DomainRule = 7,

    /// <summary>Unclassified failure. Maps to HTTP 500 and is never used to hide a defect.</summary>
    Unexpected = 8
}
