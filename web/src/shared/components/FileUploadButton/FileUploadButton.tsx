import Button from '@mui/material/Button';

export type FileUploadButtonProps = {
  /** Button/label text when no file selected; or pass selected file name to show it */
  label: string;
  /** Selected file name to display (when present, often shown instead of label) */
  selectedFileName?: string | null;
  accept?: string;
  onChange: (file: File | null) => void;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
};

export function FileUploadButton({
  label,
  selectedFileName,
  accept,
  onChange,
  fullWidth = true,
  size = 'small',
}: FileUploadButtonProps) {
  return (
    <Button variant="outlined" component="label" size={size} fullWidth={fullWidth}>
      {selectedFileName ?? label}
      <input
        type="file"
        accept={accept}
        hidden
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </Button>
  );
}
