# Windows app shortcuts

**PC apps** in the workspace toolbar opens a device-local app list. PDFCraft is
the initial shortcut. A normal website cannot execute a local Windows file path;
one explicit setup installs an `oaktown-ops:` URI handler for the Windows user.

## Use on a Windows PC

1. Use the prepared setup ZIP, or enter app names and full `.exe` paths in
   PC apps → Windows setup & app list and download a setup ZIP.
2. Extract the entire ZIP. Double-click **Install.cmd** once on that Windows PC.
   It validates the listed executable files and compiles the small local launcher
   using Windows PowerShell 5.1 and the built-in .NET Framework. No admin account
   is needed. Existing unrelated protocol registrations/folders are not replaced.
3. Refresh Oaktown Ops, choose **PC apps → Open PDFCraft**, and allow the browser's
   request to open the Windows launcher. The app controls its own window behavior.

Add/edit/remove changes the browser's shortcut list. Download and run updated
setup to replace the Windows user's allowed app list. Import `apps.json` from a
setup ZIP to restore the browser list. Uninstall.cmd removes the handler and
known launcher files while retaining the selected applications and unrelated files.

The user's supplied PDFCraft path belongs only in the private prepared download
and device configuration. It is not a site default, server record or repository
fixture. The browser keeps its list in local storage, with session-only fallback
if storage is unavailable. Different browsers/Windows accounts have separate setup.

## Launch boundary

- Links contain exactly one app ID: `oaktown-ops://launch/pdfcraft`. Executable
  paths, document arguments, extra process arguments, encoded IDs, queries and
  fragments are not accepted from links. Unknown IDs are rejected.
- A native launcher resolves the ID against its own local `apps.json`. It starts
  an approved local drive `.exe` directly, with no arguments, `UseShellExecute=false`
  and the app's own directory as working directory. No command shell is involved.
- The handler has no network listener, service, scheduled job or auto-start entry.
  Installation uses HKCU and LocalAppData. The setup command's execution-policy
  flag is process-only; it does not change system/user execution-policy settings.
- The custom scheme is an OS capability, not an authenticated website origin.
  Other programs/sites can request the same allowed IDs; browser prompts and the
  narrow local allowlist remain the boundary. Nothing authorizes arbitrary code
  or proves staff approval, document correctness or work done inside an app.
- The web page reports a request sent to Windows. It cannot independently confirm
  that a window opened. This Linux coding environment cannot install the helper
  or verify an executable on the user's Windows PC.

## Verification and rollout

Fictional Node/browser tests cover strict local paths and IDs, config limits,
ZIP contents, local persistence/import, no path-bearing network requests, closed
dialog cancellation, keyboard focus and all six themes at 320/390/1440px.
The dedicated Windows CI job compiles the native handler, opens a fictional
executable through both native and registered-URI paths, verifies working
directory/zero arguments, rejects unsafe requests/configs, preserves valid setup
after a rejected update, rejects foreign ownership and verifies uninstall.

Windows test execution requires a clean disposable GitHub Actions runner. It is
not a script to run on a configured staff PC. Actual user installation and opening
PDFCraft remain separate from these fictional tests and website publication.
