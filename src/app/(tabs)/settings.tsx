import { DevelopmentScreen } from '@/development/development-screen';
import { SettingsScreen } from '@/features/settings/ui/settings-screen';

export default function SettingsRoute() {
  return (
    <DevelopmentScreen>
      <SettingsScreen />
    </DevelopmentScreen>
  );
}
