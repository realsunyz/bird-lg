import * as React from 'react';

interface CommonControlledStateProps<T> {
  value?: T;
  defaultValue?: T;
}

export function useControlledState<T, Rest extends unknown[] = []>(
  props: CommonControlledStateProps<T> & {
    onChange?: (value: T, ...args: Rest) => void;
  },
): readonly [T, (next: T, ...args: Rest) => void] {
  const { value, defaultValue, onChange } = props;
  const isControlled = value !== undefined;
  const wasControlledRef = React.useRef(isControlled);

  React.useEffect(() => {
    if (
      import.meta.env.DEV &&
      wasControlledRef.current !== isControlled
    ) {
      console.error(
        'useControlledState changed from ' +
          `${wasControlledRef.current ? 'controlled' : 'uncontrolled'} to ` +
          `${isControlled ? 'controlled' : 'uncontrolled'}. ` +
          'Do not switch control mode during component lifecycle.',
      );
    }
    wasControlledRef.current = isControlled;
  }, [isControlled]);

  const [uncontrolledState, setUncontrolledState] = React.useState<T | undefined>(
    defaultValue,
  );

  const setState = React.useCallback(
    (next: T, ...args: Rest) => {
      if (!isControlled) {
        setUncontrolledState(next);
      }
      onChange?.(next, ...args);
    },
    [isControlled, onChange],
  );

  const currentValue = (isControlled ? value : uncontrolledState) as T;
  return [currentValue, setState] as const;
}
