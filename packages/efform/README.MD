# EFFORM

Form manager, based on `effector` state manager, designed to deliver high-quality DX

## Installation  

Simply execute `npm i efform` in the terminal.  
**Notice**: efform uses `effector` as a peer dependency, so if you don't have this package installed, install it by yourself

## Motivation

You may have heard of `effector` package which allows you to organise logic of your application in a declarative way. Although the package itself is very convinient to use, when it comes to the forms handling you may struggle with quite an amount of similar code, for example:
```ts
const setName = createEvent<string>();
const setAge = createEvent<number>();

const $name = createStore("").on(setName, (_, v) => v);
const $age = createStore(0).on(setAge, (_, v) => v);

const $form = combine({name: $name, age: $age});

const $isValid = $form.map(({name, age}) => name.length > 5 && age > 18);
```
The snippet above doesn't seem that convinient, does it? Especially if amount of fields more than just 2. This is the case when `efform` comes in handy: it hides all the common logic, providing convinient API to work with and might be customized in different ways.

## Usage & Basics

There are 2 basic types of units used for building schemas: `forms` themselves and `typeDefs`.

**Forms** may consist of nested **Forms**, nested **Inline-Forms**, or **Fields**  
**TypeDefs** (Type Definitions) - are objects with built-in methods for describing of what specific data  sctructure should look like

Let's consider simple example below:
```ts
import { createForm, string, number } from "efform";
import { forward, createEffect } from "effector";

const fxSendForm = createEffect({ handler: console.log });

const form = createForm({
  name: string().required('Introduce yourself, name is mandatory!'),
  age: number(18).max(100, 'Uh-oh, your age doesn\'t seem legit!'),
  email: string().required().pattern(/.+@.+/),
});

forward({ from: form.submitted, to: fxSendForm });
form.submit();
// => {name: "", age: 18, email: ""}
```
As you can guess, there is a form which consists of 3 fields: `name`, `age`, `email`. The first and the third are required fields, so they will be only valid if they have any value within. Furthermore, there are custom error messages for validation of name existence and how old person is. Then you can see basic work with form events, such as `submitted`, `submit`: if the form is valid, whenever the `submit` event is triggered(or called), `submitted` event will fire with payload of the form's state.  

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

### Validators

Each default validator has parameters and optional message to display. For instance consider you need to define string which might be from 10 to 20 symbols and show user the appropriate message in case of error:
```ts
const form = createForm({
  password: string().length(10, 20, 'Length of your password must be within range from 10 to 20 symbols!')
})
```
Whenever value doesn't pass the validation rule this string will be used as error message and popped in form errors  

All the default validators are designed in a similar way, providing all the base needs for validation.  
Despite of having it's own validators set for each type, there is one general validator which might be applied to any type - custom validator. It has following signature:  
```ts
validation<T>(
    validator: (data: T, formState: unknown) => boolean | Promise<boolean>,
    message?: string
  )
```
As you might notice this validator can be **async**. Although it correctly derives type of the data itself, due to the TS limitations it cannot resolve form's state type since it references itself type therefore `formState` is typed as `unknown`.

## Roadmap
 + Basic API and all the possible form structures covered with inner type definitions (records, objects, etc.)
 + Stable version with no bugs, stable API
 + Comprehensive documentation, with examples included
 + SSR
 + Bindings with other popular frameworks