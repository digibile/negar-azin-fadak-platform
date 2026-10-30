namespace NegarAzinFadak.Core.Paging;

/// <summary>Sort direction for a list query.</summary>
public enum SortDirection
{
    /// <summary>Ascending order.</summary>
    Ascending = 0,

    /// <summary>Descending order.</summary>
    Descending = 1
}

/// <summary>A single sort instruction. Sorting is always expressed as data, never as a raw SQL fragment.</summary>
public sealed record SortField(string Property, SortDirection Direction = SortDirection.Ascending)
{
    public SortField()
        : this(string.Empty, SortDirection.Ascending)
    {
    }
}

/// <summary>Validated, bounded paging and sorting input for any list query.</summary>
public sealed record PageRequest
{
    /// <summary>Largest page size a caller may request, protecting the platform from unbounded reads.</summary>
    public const int MaxPageSize = 200;

    /// <summary>Page size used when a caller does not specify a sensible one.</summary>
    public const int DefaultPageSize = 25;

    public PageRequest(int pageNumber = 1, int pageSize = DefaultPageSize, IReadOnlyList<SortField>? sort = null)
    {
        if (pageNumber < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(pageNumber), pageNumber, "Page number must be greater than zero.");
        }

        if (pageSize is < 1 or > MaxPageSize)
        {
            throw new ArgumentOutOfRangeException(
                nameof(pageSize),
                pageSize,
                $"Page size must be between 1 and {MaxPageSize}.");
        }

        PageNumber = pageNumber;
        PageSize = pageSize;
        Sort = sort ?? [];
    }

    /// <summary>One-based page number.</summary>
    public int PageNumber { get; }

    /// <summary>Number of records requested per page.</summary>
    public int PageSize { get; }

    /// <summary>Requested ordering, applied by the persistence layer.</summary>
    public IReadOnlyList<SortField> Sort { get; }

    /// <summary>Number of records to skip.</summary>
    public int Skip => (PageNumber - 1) * PageSize;
}

/// <summary>A single page of results plus the metadata a UI needs to render pagination.</summary>
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int PageNumber, int PageSize, long TotalCount)
{
    /// <summary>Number of records in <see cref="Items"/>.</summary>
    public int Count => Items.Count;

    /// <summary>True when at least one further page exists.</summary>
    public bool HasNextPage => (long)PageNumber * PageSize < TotalCount;

    /// <summary>Total number of pages available.</summary>
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);

    /// <summary>Projects the items of this page, preserving pagination metadata.</summary>
    public PagedResult<TOut> Map<TOut>(Func<T, TOut> map)
    {
        ArgumentNullException.ThrowIfNull(map);
        var mapped = new List<TOut>(Items.Count);
        foreach (var item in Items)
        {
            mapped.Add(map(item));
        }

        return new PagedResult<TOut>(mapped, PageNumber, PageSize, TotalCount);
    }

    /// <summary>Creates an empty page, used when a query legitimately matches nothing.</summary>
    public static PagedResult<T> Empty(PageRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        return new PagedResult<T>([], request.PageNumber, request.PageSize, 0);
    }
}
