import { DevelopmentScreen } from '@/development/development-screen';
import { HistoryScreen } from '@/features/check-in/ui/history-screen';

export default function HistoryRoute() {
  return (
    <DevelopmentScreen>
      <HistoryScreen />
    </DevelopmentScreen>
  );
}
