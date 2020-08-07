// @ts-nocheck

import {
  attach,
  combine,
  createEffect,
  createEvent,
  createStore,
  Effect,
  Event,
  forward,
  guard,


  merge, sample,
  Store
} from "effector";

type CustomValidator<T> = (data: T) => boolean | Promise<boolean>;

interface Rule<T = any> {
  payload?: any;
  message?: string;
  validator: (value: T, payload: any) => boolean | Promise<boolean>;
}

interface TypeDef<T = any> {
  protected getInitial(): any;
  validation(validator: CustomValidator<T>, message?: string): TypeDef<T>;
}

interface NumberTypeDef extends TypeDef<number> {
  required(message?: string): NumberTypeDef;
  min(payload: number, message?: string): NumberTypeDef;
  max(payload: number, message?: string): NumberTypeDef;
  positive(message?: string): NumberTypeDef;
  negative(message?: string): NumberTypeDef;
  validation(
    validator: CustomValidator<number>,
    message?: string
  ): NumberTypeDef;
}

interface StringTypeDef extends TypeDef {
  required(message?: string): StringTypeDef;
  pattern(pattern: RegExp | string, message?: string): StringTypeDef;

  length(exact: number, message?: string): StringTypeDef;
  length(min: number, max: number, message?: string): StringTypeDef;
  validation(
    validator: CustomValidator<string>,
    message?: string
  ): StringTypeDef;
}

abstract class TypeDef<T = any> {
  private initial: any;
  private rules: Rule<T>[] = [];

  protected setRule({ payload, message, validator }: Rule<T>) {
    const newInstance = this.constructor(this.initial);

    newInstance.rules = [...this.rules, { message, payload, validator }];
    return newInstance;
  }

  required(message?: string) {
    return this.setRule({
      payload: null,
      validator: Boolean,
      message: message || "Required param",
    });
  }

  getInitial() {
    return this.initial;
  }

  protected async validate(value: any) {
    for (const { payload, message, validator } of this.rules) {
      const result = await validator(value, payload);
      if (!result) {
        return message || "Validation error";
      }
    }
    return undefined;
  }

  validation<E extends (data: T) => boolean | Promise<boolean>>(
    validator: E,
    message?: string
  ) {
    return this.setRule({
      validator,
      message,
    });
  }
}

type NumberValidatorKey =
  | "required"
  | "min"
  | "max"
  | "negative"
  | "positive"
  | "type";
type StringValidatorKey =
  | "required"
  | "pattern"
  | "length"
  | "startsWith"
  | "enum"
  | "endsWith"
  | "type";

const numberValidators: {
  [key in NumberValidatorKey]: (v: number, payload: any) => boolean;
} = {
  required: (v) => !!v,
  max: (v, max) => v < max,
  min: (v, min) => v > min,
  negative: (v) => v < 0,
  positive: (v) => v > 0,
  type: (v) => typeof v === "number",
};

const stringValidators: {
  [key in StringValidatorKey]: (v: string, payload: any) => boolean;
} = {
  length: (v, payload) =>
    typeof payload === "number"
      ? v.length === payload
      : v.length > payload.min && v.length < payload.max,
  pattern: (v, pattern: RegExp) => pattern.test(v),
  required: Boolean,
  endsWith: (v, payload) => v.endsWith(payload),
  startsWith: (v, payload) => v.startsWith(payload),
  enum: (v, options) => options.includes(v),
  type: (v) => typeof v === "string",
};

class NumberTypeDef extends TypeDef {
  private rules: Rule[] = [
    {
      payload: null,
      message: "must be number",
      validator: numberValidators.type,
    },
  ];
  private initial: number;

  constructor(initial: number = 0) {
    super();
    this.initial = initial;
  }

  max(payload: number, message?: string) {
    return this.setRule({
      validator: numberValidators.max,
      payload,
      message: message || `Value must be less then ${payload}`,
    });
  }

  min(payload: number, message?: string) {
    return this.setRule({
      validator: numberValidators.min,
      payload,
      message: message || `Value must be more then ${payload}`,
    });
  }

  positive(message?: string) {
    return this.setRule({
      validator: numberValidators.positive,
      message: message || "Value must be positive",
    });
  }

  negative(message?: string) {
    return this.setRule({
      validator: numberValidators.positive,
      message: message || "Value must be negative",
    });
  }
}

export const number = (initial?: number): NumberTypeDef => {
  return new NumberTypeDef(initial);
};

class StringTypeDef extends TypeDef {
  private rules: Rule[] = [
    { validator: stringValidators.type, message: "Must be string" },
  ];
  private initial: string;

  constructor(initial: string = "") {
    super();
    this.initial = initial;
  }

  pattern(pattern: RegExp | string, message?: string) {
    const patternParsed =
      typeof pattern === "string" ? new RegExp(pattern) : pattern;
    return this.setRule({
      validator: stringValidators.pattern,
      message,
      payload: patternParsed,
    });
  }

  endsWidth(payload: string, message?: string) {
    return this.setRule({
      message,
      payload,
      validator: stringValidators.endsWith,
    });
  }

  startsWith(payload: string, message?: string) {
    return this.setRule({
      message,
      payload,
      validator: stringValidators.startsWith,
    });
  }

  length(min: number, message?: string): StringTypeDef;
  length(min: number, max?: number, message?: string): StringTypeDef;
  length(min: number, max?: number | string, message?: string) {
    const isRange = typeof max === "number";
    return this.setRule({
      validator: stringValidators.length,
      message: isRange ? message : (max as string),
      payload: isRange ? { min, max } : min,
    });
  }

  enum(options: string[], message?: string) {
    return this.setRule({
      validator: stringValidators.enum,
      message,
      payload: options,
    });
  }
}

export const string = (initial?: string): StringTypeDef => {
  return new StringTypeDef(initial);
};

type UnionToIntersection<U> = (
  U extends unknown ? (a: U) => 0 : never
) extends (a: infer I) => 0
  ? I
  : never;

type UnionOfFn<T> = {
  [K in keyof T]: Event<{ key: K; payload: T[K] }>;
}[keyof T];

type IntersectionOfFn<T> = UnionToIntersection<UnionOfFn<T>>;

type Schema<T> = { [key in keyof T]: T[key] };

type KeysNotMatching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? never : K;
}[keyof T];

type PrimitiveOnly<T> = { [key in KeysNotMatching<T, Form<any>>]: T[key] };

interface Form<T> {
  onChange(cb: (data: Values<T>) => void): void;
  onSubmit(cb: (data: Values<T>) => void): void;
  changed: Event<Values<T>>;
  set: IntersectionOfFn<Values<PrimitiveOnly<T>>>;
  fill: Event<Values<T>>;
  validate: Event<void>;
  getInitial(): Values<T>;
  values: Store<Values<T>>;
  errors: Store<Errors<T>>;
  error: Event<Errors<T>>;
  submitted: Event<Values<T>>;
  validateField: Effect<keyof T, void, Error>;
}

type Values<T> = T extends Schema<infer U>
  ? {
      [key in keyof U]: U[key] extends Form<infer G>
        ? Values<Schema<G>>
        : U[key] extends Schema<infer G>
        ? Values<Schema<G>>
        : Value<U[key]>;
    }
  : never;

type Errors<T> = T extends Schema<infer U>
  ? {
      [key in keyof U]: U[key] extends Schema<infer G>
        ? Values<Schema<G>>
        : string | undefined;
    }
  : never;

type Value<T> = T extends NumberTypeDef
  ? number
  : T extends StringTypeDef
  ? string
  : never;

export const createForm = <T>(schema: Schema<T>): Form<T> => {
  const parsedSchema = { ...schema };

  const ownKeys: string[] = [];
  const nestedKeys: string[] = [];

  const ownState = {} as any;
  const nestedState = {} as any;

  const $ownErrors = createStore({});
  const $nestedErrors = createStore({});

  const errorOccured = sample(merge([$ownErrors, $nestedErrors]));
  
  const $errors = createStore({}).on(errorOccured, (state, errs) =>
    isEmptyObject(errs) ? state : { ...state, ...errs }
  );
  // .on($nestedErrors, (state, nested) => ({ ...state, ...nested }));

  const errorsSampled = sample($errors);

  const fill = createEvent<T>();

  // resolve initial state, parse form keys to determine parents
  for (const key in parsedSchema) {
    const payload = parsedSchema[key];
    if (payload instanceof TypeDef) {
      ownKeys.push(key);
      ownState[key] = payload.getInitial();
      continue;
    }
    if (isForm(payload)) {
      nestedKeys.push(key);
      nestedState[key] = payload.getInitial();
      continue;
    }

    // @ts-ignore
    parsedSchema[key] = createForm(payload);
    nestedKeys.push(key);

    // @ts-ignore
    nestedState[key] = parsedSchema[key].getInitial();
  }

  const $ownState = createStore(ownState);
  const $nestedState = createStore(nestedState);

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
      handler: ({ key, value }: any) => {
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

  const validateOwn = attach({
    source: $ownState,
    mapParams: (_: void, state) => state,
    effect: createEffect({
      async handler(state) {
        const promises = [];
        for (const key of ownKeys) {
          promises.push(
            parsedSchema[key].validate(state[key]).catch((e) => e.message)
          );
        }
        const results = await Promise.all(promises);
        return ownKeys.reduce((carry, key, i) => {
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
        }, {});
      },
    }),
  });

  forward({
    from: validate,

    // @ts-ignore
    to: [
      nestedKeys.map((key) => parsedSchema[key as keyof T].validate),
      validateOwn,
    ],
  });

  $ownErrors.on(validateOwn.doneData, (state, errs) => ({
    ...state,
    ...errs,
  }));
  const submit = createEvent();
  const submitted = sample($values, submit);

  const isValid = $errors.map(checkIsValid)
  return {
    onChange: () => void 0,
    onSubmit: () => void 0,
    submitted,
    submit,
    error: sample(
      $errors.updates.filter({
        fn: (t) => !!(typeof T === "object" ? Object.keys(t).length : t),
      })
    ),
    set,
    validate,
    getInitial: () => $values.defaultState,
    fill,
    values: $values,
    errors: sample(errorsSampled),
    isValid,
    __kind: "form",
    validateField,
  };
};

/*
TODO:
- async validation
- array of items
- object typedef (?) - provided with inline form
*/

const isForm = (entity: any): entity is Form<any> => {
  //@ts-ignore
  return entity.__kind === "form";
};

const isEmptyObject = <T>(obj: T) => {
  return Object.keys(obj).length === 0;
};

function checkIsValid(obj){
  if(typeof obj === "object"){
    if(isEmptyObject(obj)){
      return true;
    }

    return Object.values(obj).every(checkIsValid);
  }
  return false;
}
