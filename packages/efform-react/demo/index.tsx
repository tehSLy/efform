import { array, createForm, number, string } from "efform";
import * as React from "react";
//@ts-ignore
import { render } from "react-dom";
import { createField } from "../src/";
import { createNumericField, createSpecificField } from "../src/createField";

const root = document.createElement("div");
document.body.appendChild(root);

const address = createForm({
  street: string("asd").length(4, 10),
});

const contacts = createForm({
  address,
});

contacts.fields.address.set({street: "fooobarrrr"})

const form = createForm({
  age: number("foo"),
  name: string("john").length(10, 20),
  foo: array(number(5).max(4, "no more than 4"), [3, 100]),
  contacts,
  bio: { age: number() },
});
form.errors.watch((v) => {
  console.log(v)
});

//@ts-ignore
window.form = form;
const Field = createField(form, ({ onChange, value, validate, error }) => (
  <div>
    <input
      value={(value as any) || ""}
      onChange={(e) => onChange(e.target.value as any)}
      onBlur={validate}
    />
    {error}
  </div>
));
const NumericField = createNumericField(
  form,
  ({ onChange, value, validate, error }) => (
    <div>
      <input
        value={(value as any) || 0}
        onChange={(e) =>
          onChange(
            isNaN(+e.target.value) ? (e.target.value as any) : +e.target.value
          )
        }
        onKeyUp={validate}
      />
      {error}
    </div>
  )
);

const ArrayField = createSpecificField({
  form,
  key: "foo",
  render: ({ error, onChange, validate, value }) => (
    <div>
      <button onClick={() => (onChange([...value, Math.random() * 100]), validate())}>123</button>
      {value.map((v, i) => (
        <div key={v}>{v} {error?.[i]}</div>
      ))}
    </div>
  ),
});

const AddressField = createSpecificField({
  form: address,
  key: "street",
  render: ({error, onChange, validate, value}) => <input title={error} onChange={(e) => onChange(e.target.value)} value={value || ""} />
})

const App = () => {
  return (
    <div>
      <NumericField name="age" />
      <Field name="name" />
      <ArrayField />
      <AddressField />
    </div>
  );
};

render(<App />, root);
