# PC apps / PDFCraft shortcut — retired

Huzy reported on November 11, 2026 that the PC apps feature did not work for him
and explicitly asked to remove it. The website no longer offers PC apps, app-list
editing/import or Windows setup downloads. Its launcher sources, scripts, styles,
feature tests and dedicated CI job are removed. Use PDFCraft directly in Windows.

## If you previously installed the helper

Run **Uninstall.cmd** from the original extracted setup folder, or from
`%LOCALAPPDATA%\OaktownOpsLauncher` in File Explorer. This removes only the
current user's Oaktown launcher registration and owned helper files. PDFCraft
and other selected applications remain installed.

Removing the website feature cannot uninstall software from a separate Windows
PC. This coding environment has no access to that PC, so local uninstallation
must not be reported as completed without evidence from the user.

The former implementation remains in Git history under PR #61. No new setup
should be installed; these notes exist only for retirement and optional cleanup.
