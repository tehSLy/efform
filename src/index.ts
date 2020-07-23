export function createForm<T>(
  schemaDefinition: SchemaDefinition<T>
): Form<Schema<T>>;
export function createForm<T>(schema: Schema<T>): Form<Schema<T>>;
export function createForm(source: any) {
  const schema: any = source instanceof Schema ? source : createSchema(source);
  return {} as any;
}
import "./typeDef"
export const createSchema = <T>(definition: SchemaDefinition<T>) => {
  // @ts-ignore
  const result = new Schema();

  return result as Schema<T>;
};

const Schema = function () {};

const form = createForm({
  age: null,
  name: null,
});
