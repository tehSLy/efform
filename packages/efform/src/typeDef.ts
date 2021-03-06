// @ts-nocheck

import { Effect, Event, Store } from "effector";
import { Field } from "./createSetters";

export type CustomValidator<T> = (
  data: T,
  state: unknown
) => boolean | Promise<boolean>;

export interface Rule<T = any> {
  payload?: any;
  message?: string;
  validator: (value: T, payload: any) => boolean | Promise<boolean>;
  async: boolean;
  key?: string;
}

export interface TypeDef<T = any> {
  protected getInitial(): any;
  validation(validator: CustomValidator<T>, message?: string): TypeDef<T>;
}

export interface NumberTypeDef extends TypeDef<number> {
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

export interface StringTypeDef extends TypeDef<string> {
  required(message?: string): StringTypeDef;
  pattern(pattern: RegExp | string, message?: string): StringTypeDef;

  length(exact: number, message?: string): StringTypeDef;
  length(min: number, max: number, message?: string): StringTypeDef;
  validation(
    validator: CustomValidator<string>,
    message?: string
  ): StringTypeDef;
}

export interface BooleanTypeDef extends TypeDef<boolean> {}

export interface ArrayTypeDef<T> extends TypeDef<T[]> {}

export abstract class TypeDef<T = any> {
  private initial: any;

  private rules: Rule<T>[] = [];
  private asyncRules: Rule<T> = [];

  protected setRule({ payload, message, validator, async }: Rule<T>) {
    const newInstance = this.clone();

    const key = async ? "asyncRules" : "rules";
    newInstance[key] = [...this[key], { message, payload, validator }];
    return newInstance as this;
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

  protected async validateAsync(value: any, state: any) {
    for (const { payload, message, validator, stateful } of this.asyncRules) {
      const result = await validator(value, stateful ? state : payload);
      if (!result) {
        return message || "Validation error";
      }
    }
    return undefined;
  }

  protected validate(value: any, state: any) {
    for (const { payload, message, validator } of this.rules) {
      const result = validator(value, payload);
      if (!result) {
        return message || "Validation error";
      }
    }
    return undefined;
  }

  validation(
    validator: (data: T, state: D) => boolean | Promise<boolean>,
    message?: string
  ) {
    return this.setRule({
      validator,
      message,
      async: true,
      stateful: true,
    });
  }

  public static resolveInitial<T>(typeDef: TypeDef<T>) {
    return typeDef.getInitial() as T;
  }

  public static validateSchema<T>(schema: Schema<T>, value: Values<T>) {
    if (schema instanceof TypeDef) {
      return schema.validate(value);
    }

    console.log({ schema, value });

    return Object.fromEntries(
      Object.entries(schema).map(([key, typeDef]) => {
        return [key, TypeDef.validateSchema(typeDef, value[key])];
      })
    );
  }

  public static async validateSchemaAsync<T>(
    schema: Schema<T>,
    value: Values<T>
  ) {
    if (schema instanceof TypeDef) {
      return schema.validateAsync(value);
    }
  }

  protected clone() {
    return new this.constructor(this.initial);
  }
}

export type NumberValidatorKey =
  | "required"
  | "min"
  | "max"
  | "negative"
  | "positive"
  | "type";
export type StringValidatorKey =
  | "required"
  | "pattern"
  | "length"
  | "startsWith"
  | "enum"
  | "endsWith"
  | "type";

export const numberValidators: {
  [key in NumberValidatorKey]: (v: number, payload: any) => boolean;
} = {
  required: (v) => !!v,
  max: (v, max) => v < max,
  min: (v, min) => v > min,
  negative: (v) => v < 0,
  positive: (v) => v > 0,
  type: (v) => typeof v === "number",
};

export const stringValidators: {
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

export class NumberTypeDef extends TypeDef<number> {
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

export class StringTypeDef extends TypeDef {
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

export class ArrayTypeDef<T> extends TypeDef<T[]> {
  constructor(private schema: Schema<T>, private initial: Values<T>[]) {
    super();
    const validate = (v: any) => TypeDef.validateSchema(schema, v);
    const validateAsync = (v: any) => TypeDef.validateSchemaAsync(schema, v);

    this.rules = [
      {
        validator: (value) => value.map(validate),
        async: false,
      },
      {
        validator: (value) => value.map(validateAsync),
        async: true,
      },
    ];
  }

  validate(v: any[]) {
    const validate = (v: any) => TypeDef.validateSchema(this.schema, v);
    return v.map(validate);
  }

  validateAsync(v: any[]) {
    const validateAsync = (v: any) => TypeDef.validateSchemaAsync(schema, v);
    return Promise.all(v.map(validateAsync));
  }

  clone() {
    return new this.constructor(this.schema, this.initial);
  }
}

export class RecordTypeDef<
  K extends string | number | symbol,
  V
> extends TypeDef<Record<K, V>> {
  constructor(
    private keyType: any,
    private valueType: any,
    private initial: Record<K, V>
  ) {
    super();
  }

  protected clone() {
    return new this.constructor(this.keyType, this.valueType, this.initial);
  }

  validate(v: any[]) {
    if (typeof v !== "object") {
      return false;
    }
    return Object.fromEntries(
      Object.entries(v).map(([key, value]) => [
        key,
        TypeDef.validateSchema(key) || TypeDef.validateSchema(value),
      ])
    );
  }

  validateAsync(v: any[]) {
    const validateAsync = (v: any) => TypeDef.validateSchemaAsync(schema, v);
    return Promise.all(v.map(validateAsync));
  }
}

export class BooleanTypeDef extends TypeDef {
  private rules: Rule[] = [
    {
      async: false,
      validator: (v) => typeof v === "boolean",
      message: "Must be boolean",
      key: "type",
    },
  ];

  constructor(private initial: boolean) {
    super(initial);
  }
}

export const string = (initial?: string): StringTypeDef => {
  return new StringTypeDef(initial);
};

export const boolean = (initial: boolean) => {
  return new BooleanTypeDef(initial);
};

export const array = <T>(schema: T, initial?: Value<T>[]) => {
  return new ArrayTypeDef<T>(schema, initial);
};

export const record = <K extends StringTypeDef | NumberTypeDef, V>(
  key: K,
  schema: V,
  initial: Record<Value<K>, Value<V>>
) => {
  return new RecordTypeDef<Value<K>, Value<V>>(key, schema, initial);
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

export type Schema<T> = { [key in keyof T]: T[key] };

type KeysNotMatching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? never : K;
}[keyof T];

export type PrimitiveOnly<T> = {
  [key in KeysNotMatching<T, Form<any>>]: T[key];
};

export interface Form<T> {
  submit: Event<void>;
  submitted: Event<Values<T>>;

  set: IntersectionOfFn<Values<T>>;
  setErrors: Event<Errors<T>>;
  fill: Event<Partial<Values<T>>>;
  validate: Effect<void, any, Error>;

  values: Store<Values<T>>;
  errors: Store<Errors<T>>;
  validateField: Effect<keyof T, any, Error>;

  isValid: Store<boolean>;

  fields: { [key in keyof T]: Field<Values<T[key]>> };
  getMeta(): FormMeta<T>;
}

export interface FormMeta<T> {
  getOwnKeys(): (keyof FormValues<T>)[];
  getNestedKeys(): (keyof FormValues<T>)[];
  getSchema(): Schema<unknown>;
  getParsedSchema(): Schema<T>;
  validateInternal: Effect<void, Errors<T>, Error>;
}

export type ValuesGeneric<T> = T extends Values<infer G>
  ? Values<G>
  : T extends Value<infer U>
  ? Value<U>
  : never;

export type FormValues<T> = T extends string | number | boolean
  ? T
  : T extends Form<infer G>
  ? Form<FormValues<G>>
  : T extends Schema<infer U>
  ? { [key in keyof U]: FormValues<U[key]> }
  : Value<T>;

// Consider removing duplicates
export type Values<T> = T extends number | boolean | string
  ? T
  : T extends Array<infer G>
  ? G[]
  : T extends Form<infer P>
  ? {
      [key in keyof P]: P[key] extends number | boolean | string
        ? P[key]
        : Values<P[key]>;
    }
  : T extends Schema<infer U>
  ? {
      [key in keyof U]: U[key] extends number | boolean | string
        ? U[key]
        : Values<U[key]>;
    }
  : never;

type Error = string | undefined;

export type Errors<T> = T extends number | boolean | string
  ? string | undefined
  : T extends Array<any>
  ? (string | undefined)[]
  : T extends Form<infer G>
  ? {
      [key in keyof G]: G[key] extends number | boolean | string
        ? Error
        : Errors<G[key]>;
    }
  : T extends Schema<infer G>
  ? {
      [key in keyof G]: G[key] extends number | boolean | string
        ? Error
        : Errors<G[key]>;
    }
  : never;

export type Value<T> = T extends RecordTypeDef<infer K, infer V>
  ? Record<K, V>
  : T extends NumberTypeDef
  ? number
  : T extends ArrayTypeDef<infer U>
  ? Value<U>[]
  : T extends StringTypeDef
  ? string
  : T extends BooleanTypeDef
  ? boolean
  : T;

/*
TODO:
- async validation
- array of items
- object typedef (?) - provided with inline form
- set multiple fields at once
- consider, reversing meta types and value types on form creation, may be difficult for complicated and multilevel fields
*/
