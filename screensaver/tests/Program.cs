using GutsyShinobi;

var cases = new (string[] Args, LaunchMode Mode, long Parent)[] {
    ([], LaunchMode.Configure, 0),
    (["/s"], LaunchMode.Saver, 0),
    (["/S"], LaunchMode.Saver, 0),
    (["-s"], LaunchMode.Saver, 0),
    (["/c"], LaunchMode.Configure, 0),
    (["/c:0"], LaunchMode.Configure, 0),
    (["/c:123"], LaunchMode.Configure, 123),
    (["/c", "123"], LaunchMode.Configure, 123),
    (["/p", "123"], LaunchMode.Preview, 123),
    (["/P:123"], LaunchMode.Preview, 123),
    (["/p"], LaunchMode.Invalid, 0),
    (["/p:0"], LaunchMode.Invalid, 0),
    (["/p:-1"], LaunchMode.Invalid, 0),
    (["/p:9223372036854775808"], LaunchMode.Invalid, 0),
    (["/p:abc"], LaunchMode.Invalid, 0),
    (["/p:123", "456"], LaunchMode.Invalid, 0),
    (["/s", "123"], LaunchMode.Invalid, 0),
    (["/s:123"], LaunchMode.Invalid, 0),
    (["https://example.com"], LaunchMode.Invalid, 0),
    (["/unknown"], LaunchMode.Invalid, 0),
    (["/p", "123", "456"], LaunchMode.Invalid, 0),
};
foreach (var test in cases) {
    var actual = LaunchOptions.Parse(test.Args);
    if (actual.Mode != test.Mode || (long)actual.Parent != test.Parent)
        throw new Exception($"Invalid result for {string.Join(' ', test.Args)}: {actual}");
}
Console.WriteLine($"Passed {cases.Length} screensaver argument checks.");
