# EFFORM

Form manager, based on `effector` state manager, designed to deliver high-quality DX

```ts
import { createForm, string, number } from "efform";
import { forward, createEffect } from "effector";

const fxSendForm = createEffect({ handler: console.log });

const form = createForm({
  name: string().required(),
  age: number(18).max(100),
  email: string().required().pattern(/.+@.+/),
});

forward({ from: form.submitted, to: fxSendForm });
form.submit();
// => {name: "", age: 18, email: ""}
```

## Basics

In efform, **Forms** may consist of nested **Forms**, nested **Inline-Forms**, or **Fields**

### Form

This is the very common type of unit. It defines structure of data-slice, with validation, error and state management included. 
```ts
type Form<T> = {
  submit: Event<void>;
  submitted: Event<T>;

  set: Event<{key: K; payload: T[K]>;
  setErrors: Event<Errors<T>>;
  fill: Event<Values<Partial<T>>>;
  validate: Effect<void, any, Error>;

  values: Store<T>;
  errors: Store<Errors<T>>;
  validateField: Effect<keyof T, any, Error>;

  isValid: Store<boolean>
  
  fields: Record<keyof T, Field>
  getMeta(): FormMeta<T>;
}
```

See example of basic form on following snippet:

```ts
const form = createForm({
  age: number(),
  name: string(),
});
```

### Nested Forms

It might be either dedicated, or inline-forms. Dedicated forms - are just forms, declared outside of parent, see example below:

```ts
const nestedForm = createForm({
  name: string(),
  age: number(),
});

const form = createForm({
  // Notice, how nested form is used here, as a part of the main one
  bio: nestedForm,
  status: string(),
});
```

Aside from being basically a simple form, being child form provides us opportunity to manage it's state by it's parent. Let's break down nested form possible use-cases in the code below:

```ts
const nestedForm = createForm({
  name: string(),
  age: number(),
});

const form = createForm({
  // Notice, how nested form is used here, as a part of the main one
  bio: nestedForm,
  status: string(),
});

form.values.watch(console.log);
// => {bio: {name: "", age: 0}, status: ""}

nestedForm.fill({ name: "John", age: 42 });
// => {bio: {name: "John", age: 42}, status: ""}
```

As you can see, any nested form lifting up it's state, errors, and other things like that. So you are free to separate complicated forms into simplier ones, and then, just combine them at the upper structure level, resulting in solid data structure.

The next thing on the list - is **Inline-Forms** which are appear to be nested by design. There is an example of such form in the code below:

```ts
const form = createForm({
	bio: { // this field is actually an inline-form, and it is nested aswell
		name: string(),
		age: number()
	},
	status: string()
});

form.values.watch(console.log);
	// => {bio: {name: "", age: 0}, status: ""}

form.fill({
	bio: {
		name: "Alice",
		age: 28
	}
})
	// => {bio: {name: "Alice", age: 28}, status: ""}
```

### Fields
In short, **Field** refers to a part of the form.  
```ts
type Field<T> = {
  set: Event<T>;
  value: Store<T>;
  error: Store<string | undefined>;
  validate: Effect<void, Errors<T>, Error>;
};
```

It may be either simple field (e.g. string field, numeric field, etc) or even, reference to nested form. Let's look at the example below:

```ts
const nestedForm = createForm({
  name: string(),
  age: number(),
});

const form = createForm({
  bio: nestedForm, // we have a nested form here
  location: { // and we also do an inline one
	  country: string(),
	  city: string()
  }
  status: string(),
});

// Then, we have an access to form's fields
console.log(form.fields.bio.value.getState()) // => {name: "", age: 0}

form.fields.location.set({
	country: "France",
	city: "Paris"
})

console.log(form.values.getState()) // => {status: "", location: {country: "France", city: "Paris"}, bio: {name: "", age: 0}}
```

