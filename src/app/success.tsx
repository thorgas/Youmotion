import { DevelopmentScreen } from '@/development/development-screen';
import { SuccessScreen } from '@/features/check-in/ui/success-screen';

export default function SuccessRoute() {
  return (
    <DevelopmentScreen>
      <SuccessScreen />
    </DevelopmentScreen>
  );
}
