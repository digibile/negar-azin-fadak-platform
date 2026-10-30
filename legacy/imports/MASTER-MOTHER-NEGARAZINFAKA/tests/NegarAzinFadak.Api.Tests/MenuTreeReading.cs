using System.Text.Json;
using NegarAzinFadak.Application.Options;

namespace NegarAzinFadak.Api.Tests;

/// <summary>
/// Reads a menu tree out of an API response, level by level.
/// </summary>
/// <remarks>
/// The base navigation the platform ships is hierarchical, so a test that only reads the root sections is
/// reading a fraction of what the tenant was given. A helper that walked one level would let a nested section
/// be dropped by an installer and leave the suite green, which is exactly the failure this type exists to
/// prevent.
/// </remarks>
internal static class MenuTreeReading
{
    /// <summary>
    /// The top-level sections of every menu, one level deep.
    /// </summary>
    /// <remarks>
    /// Accepts either shape the platform serves: the effective tree is an object with a <c>menus</c>
    /// collection, while the administration read is that collection on its own.
    /// </remarks>
    public static IReadOnlyList<JsonElement> Sections(JsonElement root)
    {
        var menus = root.ValueKind is JsonValueKind.Array
            ? root
            : root.GetProperty("menus");

        return menus.EnumerateArray()
            .SelectMany(menu => menu.GetProperty("sections").EnumerateArray())
            .ToArray();
    }

    /// <summary>Every section of every menu, parents before children.</summary>
    public static IReadOnlyList<JsonElement> Flatten(JsonElement root) =>
        Sections(root).SelectMany(Walk).ToArray();

    /// <summary>
    /// The path of every installed section, in display order, as codes joined by slashes.
    /// </summary>
    /// <remarks>
    /// Keyed by path rather than by code because a code is unique only among its siblings. Two branches may
    /// legitimately share one, and a test comparing a flat list of codes could not tell a duplicated branch
    /// from a section that appears twice at different depths.
    /// </remarks>
    public static IReadOnlyList<string> Paths(JsonElement root) =>
        InstalledPaths(Sections(root), prefix: string.Empty).ToArray();

    /// <summary>The section paths a deployment declares in its base menu, in the same shape.</summary>
    public static IReadOnlyList<string> ConfiguredPaths(
        IReadOnlyCollection<MenuSectionDefinition> sections,
        string prefix = "") =>
        sections
            .SelectMany(section =>
            {
                var path = prefix.Length is 0 ? section.Code : $"{prefix}/{section.Code}";
                return new[] { path }.Concat(ConfiguredPaths(section.Children, path));
            })
            .ToArray();

    private static IEnumerable<string> InstalledPaths(IEnumerable<JsonElement> sections, string prefix)
    {
        foreach (var section in sections)
        {
            var code = section.GetProperty("code").GetString() ?? string.Empty;
            var path = prefix.Length is 0 ? code : $"{prefix}/{code}";
            yield return path;

            foreach (var child in InstalledPaths(section.GetProperty("children").EnumerateArray(), path))
            {
                yield return child;
            }
        }
    }

    private static IEnumerable<JsonElement> Walk(JsonElement section)
    {
        yield return section;

        foreach (var child in section.GetProperty("children").EnumerateArray())
        {
            foreach (var descendant in Walk(child))
            {
                yield return descendant;
            }
        }
    }
}