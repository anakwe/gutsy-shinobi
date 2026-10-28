using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace GutsyShinobi;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        var options = LaunchOptions.Parse(args);
        if (options.Mode == LaunchMode.Invalid) return;
        if (options.Mode == LaunchMode.Configure)
        {
            MessageBox.Show("Gutsy Shinobi plays silently and automatically.\n\nSelect this screensaver in Windows Screen Saver Settings and enable 'On resume, display logon screen'.\n\nThe browser version remains playable after sign-in.",
                "Gutsy Shinobi", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return;
        }
        if (options.Mode == LaunchMode.Preview && !Native.IsWindow(options.Parent)) return;
        var profile = Path.Combine(Path.GetTempPath(), "GutsyShinobi", Guid.NewGuid().ToString("N"));
        try
        {
            Directory.CreateDirectory(profile);
            using var context = new SaverContext(options, profile);
            Application.Run(context);
        }
        finally
        {
            // WebView2 may still be releasing file handles. Never delete outside this run's profile.
            try { Directory.Delete(profile, true); } catch (IOException) { } catch (UnauthorizedAccessException) { }
        }
    }
}

internal sealed class SaverContext : ApplicationContext
{
    private readonly List<SaverWindow> windows = [];
    private readonly System.Windows.Forms.Timer timer = new() { Interval = 50 };
    private readonly LaunchOptions options;
    private readonly long started = Environment.TickCount64;
    private Native.Point initialMouse;
    private bool exiting;

    internal SaverContext(LaunchOptions options, string profile)
    {
        this.options = options;
        Native.GetCursorPos(out initialMouse);
        if (options.Mode == LaunchMode.Preview)
            windows.Add(new SaverWindow(options.Parent, Rectangle.Empty, profile));
        else
            foreach (var screen in Screen.AllScreens)
                windows.Add(new SaverWindow(0, screen.Bounds, profile));
        foreach (var window in windows)
        {
            window.FormClosed += (_, _) => ExitThread();
            window.Show();
        }
        if (options.Mode == LaunchMode.Saver) Cursor.Hide();
        timer.Tick += OnTick;
        timer.Start();
    }

    private void OnTick(object? sender, EventArgs e)
    {
        if (options.Mode == LaunchMode.Preview)
        {
            if (!Native.IsWindow(options.Parent)) ExitThread();
            else windows[0].ResizePreview();
            return;
        }
        // Poll the native desktop, including input delivered to WebView2 child windows.
        // Do not install hooks, consume input, or synthesize events that keep the PC awake.
        if (Environment.TickCount64 - started < 750)
        {
            Native.GetCursorPos(out initialMouse);
            for (int key = 1; key <= 254; key++) Native.GetAsyncKeyState(key);
            return;
        }
        if (Native.GetCursorPos(out var mouse) &&
            (Math.Abs((long)mouse.X - initialMouse.X) > 3 || Math.Abs((long)mouse.Y - initialMouse.Y) > 3))
        { ExitThread(); return; }
        for (int key = 1; key <= 254; key++)
            if ((Native.GetAsyncKeyState(key) & 0x8001) != 0) { ExitThread(); return; }
    }

    protected override void ExitThreadCore()
    {
        if (exiting) return;
        exiting = true;
        timer.Stop();
        // Closing any monitor dismisses the entire saver; guard against reentry.
        foreach (var window in windows.ToArray()) window.Dispose();
        windows.Clear();
        base.ExitThreadCore();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            timer.Dispose();
            foreach (var window in windows) window.Dispose();
            if (options.Mode == LaunchMode.Saver) Cursor.Show();
        }
        base.Dispose(disposing);
    }
}

internal sealed class SaverWindow : Form
{
    private const string Origin = "https://gutsy.invalid/";
    private static readonly HashSet<string> Resources =
        [Origin + "index.html", Origin + "screensaver.js", Origin + "screensaver.css"];
    private readonly nint parent;
    private readonly string profile;
    private readonly WebView2 view = new() { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.Black };

    internal SaverWindow(nint parent, Rectangle bounds, string profile)
    {
        this.parent = parent;
        this.profile = profile;
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.Manual;
        BackColor = Color.Black;
        ShowInTaskbar = false;
        if (parent == 0) { Bounds = bounds; TopMost = true; }
        Controls.Add(view);
    }

    protected override CreateParams CreateParams
    {
        get
        {
            var parameters = base.CreateParams;
            if (parent != 0)
            {
                parameters.Style = (parameters.Style & unchecked((int)~0x80000000)) | 0x40000000; // WS_CHILD
                parameters.Parent = parent;
            }
            return parameters;
        }
    }

    internal void ResizePreview()
    {
        if (parent != 0 && Native.GetClientRect(parent, out var rect))
            Bounds = new Rectangle(0, 0, Math.Max(1, rect.Right), Math.Max(1, rect.Bottom));
    }

    protected override async void OnShown(EventArgs e)
    {
        base.OnShown(e);
        if (parent != 0) { Native.SetParent(Handle, parent); ResizePreview(); }
        try
        {
            var environment = await CoreWebView2Environment.CreateAsync(null, profile);
            if (IsDisposed) return;
            var controllerOptions = environment.CreateCoreWebView2ControllerOptions();
            controllerOptions.IsInPrivateModeEnabled = true;
            await view.EnsureCoreWebView2Async(environment, controllerOptions);
            if (IsDisposed) return;
            var core = view.CoreWebView2;
            var settings = core.Settings;
            settings.AreDevToolsEnabled = false;
            settings.AreDefaultContextMenusEnabled = false;
            settings.AreBrowserAcceleratorKeysEnabled = false;
            settings.AreDefaultScriptDialogsEnabled = false;
            settings.IsStatusBarEnabled = false;
            settings.IsZoomControlEnabled = false;
            settings.IsWebMessageEnabled = false;
            settings.AreHostObjectsAllowed = false;
            settings.IsPasswordAutosaveEnabled = false;
            settings.IsGeneralAutofillEnabled = false;
            core.IsMuted = true;
            core.SetVirtualHostNameToFolderMapping("gutsy.invalid", Path.Combine(AppContext.BaseDirectory, "Web"), CoreWebView2HostResourceAccessKind.Deny);
            core.NavigationStarting += (_, args) => args.Cancel = args.Uri != Origin + "index.html";
            core.FrameNavigationStarting += (_, args) => args.Cancel = true;
            core.NewWindowRequested += (_, args) => args.Handled = true;
            core.PermissionRequested += (_, args) => args.State = CoreWebView2PermissionState.Deny;
            core.DownloadStarting += (_, args) => args.Cancel = true;
            core.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
            core.WebResourceRequested += (_, args) =>
            {
                if (!Resources.Contains(args.Request.Uri))
                    args.Response = environment.CreateWebResourceResponse(null, 403, "Forbidden", "");
            };
            core.ProcessFailed += (_, _) => Application.Exit();
            core.Navigate(Origin + "index.html");
        }
        catch (Exception) when (!System.Diagnostics.Debugger.IsAttached)
        {
            // No prompts on a secure desktop. Missing runtime/assets fail by exiting.
            Application.Exit();
        }
    }
}
