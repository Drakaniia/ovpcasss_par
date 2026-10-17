import type { FilePicker, PickedFile } from '../contracts';

/** Browser file input; the Tauri build swaps in the dialog plugin (spec §6). */
export function createFilePicker(): FilePicker {
  return {
    async pick() {
      return new Promise<PickedFile[]>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;

        input.addEventListener('change', () => {
          const picked = [...(input.files ?? [])].map((file) => ({
            name: file.name,
            size: file.size,
            mimeType: file.type,
          }));
          resolve(picked);
        });

        input.click();
      });
    },
  };
}
