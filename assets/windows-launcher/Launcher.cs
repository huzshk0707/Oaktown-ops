// Per-user Windows URI handler. URI callers select only a locally approved ID.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.Serialization;
using System.Runtime.Serialization.Json;
using System.Text.RegularExpressions;
using System.Windows.Forms;

namespace Oaktown.Ops
{
    [DataContract]
    public sealed class AppDefinition
    {
        [DataMember(Name = "id", IsRequired = true)] public string Id;
        [DataMember(Name = "name", IsRequired = true)] public string Name;
        [DataMember(Name = "executable", IsRequired = true)] public string Executable;
    }

    [DataContract]
    public sealed class LauncherConfiguration
    {
        [DataMember(Name = "version", IsRequired = true)] public int Version;
        [DataMember(Name = "apps", IsRequired = true)] public AppDefinition[] Apps;
    }

    public static class LauncherPolicy
    {
        private static readonly Regex AppId = new Regex(@"\A[a-z0-9][a-z0-9-]{0,39}\z", RegexOptions.CultureInvariant);
        private static readonly Regex Request = new Regex(@"\Aoaktown-ops://launch/([a-z0-9][a-z0-9-]{0,39})\z", RegexOptions.CultureInvariant);

        public static LauncherConfiguration ReadConfiguration(string file, bool requireAllFiles)
        {
            FileInfo info = new FileInfo(file);
            if (!info.Exists || info.Length < 1 || info.Length > 65536)
                throw new InvalidOperationException("The local app list is missing or too large. Run Windows setup again.");
            LauncherConfiguration config;
            using (FileStream input = File.OpenRead(file))
                config = (LauncherConfiguration)new DataContractJsonSerializer(typeof(LauncherConfiguration)).ReadObject(input);
            if (config == null || config.Version != 1 || config.Apps == null || config.Apps.Length < 1 || config.Apps.Length > 20)
                throw new InvalidOperationException("The local app list is invalid. Run Windows setup again.");
            HashSet<string> ids = new HashSet<string>(StringComparer.Ordinal);
            foreach (AppDefinition app in config.Apps)
            {
                if (app == null || app.Id == null || !AppId.IsMatch(app.Id) || !ids.Add(app.Id)
                    || String.IsNullOrWhiteSpace(app.Name) || app.Name.Length > 80 || Regex.IsMatch(app.Name, @"[\x00-\x1f\x7f]"))
                    throw new InvalidOperationException("An app ID or name is invalid or duplicated.");
                string path = app.Executable;
                if (String.IsNullOrWhiteSpace(path) || path.Length > 1024 || !Regex.IsMatch(path, @"\A[A-Za-z]:\\")
                    || Regex.IsMatch(path, @"[\x00-\x1f\x7f\u0022<>|?*]") || path.Substring(2).IndexOf(':') >= 0
                    || !String.Equals(Path.GetExtension(path), ".exe", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("Choose a local drive .exe path for " + app.Name + ".");
                app.Executable = Path.GetFullPath(path);
                if (requireAllFiles && !File.Exists(app.Executable))
                    throw new FileNotFoundException("The app file was not found for " + app.Name + ": " + app.Executable);
            }
            return config;
        }

        public static AppDefinition Resolve(string[] args, string configFile)
        {
            if (args == null || args.Length != 1 || args[0] == null || args[0].Length > 100)
                throw new ArgumentException("Only one approved app link is accepted.");
            Match match = Request.Match(args[0]);
            if (!match.Success) throw new ArgumentException("This app link is not supported.");
            string id = match.Groups[1].Value;
            LauncherConfiguration config = ReadConfiguration(configFile, false);
            foreach (AppDefinition app in config.Apps)
            {
                if (String.Equals(app.Id, id, StringComparison.Ordinal))
                {
                    if (!File.Exists(app.Executable))
                        throw new FileNotFoundException("The app file was not found for " + app.Name + ". Update Windows setup.");
                    return app;
                }
            }
            throw new InvalidOperationException("This app has not been allowed on this PC. Update Windows setup first.");
        }

        public static Process Start(string[] args, string configFile)
        {
            AppDefinition app = Resolve(args, configFile);
            ProcessStartInfo start = new ProcessStartInfo();
            start.FileName = app.Executable;
            start.WorkingDirectory = Path.GetDirectoryName(app.Executable);
            start.UseShellExecute = false;
            start.Arguments = String.Empty;
            return Process.Start(start);
        }
    }

    internal static class Program
    {
        [STAThread]
        private static int Main(string[] args)
        {
            try
            {
                string config = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "apps.json");
                using (Process process = LauncherPolicy.Start(args, config)) { }
                return 0;
            }
            catch (Exception error)
            {
                MessageBox.Show(error.Message, "Oaktown Ops desktop apps", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return 1;
            }
        }
    }
}
