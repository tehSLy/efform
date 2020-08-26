// @ts-nocheck

import { Effect, Event, Store } from "effector";

export type CustomValidator<T> = (data: T) => boolean | Promise<boolean>;

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
    const newInstance = this.constructor(this.initial);
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

  protected async validateAsync(value: any) {
    for (const { payload, message, validator } of this.asyncRules) {
      const result = await validator(value, payload);
      if (!result) {
        return message || "Validation error";
      }
    }
    return undefined;
  }

  protected validate(value: any) {
    for (const { payload, message, validator } of this.rules) {
      const result = validator(value, payload);
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
      async: true,
    });
  }

  public static resolveInitial<T>(typeDef: TypeDef<T>) {
    return typeDef.getInitial() as T;
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

export class ArrayTypeDef<T> extends TypeDef<T[]> {}

export class BooleanTypeDef extends TypeDef {}

export const string = (initial?: string): StringTypeDef => {
  return new StringTypeDef(initial);
};

export const boolean = () => {
  return new BooleanTypeDef();
};

export const array = <T>(schema: T, initial?: ValuesT[]) => {
  return new ArrayTypeDef<T>();
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
  onChange(cb: (data: Values<T>) => void): void;
  onSubmit(cb: (data: Values<T>) => void): void;

  changed: Event<Values<T>>;
  submitted: Event<Values<T>>;

  //merge
  // set: IntersectionOfFn<Values<PrimitiveOnly<Values<T>>>>; // this option is not working correctly
  set: IntersectionOfFn<Values<T>>;
  fill: Event<Values<T>>;
  validate: Event<void>;

  getInitial(): Values<T>;
  values: Store<Values<T>>;
  errors: Store<Errors<T>>;
  error: Event<Errors<T>>;
  validateField: Effect<keyof T, void, Error>;
}

export interface FormMeta<T> {
  getOwnKeys(): string[];
  getMeta(): T;
  
}

export type ValuesGeneric<T> = T extends Values<infer G>
  ? Values<G>
  : T extends Value<infer U>
  ? Value<U>
  : never;

export type Values<T> = T extends Schema<infer U>
  ? {
      [key in keyof U]: U[key] extends Form<infer G>
        ? Values<Schema<G>>
        : U[key] extends Schema<infer G>
        ? Values<Schema<G>>
        : Value<U[key]>;
    }
  : never;

export type Errors<T> = T extends Schema<infer U>
  ? {
      [key in keyof U]: U[key] extends Form<infer G>
        ? Errors<G>
        : U[key] extends Schema<infer G>
        ? Values<Schema<G>>
        : string | undefined;
    }
  : never;

export type Value<T> = T extends NumberTypeDef
  ? number
  : T extends ArrayTypeDef<infer U>
  ? Value<U>[]
  : T extends StringTypeDef
  ? string
  : T extends BooleanTypeDef
  ? boolean
  : never;

/*
TODO:
- async validation
- array of items
- object typedef (?) - provided with inline form
- set multiple fields at once
- consider, reversing meta types and value types on form creation, may be difficult for complicated and multilevel fields
*/
