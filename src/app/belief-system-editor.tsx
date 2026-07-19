import { DevelopmentScreen } from '@/development/development-screen';
import { ReflectionScreen } from '@/features/check-in/ui/reflection-screen';

export default function BeliefSystemEditorRoute() {
  return (
    <DevelopmentScreen>
      <ReflectionScreen />
    </DevelopmentScreen>
  );
}
