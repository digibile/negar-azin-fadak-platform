using Microsoft.EntityFrameworkCore;
using NegarAzinFadak.Core.Primitives;
using NegarAzinFadak.Core.Tenancy;
using NegarAzinFadak.Identity.Domain.Users;
using NegarAzinFadak.Infrastructure.Persistence;

namespace NegarAzinFadak.Infrastructure.Tests;

/// <summary>
/// Isolation that only works because the database happens to be small is not isolation. These tests pin
/// the queries down to server-side SQL, so a future refactor cannot quietly turn the tenant predicate or
/// the child-graph insert into a client-side operation that works on one row and fails on a million.
/// </summary>
public sealed class GeneratedSqlTests
{
    private static readonly TenantScope AlphaScope = new(Guid.Parse("aaaaaaaa-0000-0000-0000-000000000001"));

    [Fact]
    public void The_tenant_predicate_is_executed_by_the_database()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var user = User.Register(Guid.NewGuid(), AlphaScope, MobileNumber.Create("+989121111001"), UserSource.MobileRegistration);
        factory.Context.Users.Add(user);
        factory.Context.SaveChanges();
        factory.Context.ChangeTracker.Clear();

        var command = factory.Context.Users.ToQueryString();
        var where = command[command.IndexOf("WHERE", System.StringComparison.Ordinal)..];

        // The predicate reads the indexed isolation column, so the database can serve it from the index.
        Assert.Contains($"\"{TenantIsolationFilter.IsolationColumns.Organization}\" =", where, System.StringComparison.Ordinal);

        // It must not fall back to comparing the serialized scope, which is neither translatable as a
        // member access nor usable by an index.
        Assert.DoesNotContain($"\"Scope\" =", where, System.StringComparison.Ordinal);

        // No local evaluation: a client-side filter would be untranslatable rather than silently local,
        // so a WHERE clause that reaches SQL at all is the evidence required here.
        Assert.Contains("WHERE", command, System.StringComparison.Ordinal);
    }

    [Fact]
    public async Task Graph_inserts_children_instead_of_updating_rows_that_never_existed()
    {
        using var factory = new SqliteContextFactory(AlphaScope);
        var user = User.Register(Guid.NewGuid(), AlphaScope, MobileNumber.Create("+989121111002"), UserSource.MobileRegistration);
        user.ChangeMobile(MobileNumber.Create("+989121111003"), "second number");

        factory.Context.Users.Add(user);
        factory.Context.SaveChanges();

        // A second contact point, added after the aggregate was already tracked. EF must treat a
        // domain-assigned Guid as a real value, not as a database-generated placeholder.
        user.ChangeMobile(MobileNumber.Create("+989121111004"), "third number");
        factory.Context.SaveChanges();

        factory.Context.ChangeTracker.Clear();
        var stored = await factory.Context.Users
            .Include(candidate => candidate.Contacts)
            .SingleAsync(candidate => candidate.Id == user.Id);

        Assert.Single(stored.Contacts);
        Assert.Equal("+989121111004", stored.Contacts[0].Value);
    }
}
