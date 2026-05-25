import { useEffect } from 'react';

import { getWorkbenchContext } from '../context/workbench-context';
import { evaluateWhenClause } from '../menu/evaluate-when-clause';
import { keybindingService } from './keybinding-service';

export function useKeybindingListener() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        return;
      }

      void keybindingService.handleKeyDown(event, getWorkbenchContext(), evaluateWhenClause);
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
