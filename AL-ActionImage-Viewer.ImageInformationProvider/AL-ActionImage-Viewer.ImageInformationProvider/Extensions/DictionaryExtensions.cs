namespace AL_ActionImage_Viewer.ImageInformationProvider.Extensions;

/// <summary>Extension methods for <see cref="KeyValuePair{TKey, TValue}"/>.</summary>
public static class DictionaryExtensions
{
    /// <summary>
    /// Enables tuple-style deconstruction of a <see cref="KeyValuePair{TKey, TValue}"/>
    /// so that <c>foreach (var (key, value) in dict)</c> syntax compiles.
    /// </summary>
    public static void Deconstruct<TKey, TValue>(this KeyValuePair<TKey, TValue> kvp, out TKey key, out TValue value)
    {
        key = kvp.Key;
        value = kvp.Value;
    }
}
