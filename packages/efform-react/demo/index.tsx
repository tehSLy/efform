import { createForm, number, string } from "efform";
import * as React from "react";
//@ts-ignore
import { render } from "react-dom";
import { createField } from "../src/";
import { createNumericField } from "../src/createField";

const root = document.createElement("div");
document.body.appendChild(root);

const form = createForm({
  age: number(10),
  name: string("john").length(10, 20),
  foo: {
	  bar: string(),
	  baz: {
		  quix: number()
	  }
  }
});

form.errors.watch(console.log);
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
        onChange={(e) => onChange(isNaN(+e.target.value) ? e.target.value as any : +e.target.value)}
        onKeyUp={validate}
      />
      {error}
    </div>
  )
);
const App = () => {
  return (
    <div>
      <NumericField name="age" />
      <Field name="name" />
    </div>
  );
};

render(<App />, root);
