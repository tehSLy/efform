declare type SchemaDefinition<T> = { [key in keyof T]: TypeDef<T[key]> };

declare interface Schema<T> {}

declare type Values<T> = T extends Schema<infer U> ? U : never;

declare interface Form<T extends Schema<any>> {
  onChange(data: Values<T>): void;
  onSubmit(data: Values<T>): void;
  onValidityChange(is: boolean): void;
}

declare type TypeDef<T> = {};
