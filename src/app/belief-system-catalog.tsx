import { DevelopmentScreen } from '@/development/development-screen';
import { ReflectionScreen } from '@/features/check-in/ui/reflection-screen';

export default function BeliefSystemCatalogRoute() {
  return (
    <DevelopmentScreen>
      <ReflectionScreen />
    </DevelopmentScreen>
  );
}
