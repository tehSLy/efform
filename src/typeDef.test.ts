// const {createForm, number, string} = require('./typeDef')
import {createForm, number, string} from "./typeDef"

describe("General test", () => {
	const form = 

	it("resolves default values correctly", () => {
		const form = createBasicForm();
		expect(form.values.getState()).toMatchObject({name: "", age: 0})
	})

	it("sets values correctly", () => {
		const form = createBasicForm();
		form.set({key: "name", payload: "Bob"})

		expect(form.values.getState()).toMatchObject({name: "Bob", age: 0})
	})

	it("resolves validation errors in nested forms", () => {
		const form = createNestedForm();
		form.fill({
			foo: "",
			nested: {
				age: 55,

				//@ts-expect-error
				name: 1337
			}
		})
		form.validate();
		
		expect(form.errors.getState()).toMatchObject({
			nested: {
				name: "Should be string"
			}
		})

	})
})

const createBasicForm = () => createForm({name: string(), age: number()});
const createNestedForm = () => createForm({
	nested: createBasicForm(),
	foo: string()
});