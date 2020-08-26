// const {createForm, number, string} = require('./typeDef')
import { createForm } from "../src/createForm";
import { number, string } from "../src/typeDef";

describe("General test", () => {
  it("resolves default values correctly", () => {
    const form = createBasicForm();
    expect(form.values.getState()).toMatchObject({ name: "", age: 0 });
  });

  it("sets values correctly", () => {
    const form = createBasicForm();
    form.set({ key: "name", payload: "Bob" });

    expect(form.values.getState()).toMatchObject({ name: "Bob", age: 0 });
  });

  it("correctly resolves field types", () => {
    const form = createNestedForm();
    form.fill({
      // @ts-expect-error
      foo: 124,
      nested: {
        // @ts-expect-error
        age: "asd",

        //@ts-expect-error
        name: 1337,
      },
    });

    form.fill({
      foo: "",
      nested: {
        age: 100,
        name: "asd",
      },
    });
  });

  it("resolves validation errors in nested forms", () => {
    const form = createNestedForm();
    form.fill({
      foo: "",
      nested: {
        age: 55,

        //@ts-expect-error
        name: 1337,
      },
    });
    form.validate();

    expect(form.errors.getState()).toMatchObject({
      nested: {
        name: "Should be string",
      },
    });
  });

  it("resolves required message correctly", async () => {
    const message = "Test message";
    const form = createForm({
      name: string().required(message),
    });

    await form.validateField("name");
    expect(form.errors.getState().name).toBe(message);
  });

  it("validates asychronyously correctly, with custom validator", async () => {
    const message = "Test message";
    const correct = "correct";
    const form = createForm({
      name: string().validation((v) => delay(100, v === correct), message),
    });

    await form.validateField("name");
    expect(form.errors.getState().name).toBe(message);

    form.set({ key: "name", payload: correct });

    await form.validateField("name");
    expect(form.errors.getState().name).toBeFalsy();
  });

  it("batches sync validation results", async () => {
    const form = createForm({
      // branch #1
      foo: {
        foo1: string().required(),
        foo2: number().required(),
      },
      //branch #2
      bar: {
        bar1: number().validation(() => delay(500, true)),
        bar2: string().validation(() => delay(1000, false)),
      },
    });
  });
});

const createBasicForm = () => createForm({ name: string(), age: number() });
const createNestedForm = () =>
  createForm({
    nested: createBasicForm(),
    foo: string(),
  });

const delay = <T = void>(ms: number, returnValue?: T): Promise<T> =>
  new Promise((rs) => setTimeout(rs, ms, returnValue));
