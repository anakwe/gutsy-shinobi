using System.Globalization;

namespace GutsyShinobi;

internal enum LaunchMode { Configure, Saver, Preview, Invalid }
internal readonly record struct LaunchOptions(LaunchMode Mode, nint Parent = 0)
{
    // No URL, executable path, script, or other externally supplied content is accepted.
    internal static LaunchOptions Parse(string[] args)
    {
        if (args.Length == 0) return new(LaunchMode.Configure);
        if (args.Length > 2) return new(LaunchMode.Invalid);
        var parts = args[0].Split(':', 2);
        var command = parts[0].ToLowerInvariant();
        if (command is not ("/s" or "-s" or "/p" or "-p" or "/c" or "-c")) return new(LaunchMode.Invalid);
        if (parts.Length == 2 && args.Length == 2) return new(LaunchMode.Invalid);
        string? handle = parts.Length == 2 ? parts[1] : args.Length == 2 ? args[1] : null;
        if (command is "/s" or "-s") return new(handle is null ? LaunchMode.Saver : LaunchMode.Invalid);
        if (handle is null) return new(command is "/c" or "-c" ? LaunchMode.Configure : LaunchMode.Invalid);
        if (!long.TryParse(handle, NumberStyles.None, CultureInfo.InvariantCulture, out var value) ||
            value < 0 || (value == 0 && command is "/p" or "-p") ||
            (IntPtr.Size == 4 && value > int.MaxValue)) return new(LaunchMode.Invalid);
        return new(command is "/p" or "-p" ? LaunchMode.Preview : LaunchMode.Configure, (nint)value);
    }
}
