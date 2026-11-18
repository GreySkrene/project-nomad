using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Net;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Web.Script.Serialization;

namespace NomadLauncher
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new LauncherForm());
        }
    }

    internal sealed class CommandResult
    {
        public int ExitCode;
        public string Output = "";
    }

    internal sealed class LmsModel
    {
        public string type = "";
        public string modelKey = "";
        public string displayName = "";
        public string deviceIdentifier;
        public long sizeBytes;
    }

    internal sealed class LmsLoadedModel
    {
        public string modelKey = "";
        public string identifier = "";
        public string deviceIdentifier;
        public string status = "";
    }

    internal sealed class LmsPeer
    {
        public string deviceIdentifier = "";
        public string deviceName = "";
        public string status = "";
    }

    internal sealed class LmsLinkStatus
    {
        public string status = "";
        public string deviceIdentifier = "";
        public string deviceName = "";
        public string preferredDeviceIdentifier = "";
        public List<LmsPeer> peers = new List<LmsPeer>();
    }

    internal sealed class ModelChoice
    {
        public string Type = "";
        public string ModelKey = "";
        public string DisplayName = "";
        public string DeviceIdentifier = "";
        public string DeviceName = "";
        public long SizeBytes;
        public bool Loaded;
        public string LoadedIdentifier = "";
        public string LoadedStatus = "";

        public override string ToString()
        {
            string source = DeviceName.Length == 0 ? "Local" : "LM Link: " + DeviceName;
            string loaded = Loaded ? " | LOADED " + LoadedStatus.ToUpperInvariant() : "";
            string kind = Type == "embedding" ? " | embedding" : "";
            return "[" + source + "] " + DisplayName + " (" + FormatSize(SizeBytes) + ")" + kind + loaded;
        }

        private static string FormatSize(long bytes)
        {
            if (bytes <= 0) return "size unknown";
            return (bytes / 1073741824.0).ToString("0.00") + " GiB";
        }
    }

    internal sealed class LauncherForm : Form
    {
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern uint SetThreadExecutionState(uint executionState);

        private const uint ES_CONTINUOUS = 0x80000000;
        private const uint ES_SYSTEM_REQUIRED = 0x00000001;

        private const string Distro = "Ubuntu-24.04";
        private readonly Button startButton = new Button();
        private readonly Button openButton = new Button();
        private readonly Button stopButton = new Button();
        private readonly Button refreshButton = new Button();
        private readonly ComboBox modelPicker = new ComboBox();
        private readonly Button refreshModelsButton = new Button();
        private readonly Button loadModelButton = new Button();
        private readonly Button unloadModelButton = new Button();
        private readonly Button emergencyModelButton = new Button();
        private readonly Label modelStatusLabel = new Label();
        private readonly Label stateLabel = new Label();
        private readonly TextBox logBox = new TextBox();
        private readonly Timer statusTimer = new Timer();
        private Process keepAliveProcess;
        private bool busy;
        private bool stoppingForClose;

        public LauncherForm()
        {
            Text = "Project NOMAD Launcher";
            Icon? applicationIcon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            if (applicationIcon != null)
            {
                Icon = applicationIcon;
            }
            Width = 760;
            Height = 680;
            MinimumSize = new Size(720, 560);
            StartPosition = FormStartPosition.CenterScreen;

            Label title = new Label();
            title.Text = "Project NOMAD";
            title.AutoSize = true;
            title.Font = new Font("Segoe UI", 20, FontStyle.Bold);

            Label subtitle = new Label();
            subtitle.Text = "Offline emergency knowledge system";
            subtitle.AutoSize = true;
            subtitle.ForeColor = Color.DimGray;

            stateLabel.AutoSize = true;
            stateLabel.Font = new Font("Segoe UI", 11, FontStyle.Bold);

            ConfigureButton(startButton, "Start NOMAD");
            ConfigureButton(openButton, "Open Interface");
            ConfigureButton(stopButton, "Stop Everything");
            ConfigureButton(refreshButton, "Refresh Status");

            FlowLayoutPanel buttons = new FlowLayoutPanel();
            buttons.AutoSize = true;
            buttons.FlowDirection = FlowDirection.LeftToRight;
            buttons.WrapContents = true;
            buttons.Dock = DockStyle.Fill;
            buttons.Controls.Add(startButton);
            buttons.Controls.Add(openButton);
            buttons.Controls.Add(stopButton);
            buttons.Controls.Add(refreshButton);

            GroupBox modelGroup = new GroupBox();
            modelGroup.Text = "LM Studio integration (paused)";
            modelGroup.AutoSize = true;
            modelGroup.Dock = DockStyle.Fill;
            modelGroup.Padding = new Padding(10);

            Label modelHelp = new Label();
            modelHelp.Text = "NOMAD is currently in library/search mode and will not start, stop, load, unload, or reconfigure LM Studio. Use LM Studio directly for your other projects.";
            modelHelp.AutoSize = true;
            modelHelp.MaximumSize = new Size(680, 0);

            modelPicker.DropDownStyle = ComboBoxStyle.DropDownList;
            modelPicker.Width = 650;
            modelPicker.DropDownWidth = 720;

            ConfigureButton(refreshModelsButton, "Refresh Models");
            ConfigureButton(loadModelButton, "Load Selected");
            ConfigureButton(unloadModelButton, "Unload Selected");
            ConfigureButton(emergencyModelButton, "Load Low-Power Local AI (4B)");
            emergencyModelButton.Width = 210;

            FlowLayoutPanel modelButtons = new FlowLayoutPanel();
            modelButtons.AutoSize = true;
            modelButtons.Dock = DockStyle.Fill;
            modelButtons.WrapContents = true;
            modelButtons.Controls.Add(refreshModelsButton);
            modelButtons.Controls.Add(loadModelButton);
            modelButtons.Controls.Add(unloadModelButton);
            modelButtons.Controls.Add(emergencyModelButton);
            modelPicker.Enabled = false;
            refreshModelsButton.Enabled = false;
            loadModelButton.Enabled = false;
            unloadModelButton.Enabled = false;
            emergencyModelButton.Enabled = false;

            modelStatusLabel.AutoSize = true;
            modelStatusLabel.ForeColor = Color.DarkSlateGray;

            FlowLayoutPanel modelLayout = new FlowLayoutPanel();
            modelLayout.FlowDirection = FlowDirection.TopDown;
            modelLayout.WrapContents = false;
            modelLayout.AutoSize = true;
            modelLayout.Dock = DockStyle.Fill;
            modelLayout.Controls.Add(modelHelp);
            modelLayout.Controls.Add(modelPicker);
            modelLayout.Controls.Add(modelButtons);
            modelLayout.Controls.Add(modelStatusLabel);
            modelGroup.Controls.Add(modelLayout);

            logBox.Multiline = true;
            logBox.ReadOnly = true;
            logBox.ScrollBars = ScrollBars.Vertical;
            logBox.Dock = DockStyle.Fill;
            logBox.Font = new Font("Consolas", 9);
            logBox.BackColor = Color.FromArgb(248, 249, 250);

            TableLayoutPanel layout = new TableLayoutPanel();
            layout.Dock = DockStyle.Fill;
            layout.Padding = new Padding(18);
            layout.ColumnCount = 1;
            layout.RowCount = 6;
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
            layout.Controls.Add(title, 0, 0);
            layout.Controls.Add(subtitle, 0, 1);
            layout.Controls.Add(stateLabel, 0, 2);
            layout.Controls.Add(buttons, 0, 3);
            layout.Controls.Add(modelGroup, 0, 4);
            layout.Controls.Add(logBox, 0, 5);
            Controls.Add(layout);

            startButton.Click += async delegate { await StartNomadAsync(); };
            openButton.Click += delegate { OpenInterface(); };
            stopButton.Click += async delegate { await StopNomadAsync(); };
            refreshButton.Click += async delegate { await RefreshStatusAsync(true); };
            refreshModelsButton.Click += async delegate { await RefreshModelsAsync(true); };
            loadModelButton.Click += async delegate { await LoadSelectedModelAsync(); };
            unloadModelButton.Click += async delegate { await UnloadSelectedModelAsync(); };
            emergencyModelButton.Click += async delegate { await LoadEmergencyModelAsync(); };
            statusTimer.Interval = 10000;
            statusTimer.Tick += async delegate { await RefreshStatusAsync(false); };
            Shown += async delegate
            {
                AppendLog("Launcher ready. NOMAD is local-only unless LAN access is explicitly configured.");
                AppendLog("LM Studio integration is paused; this launcher will leave its server and models untouched.");
                await RefreshStatusAsync(true);
                statusTimer.Start();
            };
            FormClosing += HandleFormClosing;
        }

        private static void ConfigureButton(Button button, string text)
        {
            button.Text = text;
            button.Width = 130;
            button.Height = 38;
        }

        private async Task StartNomadAsync()
        {
            if (busy) return;
            SetBusy(true, "Starting...");
            try
            {
                AppendLog("Starting Ubuntu WSL and Docker...");
                CommandResult docker = await RunAsync(
                    "wsl.exe",
                    "-d " + Distro + " -u root --exec /bin/bash -lc \"systemctl start docker && docker start $(docker ps -aq --filter name=nomad_) >/dev/null 2>&1 || true\"",
                    60000);
                if (docker.ExitCode != 0)
                    throw new InvalidOperationException("Docker start failed: " + docker.Output);

                if (keepAliveProcess == null || keepAliveProcess.HasExited)
                {
                    ProcessStartInfo keepAlive = new ProcessStartInfo();
                    keepAlive.FileName = "wsl.exe";
                    keepAlive.Arguments = "-d " + Distro + " -u root --exec /usr/bin/sleep infinity";
                    keepAlive.UseShellExecute = false;
                    keepAlive.CreateNoWindow = true;
                    keepAlive.WindowStyle = ProcessWindowStyle.Hidden;
                    keepAliveProcess = Process.Start(keepAlive);
                }

                // A PMTiles extraction cannot resume after Windows suspends WSL.
                // Keep Windows awake while this launcher owns a running NOMAD
                // session. A deliberate lid close can still override this.
                if (SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED) == 0)
                    AppendLog("Warning: Windows sleep prevention could not be enabled.");
                else
                    AppendLog("Automatic system sleep is inhibited while NOMAD is running; keep the lid open during map extraction.");

                AppendLog("LM Studio integration is paused; leaving its server and models untouched.");

                if (!await WaitForHealthAsync(TimeSpan.FromSeconds(90)))
                    throw new InvalidOperationException("NOMAD did not become healthy at http://localhost:8080/api/health within 90 seconds.");

                AppendLog("NOMAD is healthy. Kiwix: port 8090; Kolibri: port 8310.");
                OpenInterface();
            }
            catch (Exception ex)
            {
                AppendLog("START ERROR: " + ex.Message);
                MessageBox.Show(this, ex.Message, "NOMAD could not start", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                SetBusy(false, "Checking status...");
            }
            await RefreshStatusAsync(true);
        }

        private async Task StopNomadAsync()
        {
            if (busy) return;
            SetBusy(true, "Stopping...");
            try
            {
                AppendLog("Leaving LM Studio and its loaded models untouched.");

                AppendLog("Terminating the NOMAD WSL instance; queued downloads will resume on the next start...");
                CommandResult terminate = await RunAsync("wsl.exe", "--terminate " + Distro, 60000);
                if (terminate.ExitCode != 0)
                    AppendLog("WSL terminate warning: " + terminate.Output.Trim());

                if (keepAliveProcess != null && !keepAliveProcess.HasExited)
                    keepAliveProcess.Kill();
                if (keepAliveProcess != null) keepAliveProcess.Dispose();
                keepAliveProcess = null;
                SetThreadExecutionState(ES_CONTINUOUS);
                AppendLog("All NOMAD-related runtime processes have been asked to stop.");
            }
            catch (Exception ex)
            {
                AppendLog("STOP ERROR: " + ex.Message);
                MessageBox.Show(this, ex.Message, "NOMAD stop warning", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            finally
            {
                SetBusy(false, "Stopped");
            }
            await RefreshStatusAsync(true);
        }

        private async Task RefreshStatusAsync(bool logResult)
        {
            if (busy) return;
            try
            {
                using (HttpClient client = new HttpClient())
                {
                    client.Timeout = TimeSpan.FromSeconds(2);
                    bool nomad = await IsHealthyAsync(client, "http://localhost:8080/api/health");
                    bool kiwix = await IsHealthyAsync(client, "http://localhost:8090/");
                    bool kolibri = await IsHealthyAsync(client, "http://localhost:8310/");
                    stateLabel.Text = nomad
                        ? "Running - NOMAD healthy | Kiwix " + (kiwix ? "up" : "starting") + " | Kolibri " + (kolibri ? "up" : "starting")
                        : "Stopped or starting";
                    stateLabel.ForeColor = nomad ? Color.DarkGreen : Color.DarkSlateGray;
                    if (logResult) AppendLog(stateLabel.Text);
                }
            }
            catch (Exception ex)
            {
                stateLabel.Text = "Status check failed";
                stateLabel.ForeColor = Color.DarkRed;
                if (logResult) AppendLog("STATUS ERROR: " + ex.Message);
            }
        }

        private async Task RefreshModelsAsync(bool logResult)
        {
            if (busy) return;
            refreshModelsButton.Enabled = false;
            try
            {
                CommandResult modelsResult = await RunAsync("lms.exe", "ls --json", 30000);
                CommandResult loadedResult = await RunAsync("lms.exe", "ps --json", 30000);
                CommandResult linkResult = await RunAsync("lms.exe", "link status --json", 30000);
                if (modelsResult.ExitCode != 0)
                    throw new InvalidOperationException(modelsResult.Output.Trim());

                JavaScriptSerializer json = new JavaScriptSerializer();
                List<LmsModel> models = json.Deserialize<List<LmsModel>>(modelsResult.Output) ?? new List<LmsModel>();
                List<LmsLoadedModel> loaded = loadedResult.ExitCode == 0
                    ? json.Deserialize<List<LmsLoadedModel>>(loadedResult.Output) ?? new List<LmsLoadedModel>()
                    : new List<LmsLoadedModel>();
                LmsLinkStatus link = linkResult.ExitCode == 0
                    ? json.Deserialize<LmsLinkStatus>(linkResult.Output) ?? new LmsLinkStatus()
                    : new LmsLinkStatus();

                Dictionary<string, string> deviceNames = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                foreach (LmsPeer peer in link.peers)
                    deviceNames[peer.deviceIdentifier] = peer.deviceName;

                ModelChoice previous = modelPicker.SelectedItem as ModelChoice;
                string previousKey = previous == null ? "" : previous.ModelKey + "|" + previous.DeviceIdentifier;
                modelPicker.Items.Clear();

                int localCount = 0;
                int remoteCount = 0;
                foreach (LmsModel model in models)
                {
                    ModelChoice choice = new ModelChoice();
                    choice.Type = model.type;
                    choice.ModelKey = model.modelKey;
                    choice.DisplayName = model.displayName.Length == 0 ? model.modelKey : model.displayName;
                    choice.DeviceIdentifier = model.deviceIdentifier ?? link.deviceIdentifier ?? "";
                    choice.SizeBytes = model.sizeBytes;
                    if (model.deviceIdentifier == null)
                    {
                        choice.DeviceName = "";
                        localCount++;
                    }
                    else
                    {
                        choice.DeviceName = deviceNames.ContainsKey(model.deviceIdentifier)
                            ? deviceNames[model.deviceIdentifier]
                            : model.deviceIdentifier;
                        remoteCount++;
                    }

                    foreach (LmsLoadedModel running in loaded)
                    {
                        string runningDevice = running.deviceIdentifier ?? link.deviceIdentifier ?? "";
                        if (running.modelKey == choice.ModelKey && runningDevice == choice.DeviceIdentifier)
                        {
                            choice.Loaded = true;
                            choice.LoadedIdentifier = running.identifier;
                            choice.LoadedStatus = running.status;
                            break;
                        }
                    }
                    modelPicker.Items.Add(choice);
                }

                int selection = 0;
                for (int i = 0; i < modelPicker.Items.Count; i++)
                {
                    ModelChoice choice = (ModelChoice)modelPicker.Items[i];
                    if (choice.ModelKey + "|" + choice.DeviceIdentifier == previousKey)
                    {
                        selection = i;
                        break;
                    }
                }
                if (modelPicker.Items.Count > 0) modelPicker.SelectedIndex = selection;
                modelStatusLabel.Text = localCount + " local model(s), " + remoteCount + " LM Link model(s), " + loaded.Count + " loaded.";
                if (logResult) AppendLog("LM Studio: " + modelStatusLabel.Text);
            }
            catch (Exception ex)
            {
                modelStatusLabel.Text = "Could not read LM Studio models: " + ex.Message;
                modelStatusLabel.ForeColor = Color.DarkRed;
                if (logResult) AppendLog("MODEL STATUS ERROR: " + ex.Message);
            }
            finally
            {
                refreshModelsButton.Enabled = !busy;
            }
        }

        private async Task LoadSelectedModelAsync()
        {
            ModelChoice choice = modelPicker.SelectedItem as ModelChoice;
            if (choice == null || busy) return;
            await LoadModelAsync(choice, false);
        }

        private async Task LoadEmergencyModelAsync()
        {
            if (busy) return;
            foreach (object item in modelPicker.Items)
            {
                ModelChoice choice = (ModelChoice)item;
                if (choice.DeviceName.Length == 0 && choice.Type == "llm" && choice.ModelKey == "qwen/qwen3-4b-2507")
                {
                    modelPicker.SelectedItem = choice;
                    await LoadModelAsync(choice, true);
                    return;
                }
            }
            MessageBox.Show(this, "The local Qwen3 4B 2507 model was not found. Refresh Models after LM Studio starts.", "Emergency model unavailable", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }

        private async Task LoadModelAsync(ModelChoice choice, bool emergency)
        {
            SetBusy(true, "Loading model...");
            try
            {
                if (choice.DeviceIdentifier.Length > 0)
                {
                    CommandResult preferred = await RunAsync("lms.exe", "link set-preferred-device " + Quote(choice.DeviceIdentifier), 30000);
                    if (preferred.ExitCode != 0)
                        throw new InvalidOperationException("Could not select model device: " + preferred.Output.Trim());
                }

                string arguments = "load " + Quote(choice.ModelKey) + " -y";
                if (choice.Type == "llm") arguments += " --context-length 8192 --parallel 1";
                AppendLog("Loading " + choice.DisplayName + " from " + (choice.DeviceName.Length == 0 ? "this laptop" : choice.DeviceName) + "...");
                CommandResult result = await RunAsync("lms.exe", arguments, 300000);
                if (result.ExitCode != 0)
                    throw new InvalidOperationException(result.Output.Trim());
                AppendLog((emergency
                    ? "Low-power local AI loaded. Verify medical and safety answers against the original source. "
                    : "Model loaded. ") + result.Output.Trim());
            }
            catch (Exception ex)
            {
                AppendLog("MODEL LOAD ERROR: " + ex.Message);
                MessageBox.Show(this, ex.Message, "LM Studio model load failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                SetBusy(false, "Model command finished");
                await RefreshModelsAsync(false);
                await RefreshStatusAsync(false);
            }
        }

        private async Task UnloadSelectedModelAsync()
        {
            ModelChoice choice = modelPicker.SelectedItem as ModelChoice;
            if (choice == null || busy) return;
            if (!choice.Loaded)
            {
                MessageBox.Show(this, "That model is not currently loaded.", "LM Studio", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            SetBusy(true, "Unloading model...");
            try
            {
                if (choice.DeviceIdentifier.Length > 0)
                    await RunAsync("lms.exe", "link set-preferred-device " + Quote(choice.DeviceIdentifier), 30000);
                CommandResult result = await RunAsync("lms.exe", "unload " + Quote(choice.LoadedIdentifier), 60000);
                if (result.ExitCode != 0)
                    throw new InvalidOperationException(result.Output.Trim());
                AppendLog("Unloaded " + choice.DisplayName + " from " + (choice.DeviceName.Length == 0 ? "this laptop" : choice.DeviceName) + ".");
            }
            catch (Exception ex)
            {
                AppendLog("MODEL UNLOAD ERROR: " + ex.Message);
                MessageBox.Show(this, ex.Message, "LM Studio model unload failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                SetBusy(false, "Model command finished");
                await RefreshModelsAsync(false);
            }
        }

        private static string Quote(string value)
        {
            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }

        private static async Task<bool> IsHealthyAsync(HttpClient client, string url)
        {
            try
            {
                using (HttpResponseMessage response = await client.GetAsync(url))
                    return response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.Redirect;
            }
            catch { return false; }
        }

        private static async Task<bool> WaitForHealthAsync(TimeSpan timeout)
        {
            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(3);
                DateTime deadline = DateTime.UtcNow + timeout;
                while (DateTime.UtcNow < deadline)
                {
                    if (await IsHealthyAsync(client, "http://localhost:8080/api/health")) return true;
                    await Task.Delay(1500);
                }
                return false;
            }
        }

        private static string FindWslHostAddress()
        {
            foreach (NetworkInterface nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (nic.Name.IndexOf("WSL", StringComparison.OrdinalIgnoreCase) < 0) continue;
                foreach (UnicastIPAddressInformation unicast in nic.GetIPProperties().UnicastAddresses)
                {
                    IPAddress address = unicast.Address;
                    if (address.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(address))
                        return address.ToString();
                }
            }
            return null;
        }

        private async Task EnsureLocalEmbeddingModelAsync()
        {
            JavaScriptSerializer json = new JavaScriptSerializer();
            CommandResult loadedResult = await RunAsync("lms.exe", "ps --json", 30000);
            if (loadedResult.ExitCode == 0)
            {
                List<LmsLoadedModel> loaded = json.Deserialize<List<LmsLoadedModel>>(loadedResult.Output);
                if (loaded.Exists(delegate(LmsLoadedModel model)
                    {
                        return model.deviceIdentifier == null &&
                            string.Equals(model.identifier, "nomic-embed-text:v1.5", StringComparison.OrdinalIgnoreCase);
                    }))
                {
                    AppendLog("Local NOMAD embedding model is ready.");
                    return;
                }
            }

            CommandResult linkResult = await RunAsync("lms.exe", "link status --json", 30000);
            if (linkResult.ExitCode != 0)
                throw new InvalidOperationException("Could not inspect LM Studio Link status: " + linkResult.Output);

            LmsLinkStatus link = json.Deserialize<LmsLinkStatus>(linkResult.Output);
            string previousPreferred = link.preferredDeviceIdentifier;
            if (string.IsNullOrWhiteSpace(link.deviceIdentifier))
                throw new InvalidOperationException("LM Studio did not report this laptop's device identifier.");

            AppendLog("Loading the local Nomic embedding model required for document search...");
            await RunAsync("lms.exe", "link set-preferred-device " + link.deviceIdentifier, 30000);
            try
            {
                CommandResult load = await RunAsync(
                    "lms.exe",
                    "load text-embedding-nomic-embed-text-v1.5 --identifier nomic-embed-text:v1.5 --context-length 2048 --gpu max --yes",
                    120000);
                if (load.ExitCode != 0)
                    throw new InvalidOperationException("Local embedding model load failed: " + load.Output);
            }
            finally
            {
                if (!string.IsNullOrWhiteSpace(previousPreferred))
                    await RunAsync("lms.exe", "link set-preferred-device " + previousPreferred, 30000);
            }
            AppendLog("Local NOMAD embedding model is ready.");
        }

        private async Task UnloadLocalModelsAsync()
        {
            CommandResult loadedResult = await RunAsync("lms.exe", "ps --json", 30000);
            if (loadedResult.ExitCode != 0) return;

            JavaScriptSerializer json = new JavaScriptSerializer();
            List<LmsLoadedModel> loaded = json.Deserialize<List<LmsLoadedModel>>(loadedResult.Output);
            HashSet<string> identifiers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (LmsLoadedModel model in loaded)
            {
                if (model.deviceIdentifier == null && !string.IsNullOrWhiteSpace(model.identifier))
                    identifiers.Add(model.identifier);
            }

            foreach (string identifier in identifiers)
                await RunAsync("lms.exe", "unload " + Quote(identifier), 30000);

            if (identifiers.Count == 0)
                AppendLog("No local LM Studio models were loaded.");
            else
                AppendLog("Unloaded " + identifiers.Count + " local LM Studio model(s); LM Link peers were left untouched.");
        }

        private static Task<CommandResult> RunAsync(string file, string arguments, int timeoutMs)
        {
            return Task.Run(delegate
            {
                StringBuilder output = new StringBuilder();
                using (Process process = new Process())
                {
                    process.StartInfo.FileName = file;
                    process.StartInfo.Arguments = arguments;
                    process.StartInfo.UseShellExecute = false;
                    process.StartInfo.RedirectStandardOutput = true;
                    process.StartInfo.RedirectStandardError = true;
                    process.StartInfo.CreateNoWindow = true;
                    process.StartInfo.WindowStyle = ProcessWindowStyle.Hidden;
                    process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (e.Data != null) output.AppendLine(e.Data); };
                    process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e) { if (e.Data != null) output.AppendLine(e.Data); };
                    process.Start();
                    process.BeginOutputReadLine();
                    process.BeginErrorReadLine();
                    if (!process.WaitForExit(timeoutMs))
                    {
                        try { process.Kill(); } catch { }
                        throw new TimeoutException(file + " " + arguments + " timed out after " + (timeoutMs / 1000) + " seconds.");
                    }
                    process.WaitForExit();
                    CommandResult result = new CommandResult();
                    result.ExitCode = process.ExitCode;
                    result.Output = output.ToString();
                    return result;
                }
            });
        }

        private void OpenInterface()
        {
            try
            {
                ProcessStartInfo browser = new ProcessStartInfo("http://localhost:8080");
                browser.UseShellExecute = true;
                Process.Start(browser);
            }
            catch (Exception ex) { AppendLog("BROWSER ERROR: " + ex.Message); }
        }

        private void SetBusy(bool value, string state)
        {
            busy = value;
            startButton.Enabled = !value;
            stopButton.Enabled = !value;
            refreshButton.Enabled = !value;
            refreshModelsButton.Enabled = false;
            loadModelButton.Enabled = false;
            unloadModelButton.Enabled = false;
            emergencyModelButton.Enabled = false;
            stateLabel.Text = state;
            stateLabel.ForeColor = Color.DarkSlateBlue;
        }

        private void AppendLog(string message)
        {
            if (InvokeRequired)
            {
                BeginInvoke(new Action<string>(AppendLog), message);
                return;
            }
            logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + message + Environment.NewLine);
        }

        private async void HandleFormClosing(object sender, FormClosingEventArgs e)
        {
            if (stoppingForClose) return;
            bool running;
            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(1);
                running = await IsHealthyAsync(client, "http://localhost:8080/api/health");
            }
            if (!running) return;

            DialogResult answer = MessageBox.Show(
                this,
                "Closing the launcher will stop NOMAD and its WSL containers. LM Studio and its loaded models will be left untouched. Continue?",
                "Stop Project NOMAD?",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);
            if (answer == DialogResult.No)
            {
                e.Cancel = true;
                return;
            }

            e.Cancel = true;
            stoppingForClose = true;
            await StopNomadAsync();
            Close();
        }
    }
}
