import { Event, Store, Effect, attach } from "effector";
import { Form, FormMeta, Errors } from "./typeDef";

export type Field<T> = {
  set: Event<T>;
  value: Store<T>;
  error: Store<string | undefined>;
  validate: Effect<void, Errors<T>, Error>;
};

/**
 * Internal method for creating and binding all the fields units.  
 * **Own keys** are treated as separated fields thus their units are also being created and separated  
 * **Nested keys** are treated as fields but, its API reuses already defined methods from such subforms, no units created or generated whatsoever  
 */
export const createFields = <T>(form: Form<T>) => {
  const {
    getOwnKeys,
    getNestedKeys,
    getParsedSchema,
  } = form.getMeta();
  const parsedSchema = getParsedSchema();
  const fields = {} as any;

  // We wanna interpret own keys as "real" fields thus we're **creating** handlers for it
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
  
  // As nested forms are generally just large fields related to origin form, we wanna treat them differently
  // Thus we're not creating anything, just reusing existing methods
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
