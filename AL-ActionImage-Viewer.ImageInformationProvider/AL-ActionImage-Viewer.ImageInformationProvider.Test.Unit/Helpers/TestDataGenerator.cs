using AL_ActionImage_Viewer.ImageInformationProvider.Data;

using Bogus;

namespace AL_ActionImage_Viewer.ImageInformationProvider.Test.Unit.Helpers;

/// <summary>
/// Produces a deterministic, reproducible set of <see cref="ImageInformationDTO"/> groups
/// using Bogus with a fixed seed so every test run yields identical data.
/// </summary>
public static class TestDataGenerator
{
    public const int Seed = 12345;
    public const int ImagesPerCategory = 20;

    public static readonly string[] CategoryNames =
    [
        "ActionImages",
        "FieldCueGroupImages",
        "ActionCueGroupImages",
        "RoleCenterActionGroupImages",
        "PromotedImages",
    ];

    /// <summary>
    /// Returns ~100 images spread across the five fixed categories.
    /// Values are stable across runs because every <see cref="Faker{T}"/> uses
    /// a category-derived seed rooted at <see cref="Seed"/>.
    /// </summary>
    public static Dictionary<string, IEnumerable<ImageInformationDTO>> GenerateImageGroups(int imagesPerCategory = ImagesPerCategory)
    {
        var result = new Dictionary<string, IEnumerable<ImageInformationDTO>>();
        for (var i = 0; i < CategoryNames.Length; i++)
        {
            result[CategoryNames[i]] = GenerateImages(CategoryNames[i], Seed + i, imagesPerCategory);
        }
        return result;
    }

    /// <summary>
    /// Generates <paramref name="count"/> images for a single <paramref name="category"/>.
    /// </summary>
    public static List<ImageInformationDTO> GenerateImages(string category, int seed, int count = ImagesPerCategory)
    {
        var faker = new Faker<ImageInformationDTO>()
            .UseSeed(seed)
            .RuleFor(x => x.Name, f => f.Commerce.ProductName().Replace(" ", "") + f.UniqueIndex)
            .RuleFor(x => x.Category, _ => category)
            .RuleFor(x => x.Tags, f => [.. f.Make(f.Random.Int(2, 4), () => f.Lorem.Word())])
            .RuleFor(x => x.ImageDataUrl, f =>
            {
                var bytes = f.Random.Bytes(48);
                return "data:image/png;base64," + Convert.ToBase64String(bytes);
            });

        return faker.Generate(count);
    }
}
