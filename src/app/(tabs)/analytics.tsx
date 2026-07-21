import { DevelopmentScreen } from '@/development/development-screen';
import { AnalyticsScreen } from '@/features/analytics/ui/analytics-screen';

export default function AnalyticsRoute() {
  return (
    <DevelopmentScreen>
      <AnalyticsScreen />
    </DevelopmentScreen>
  );
}
