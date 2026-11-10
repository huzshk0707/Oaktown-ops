Oaktown Ops - Windows app shortcuts

1. Extract this entire ZIP to a folder on your Windows PC.
2. Double-click Install.cmd. It checks the configured .exe files and installs
   the launcher for your current Windows account. Administrator access is not needed.
3. Refresh Oaktown Ops, click PC apps, and choose your app. Allow the browser's
   request to open Oaktown Ops desktop apps when prompted.

The setup list is apps.json. You can import it in PC apps to restore your browser's
shortcut list. After adding/changing apps, download and run an updated setup ZIP.
Setup replaces the allowed app list for this Windows user.

The launcher opens only IDs in its local app list. Links cannot supply executable
paths, command arguments, document paths, queries or fragments. Apps open with no
arguments and their own folder as working directory. The launcher has no network
listener, background service or auto-start entry. A browser request is not proof
that an application's window opened or any work inside it was completed.

This uses Windows PowerShell 5.1 and the built-in .NET Framework on Windows 10/11.
Install.cmd uses a process-only execution-policy flag; it does not change your
Windows execution-policy setting. All compiler and launcher source is in this ZIP.

To remove the launcher, run Uninstall.cmd. It removes only this launcher's
current-user registration and known files, leaving the configured applications alone.
