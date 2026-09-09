import CrewOutings2026Screen from '../src/features/refonte/CrewOutings2026Screen';
import { useResultOwner2026 } from '../src/features/run/useResultOwner2026';

export default function CrewOutingsRoute() {
  const { epoch } = useResultOwner2026();
  return <CrewOutings2026Screen key={epoch} />;
}
