# EFFORM
Form manager, based on `effector` state manager, designed to deliver high-quality DX

```ts
import { createForm, string, number } from "efform"
import { forward, createEffect } from "effector"

const fxSendForm = createEffect({handler: console.log})

const form = createForm({
	name: string()
		.required(),
	age: number(18)
		.max(100),
	email: string()
		.required()
		.pattern(/.+@.+/)
})

forward({from: form.submitted, to: fxSendForm})
form.submit()
// => {name: "", age: 18, email: ""}

const Field = createField(form, ({value, onChange}) => <input  />)
```