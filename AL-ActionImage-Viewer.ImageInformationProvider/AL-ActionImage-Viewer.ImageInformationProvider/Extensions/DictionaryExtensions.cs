namespace AL_ActionImage_Viewer.ImageInformationProvider.Extensions;

public static class DictionaryExtensions
{
    public static void Deconstruct<TKey, TValue>(this KeyValuePair<TKey, TValue> kvp, out TKey key, out TValue value)
    {
        key = kvp.Key;
        value = kvp.Value;
    }
}
