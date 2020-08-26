import { Form, FormMeta } from "./typeDef";

export const createSetters = <T>(form: Form<T>) => {
	const {getMeta, getOwnKeys} = form as any as FormMeta<T>;
	
}