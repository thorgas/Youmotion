export function shouldShowUpdateControls({
  isDevelopment,
  updateChannel,
}: {
  isDevelopment: boolean;
  updateChannel: string | null;
}) {
  return isDevelopment || updateChannel === 'testing' || updateChannel === 'qa';
}
