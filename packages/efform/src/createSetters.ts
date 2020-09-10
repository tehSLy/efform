import { Event, Store, Effect, attach } from "effector";
import { Form, FormMeta, Errors } from "./typeDef";

export type Field<T> = {
  set: Event<T>;
  value: Store<T>;
  error: Store<string | undefined>;
  validate: Effect<void, Errors<T>, Error>;
};

export const createFields = <T>(form: Form<T>) => {
  const {
    getOwnKeys,
    getNestedKeys,
    getParsedSchema,
  } = form.getMeta();
  const parsedSchema = getParsedSchema();
  const fields = {} as any;

  for (const key of getOwnKeys()) {
    fields[key] = {
      //@ts-ignore
      error: form.errors.map((state) => state[key]),
      //@ts-ignore
      set: form.set.prepend((payload: any) => ({ key, payload })),
      //@ts-ignore
      value: form.values.map((state) => state[key]),
      //@ts-ignore
      validate: attach({effect: form.validateField, mapParams: () => key}) as any,
    } as Field<any>;
  }
  
  for (const key of getNestedKeys()) {
    //@ts-ignore
    const formPart = parsedSchema[key] as Form<any>;
    fields[key] = {
      error: formPart.errors,
      set: formPart.fill,
      validate: formPart.validate as any,
      value: formPart.values,
    } as Field<any>;
  }

  return fields;
};
