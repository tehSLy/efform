import { useStoreMap } from "effector-react";
import { Form, FormValues, ValuesGeneric } from "efform";
import { useCallback } from "react";
import { PickOnly } from "./lib";

type SpecificProps<T> = {
  onChange(data: T): void;
  value: T;
  validate(): void;
  error: T extends Array<any> ? (string | undefined)[] : string | undefined;
};

export const createField = function <
  T,
  K extends keyof FormValues<T> = keyof FormValues<T>
>(
  form: Form<FormValues<T>>,
  render: (props: SpecificProps<unknown>) => JSX.Element
) {
  // @ts-ignore
  return ({ for: field, ...props }: { for: K }) => {
    // @ts-ignore
    const [value, error] = useField(form, field);

    const onChange = form.fields[field].set;
    const validate = form.fields[field].validate;
    // @ts-ignore
    return render({ onChange, validate, value, error });
  };
};

export const createNumericField = function <T>(
  form: Form<T>,
  render: (props: SpecificProps<number>) => JSX.Element
) {
  //@ts-ignore
  return createField<T, PickOnly<T, number>>(form, render);
};

export const createStringField = function <T>(
  form: Form<T>,
  render: (props: SpecificProps<string>) => JSX.Element
) {
  //@ts-ignore
  return createField<T, PickOnly<T, string>>(form, render);
};

export const createSpecificField = function <T, K extends keyof T>(
  form: Form<T>,
  {
    key,
    render,
  }: {
    render: (props: SpecificProps<ValuesGeneric<T[K]>>) => React.ReactNode;
    key: K;
  }
) {
  return () => {
    const [value, error] = useField(form, key);
    const onChange = useCallback(
      //@ts-ignore
      (value: any) => form.set({ key, payload: value }),
      [key]
    );

    const validate = useCallback(() => form.validateField(key), [key]);
    // @ts-ignore
    return render({ onChange, validate, value, error }) as any;
  };
};

export const useFieldValue = function <T, K extends keyof T>(
  form: Form<T>,
  name: K
) {
  return useStoreMap({
    store: form.values,
    // @ts-ignore
    fn: (state) => (state[name] === undefined ? null : state[name]),
    keys: [name],
  }) as T[K];
};

export const useFieldError = function <T, K extends keyof T>(
  form: Form<T>,
  name: K
) {
  return useStoreMap({
    store: form.errors,
    // @ts-ignore
    fn: (state) => state[name] || null,
    keys: [name],
  }) as string | undefined | null;
};

export const useField = function <T, K extends keyof T>(
  form: Form<T>,
  name: K
) {
  return [useFieldValue(form, name), useFieldError(form, name)] as const;
};

/*
 Roadmap:
  - useField better api
  - useForm -> {validate, values, errors, reset}
  - use
  ```ts
    const { value, touched, dirty, set } = useField(form, name);
  ```
*/
