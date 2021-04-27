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
  render: <P>(props: SpecificProps<unknown> & P) => JSX.Element
) {
  // @ts-ignore
  return function<T = {}>({ for: field, ...props }: { for: K } & T){
    // @ts-ignore
    const [value, error] = useField(form, field);

    const onChange = form.fields[field].set;
    const validate = form.fields[field].validate;
    // @ts-ignore
    return render({ onChange, validate, value, error, ...props });
  };
};

export const createNumericField = function <T>(
  form: Form<T>,
  render: <P>(props: SpecificProps<number> & P) => JSX.Element
) {
  //@ts-ignore
  return createField<T, PickOnly<T, number>>(form, render);
};

export const createStringField = function <T>(
  form: Form<T>,
  render: <P = {}>(props: SpecificProps<string> & P) => JSX.Element
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
    render: <P = {}>(props: SpecificProps<ValuesGeneric<T[K]>> & P) => React.ReactNode;
    key: K;
  }
) {
  return () => {
    const { value, error } = useField(form, key);
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
  return { value: useFieldValue(form, name), error: useFieldError(form, name) };
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
