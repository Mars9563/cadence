import { Orb } from '@yogesharc/thinking-orbs';
import { squares } from '@yogesharc/thinking-orbs/renders';
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center flex-col">
          <Orb state="waiting" density={0.25} size={480} render={squares} className='text-red-600'/>
          <div className='text-2xl text-muted-foreground'>Loading cadence...</div>
    </div>
  );
}
