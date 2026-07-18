import { DevelopmentScreen } from '@/development/development-screen';
import { GuidingBeliefScreen } from '@/features/check-in/ui/guiding-belief-screen';

export default function GuidingBeliefRoute() {
  return (
    <DevelopmentScreen>
      <GuidingBeliefScreen />
    </DevelopmentScreen>
  );
}
