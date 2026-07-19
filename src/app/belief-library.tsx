import { DevelopmentScreen } from '@/development/development-screen';
import { BeliefLibraryScreen } from '@/features/settings/ui/belief-library-screen';

export default function BeliefLibraryRoute() {
  return (
    <DevelopmentScreen>
      <BeliefLibraryScreen />
    </DevelopmentScreen>
  );
}
