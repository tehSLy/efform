## Efform-React
efform bindings for React.js library. Provides API for rendering form data fields in a way, described below:

```tsx


const form = createForm({
	name: string(),
	age: number(),
	nickNames: array(string(), [])
})


const NumericField = createNumericField(form, ({value, error, onChange, validate}) => <input value={value} onChange={(e) => onChange(+e.event.target)}/>)
const StringField = createStringField(form, ({value, error, onChange, validate}) => <input value={value} onChange={(e) => onChange(+e.event.target)}/>)

const NickNamesField = createSpecificField(form, {
	key: "nickNames",
	render: ({value, error, onChange, validate}) => ...
});


const Form = () => <form>
  <NumericField field='age' />
  <StringField field='name' />
  <NickNamesField />
</form>
```