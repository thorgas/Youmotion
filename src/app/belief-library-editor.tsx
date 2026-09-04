import { DevelopmentScreen } from '@/development/development-screen';
import { BeliefLibraryScreen } from '@/features/beliefs/ui/belief-library-screen';

export default function BeliefLibraryEditorRoute() {
  return (
    <DevelopmentScreen>
      <BeliefLibraryScreen />
    </DevelopmentScreen>
  );
}
