import { DevelopmentScreen } from '@/development/development-screen';
import { BeliefLibraryScreen } from '@/features/beliefs/ui/belief-library-screen';

export default function BeliefLibraryRoute() {
  return (
    <DevelopmentScreen>
      <BeliefLibraryScreen />
    </DevelopmentScreen>
  );
}
