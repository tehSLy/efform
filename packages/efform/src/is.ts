import { ArrayTypeDef, Form, NumberTypeDef, StringTypeDef } from "./typeDef";

export const is = {
  numeric: (payload: unknown): payload is NumberTypeDef =>
    payload instanceof NumberTypeDef,
  string: (payload: unknown): payload is StringTypeDef =>
    payload instanceof StringTypeDef,
  array: <T = unknown>(payload: unknown): payload is ArrayTypeDef<T> =>
    payload instanceof ArrayTypeDef,
  form: <T = unknown>(payload: unknown): payload is Form<T> =>
    //@ts-ignore
    payload.__kind === "form",
};
