
import {
  combine,
  createEvent,
  createStore,
  Event,
  forward,
  sample,
  Store,
} from "effector";

interface FormPart<T> {
  getInitial(): T;
  validate(): Event<void>;
}

interface TypeDef {
  getInitial(): any;
}

abstract class TypeDef {}
interface Rule {
  key: string;
  payload: any;
  message?: string;
}

interface NumberTypeDef extends TypeDef {
  required(): NumberTypeDef;
  min(payload: number): NumberTypeDef;
  max(payload: number): NumberTypeDef;
  positive(): NumberTypeDef;
  negative(): NumberTypeDef;
}

interface StringTypeDef extends TypeDef {
  required(): StringTypeDef;
  pattern(pattern: RegExp | string): StringTypeDef;

  length(exact: number): StringTypeDef;
  length(min: number, max: number): StringTypeDef;
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
    { key: "type", payload: null, message: "Should be number" },
  ];
  private initial: number;

  constructor(initial: number = 0) {
    super();
    this.initial = initial;
  }

  private setRule(key: string, payload: any = true, message?: string) {
    const newInstance = new NumberTypeDef(this.initial);
    newInstance.rules = [...this.rules, { key, message, payload }];
    return newInstance;
  }

  required(message?: string) {
    return this.setRule("required", null, message);
  }

  max(payload: number, message?: string) {
    return this.setRule(
      "max",
      payload,
      message || `Value should be less then ${payload}`
    );
  }

  min(payload: number, message?: string) {
    return this.setRule("min", payload, message);
  }

  positive(message?: string) {
    return this.setRule("positive", message);
  }

  negative(message?: string) {
    return this.setRule("negative", message);
  }

  validate(value: number) {
    for (const { key, payload, message } of this.rules) {
      const validator = numberValidators[key as NumberValidatorKey];
      const result = validator(value, payload);
      if (!result) {
        return message || "Validation error";
      }
    }
    return undefined;
  }

  getInitial() {
    return this.initial;
  }
}

export const number = (initial?: number): NumberTypeDef => {
  return new NumberTypeDef(initial);
};

class StringTypeDef extends TypeDef {
  private rules: Rule[] = [
    { key: "type", payload: null, message: "Should be string" },
  ];
  private initial: string;

  constructor(initial: string = "") {
    super();
    this.initial = initial;
  }

  private setRule(key: string, payload: any = true, message?: string) {
    const newInstance = new StringTypeDef(this.initial);
    newInstance.rules = [...this.rules, { key, message, payload }];
    return newInstance;
  }

  required() {
    return this.setRule("required");
  }

  pattern(pattern: RegExp | string, message?: string) {
    const patternParsed =
      typeof pattern === "string" ? new RegExp(pattern) : pattern;
    return this.setRule("pattern", patternParsed, message);
  }

  validate(value: string) {
    for (const { key, payload, message } of this.rules) {
      const validator = stringValidators[key as StringValidatorKey];
      const result = validator(value, payload);
      if (!result) {
        return message || "Validation error";
      }
    }
    return undefined;
  }

  endsWidth(payload: string, message?: string) {
    return this.setRule("endsWith", payload, message);
  }

  startsWith(payload: string, message?: string) {
    return this.setRule("startsWith", payload, message);
  }

  length(min: number, message?: string): StringTypeDef;
  length(min: number, max?: number, message?: string): StringTypeDef;
  length(min: number, max?: number | string, message?: string) {
    const isRange = typeof max === "number";
    return this.setRule(
      "length",
      isRange ? { min, max } : min,
      isRange ? message : (max as string)
    );
  }

  //   enum(...options: string[]): StringTypeDef; // consider message argument position, on hold
  enum(options: string[], message?: string) {
    return this.setRule("enum", options, message);
  }

  getInitial() {
    return this.initial;
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

type Callable<K extends keyof T, T> = Event<{ key: K; payload: T[K] }>;

type Fn<T extends string | number | symbol, V> = Callable<T, { [K in T]: V }>;

type UnionOfFn<T> = {
  [K in keyof T]: Event<{ key: K; payload: T[K] }>;
}[keyof T];

type IntersectionOfFn<T> = UnionToIntersection<UnionOfFn<T>>;

type Schema<T> = { [key in keyof T]: T[key] };

type KeysNotMatching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? never : K;
}[keyof T];

type PrimitiveOnly<T> = { [key in KeysNotMatching<T, Form<any>>]: T[key] };

type E = PrimitiveOnly<{ foo: StringTypeDef; bar: Form<any> }>;

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
// type Value<T> = T

export const createForm = <T>(schema: Schema<T>): Form<T> => {
  const parsedSchema = { ...schema };

  const ownKeys: string[] = [];
  const nestedKeys: string[] = [];

  const ownState = {} as any;
  const nestedState = {} as any;

  const $ownErrors = createStore({});
  const $nestedErrors = createStore({});

  const $errors = createStore({})
    .on($ownErrors, (state, own) => ({ ...state, ...own }))
    .on($nestedErrors, (state, nested) => ({ ...state, ...nested }));
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
  forward({
	 from: validate,
	 
	 // @ts-ignore
    to: nestedKeys.map((key) => parsedSchema[key as keyof T].validate),
  });

  const error = sample($values, validate, (values) => {
    const result = {};

    ownKeys.forEach((key) => {
		const typeDef = schema[key as keyof T];
		
		// @ts-ignore
      const validationResult = typeDef.validate(values[key]);
      if (validationResult) {
			
			// @ts-ignore
        result[key as keyof T] = validationResult;
      }
    });

    return result;
  });

  $ownErrors.on(error, (state, errs) => ({ ...state, ...errs }));

  return {
    onChange: () => void 0,
	 onSubmit: () => void 0,
	 
	 // @ts-ignore
	 error,
	 
	 // @ts-ignore
    set,
    validate,
    getInitial: () => $values.defaultState,
	 // @ts-ignore
    fill,
	 // @ts-ignore
    values: $values,
	 // @ts-ignore
    errors: sample(errorsSampled),
    //@ts-ignore
    __kind: "form",
	};
};

/*
TODO:
- async validation
- array of items
- object typedef (?)
*/

const isForm = (entity: any): entity is Form<any> => {
	//@ts-ignore
	return entity.__kind === "form";
};

const contacts = createForm({
	city: string(),
	street: string(),
});

// const form = createForm({
// 	foo: {
// 		bar: {
// 			baz: number().required(),
// 		},
// 	},
// 	name: string(),
// 	contacts,
// });

// // form.values.watch(console.log);

// // form.fill({
// // 	contacts: { city: "foo", street: "bar" },
// // 	foo: {
// // 		bar: {
// // 			baz: 123,
// // 		},
// // 	},
// // 	name: "asd",
// // });

// if (window) {
	//   Object.assign(window, { createForm, string, number, form });
// }
