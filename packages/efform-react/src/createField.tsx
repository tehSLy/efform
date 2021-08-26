import { useStoreMap } from "effector-react";
import { Form, FormValues, ValuesGeneric } from "efform";
import { ComponentType, useCallback, useMemo } from "react";
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
  render: <P>(
    field: SpecificProps<unknown> & { fieldKey: keyof FormValues<T> },
    props: P
  ) => JSX.Element
) {
  // @ts-ignore
  return function <T = {}>({ for: field, ...props }: { for: K } & T) {
    // @ts-ignore
    const [value, error] = useField(form, field);

    const onChange = form.fields[field].set;
    const validate = form.fields[field].validate;
    // @ts-ignore
    return render({ onChange, validate, value, error, fieldKey: field }, props);
  };
};

export const createNumericField = function <T, P = {}>(
  form: Form<T>,
  render: (
    field: SpecificProps<number> & { fieldKey: keyof FormValues<T> },
    props: P
  ) => JSX.Element
) {
  //@ts-ignore
  return createField<T, PickOnly<T, number>>(
    form,
    render
  ) as any as ComponentType<P & { for: PickOnly<T, number> }>;
};

export const createStringField = function <T, P = {}>(
  form: Form<T>,
  render: (
    field: SpecificProps<string> & { fieldKey: keyof FormValues<T> },
    props: P
  ) => JSX.Element
) {
  //@ts-ignore
  return createField<T, PickOnly<T, string>>(
    form,
    render
  ) as any as ComponentType<P & { for: PickOnly<T, string> }>;
};

export const createSpecificField = function <T, K extends keyof T, P>(
  form: Form<T>,
  {
    key,
    render,
  }: {
    render: (
      field: SpecificProps<ValuesGeneric<T[K]>>,
      props: P
    ) => React.ReactNode;
    key: K;
  }
) {
  return function (props: P) {
    const { value, error } = useField(form, key);
    const onChange = useCallback(
      //@ts-ignore
      (value: any) => form.set({ key, payload: value }),
      [key]
    );

    const validate = useCallback(() => form.validateField(key), [key]);
    return render(
      // @ts-ignore
      { onChange, validate, value, error },
      props
    ) as JSX.Element;
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
  const value = useFieldValue(form, name);
  const error = useFieldError(form, name);
  return useMemo(() => {
    const result = [value, error] as const;
    return Object.assign(result, { value, error });
  }, [value, error]);
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
