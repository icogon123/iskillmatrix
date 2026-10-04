import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { errorMessage } from '../app/api';

/** Wraps an RTK Query mutation trigger: unwraps, toasts the server message, returns true on success. */
export function useAction(trigger) {
  return useCallback(
    async (arg, successMessage) => {
      try {
        const res = await trigger(arg).unwrap();
        toast.success(successMessage || res?.message || 'Done');
        if (res?.warning) toast(res.warning, { icon: '⚠️', duration: 6000 });
        return res || true;
      } catch (err) {
        toast.error(errorMessage(err));
        return false;
      }
    },
    [trigger],
  );
}
