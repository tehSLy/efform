import {
  attach,
  combine,
  createEffect,
  createEvent,
  createStore,
  forward,
  guard,
  sample,
} from "effector";
import { createFields } from "./createSetters";
import { is } from "./is";
import { Form, FormMeta, FormValues, Schema, TypeDef, Values } from "./typeDef";


export const createForm = <T>(schema: Schema<T>): Form<FormValues<T>> => {
  const parsedSchema = { ...schema } as Schema<T>;

  const ownKeys: string[] = [];
  const nestedKeys: string[] = [];

  const ownState = {} as any;
  const nestedState = {} as any;

  const ownErrorsState = {} as any;
  const nestedErrorsState = {} as any;

  const fill = createEvent<T>();
  const setErrors = createEvent<any>();

  const reset = createEvent();

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
      nestedState[key] = payload.values.defaultState;

      nestedErrorsState[key] = payload.errors.defaultState;
      continue;
    }

    const inlineForm = createForm(payload);
    // @ts-ignore
    parsedSchema[key] = inlineForm;
    nestedKeys.push(key);

    nestedState[key] = inlineForm.values.defaultState;
    nestedErrorsState[key] = inlineForm.errors.defaultState;
  }

  const $ownState = createStore(ownState);
  const $nestedState = createStore(nestedState);

  const $ownErrors = createStore(ownErrorsState);
  const $nestedErrors = createStore(nestedErrorsState);

  const $errors = combine($ownErrors, $nestedErrors, (own, nested) => ({
    ...own,
    ...nested,
  }));

  // const errorsSampled = sample($errors);
  const errorsSampled = sample($errors);

  nestedKeys.forEach((key) => {
    const nestedForm = (parsedSchema[key as keyof T] as any) as Form<
      T[keyof T]
    >;

    $nestedState.on(nestedForm.values, (state, nested) => ({
      ...state,
      [key]: nested,
    }));

    $nestedErrors.on(nestedForm.errors, (state, errors) => ({
      ...state,
      [key]: errors,
    }));

    // @ts-ignore
    guard(
      fill.map((data) => data[key]),
      {
        filter: Boolean,
        target: nestedForm.fill,
      }
    );

    forward({
      from: setErrors,
      to: nestedForm.setErrors.prepend((data) => data[key]),
    });
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
      const res = {...state};
      for (const key of ownKeys) {
        if (key in data) {
          // @ts-ignore
          res[key] = data[key];
        }
      }
      return res;
    })
    .reset(reset);

  const validateField = attach({
    source: $ownState,
    mapParams: (key: keyof T, state) => ({ key, value: state[key] }),
    effect: createEffect({
      handler: async ({ key, value }: { key: keyof T; value: any }) => {
        //@ts-ignore
        const error = parsedSchema[key].validate(value);
        if(!error){
          //@ts-ignore
          return await parsedSchema[key].validateAsync(value);
        }

        return error;
      },
    }),
  });

  const err = guard(validateField.done, {
    filter: ({ params }) => ownKeys.includes(params as string),
  });

  $ownErrors
    .on(err, (errs, { params, result }) => ({
      ...errs,
      [params]: result,
    }))
    .on(setErrors, (state, errs) => {
      let changed = false;
      for (const key of ownKeys) {
        if (state[key] !== errs[key]) {
          changed = true;
        }
      }

      return changed ? { ...state, ...errs } : state;
    })
    .reset(reset);

  const validateInternal = attach({
    source: $values,
    effect: createEffect({
      handler: async (state: any) => {
        const ownResult = {};
        const nestedResult = {};

        const ownPromises = {};
        const nestedPromises = {};

        for (const key of ownKeys) {
          const field = parsedSchema[key];

          ownResult[key] = field.validate(state[key]); // either string or undefined

          if (!ownResult[key]) {
            ownPromises[key] = field
              .validateAsync(state[key], state)
              .then((v) => (ownResult[key] = v));
          }
        }

        for (const key of nestedKeys) {
          const formPart = parsedSchema[key] as Form<any>;
          nestedPromises[key] = formPart
            .getMeta()
            .validateInternal()
            .then((v) => (nestedResult[key] = v));
        }

        await Promise.all([
          ...Object.values(ownPromises),
          ...Object.values(nestedPromises),
        ]);

        return { ...ownResult, ...nestedResult };
      },
    }),
    mapParams: (_: void, state) => state,
  });

  const validate = createEffect({
    async handler() {
      // this need in purpose of determining root of validation tree session
      return validateInternal();
    },
  });

  forward({ from: validate.doneData, to: setErrors });

  const isValid = $errors.map(checkIsValid);
  const submit = createEvent();
  const submitted = guard(sample($values, submit), {
    filter: isValid,
  });

  const meta: FormMeta<T> = {
    getSchema: () => schema,
    //@ts-ignore
    getOwnKeys: () => ownKeys,
    //@ts-ignore
    getNestedKeys: () => nestedKeys,
    //@ts-ignore
    getParsedSchema: () => parsedSchema,
    //@ts-ignore
    validateInternal,
    kind: "form",
  };

  const form = ({
    submitted,
    submit,
    set,
    validate: validate,
    fill,
    values: $values,
    errors: errorsSampled,
    isValid,
    validateField,
    setErrors,
    reset,
    getMeta: () => meta,
  } as any) as Form<FormValues<T>>;

  //@ts-ignore
  form.fields = createFields(form);

  return form;
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
