# Icons

Generate the platform icon set before the first bundle:

```
pnpm --filter @par/desktop exec tauri icon path/to/logo.png
```

`docs/OVPCASSS_LOGO.jpg` is the source artwork. The generated `icon.ico` is
referenced by the Windows bundler; committed binaries stay out of the scaffold.
