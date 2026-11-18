# Project NOMAD Launcher

Build `NOMAD Launcher.exe` from this directory to control the complete local
stack from one window. The public repository intentionally keeps unsigned build
artifacts out of Git; a locally built copy may already be present on the machine
where this profile was configured.

- **Start NOMAD** starts Ubuntu/WSL, Docker and the NOMAD containers, keeps WSL
  alive, waits for the health check, and opens the interface. It does not start,
  stop, load, unload, or reconfigure LM Studio.
- **Open Interface** opens `http://localhost:8080` without restarting services.
- **Stop Everything** terminates the NOMAD WSL distribution (which stops the
  NOMAD containers) but leaves LM Studio, its API server, and all loaded local
  or LM Link models untouched.
- **LM Studio integration** is paused. Its controls are disabled in the launcher
  because the tested local models could distort safety-critical retrieved text,
  and LM Studio is currently reserved for a separate project. NOMAD remains
  useful for its offline libraries, maps, original documents, and direct search.
- Closing the launcher offers to stop everything before it exits.

The executable was compiled locally from `Program.cs`; it is unsigned, so
Windows SmartScreen may show an Unknown Publisher warning. No installer or
administrator access is required for the launcher itself.

The launcher uses Project NOMAD's own application mark. If an older build was
already pinned to the Windows taskbar, unpin that shortcut and pin the rebuilt
`NOMAD Launcher.exe` again so Windows drops its cached generic icon.

Keep the launcher open while using NOMAD. Its hidden WSL keepalive prevents
Windows from shutting down the WSL virtual machine during an idle period.
The updated build also asks Windows not to enter automatic system sleep while
NOMAD is running. Deliberately closing the lid can still suspend the laptop;
do not close it during a large map extraction because PMTiles extraction cannot
resume and will restart from the beginning after wake.

## Rebuilding

Run `build-icon.ps1` once if the source favicon changes, then publish with:

```powershell
dotnet publish .\NomadLauncher.csproj -c Release -r win-x64 --self-contained true
```
