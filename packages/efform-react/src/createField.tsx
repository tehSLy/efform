import { useStoreMap } from "effector-react";
import { Form, Schema } from "efform";
import { useCallback } from "react";

type Props<K extends keyof T, T> = {
  onChange(data: T[K]): void;
  value: T[K];
  validate(): void;
  error: string | null;
};

type SpecificProps<T> = {
  onChange(data: T): void;
  value: T;
  validate(): void;
  error: string | null;
};

export const createField = function <T>(
  form: Form<Schema<T>>,
  render: (props: SpecificProps<unknown>) => JSX.Element
) {
  // @ts-ignore
  return ({ name, ...props }: { name: keyof T }) => {
    const value = useStoreMap({
      store: form.values,
      // @ts-ignore
      fn: (state) => state[name] || null,
      keys: [name],
    });

    const error = useStoreMap({
      store: form.errors,
      // @ts-ignore
      fn: (state) => state[name] || null,
      keys: [name],
    });

    const onChange = useCallback(
      //@ts-ignore
      (value: any) => form.set({ key: name, payload: value }),
      [name]
    );
    const validate = useCallback(() => form.validateField(name), [name]);
    // @ts-ignore
    return render({ onChange, validate, value, error });
  };
};

export const createNumericField = function <T>(
  form: Form<Schema<T>>,
  render: (props: SpecificProps<number>) => JSX.Element
) {
  //@ts-ignore
  return createField(form, render);
};

export const createStringField = function <T>(
  form: Form<Schema<T>>,
  render: (props: SpecificProps<string>) => JSX.Element
) {
  //@ts-ignore
  return createField(form, render);
};
