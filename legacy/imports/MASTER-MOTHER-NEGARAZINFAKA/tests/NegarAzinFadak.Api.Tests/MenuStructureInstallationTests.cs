using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using NegarAzinFadak.Api.Authentication;
using NegarAzinFadak.Api.Configuration;
using NegarAzinFadak.Core.Tenancy;

namespace NegarAzinFadak.Api.Tests;

/// <summary>
/// The base structure installer, read through the API on a host whose base menu is configured on purpose.
/// </summary>
/// <remarks>
/// The property under test is that a section is identified by where it sits, not by its code alone. Two
/// branches of a menu may each hold a section called <c>reports</c> with a different requirement behind it; if
/// the installer resolved requirements by code, the second branch would inherit the first one's and a role
/// would be shown — or denied — a section because of an unrelated branch. The tree configured below is the
/// smallest one that shows the difference, and the sections are appended after the committed base menu so the
/// rest of the catalog stays exactly as the platform ships it.
/// </remarks>
public sealed class MenuStructureInstallationTests : IClassFixture<MenuStructureInstallationTests.Host>, IDisposable
{
    private readonly Host _factory;
    private readonly HttpClient _client;

    public MenuStructureInstallationTests(Host factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public void Dispose() => _client.Dispose();

    [Fact]
    public async Task A_repeated_code_in_two_branches_keeps_the_requirement_of_its_own_branch()
    {
        await PublishAsync();
        _client.DefaultRequestHeaders.Authorization = TokenFor("navigation.menu.read");

        var structure = await _client.GetFromJsonAsync<JsonElement>("/api/v1/menus/");
        var platformBranch = Find(structure, "platform");
        var salesBranch = Find(structure, "sales");

        Assert.Equal("sales.access.read", salesBranch.GetProperty("permission").GetString());
        Assert.Equal("platform.reporting.read", Requirement(platformBranch, "reports"));
        Assert.Equal("sales.reporting.read", Requirement(salesBranch, "reports"));
    }

    [Fact]
    public async Task A_role_is_shown_the_section_of_its_own_branch_and_not_the_other_reports()
    {
        await PublishAsync();
        _client.DefaultRequestHeaders.Authorization = TokenFor("platform.reporting.read");

        var tree = await _client.GetFromJsonAsync<JsonElement>("/api/v1/menu/tree");

        // Both branches contain a section called `reports`. Holding the platform's requirement must not also
        // open the sales one, which carries a different requirement.
        var reports = Visible(tree).Where((section) => section.GetProperty("code").GetString() == "reports").ToArray();

        Assert.Single(reports);
        Assert.Equal("platform.reporting.read", reports[0].GetProperty("permission").GetString());
        Assert.DoesNotContain(Visible(tree), (section) => section.GetProperty("code").GetString() == "sales");
    }

    [Fact]
    public async Task A_role_holding_the_sales_requirement_is_not_shown_the_platform_branch()
    {
        await PublishAsync();
        _client.DefaultRequestHeaders.Authorization = TokenFor("sales.access.read", "sales.reporting.read");

        var tree = await _client.GetFromJsonAsync<JsonElement>("/api/v1/menu/tree");
        var reports = Visible(tree).Where((section) => section.GetProperty("code").GetString() == "reports").ToArray();

        // The grouping branch itself is open to everyone, which is what a grouping section is for; what the
        // role may not get is the other branch's child that shares its code.
        Assert.Single(reports);
        Assert.Equal("sales.reporting.read", reports[0].GetProperty("permission").GetString());
        Assert.All(
            Visible(tree).Where((section) => section.GetProperty("code").GetString() == "platform"),
            (section) => Assert.Empty(section.GetProperty("children").EnumerateArray().ToArray()));
    }

    /// <summary>Installs the base structure into the tenant these tests share, and returns its report.</summary>
    private async Task PublishAsync()
    {
        _client.DefaultRequestHeaders.Authorization = TokenFor("navigation.menu.publish");
        using var response = await _client.PostAsync("/api/v1/menu/publish", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // The report is not asserted on its counts: publishing is idempotent and the tenant is shared, so the
        // first test to run adds and the rest find their own work. What matters is that something is there.
        var report = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(
            report.GetProperty("sectionsAdded").GetInt32() + report.GetProperty("sectionsKept").GetInt32() > 0,
            "the base structure was neither installed nor found");
    }

    private static string Requirement(JsonElement section, string code)
    {
        var child = section.GetProperty("children")
            .EnumerateArray()
            .Single((candidate) => candidate.GetProperty("code").GetString() == code);

        return child.GetProperty("permission").GetString() ?? string.Empty;
    }

    private static JsonElement Find(JsonElement menus, string code)
    {
        foreach (var menu in menus.EnumerateArray())
        {
            foreach (var section in Descend(menu.GetProperty("sections")))
            {
                if (section.GetProperty("code").GetString() == code)
                {
                    return section;
                }
            }
        }

        throw new Xunit.Sdk.XunitException($"no section with code '{code}' was installed");
    }

    private static IEnumerable<JsonElement> Visible(JsonElement tree)
    {
        return tree.GetProperty("menus").EnumerateArray().SelectMany((menu) => Descend(menu.GetProperty("sections")));
    }

    private static IEnumerable<JsonElement> Descend(JsonElement sections)
    {
        foreach (var section in sections.EnumerateArray())
        {
            yield return section;

            foreach (var child in Descend(section.GetProperty("children")))
            {
                yield return child;
            }
        }
    }

    private AuthenticationHeaderValue TokenFor(params string[] permissions)
    {
        return new AuthenticationHeaderValue(
            "Bearer",
            _factory.ResolveIssuer()
                .Issue(
                    new AccessTokenRequest(
                        Guid.NewGuid(),
                        Host.PublishedScope,
                        ["platform-admin"],
                        permissions))
                .Value);
    }

    /// <summary>A host whose base menu holds the same code in two different branches.</summary>
    public sealed class Host : WebApplicationFactory<Program>
    {
        /// <summary>
        /// The first index the platform's committed base menu does not use.
        ///
        /// Configuration merges by key, so a shorter override cannot remove the committed sections; the
        /// branches under test are therefore appended after them rather than substituted for them.
        /// </summary>
        private const int FirstFreeSection = 8;

        private readonly string _databasePath =
            Path.Combine(Path.GetTempPath(), $"negar-menu-install-{Guid.NewGuid():N}.db");

        /// <summary>The one tenant these tests install into, so every test reads the same structure.</summary>
        internal static readonly TenantScope PublishedScope = new(Guid.NewGuid());

        internal IAccessTokenIssuer Issuer { get; private set; } = default!;

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            ArgumentNullException.ThrowIfNull(builder);

            builder.UseSetting("Database:Provider", DatabaseProvider.Sqlite.ToString());
            builder.UseSetting("Database:ConnectionString", $"Data Source={_databasePath}");
            builder.UseSetting("Database:MigrateOnStartup", "true");
            builder.UseSetting("Security:Secrets:MasterKey", Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
            builder.UseSetting("Security:Secrets:DigestKey", Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
            builder.UseSetting("Authentication:Jwt:SigningKey", Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
            builder.UseSetting("Sms:Provider", "Development");
            builder.UseSetting("Sms:Development:InboxPath", Path.Combine(Path.GetTempPath(), $"negar-sms-{Guid.NewGuid():N}", "inbox.txt"));

            // The installer refuses a section whose requirement is not a declared permission, so the catalog
            // has to carry the three codes this tree asks for. They are appended after the committed catalog,
            // whose entries the role templates still grant by name.
            AddPermission(builder, 19, "platform.reporting.read", "platform", "Read platform reporting");
            AddPermission(builder, 20, "sales.access.read", "identity", "Read the sales desk");
            AddPermission(builder, 21, "sales.reporting.read", "identity", "Read sales reporting");

            // Two branches, one requirement each, and the same child code in both.
            AddSection(builder, FirstFreeSection, "platform", "سکو", route: null, permission: null, module: "platform");
            AddChild(
                builder, FirstFreeSection, 0, "reports", "گزارش‌های سکو", "/management/platform-reports",
                "platform.reporting.read", "platform");

            AddSection(builder, FirstFreeSection + 1, "sales", "فروش", "/management/sales", "sales.access.read", "identity");
            AddChild(
                builder, FirstFreeSection + 1, 0, "reports", "گزارش‌های فروش", "/management/sales-reports",
                "sales.reporting.read", "identity");
        }

        internal IAccessTokenIssuer ResolveIssuer() => Issuer ??= Services.GetRequiredService<IAccessTokenIssuer>();

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);

            if (!disposing)
            {
                return;
            }

            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();

            foreach (var path in new[] { _databasePath, _databasePath + "-wal", _databasePath + "-shm" })
            {
                try
                {
                    File.Delete(path);
                }
                catch (IOException)
                {
                    // A locked file would leave a temp artefact behind; it is not worth failing the run.
                }
            }
        }

        private static void AddPermission(IWebHostBuilder builder, int index, string code, string category, string title)
        {
            builder.UseSetting($"PlatformAuthorization:Permissions:{index}:Code", code);
            builder.UseSetting($"PlatformAuthorization:Permissions:{index}:Category", category);
            builder.UseSetting($"PlatformAuthorization:Permissions:{index}:Title", title);
        }

        private static void AddSection(
            IWebHostBuilder builder,
            int index,
            string code,
            string title,
            string? route,
            string? permission,
            string module)
        {
            builder.UseSetting($"PlatformMenu:Sections:{index}:Code", code);
            builder.UseSetting($"PlatformMenu:Sections:{index}:Title", title);
            builder.UseSetting($"PlatformMenu:Sections:{index}:Route", route ?? string.Empty);
            builder.UseSetting($"PlatformMenu:Sections:{index}:SortOrder", ((index + 1) * 10).ToString());
            builder.UseSetting($"PlatformMenu:Sections:{index}:Module", module);
            builder.UseSetting($"PlatformMenu:Sections:{index}:RequiredPermissionCode", permission ?? string.Empty);
        }

        private static void AddChild(
            IWebHostBuilder builder,
            int index,
            int childIndex,
            string code,
            string title,
            string route,
            string permission,
            string module)
        {
            string key(string name) => $"PlatformMenu:Sections:{index}:Children:{childIndex}:{name}";

            builder.UseSetting(key("Code"), code);
            builder.UseSetting(key("Title"), title);
            builder.UseSetting(key("Route"), route);
            builder.UseSetting(key("SortOrder"), "10");
            builder.UseSetting(key("Module"), module);
            builder.UseSetting(key("RequiredPermissionCode"), permission);
        }
    }
}
