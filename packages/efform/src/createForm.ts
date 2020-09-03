import {
  attach,
  combine,
  createEffect,
  createEvent,
  createStore,
  forward,
  guard,
  merge,
  sample
} from "effector";
import { is } from "./is";
import { Form, FormMeta, FormValues, Schema, TypeDef, Values } from "./typeDef";

const empty = {};

export const createForm = <T>(schema: Schema<T>): Form<FormValues<T>> => {
  const parsedSchema = { ...schema } as Schema<T>;

  const ownKeys: string[] = [];
  const nestedKeys: string[] = [];

  const ownState = {} as any;
  const nestedState = {} as any;

  const ownErrorsState = {} as any;
  const nestedErrorsState = {} as any;

  const ownTouched = {} as any;
  const nestedTouched = {} as any;

  const ownDirty = {} as any;
  const nestedDirty = {} as any;

  const fill = createEvent<T>();

  // resolve initial state, parse form keys to determine parents
  for (const key in parsedSchema) {
    const payload = parsedSchema[key as keyof Schema<T>];
    if (payload instanceof TypeDef) {
      ownKeys.push(key);
      ownState[key] = TypeDef.resolveInitial(payload);

      ownErrorsState[key] = undefined;
      continue;
    }
    if (is.form(payload)) {
      nestedKeys.push(key);
      nestedState[key] = payload.getInitial();

      nestedErrorsState[key] = payload.errors.defaultState;
      continue;
    }

    const inlineForm = createForm(payload);
    // @ts-ignore
    parsedSchema[key] = inlineForm;
    nestedKeys.push(key);


    nestedState[key] = inlineForm.getInitial();
    nestedErrorsState[key] = inlineForm.errors.defaultState
  }

  const $ownState = createStore(ownState);
  const $nestedState = createStore(nestedState);

  const $ownErrors = createStore(ownErrorsState);
  const $nestedErrors = createStore(nestedErrorsState);

  const $ownTouched = createStore(ownTouched);
  const $nestedTouched = createStore(nestedTouched);

  const $ownDirty = createStore(ownDirty);
  const $nestedDirty = createStore(nestedDirty);

  const $errors = combine($ownErrors, $nestedErrors, (own, nested) => ({...own, ...nested}))

  const errorsSampled = sample($errors);

  nestedKeys.forEach((key) => {
    const nestedForm = (parsedSchema[key as keyof T] as any) as Form<
      T[keyof T]
    >;

    $nestedState.on(nestedForm.values, (state, nested) => ({
      ...state,
      [key]: nested,
    }));

    $nestedErrors.on(nestedForm.error, (state, errors) => ({
      ...state,
      [key]: errors,
    }));

    // @ts-ignore
    forward({ from: fill, to: nestedForm.fill.prepend((data) => data[key]) });
  });

  const set = createEvent<{ key: keyof Values<T>; payload: any }>();
  const $values = combine($ownState, $nestedState, (own, nested) => ({
    ...nested,
    ...own,
  }));

  $ownState
    .on(set, (state, { key, payload }) => ({
      ...state,
      [key]: payload,
    }))
    .on(fill, (state, data) => {
      for (const key of ownKeys) {
        // @ts-ignore
        state[key] = data[key];
      }
      return { ...state };
    });

  const validate = createEvent();
  const validateField = attach({
    source: $ownState,
    mapParams: (key: keyof T, state) => ({ key, value: state[key] }),
    effect: createEffect({
      handler: ({ key, value }: { key: keyof T; value: any }) => {
        //@ts-ignore
        return parsedSchema[key].validate(value);
      },
    }),
  });

  const err = guard(validateField.done, {
    filter: ({ params }) => ownKeys.includes(params as string),
  });

  $ownErrors.on(err, (errs, { params, result }) => ({
    ...errs,
    [params]: result,
  }));

  const validateOwnSync = sample($ownState, validate, (state) => {
    const errs = [];
    for (const key of ownKeys) {
      const validator = parsedSchema[key as keyof Schema<T>];
      //@ts-ignore
      const result = validator.validate(state[key]);
      if (result) {
        errs.push([key, result]);
      }
    }

    return errs.length ? Object.fromEntries(errs) : null;
  });

  const validateOwn = attach({
    source: $ownState,
    mapParams: (_: void, state) => state,
    effect: createEffect({
      async handler(state: any) {
        const promises = [];
        for (const key of ownKeys) {
          promises.push(
            //@ts-ignore
            parsedSchema[key as keyof Schema<T>]
              //@ts-ignore
              .validateAsync(state[key])
              //@ts-ignore
              .catch((e) => e.message)
          );
        }
        const results = await Promise.all(promises);
        const result = ownKeys.reduce((carry, key, i) => {
          const result = results[i];
          if (!result) {
            return carry;
          }

          if (typeof result === "object") {
            if (Object.keys(result).length) {
              carry[key] = result;
            }

            return carry;
          }
          carry[key] = result;
          return carry;
        }, {} as Record<string, any>);
        return Object.keys(result).length ? result : null;
      },
    }),
  });

  forward({
    from: validate,
    to: [
      ...nestedKeys.map(
        (key) => (parsedSchema[key as keyof T] as any).validate
      ),
      validateOwn,
      validateOwnSync,
    ],
  });
  $ownErrors.on([validateOwn.doneData, validateOwnSync], (state, errs) =>
    errs
      ? {
          ...state,
          ...errs,
        }
      : $ownErrors.defaultState
  );
  const submit = createEvent();
  const submitted = sample($values, submit);

  const isValid = $errors.map(checkIsValid);

  const meta: FormMeta<T> = {
    getMeta: () => schema,
    getOwnKeys: () => ownKeys,
  };

  return {
    onChange: () => void 0,
    onSubmit: () => void 0,
    submitted,
    submit,
    //@ts-ignore
    error: sample(
      //@ts-ignore
      $errors.updates.filter({
        //@ts-ignore
        fn: (t) => !!(typeof T === "object" ? Object.keys(t).length : t),
      })
    ),
    //@ts-ignore
    set,
    validate,
    getInitial: () => $values.defaultState,
    //@ts-ignore
    fill,
    values: $values,
    //@ts-ignore
    errors: sample(errorsSampled),
    isValid,
    __kind: "form",
    //@ts-ignore
    validateField,
    touched: null,
    dirty: null,
    merge: null,
    ...meta
  };
};
console.log("v", "1.12");
/* 
 - guard isValid & submit
*/

const isEmptyObject = <T>(obj: T) => {
  return Object.keys(obj).length === 0;
};

function checkIsValid(obj: any) {
  if (typeof obj === "object") {
    if (isEmptyObject(obj)) {
      return true;
    }

    return Object.values(obj).every(checkIsValid);
  }
  return false;
}
